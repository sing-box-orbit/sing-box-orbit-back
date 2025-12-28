import { Hono } from 'hono';
import { db } from '@/libs/db';
import { formatClash, formatOutline, formatSingbox, formatV2ray, type ServerConfig } from './formatters';

export const subscriptionPath = '/s';
export const subscriptionApp = new Hono();

type SubscriptionFormat = 'v2ray' | 'clash' | 'singbox' | 'outline';

subscriptionApp.get('/:token', async (c) => {
	const token = c.req.param('token');
	const format = (c.req.query('format') ?? 'v2ray') as SubscriptionFormat;

	const subscription = await db.subscription.findUnique({
		where: { token },
		include: {
			client: {
				include: {
					servers: {
						include: {
							server: {
								include: { inbounds: true },
							},
						},
					},
					subscriptionTemplate: true,
				},
			},
		},
	});

	if (!subscription) {
		return c.json({ error: 'Invalid subscription token' }, 401);
	}

	if (!subscription.client.enabled) {
		return c.json({ error: 'Subscription disabled' }, 403);
	}

	if (subscription.client.expiresAt && new Date() > subscription.client.expiresAt) {
		return c.json({ error: 'Subscription expired' }, 403);
	}

	const template = subscription.client.subscriptionTemplate;

	const configs: ServerConfig[] = subscription.client.servers.map((cs) => ({
		server: cs.server,
		inbounds: cs.server.inbounds,
		uuid: cs.uuid,
	}));

	let content: string;
	let contentType: string;

	switch (format) {
		case 'v2ray':
			content = formatV2ray(configs);
			contentType = 'text/plain; charset=utf-8';
			break;

		case 'clash':
			content = formatClash(configs);
			contentType = 'text/yaml; charset=utf-8';
			break;

		case 'singbox':
			content = formatSingbox(configs);
			contentType = 'application/json; charset=utf-8';
			break;

		case 'outline':
			content = formatOutline(configs);
			contentType = 'text/plain; charset=utf-8';
			break;

		default:
			return c.json({ error: `Unknown format: ${format}` }, 400);
	}

	c.header('Content-Type', contentType);
	c.header('Cache-Control', 'no-cache');

	const profileTitle = template?.profileTitle ?? `${subscription.client.username} Subscription`;
	c.header('Profile-Title', profileTitle);

	c.header('Profile-Update-Interval', String(template?.updateInterval ?? 24));

	if (template?.updateAlways) {
		c.header('Update-Always', 'true');
	}

	const userInfoParts = ['upload=0', 'download=0', `total=${template?.trafficTotal ?? 0}`];
	if (subscription.client.expiresAt) {
		userInfoParts.push(`expire=${Math.floor(subscription.client.expiresAt.getTime() / 1000)}`);
	}
	c.header('Subscription-Userinfo', userInfoParts.join('; '));

	if (template?.announce) {
		c.header('Announce', template.announce);
	}

	if (template?.announceUrl) {
		c.header('Announce-Url', template.announceUrl);
	}

	if (template?.routing) {
		c.header('Routing', template.routing);
	}

	return c.body(content);
});
