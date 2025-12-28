import { Gql } from 'gqtx';
import { db } from '@/libs/db';
import '@/graphql/types';
import { type ConnectionArgs, ConnectionArgsInput } from '@/graphql/pagination/types';
import { createConnection } from '@/graphql/pagination/utils';
import { subscriptionTemplateConnectionType, subscriptionTemplateGqlType } from './subscriptionTemplateTypes';

export const subscriptionTemplateQuery = Gql.Field({
	name: 'subscriptionTemplate',
	type: subscriptionTemplateGqlType,
	args: {
		id: Gql.Arg({ type: Gql.NonNullInput(Gql.ID) }),
	},
	resolve: async (_src, args: { id: string }) => {
		return db.subscriptionTemplate.findUnique({
			where: { id: args.id },
		});
	},
});

export const subscriptionTemplatesQuery = Gql.Field({
	name: 'subscriptionTemplates',
	type: Gql.NonNull(subscriptionTemplateConnectionType),
	args: ConnectionArgsInput,
	resolve: async (_src, args: ConnectionArgs) => {
		return createConnection({
			args,
			findMany: (findManyArgs) =>
				db.subscriptionTemplate.findMany({
					...findManyArgs,
					orderBy: { name: 'asc' },
				}),
			count: () => db.subscriptionTemplate.count(),
		});
	},
});
