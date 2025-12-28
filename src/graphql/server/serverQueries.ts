import { Gql } from 'gqtx';
import { requireResource } from '@/graphql/utils';
import { db } from '@/libs/db';
import '@/graphql/types';
import { type ConnectionArgs, ConnectionArgsInput } from '@/graphql/pagination/types';
import { createConnection } from '@/graphql/pagination/utils';
import { serverConnectionType, serverGqlType } from './serverTypes';

export const serverQuery = Gql.Field({
	name: 'server',
	type: serverGqlType,
	args: {
		id: Gql.Arg({ type: Gql.NonNullInput(Gql.ID) }),
	},
	resolve: async (_src, args: { id: string }) => {
		const server = await db.server.findUnique({
			where: { id: args.id },
			include: { inbounds: true },
		});

		return requireResource(server, 'SERVER_NOT_FOUND');
	},
});

export const serversQuery = Gql.Field({
	name: 'servers',
	type: Gql.NonNull(serverConnectionType),
	args: ConnectionArgsInput,
	resolve: async (_src, args: ConnectionArgs) => {
		return createConnection({
			args,
			findMany: (findManyArgs) =>
				db.server.findMany({
					...findManyArgs,
					include: { inbounds: true },
					orderBy: { createdAt: 'desc' },
				}),
			count: () => db.server.count(),
		});
	},
});
