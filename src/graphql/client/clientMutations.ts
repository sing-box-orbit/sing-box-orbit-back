import type { Prisma } from '@prisma/client';
import { Gql } from 'gqtx';
import { requireResource } from '@/graphql/utils';
import { db } from '@/libs/db';
import { DuplicateError, NotFoundError } from '@/libs/errors';
import { createChildLogger } from '@/libs/logger';
import { createClientSchema, updateClientSchema, validate } from '@/libs/validation';
import { SuiApiClient } from '@/services/sui';
import '@/graphql/types';

const logger = createChildLogger('client');

import {
	type CreateClientInputType,
	clientGqlType,
	createClientInput,
	type UpdateClientInputType,
	updateClientInput,
} from './clientTypes';

const generateUUID = () => crypto.randomUUID();

const clientInclude = {
	servers: {
		include: {
			server: {
				include: { inbounds: true },
			},
		},
	},
	subscription: true,
	subscriptionTemplate: true,
} satisfies Prisma.ClientInclude;

export const createClientMutation = Gql.Field({
	name: 'createClient',
	type: Gql.NonNull(clientGqlType),
	args: {
		input: Gql.Arg({ type: Gql.NonNullInput(createClientInput) }),
	},
	resolve: async (_src, args: { input: CreateClientInputType }) => {
		validate(createClientSchema, args.input);
		const { username, email, expiresAt, serverIds, subscriptionTemplateId } = args.input;

		const existingClient = await db.client.findUnique({ where: { username } });
		if (existingClient) {
			throw new DuplicateError('Client', 'username', username);
		}

		const servers = await db.server.findMany({
			where: { id: { in: serverIds } },
			include: { inbounds: true },
		});

		if (servers.length !== serverIds.length) {
			throw new NotFoundError('Server');
		}

		const client = await db.client.create({
			data: {
				username,
				email,
				expiresAt: expiresAt ? new Date(expiresAt) : null,
				subscriptionTemplateId: subscriptionTemplateId ?? undefined,
				subscription: {
					create: {},
				},
			},
		});

		for (const server of servers) {
			const suiClient = new SuiApiClient(server.url, server.apiToken);
			const uuid = generateUUID();

			try {
				const inboundIds = server.inbounds.filter((i) => i.enabled).map((i) => i.suiInboundId);

				await suiClient.createClient({
					enable: true,
					name: username,
					inbounds: inboundIds,
					config: {
						vless: { name: username, uuid, flow: 'xtls-rprx-vision' },
					},
					links: [],
					volume: 0,
					expiry: 0,
					up: 0,
					down: 0,
					desc: '',
					group: '',
				});

				const suiData = await suiClient.load();
				const createdSuiClient = suiData.clients.find((c) => c.name === username);
				if (!createdSuiClient) {
					throw new Error(`Client ${username} was created but not found in S-UI`);
				}

				await db.clientServer.create({
					data: {
						clientId: client.id,
						serverId: server.id,
						suiClientId: createdSuiClient.id,
						uuid,
					},
				});
			} catch (error) {
				logger.error({ server: server.name, error }, 'Failed to create client on server');
			}
		}

		return db.client.findUniqueOrThrow({
			where: { id: client.id },
			include: clientInclude,
		});
	},
});

export const updateClientMutation = Gql.Field({
	name: 'updateClient',
	type: Gql.NonNull(clientGqlType),
	args: {
		id: Gql.Arg({ type: Gql.NonNullInput(Gql.ID) }),
		input: Gql.Arg({ type: Gql.NonNullInput(updateClientInput) }),
	},
	resolve: async (_src, args: { id: string; input: UpdateClientInputType }) => {
		validate(updateClientSchema, args.input);
		const foundClient = await db.client.findUnique({
			where: { id: args.id },
			include: { servers: { include: { server: true } } },
		});
		const existingClient = requireResource(foundClient, 'Client', args.id);

		const { username, email, enabled, expiresAt, subscriptionTemplateId } = args.input;

		if (username && username !== existingClient.username) {
			const duplicateClient = await db.client.findUnique({ where: { username } });
			if (duplicateClient) {
				throw new DuplicateError('Client', 'username', username);
			}
		}

		const updateData: Prisma.ClientUpdateInput = {};
		if (username !== undefined && username !== null) updateData.username = username;
		if (email !== undefined) updateData.email = email;
		if (enabled !== undefined && enabled !== null) updateData.enabled = enabled;
		if (expiresAt !== undefined) updateData.expiresAt = expiresAt ? new Date(expiresAt) : null;
		if (subscriptionTemplateId !== undefined) {
			updateData.subscriptionTemplate = subscriptionTemplateId
				? { connect: { id: subscriptionTemplateId } }
				: { disconnect: true };
		}

		await db.client.update({
			where: { id: args.id },
			data: updateData,
		});

		for (const clientServer of existingClient.servers) {
			try {
				const suiClient = new SuiApiClient(clientServer.server.url, clientServer.server.apiToken);

				await suiClient.updateClient({
					id: clientServer.suiClientId,
					name: username ?? existingClient.username,
					enable: enabled ?? existingClient.enabled,
					inbounds: [],
					config: {},
				});
			} catch (error) {
				logger.error({ server: clientServer.server.name, error }, 'Failed to update client on server');
			}
		}

		return db.client.findUniqueOrThrow({
			where: { id: args.id },
			include: clientInclude,
		});
	},
});

export const deleteClientMutation = Gql.Field({
	name: 'deleteClient',
	type: Gql.NonNull(Gql.Boolean),
	args: {
		id: Gql.Arg({ type: Gql.NonNullInput(Gql.ID) }),
	},
	resolve: async (_src, args: { id: string }) => {
		const foundClient = await db.client.findUnique({
			where: { id: args.id },
			include: { servers: { include: { server: true } } },
		});
		const client = requireResource(foundClient, 'Client', args.id);

		for (const clientServer of client.servers) {
			try {
				const suiClient = new SuiApiClient(clientServer.server.url, clientServer.server.apiToken);

				await suiClient.deleteClient(clientServer.suiClientId);
			} catch (error) {
				logger.error({ server: clientServer.server.name, error }, 'Failed to delete client from server');
			}
		}

		await db.client.delete({ where: { id: args.id } });

		return true;
	},
});

export const addClientToServerMutation = Gql.Field({
	name: 'addClientToServer',
	type: Gql.NonNull(clientGqlType),
	args: {
		clientId: Gql.Arg({ type: Gql.NonNullInput(Gql.ID) }),
		serverId: Gql.Arg({ type: Gql.NonNullInput(Gql.ID) }),
	},
	resolve: async (_src, args: { clientId: string; serverId: string }) => {
		const foundClient = await db.client.findUnique({ where: { id: args.clientId } });
		const client = requireResource(foundClient, 'Client', args.clientId);

		const foundServer = await db.server.findUnique({
			where: { id: args.serverId },
			include: { inbounds: true },
		});
		const server = requireResource(foundServer, 'Server', args.serverId);

		const existingAssignment = await db.clientServer.findUnique({
			where: {
				clientId_serverId: {
					clientId: args.clientId,
					serverId: args.serverId,
				},
			},
		});

		if (existingAssignment) {
			throw new DuplicateError('ClientServer', 'assignment', `${args.clientId}:${args.serverId}`);
		}

		const suiClient = new SuiApiClient(server.url, server.apiToken);
		const uuid = generateUUID();

		const inboundIds = server.inbounds.filter((i) => i.enabled).map((i) => i.suiInboundId);

		await suiClient.createClient({
			enable: client.enabled,
			name: client.username,
			inbounds: inboundIds,
			config: {
				vless: { name: client.username, uuid, flow: 'xtls-rprx-vision' },
			},
			links: [],
			volume: 0,
			expiry: 0,
			up: 0,
			down: 0,
			desc: '',
			group: '',
		});

		const suiData = await suiClient.load();
		const createdSuiClient = suiData.clients.find((c) => c.name === client.username);
		if (!createdSuiClient) {
			throw new NotFoundError('S-UI Client', client.username);
		}

		await db.clientServer.create({
			data: {
				clientId: args.clientId,
				serverId: args.serverId,
				suiClientId: createdSuiClient.id,
				uuid,
			},
		});

		return db.client.findUniqueOrThrow({
			where: { id: args.clientId },
			include: clientInclude,
		});
	},
});

export const removeClientFromServerMutation = Gql.Field({
	name: 'removeClientFromServer',
	type: Gql.NonNull(clientGqlType),
	args: {
		clientId: Gql.Arg({ type: Gql.NonNullInput(Gql.ID) }),
		serverId: Gql.Arg({ type: Gql.NonNullInput(Gql.ID) }),
	},
	resolve: async (_src, args: { clientId: string; serverId: string }) => {
		const clientServer = await db.clientServer.findUnique({
			where: {
				clientId_serverId: {
					clientId: args.clientId,
					serverId: args.serverId,
				},
			},
			include: { server: true },
		});

		if (!clientServer) {
			throw new NotFoundError('ClientServer assignment', `${args.clientId}:${args.serverId}`);
		}

		try {
			const suiClient = new SuiApiClient(clientServer.server.url, clientServer.server.apiToken);
			await suiClient.deleteClient(clientServer.suiClientId);
		} catch (error) {
			logger.error({ server: clientServer.server.name, error }, 'Failed to delete client from server');
		}

		await db.clientServer.delete({
			where: {
				clientId_serverId: {
					clientId: args.clientId,
					serverId: args.serverId,
				},
			},
		});

		return db.client.findUniqueOrThrow({
			where: { id: args.clientId },
			include: clientInclude,
		});
	},
});

export const regenerateSubscriptionTokenMutation = Gql.Field({
	name: 'regenerateSubscriptionToken',
	type: Gql.NonNull(clientGqlType),
	args: {
		clientId: Gql.Arg({ type: Gql.NonNullInput(Gql.ID) }),
	},
	resolve: async (_src, args: { clientId: string }) => {
		const foundClient = await db.client.findUnique({
			where: { id: args.clientId },
			include: { subscription: true },
		});
		const client = requireResource(foundClient, 'Client', args.clientId);

		if (client.subscription) {
			await db.subscription.update({
				where: { id: client.subscription.id },
				data: { token: crypto.randomUUID() },
			});
		} else {
			await db.subscription.create({
				data: {
					clientId: args.clientId,
				},
			});
		}

		return db.client.findUniqueOrThrow({
			where: { id: args.clientId },
			include: clientInclude,
		});
	},
});
