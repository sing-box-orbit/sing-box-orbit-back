import { authZEnvelopPlugin } from '@graphql-authz/envelop-plugin';
import type { DefinitionNode, OperationDefinitionNode } from 'graphql';
import type { Plugin } from 'graphql-yoga';
import { createYoga } from 'graphql-yoga';
import { Hono } from 'hono';
import { serveStatic } from 'hono/bun';
import { authSchema, authZRules } from '@/graphql/permission';
import { schema } from '@/graphql/schema';
import type { GraphQLContext } from '@/graphql/types';
import { createChildLogger } from '@/libs/logger';
import type { AppVariables } from '@/types';

export const graphqlPath = '/graphql';

const gqlLogger = createChildLogger('graphql');

const isOperationDefinition = (def: DefinitionNode): def is OperationDefinitionNode =>
	def.kind === 'OperationDefinition';

const loggingPlugin: Plugin<GraphQLContext> = {
	onExecute({ args }) {
		const operationName = args.operationName ?? 'anonymous';
		const operationType = args.document.definitions.find(isOperationDefinition)?.operation;

		if (operationType === 'mutation') {
			gqlLogger.info({
				operation: operationName,
				type: operationType,
				userId: args.contextValue.user?.id,
				variables: args.variableValues,
			});
		}

		return {
			onExecuteDone({ result }) {
				if ('errors' in result && result.errors?.length) {
					gqlLogger.error({
						operation: operationName,
						errors: result.errors.map((e) => e.message),
						userId: args.contextValue.user?.id,
					});
				}
			},
		};
	},
};

const yoga = createYoga<object, GraphQLContext>({
	schema,
	graphqlEndpoint: graphqlPath,
	graphiql: false,
	plugins: [authZEnvelopPlugin({ rules: authZRules, authSchema }), loggingPlugin],
});

export const graphqlApp = new Hono<{ Variables: AppVariables }>();

graphqlApp.post('/', (c) => {
	return yoga.fetch(c.req.raw, {
		user: c.get('user'),
		session: c.get('session'),
	});
});

graphqlApp.get('/', (c) => {
	const url = new URL(c.req.url);
	if (url.searchParams.has('query')) {
		return yoga.fetch(c.req.raw, {
			user: c.get('user'),
			session: c.get('session'),
		});
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
</html>`;
	return c.html(sandboxBody);
});

graphqlApp.get(
	'/embeddable-sandbox.umd.production.min.js',
	serveStatic({ path: './static/embeddable-sandbox.umd.production.min.js' }),
);
