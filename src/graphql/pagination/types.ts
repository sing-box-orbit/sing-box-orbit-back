import type { ObjectType } from 'gqtx';
import { Gql } from 'gqtx';

export type PageInfo = {
	hasNextPage: boolean;
	hasPreviousPage: boolean;
	startCursor: string | null;
	endCursor: string | null;
};

export const pageInfoType = Gql.Object<PageInfo>({
	name: 'PageInfo',
	description: 'Information about pagination in a connection',
	fields: () => [
		Gql.Field({
			name: 'hasNextPage',
			type: Gql.NonNull(Gql.Boolean),
			description: 'When paginating forwards, are there more items?',
			resolve: (src) => src.hasNextPage,
		}),
		Gql.Field({
			name: 'hasPreviousPage',
			type: Gql.NonNull(Gql.Boolean),
			description: 'When paginating backwards, are there more items?',
			resolve: (src) => src.hasPreviousPage,
		}),
		Gql.Field({
			name: 'startCursor',
			type: Gql.String,
			description: 'When paginating backwards, the cursor to continue',
			resolve: (src) => src.startCursor,
		}),
		Gql.Field({
			name: 'endCursor',
			type: Gql.String,
			description: 'When paginating forwards, the cursor to continue',
			resolve: (src) => src.endCursor,
		}),
	],
});

export function createEdgeType<TSource>(name: string, nodeType: ObjectType<TSource>) {
	return Gql.Object<{ node: TSource; cursor: string }>({
		name: `${name}Edge`,
		description: `An edge in a ${name} connection`,
		fields: () => [
			Gql.Field({
				name: 'node',
				type: Gql.NonNull(nodeType),
				description: 'The item at the end of the edge',
				resolve: (src) => src.node,
			}),
			Gql.Field({
				name: 'cursor',
				type: Gql.NonNull(Gql.String),
				description: 'A cursor for use in pagination',
				resolve: (src) => src.cursor,
			}),
		],
	});
}

export function createConnectionType<TSource>(name: string, edgeType: ObjectType<{ node: TSource; cursor: string }>) {
	return Gql.Object<{
		edges: Array<{ node: TSource; cursor: string }>;
		pageInfo: PageInfo;
		totalCount: number;
	}>({
		name: `${name}Connection`,
		description: `The connection type for ${name}`,
		fields: () => [
			Gql.Field({
				name: 'edges',
				type: Gql.NonNull(Gql.List(Gql.NonNull(edgeType))),
				description: 'A list of edges',
				resolve: (src) => src.edges,
			}),
			Gql.Field({
				name: 'pageInfo',
				type: Gql.NonNull(pageInfoType),
				description: 'Information to aid in pagination',
				resolve: (src) => src.pageInfo,
			}),
			Gql.Field({
				name: 'totalCount',
				type: Gql.NonNull(Gql.Int),
				description: 'Identifies the total count of items in the connection',
				resolve: (src) => src.totalCount,
			}),
		],
	});
}

export type ConnectionArgs = {
	first?: number | null;
	after?: string | null;
	last?: number | null;
	before?: string | null;
};

export const ConnectionArgsInput = {
	first: Gql.Arg({ type: Gql.Int, description: 'Returns the first n items from the list' }),
	after: Gql.Arg({ type: Gql.String, description: 'Returns items after the given cursor' }),
	last: Gql.Arg({ type: Gql.Int, description: 'Returns the last n items from the list' }),
	before: Gql.Arg({ type: Gql.String, description: 'Returns items before the given cursor' }),
};
