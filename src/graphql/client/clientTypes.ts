import type { Client, ClientServer, Subscription, SubscriptionTemplate } from '@prisma/client';
import { Gql } from 'gqtx';
import { createConnectionType, createEdgeType } from '@/graphql/pagination/types';
import { type ServerWithInbounds, serverGqlType } from '@/graphql/server/serverTypes';
import { subscriptionTemplateGqlType } from '@/graphql/subscriptionTemplate/subscriptionTemplateTypes';
import { appConfig } from '@/libs/appConfig';
import { subscriptionPath } from '@/subscription';

export type ClientServerWithServer = ClientServer & { server: ServerWithInbounds };

export const clientServerGqlType = Gql.Object<ClientServerWithServer>({
	name: 'ClientServer',
	fields: () => [
		Gql.Field({ name: 'id', type: Gql.NonNull(Gql.ID), resolve: (src) => src.id }),
		Gql.Field({ name: 'suiClientId', type: Gql.NonNull(Gql.Int), resolve: (src) => src.suiClientId }),
		Gql.Field({ name: 'uuid', type: Gql.NonNull(Gql.String), resolve: (src) => src.uuid }),
		Gql.Field({ name: 'createdAt', type: Gql.NonNull(Gql.String), resolve: (src) => src.createdAt.toISOString() }),
		Gql.Field({ name: 'server', type: Gql.NonNull(serverGqlType), resolve: (src) => src.server }),
	],
});

export const subscriptionGqlType = Gql.Object<Subscription>({
	name: 'ClientSubscription',
	fields: () => [
		Gql.Field({ name: 'id', type: Gql.NonNull(Gql.ID), resolve: (src) => src.id }),
		Gql.Field({ name: 'token', type: Gql.NonNull(Gql.String), resolve: (src) => src.token }),
		Gql.Field({
			name: 'url',
			type: Gql.NonNull(Gql.String),
			resolve: (src) => `${appConfig.APP_URL}${subscriptionPath}/${src.token}`,
		}),
		Gql.Field({ name: 'createdAt', type: Gql.NonNull(Gql.String), resolve: (src) => src.createdAt.toISOString() }),
	],
});

export type ClientWithRelations = Client & {
	servers?: ClientServerWithServer[];
	subscription?: Subscription | null;
	subscriptionTemplate?: SubscriptionTemplate | null;
};

export const clientGqlType = Gql.Object<ClientWithRelations>({
	name: 'Client',
	fields: () => [
		Gql.Field({ name: 'id', type: Gql.NonNull(Gql.ID), resolve: (src) => src.id }),
		Gql.Field({ name: 'username', type: Gql.NonNull(Gql.String), resolve: (src) => src.username }),
		Gql.Field({ name: 'email', type: Gql.String, resolve: (src) => src.email }),
		Gql.Field({ name: 'enabled', type: Gql.NonNull(Gql.Boolean), resolve: (src) => src.enabled }),
		Gql.Field({ name: 'expiresAt', type: Gql.String, resolve: (src) => src.expiresAt?.toISOString() ?? null }),
		Gql.Field({ name: 'createdAt', type: Gql.NonNull(Gql.String), resolve: (src) => src.createdAt.toISOString() }),
		Gql.Field({
			name: 'servers',
			type: Gql.NonNull(Gql.List(Gql.NonNull(clientServerGqlType))),
			resolve: (src) => src.servers ?? [],
		}),
		Gql.Field({
			name: 'subscription',
			type: subscriptionGqlType,
			resolve: (src) => src.subscription ?? null,
		}),
		Gql.Field({
			name: 'subscriptionTemplate',
			type: subscriptionTemplateGqlType,
			resolve: (src) => src.subscriptionTemplate ?? null,
		}),
	],
});

export const createClientInput = Gql.InputObject({
	name: 'CreateClientInput',
	fields: () => ({
		username: Gql.Arg({ type: Gql.NonNullInput(Gql.String) }),
		email: Gql.Arg({ type: Gql.String }),
		expiresAt: Gql.Arg({ type: Gql.String }),
		serverIds: Gql.Arg({ type: Gql.NonNullInput(Gql.ListInput(Gql.NonNullInput(Gql.ID))) }),
		subscriptionTemplateId: Gql.Arg({ type: Gql.ID }),
	}),
});

export const updateClientInput = Gql.InputObject({
	name: 'UpdateClientInput',
	fields: () => ({
		username: Gql.Arg({ type: Gql.String }),
		email: Gql.Arg({ type: Gql.String }),
		enabled: Gql.Arg({ type: Gql.Boolean }),
		expiresAt: Gql.Arg({ type: Gql.String }),
		subscriptionTemplateId: Gql.Arg({ type: Gql.ID }),
	}),
});

export type CreateClientInputType = {
	username: string;
	email?: string | null;
	expiresAt?: string | null;
	serverIds: string[];
	subscriptionTemplateId?: string | null;
};

export type UpdateClientInputType = {
	username?: string | null;
	email?: string | null;
	enabled?: boolean | null;
	expiresAt?: string | null;
	subscriptionTemplateId?: string | null;
};

export const clientEdgeType = createEdgeType('Client', clientGqlType);
export const clientConnectionType = createConnectionType<ClientWithRelations>('Client', clientEdgeType);
