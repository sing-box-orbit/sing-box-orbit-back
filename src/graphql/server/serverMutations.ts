import type { InboundType, Prisma } from '@prisma/client';
import { Gql } from 'gqtx';
import { requireResource } from '@/graphql/utils';
import { db } from '@/libs/db';
import { AppError, ConnectionError } from '@/libs/errors';
import { createChildLogger } from '@/libs/logger';
import { createServerSchema, updateServerSchema, validate } from '@/libs/validation';
import { SuiApiClient } from '@/services/sui';
import type { SuiInbound, SuiTls } from '@/services/sui/types';
import '@/graphql/types';

const logger = createChildLogger('server');

import {
	type CreateServerInputType,
	createServerInput,
	serverGqlType,
	type UpdateServerInputType,
	updateServerInput,
} from './serverTypes';

const buildInboundSettings = (inbound: SuiInbound, tlsMap: Map<number, SuiTls>): Prisma.InputJsonValue | undefined => {
	if (!inbound.tls_id) return undefined;

	const tls = tlsMap.get(inbound.tls_id);
	if (!tls) return undefined;

	const settings: Record<string, string | boolean> = {};

	if (tls.server.enabled) {
		settings.tls = true;
		if (tls.server.server_name) {
			settings.server_name = tls.server.server_name;
		}
	}

	if (tls.server.reality?.enabled) {
		settings.reality = true;
		settings.flow = 'xtls-rprx-vision';

		if (tls.client?.reality?.public_key) {
			settings.publicKey = tls.client.reality.public_key;
		}

		if (tls.server.reality.short_id?.[0]) {
			settings.shortId = tls.server.reality.short_id[0];
		}

		if (tls.server.reality.handshake?.server) {
			settings.server_name = tls.server.reality.handshake.server;
		}
	}

	return Object.keys(settings).length > 0 ? settings : undefined;
};

export const createServerMutation = Gql.Field({
	name: 'createServer',
	type: Gql.NonNull(serverGqlType),
	args: {
		input: Gql.Arg({ type: Gql.NonNullInput(createServerInput) }),
	},
	resolve: async (_src, args: { input: CreateServerInputType }) => {
		validate(createServerSchema, args.input);
		const { name, url, apiToken, location } = args.input;

		const client = new SuiApiClient(url, apiToken);
		const isConnected = await client.testConnection();

		if (!isConnected) {
			throw new ConnectionError('S-UI', url);
		}

		const server = await db.server.create({
			data: {
				name,
				url,
				apiToken,
				location,
				status: 'ONLINE',
			},
			include: { inbounds: true },
		});

		try {
			const suiData = await client.load();
			const inboundTypes = ['VLESS', 'VMESS', 'TROJAN', 'SHADOWSOCKS', 'HYSTERIA2', 'TUIC', 'NAIVE', 'SHADOWTLS'];

			const tlsMap = new Map<number, SuiTls>();
			for (const tls of suiData.tls) {
				tlsMap.set(tls.id, tls);
			}

			for (const inbound of suiData.inbounds) {
				const type = inbound.type.toUpperCase();
				if (inboundTypes.includes(type)) {
					const settings = buildInboundSettings(inbound, tlsMap);
					await db.inbound.create({
						data: {
							serverId: server.id,
							suiInboundId: inbound.id,
							tag: inbound.tag,
							type: type as InboundType,
							port: inbound.listen_port,
							enabled: true,
							settings,
						},
					});
				}
			}

			await db.server.update({
				where: { id: server.id },
				data: { lastSyncAt: new Date() },
			});
		} catch (error) {
			logger.error({ serverId: server.id, error }, 'Failed to sync inbounds on server creation');
			await db.server.update({
				where: { id: server.id },
				data: { status: 'ERROR' },
			});
		}

		return db.server.findUniqueOrThrow({
			where: { id: server.id },
			include: { inbounds: true },
		});
	},
});

export const updateServerMutation = Gql.Field({
	name: 'updateServer',
	type: Gql.NonNull(serverGqlType),
	args: {
		id: Gql.Arg({ type: Gql.NonNullInput(Gql.ID) }),
		input: Gql.Arg({ type: Gql.NonNullInput(updateServerInput) }),
	},
	resolve: async (_src, args: { id: string; input: UpdateServerInputType }) => {
		validate(updateServerSchema, args.input);
		const existingServer = await db.server.findUnique({ where: { id: args.id } });
		const validServer = requireResource(existingServer, 'Server', args.id);

		const { name, url, apiToken, location } = args.input;

		if (url || apiToken) {
			const client = new SuiApiClient(url ?? validServer.url, apiToken ?? validServer.apiToken);
			const isConnected = await client.testConnection();

			if (!isConnected) {
				throw new ConnectionError('S-UI', url ?? validServer.url);
			}
		}

		const updateData: Prisma.ServerUpdateInput = {};
		if (name !== undefined && name !== null) updateData.name = name;
		if (url !== undefined && url !== null) updateData.url = url;
		if (apiToken !== undefined && apiToken !== null) updateData.apiToken = apiToken;
		if (location !== undefined) updateData.location = location;

		const server = await db.server.update({
			where: { id: args.id },
			data: updateData,
			include: { inbounds: true },
		});

		return server;
	},
});

export const deleteServerMutation = Gql.Field({
	name: 'deleteServer',
	type: Gql.NonNull(Gql.Boolean),
	args: {
		id: Gql.Arg({ type: Gql.NonNullInput(Gql.ID) }),
	},
	resolve: async (_src, args: { id: string }) => {
		const server = await db.server.findUnique({ where: { id: args.id } });
		requireResource(server, 'Server', args.id);

		await db.server.delete({ where: { id: args.id } });

		return true;
	},
});

export const syncServerMutation = Gql.Field({
	name: 'syncServer',
	type: Gql.NonNull(serverGqlType),
	args: {
		id: Gql.Arg({ type: Gql.NonNullInput(Gql.ID) }),
	},
	resolve: async (_src, args: { id: string }) => {
		const existingServer = await db.server.findUnique({ where: { id: args.id } });
		const server = requireResource(existingServer, 'Server', args.id);

		await db.server.update({
			where: { id: args.id },
			data: { status: 'SYNCING' },
		});

		try {
			const client = new SuiApiClient(server.url, server.apiToken);
			const suiData = await client.load();

			const inboundTypes = ['VLESS', 'VMESS', 'TROJAN', 'SHADOWSOCKS', 'HYSTERIA2', 'TUIC', 'NAIVE', 'SHADOWTLS'];

			const tlsMap = new Map<number, SuiTls>();
			for (const tls of suiData.tls) {
				tlsMap.set(tls.id, tls);
			}

			for (const inbound of suiData.inbounds) {
				const type = inbound.type.toUpperCase();
				if (inboundTypes.includes(type)) {
					const settings = buildInboundSettings(inbound, tlsMap);
					await db.inbound.upsert({
						where: {
							serverId_suiInboundId: {
								serverId: server.id,
								suiInboundId: inbound.id,
							},
						},
						create: {
							serverId: server.id,
							suiInboundId: inbound.id,
							tag: inbound.tag,
							type: type as InboundType,
							port: inbound.listen_port,
							enabled: true,
							settings,
						},
						update: {
							tag: inbound.tag,
							type: type as InboundType,
							port: inbound.listen_port,
							settings,
						},
					});
				}
			}

			const suiInboundIds = suiData.inbounds.map((i) => i.id);
			await db.inbound.deleteMany({
				where: {
					serverId: server.id,
					suiInboundId: { notIn: suiInboundIds },
				},
			});

			await db.server.update({
				where: { id: args.id },
				data: {
					status: 'ONLINE',
					lastSyncAt: new Date(),
				},
			});
		} catch (error) {
			logger.error({ serverId: args.id, error }, 'Failed to sync server');
			await db.server.update({
				where: { id: args.id },
				data: { status: 'ERROR' },
			});
			if (error instanceof AppError) {
				throw error.toGraphQLError();
			}
			throw new ConnectionError('S-UI', server.url).toGraphQLError();
		}

		return db.server.findUniqueOrThrow({
			where: { id: args.id },
			include: { inbounds: true },
		});
	},
});
