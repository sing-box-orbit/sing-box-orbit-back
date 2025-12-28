import type { Inbound, InboundType, Server, ServerStatus } from '@prisma/client';
import { Gql } from 'gqtx';
import { createConnectionType, createEdgeType } from '@/graphql/pagination/types';

export const serverStatusEnum = Gql.Enum<ServerStatus>({
	name: 'ServerStatus',
	values: [
		{ name: 'ONLINE', value: 'ONLINE' as ServerStatus },
		{ name: 'OFFLINE', value: 'OFFLINE' as ServerStatus },
		{ name: 'SYNCING', value: 'SYNCING' as ServerStatus },
		{ name: 'ERROR', value: 'ERROR' as ServerStatus },
	],
});

export const inboundTypeEnum = Gql.Enum<InboundType>({
	name: 'InboundType',
	values: [
		{ name: 'VLESS', value: 'VLESS' as InboundType },
		{ name: 'VMESS', value: 'VMESS' as InboundType },
		{ name: 'TROJAN', value: 'TROJAN' as InboundType },
		{ name: 'SHADOWSOCKS', value: 'SHADOWSOCKS' as InboundType },
		{ name: 'HYSTERIA2', value: 'HYSTERIA2' as InboundType },
		{ name: 'TUIC', value: 'TUIC' as InboundType },
		{ name: 'NAIVE', value: 'NAIVE' as InboundType },
		{ name: 'SHADOWTLS', value: 'SHADOWTLS' as InboundType },
	],
});

export const inboundGqlType = Gql.Object<Inbound>({
	name: 'Inbound',
	fields: () => [
		Gql.Field({ name: 'id', type: Gql.NonNull(Gql.ID), resolve: (src) => src.id }),
		Gql.Field({ name: 'suiInboundId', type: Gql.NonNull(Gql.Int), resolve: (src) => src.suiInboundId }),
		Gql.Field({ name: 'tag', type: Gql.NonNull(Gql.String), resolve: (src) => src.tag }),
		Gql.Field({ name: 'type', type: Gql.NonNull(inboundTypeEnum), resolve: (src) => src.type }),
		Gql.Field({ name: 'port', type: Gql.NonNull(Gql.Int), resolve: (src) => src.port }),
		Gql.Field({ name: 'enabled', type: Gql.NonNull(Gql.Boolean), resolve: (src) => src.enabled }),
		Gql.Field({ name: 'createdAt', type: Gql.NonNull(Gql.String), resolve: (src) => src.createdAt.toISOString() }),
	],
});

export type ServerWithInbounds = Server & { inbounds?: Inbound[] };

export const serverGqlType = Gql.Object<ServerWithInbounds>({
	name: 'Server',
	fields: () => [
		Gql.Field({ name: 'id', type: Gql.NonNull(Gql.ID), resolve: (src) => src.id }),
		Gql.Field({ name: 'name', type: Gql.NonNull(Gql.String), resolve: (src) => src.name }),
		Gql.Field({ name: 'url', type: Gql.NonNull(Gql.String), resolve: (src) => src.url }),
		Gql.Field({ name: 'status', type: Gql.NonNull(serverStatusEnum), resolve: (src) => src.status }),
		Gql.Field({ name: 'location', type: Gql.String, resolve: (src) => src.location }),
		Gql.Field({ name: 'lastSyncAt', type: Gql.String, resolve: (src) => src.lastSyncAt?.toISOString() ?? null }),
		Gql.Field({ name: 'createdAt', type: Gql.NonNull(Gql.String), resolve: (src) => src.createdAt.toISOString() }),
		Gql.Field({
			name: 'inbounds',
			type: Gql.NonNull(Gql.List(Gql.NonNull(inboundGqlType))),
			resolve: (src) => src.inbounds ?? [],
		}),
	],
});

export const createServerInput = Gql.InputObject({
	name: 'CreateServerInput',
	fields: () => ({
		name: Gql.Arg({ type: Gql.NonNullInput(Gql.String) }),
		url: Gql.Arg({ type: Gql.NonNullInput(Gql.String) }),
		apiToken: Gql.Arg({ type: Gql.NonNullInput(Gql.String) }),
		location: Gql.Arg({ type: Gql.String }),
	}),
});

export const updateServerInput = Gql.InputObject({
	name: 'UpdateServerInput',
	fields: () => ({
		name: Gql.Arg({ type: Gql.String }),
		url: Gql.Arg({ type: Gql.String }),
		apiToken: Gql.Arg({ type: Gql.String }),
		location: Gql.Arg({ type: Gql.String }),
	}),
});

export type CreateServerInputType = {
	name: string;
	url: string;
	apiToken: string;
	location?: string | null;
};

export type UpdateServerInputType = {
	name?: string | null;
	url?: string | null;
	apiToken?: string | null;
	location?: string | null;
};

export const serverEdgeType = createEdgeType('Server', serverGqlType);
export const serverConnectionType = createConnectionType<ServerWithInbounds>('Server', serverEdgeType);
