import { GraphQLError } from 'graphql';
import { AppError, type ErrorCode, NotFoundError } from '@/libs/errors';

export const createGraphQLError = (message: string, code: ErrorCode | string) => {
	return new GraphQLError(message, {
		extensions: { code },
	});
};

export const requireResource = <T>(resource: T | null | undefined, resourceName: string, id?: string): T => {
	if (resource === null || resource === undefined) {
		throw new NotFoundError(resourceName, id);
	}
	return resource;
};

export const handleMutationError = (error: unknown): never => {
	if (error instanceof AppError) {
		throw error.toGraphQLError();
	}
	if (error instanceof GraphQLError) {
		throw error;
	}
	throw createGraphQLError(error instanceof Error ? error.message : 'An unexpected error occurred', 'INTERNAL_ERROR');
};
