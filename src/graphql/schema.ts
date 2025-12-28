import { buildGraphQLSchema, Gql } from 'gqtx';
import {
	addClientToServerMutation,
	createClientMutation,
	deleteClientMutation,
	regenerateSubscriptionTokenMutation,
	removeClientFromServerMutation,
	updateClientMutation,
} from '@/graphql/client/clientMutations';
import { clientQuery, clientsQuery } from '@/graphql/client/clientQueries';
import { healthQuery } from '@/graphql/health/healthQuery';
import {
	createServerMutation,
	deleteServerMutation,
	syncServerMutation,
	updateServerMutation,
} from '@/graphql/server/serverMutations';
import { serverQuery, serversQuery } from '@/graphql/server/serverQueries';
import {
	createSubscriptionTemplateMutation,
	deleteSubscriptionTemplateMutation,
	updateSubscriptionTemplateMutation,
} from '@/graphql/subscriptionTemplate/subscriptionTemplateMutations';
import {
	subscriptionTemplateQuery,
	subscriptionTemplatesQuery,
} from '@/graphql/subscriptionTemplate/subscriptionTemplateQueries';

const Query = Gql.Query({
	fields: () => [
		healthQuery,
		serversQuery,
		serverQuery,
		clientsQuery,
		clientQuery,
		subscriptionTemplatesQuery,
		subscriptionTemplateQuery,
	],
});

const Mutation = Gql.Mutation({
	fields: () => [
		createServerMutation,
		updateServerMutation,
		deleteServerMutation,
		syncServerMutation,
		createClientMutation,
		updateClientMutation,
		deleteClientMutation,
		addClientToServerMutation,
		removeClientFromServerMutation,
		regenerateSubscriptionTokenMutation,
		createSubscriptionTemplateMutation,
		updateSubscriptionTemplateMutation,
		deleteSubscriptionTemplateMutation,
	],
});

export const schema = buildGraphQLSchema({
	query: Query,
	mutation: Mutation,
});

export type Schema = typeof schema;
export type QueryType = typeof Query;
export type MutationType = typeof Mutation;
