import { createYoga } from 'graphql-yoga'
import { Hono } from 'hono'
import { serveStatic } from 'hono/bun'
import { schema } from '@/graphql/schema'
import type { GraphQLContext } from '@/graphql/types'
import type { AppVariables } from '@/types'

export const graphqlPath = '/graphql'

const yoga = createYoga<object, GraphQLContext>({
	schema,
	graphqlEndpoint: graphqlPath,
	graphiql: false,
})

export const graphqlApp = new Hono<{ Variables: AppVariables }>()

graphqlApp.post('/', (c) => {
	return yoga.fetch(c.req.raw, {
		user: c.get('user'),
		session: c.get('session'),
	})
})

graphqlApp.get('/', (c) => {
	const url = new URL(c.req.url)
	if (url.searchParams.has('query')) {
		return yoga.fetch(c.req.raw, {
			user: c.get('user'),
			session: c.get('session'),
		})
	}

	const sandboxBody = `<!DOCTYPE html>
<html>
<head></head>
<body>
	<div id="sandbox" style="position:absolute;top:0;right:0;bottom:0;left:0"></div>
	<script src="${graphqlPath}/embeddable-sandbox.umd.production.min.js"></script>
	<script>
		new window.EmbeddedSandbox({
			target: "#sandbox",
			initialEndpoint: window.location.href,
			runTelemetry: false
		});
	</script>
</body>
</html>`
	return c.html(sandboxBody)
})

graphqlApp.get(
	'/embeddable-sandbox.umd.production.min.js',
	serveStatic({ path: './static/embeddable-sandbox.umd.production.min.js' }),
)
