import { Gql } from 'gqtx';
import { requireResource } from '@/graphql/utils';
import { db } from '@/libs/db';
import '@/graphql/types';
import { type ConnectionArgs, ConnectionArgsInput } from '@/graphql/pagination/types';
import { createConnection } from '@/graphql/pagination/utils';
import { clientConnectionType, clientGqlType } from './clientTypes';

export const clientQuery = Gql.Field({
	name: 'client',
	type: clientGqlType,
	args: {
		id: Gql.Arg({ type: Gql.NonNullInput(Gql.ID) }),
	},
	resolve: async (_src, args: { id: string }) => {
		const client = await db.client.findUnique({
			where: { id: args.id },
			include: {
				servers: {
					include: {
						server: {
							include: { inbounds: true },
						},
					},
				},
				subscription: true,
				subscriptionTemplate: true,
			},
		});

		return requireResource(client, 'CLIENT_NOT_FOUND');
	},
});

export const clientsQuery = Gql.Field({
	name: 'clients',
	type: Gql.NonNull(clientConnectionType),
	args: ConnectionArgsInput,
	resolve: async (_src, args: ConnectionArgs) => {
		return createConnection({
			args,
			findMany: (findManyArgs) =>
				db.client.findMany({
					...findManyArgs,
					include: {
						servers: {
							include: {
								server: {
									include: { inbounds: true },
								},
							},
						},
						subscription: true,
						subscriptionTemplate: true,
					},
					orderBy: { createdAt: 'desc' },
				}),
			count: () => db.client.count(),
		});
	},
});
