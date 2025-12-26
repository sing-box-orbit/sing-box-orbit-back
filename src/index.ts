import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { graphqlApp, graphqlPath } from '@/graphql'
import { appConfig, trustedOrigins } from '@/libs/appConfig'
import { auth } from '@/libs/auth/auth'
import { seedAdmin } from '@/libs/auth/seedAdmin'
import type { AppVariables } from '@/types'

await seedAdmin()

const app = new Hono<{ Variables: AppVariables }>()

app.use(
	'*',
	cors({
		origin: trustedOrigins,
		credentials: true,
	}),
)

app.use('*', async (c, next) => {
	const session = await auth.api.getSession({ headers: c.req.raw.headers })
	c.set('user', session?.user ?? null)
	c.set('session', session?.session ?? null)
	await next()
})

app.get('/', (c) => c.text('ok'))

app.on(['POST', 'GET'], '/api/auth/*', (c) => auth.handler(c.req.raw))

app.route(graphqlPath, graphqlApp)

export default {
	port: appConfig.APP_PORT,
	fetch: app.fetch,
}
