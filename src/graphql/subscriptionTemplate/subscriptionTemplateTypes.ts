import type { Client, SubscriptionTemplate } from '@prisma/client';
import { Gql } from 'gqtx';
import { createConnectionType, createEdgeType } from '@/graphql/pagination/types';
import { db } from '@/libs/db';

const templateClientGqlType = Gql.Object<Client>({
	name: 'TemplateClient',
	fields: () => [
		Gql.Field({ name: 'id', type: Gql.NonNull(Gql.ID), resolve: (src) => src.id }),
		Gql.Field({ name: 'username', type: Gql.NonNull(Gql.String), resolve: (src) => src.username }),
	],
});

export const subscriptionTemplateGqlType = Gql.Object<SubscriptionTemplate>({
	name: 'SubscriptionTemplate',
	fields: () => [
		Gql.Field({ name: 'id', type: Gql.NonNull(Gql.ID), resolve: (src) => src.id }),
		Gql.Field({ name: 'name', type: Gql.NonNull(Gql.String), resolve: (src) => src.name }),
		Gql.Field({ name: 'profileTitle', type: Gql.String, resolve: (src) => src.profileTitle }),
		Gql.Field({ name: 'updateInterval', type: Gql.NonNull(Gql.Int), resolve: (src) => src.updateInterval }),
		Gql.Field({ name: 'updateAlways', type: Gql.NonNull(Gql.Boolean), resolve: (src) => src.updateAlways }),
		Gql.Field({ name: 'announce', type: Gql.String, resolve: (src) => src.announce }),
		Gql.Field({ name: 'announceUrl', type: Gql.String, resolve: (src) => src.announceUrl }),
		Gql.Field({ name: 'routing', type: Gql.String, resolve: (src) => src.routing }),
		Gql.Field({
			name: 'trafficTotal',
			type: Gql.NonNull(Gql.String),
			resolve: (src) => src.trafficTotal.toString(),
		}),
		Gql.Field({ name: 'createdAt', type: Gql.NonNull(Gql.String), resolve: (src) => src.createdAt.toISOString() }),
		Gql.Field({ name: 'updatedAt', type: Gql.NonNull(Gql.String), resolve: (src) => src.updatedAt.toISOString() }),
		Gql.Field({
			name: 'clients',
			type: Gql.NonNull(Gql.List(Gql.NonNull(templateClientGqlType))),
			resolve: async (src) => {
				return db.client.findMany({
					where: { subscriptionTemplateId: src.id },
				});
			},
		}),
	],
});

export const createSubscriptionTemplateInput = Gql.InputObject({
	name: 'CreateSubscriptionTemplateInput',
	fields: () => ({
		name: Gql.Arg({ type: Gql.NonNullInput(Gql.String) }),
		profileTitle: Gql.Arg({ type: Gql.String }),
		updateInterval: Gql.Arg({ type: Gql.Int }),
		updateAlways: Gql.Arg({ type: Gql.Boolean }),
		announce: Gql.Arg({ type: Gql.String }),
		announceUrl: Gql.Arg({ type: Gql.String }),
		routing: Gql.Arg({ type: Gql.String }),
		trafficTotal: Gql.Arg({ type: Gql.String }),
	}),
});

export const updateSubscriptionTemplateInput = Gql.InputObject({
	name: 'UpdateSubscriptionTemplateInput',
	fields: () => ({
		name: Gql.Arg({ type: Gql.String }),
		profileTitle: Gql.Arg({ type: Gql.String }),
		updateInterval: Gql.Arg({ type: Gql.Int }),
		updateAlways: Gql.Arg({ type: Gql.Boolean }),
		announce: Gql.Arg({ type: Gql.String }),
		announceUrl: Gql.Arg({ type: Gql.String }),
		routing: Gql.Arg({ type: Gql.String }),
		trafficTotal: Gql.Arg({ type: Gql.String }),
	}),
});

export type CreateSubscriptionTemplateInputType = {
	name: string;
	profileTitle?: string | null;
	updateInterval?: number | null;
	updateAlways?: boolean | null;
	announce?: string | null;
	announceUrl?: string | null;
	routing?: string | null;
	trafficTotal?: string | null;
};

export type UpdateSubscriptionTemplateInputType = {
	name?: string | null;
	profileTitle?: string | null;
	updateInterval?: number | null;
	updateAlways?: boolean | null;
	announce?: string | null;
	announceUrl?: string | null;
	routing?: string | null;
	trafficTotal?: string | null;
};

export const subscriptionTemplateEdgeType = createEdgeType('SubscriptionTemplate', subscriptionTemplateGqlType);
export const subscriptionTemplateConnectionType = createConnectionType<SubscriptionTemplate>(
	'SubscriptionTemplate',
	subscriptionTemplateEdgeType,
);
