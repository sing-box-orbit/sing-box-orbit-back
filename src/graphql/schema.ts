import { buildGraphQLSchema, Gql } from 'gqtx'
import { healthQuery } from '@/graphql/health/healthQuery'

const Query = Gql.Query({
	fields: () => [healthQuery],
})

export const schema = buildGraphQLSchema({
	query: Query,
})

export type Schema = typeof schema
export type QueryType = typeof Query
