import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { rateLimiter } from 'hono-rate-limiter';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { graphqlApp, graphqlPath } from '@/graphql';
import { appConfig, trustedOrigins } from '@/libs/appConfig';
import { auth } from '@/libs/auth/auth';
import { seedAdmin } from '@/libs/auth/seedAdmin';
import { db } from '@/libs/db';
import { createChildLogger, logger } from '@/libs/logger';
import { subscriptionApp, subscriptionPath } from '@/subscription';
import type { AppVariables } from '@/types';

const rateLimitLogger = createChildLogger('rateLimit');

const JWKS = createRemoteJWKSet(new URL(`${appConfig.APP_URL}/api/auth/jwks`));

const authRateLimiter = rateLimiter({
	windowMs: 60 * 1000,
	limit: 10,
	keyGenerator: (c) => c.req.header('x-forwarded-for') || 'unknown',
	handler: (c) => {
		rateLimitLogger.warn(`Auth rate limit exceeded: ${c.req.header('x-forwarded-for')}`);
		return c.json({ error: 'Too many requests, try again later' }, 429);
	},
});

const graphqlRateLimiter = rateLimiter({
	windowMs: 60 * 1000,
	limit: 100,
	keyGenerator: (c) => c.req.header('x-forwarded-for') || 'unknown',
	handler: (c) => {
		rateLimitLogger.warn(`GraphQL rate limit exceeded: ${c.req.header('x-forwarded-for')}`);
		return c.json({ error: 'Too many requests, try again later' }, 429);
	},
});

await seedAdmin();

const app = new Hono<{ Variables: AppVariables }>();

app.use(
	'*',
	cors({
		origin: trustedOrigins,
		credentials: true,
	}),
);

app.use('*', async (c, next) => {
	const requestId = crypto.randomUUID().slice(0, 8);
	c.set('requestId', requestId);
	c.header('X-Request-Id', requestId);
	await next();
});

app.use('*', async (c, next) => {
	const authHeader = c.req.header('Authorization');

	if (authHeader?.startsWith('Bearer ')) {
		const token = authHeader.slice(7);
		try {
			const { payload } = await jwtVerify(token, JWKS, {
				issuer: appConfig.APP_URL,
				audience: appConfig.APP_URL,
			});
			if (payload) {
				c.set('user', payload as AppVariables['user']);
				c.set('session', null);
				return next();
			}
		} catch {}
	}

	const session = await auth.api.getSession({ headers: c.req.raw.headers });
	c.set('user', session?.user ?? null);
	c.set('session', session?.session ?? null);
	await next();
});

app.get('/', async (c) => {
	const start = Date.now();
	try {
		await db.$queryRaw`SELECT 1`;
		const dbLatency = Date.now() - start;
		return c.json({
			status: 'healthy',
			timestamp: new Date().toISOString(),
			database: { status: 'healthy', latency: dbLatency },
		});
	} catch {
		return c.json(
			{
				status: 'unhealthy',
				timestamp: new Date().toISOString(),
				database: { status: 'unhealthy' },
			},
			503,
		);
	}
});

app.on(['POST', 'GET'], '/api/auth/*', authRateLimiter, (c) => auth.handler(c.req.raw));

app.use(graphqlPath, graphqlRateLimiter);
app.route(graphqlPath, graphqlApp);
app.route(subscriptionPath, subscriptionApp);

logger.info(`Server started http://localhost:${appConfig.APP_PORT}`);

export default {
	port: appConfig.APP_PORT,
	fetch: app.fetch,
};
