import { Gql } from 'gqtx'

type Health = {
	status: string
	timestamp: string
}

const HealthType = Gql.Object<Health>({
	name: 'Health',
	fields: () => [
		Gql.Field({ name: 'status', type: Gql.NonNull(Gql.String), resolve: (src) => src.status }),
		Gql.Field({ name: 'timestamp', type: Gql.NonNull(Gql.String), resolve: (src) => src.timestamp }),
	],
})

export const healthQuery = Gql.Field({
	name: 'health',
	type: Gql.NonNull(HealthType),
	resolve: () => ({
		status: 'ok',
		timestamp: new Date().toISOString(),
	}),
})
