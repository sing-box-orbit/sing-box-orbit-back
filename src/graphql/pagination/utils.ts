import { findManyCursorConnection } from '@devoxa/prisma-relay-cursor-connection';
import type { ConnectionArgs, PageInfo } from './types';

const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 1000;

export function validateConnectionArgs(args: ConnectionArgs): {
	isValid: boolean;
	error?: string;
} {
	const { first, last, after, before } = args;

	if (first !== null && first !== undefined && first < 0) {
		return { isValid: false, error: 'Argument "first" must be a non-negative integer' };
	}

	if (last !== null && last !== undefined && last < 0) {
		return { isValid: false, error: 'Argument "last" must be a non-negative integer' };
	}

	if (first !== null && first !== undefined && first > MAX_PAGE_SIZE) {
		return { isValid: false, error: `Argument "first" must not exceed ${MAX_PAGE_SIZE}` };
	}

	if (last !== null && last !== undefined && last > MAX_PAGE_SIZE) {
		return { isValid: false, error: `Argument "last" must not exceed ${MAX_PAGE_SIZE}` };
	}

	if (first !== null && first !== undefined && last !== null && last !== undefined) {
		return {
			isValid: false,
			error: 'Passing both "first" and "last" to paginate is not supported',
		};
	}

	if (after !== null && after !== undefined && before !== null && before !== undefined) {
		return {
			isValid: false,
			error: 'Passing both "after" and "before" to paginate is not supported',
		};
	}

	return { isValid: true };
}

export function getConnectionArgs(args: ConnectionArgs): {
	first?: number;
	after?: string;
	last?: number;
	before?: string;
} {
	const { first, after, last, before } = args;

	return {
		first: first ?? (last ? undefined : DEFAULT_PAGE_SIZE),
		after: after ?? undefined,
		last: last ?? undefined,
		before: before ?? undefined,
	};
}

export type PrismaFindManyArgs = {
	take?: number;
	skip?: number;
	cursor?: { id: string };
};

export async function createConnection<T extends { id: string }>(options: {
	args: ConnectionArgs;
	findMany: (args: PrismaFindManyArgs) => Promise<T[]>;
	count: () => Promise<number>;
}): Promise<{
	edges: Array<{ node: T; cursor: string }>;
	pageInfo: PageInfo;
	totalCount: number;
}> {
	const validation = validateConnectionArgs(options.args);
	if (!validation.isValid) {
		throw new Error(validation.error);
	}

	const connectionArgs = getConnectionArgs(options.args);
	const totalCount = await options.count();

	const result = await findManyCursorConnection(
		(args) => options.findMany(args),
		() => options.count(),
		connectionArgs,
		{
			getCursor: (record: T) => ({ id: record.id }),
		},
	);

	return {
		edges: result.edges,
		pageInfo: {
			hasNextPage: result.pageInfo.hasNextPage,
			hasPreviousPage: result.pageInfo.hasPreviousPage,
			startCursor: result.pageInfo.startCursor ?? null,
			endCursor: result.pageInfo.endCursor ?? null,
		},
		totalCount,
	};
}
