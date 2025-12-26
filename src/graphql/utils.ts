import { GraphQLError } from 'graphql'
import type { GraphQLContext } from '@/graphql/types'

export const createGraphQLError = (message: string, code: string) => {
	return new GraphQLError(message, {
		extensions: { code },
	})
}

export const requireAuth = (ctx: GraphQLContext): NonNullable<GraphQLContext['user']> => {
	if (!ctx.user) {
		throw createGraphQLError('Unauthorized', 'UNAUTHORIZED')
	}
	return ctx.user
}

export const requireResource = <T>(resource: T | null | undefined, code: string): T => {
	if (resource === null || resource === undefined) {
		throw createGraphQLError('Resource not found', code)
	}
	return resource
}
