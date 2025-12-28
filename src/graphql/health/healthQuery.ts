import { Gql } from 'gqtx';
import { db } from '@/libs/db';

type ServiceHealth = {
	name: string;
	status: 'healthy' | 'unhealthy';
	latency?: number;
	error?: string;
};

type Health = {
	status: 'healthy' | 'degraded' | 'unhealthy';
	timestamp: string;
	uptime: number;
	version: string;
	services: ServiceHealth[];
};

const startTime = Date.now();

const serviceHealthType = Gql.Object<ServiceHealth>({
	name: 'ServiceHealth',
	fields: () => [
		Gql.Field({ name: 'name', type: Gql.NonNull(Gql.String), resolve: (src) => src.name }),
		Gql.Field({ name: 'status', type: Gql.NonNull(Gql.String), resolve: (src) => src.status }),
		Gql.Field({ name: 'latency', type: Gql.Int, resolve: (src) => src.latency ?? null }),
		Gql.Field({ name: 'error', type: Gql.String, resolve: (src) => src.error ?? null }),
	],
});

const healthType = Gql.Object<Health>({
	name: 'Health',
	fields: () => [
		Gql.Field({ name: 'status', type: Gql.NonNull(Gql.String), resolve: (src) => src.status }),
		Gql.Field({ name: 'timestamp', type: Gql.NonNull(Gql.String), resolve: (src) => src.timestamp }),
		Gql.Field({ name: 'uptime', type: Gql.NonNull(Gql.Int), resolve: (src) => src.uptime }),
		Gql.Field({ name: 'version', type: Gql.NonNull(Gql.String), resolve: (src) => src.version }),
		Gql.Field({
			name: 'services',
			type: Gql.NonNull(Gql.List(Gql.NonNull(serviceHealthType))),
			resolve: (src) => src.services,
		}),
	],
});

async function checkDatabase(): Promise<ServiceHealth> {
	const start = Date.now();
	try {
		await db.$queryRaw`SELECT 1`;
		return { name: 'database', status: 'healthy', latency: Date.now() - start };
	} catch (error) {
		return {
			name: 'database',
			status: 'unhealthy',
			latency: Date.now() - start,
			error: error instanceof Error ? error.message : 'Unknown error',
		};
	}
}

export const healthQuery = Gql.Field({
	name: 'health',
	type: Gql.NonNull(healthType),
	resolve: async (): Promise<Health> => {
		const services = await Promise.all([checkDatabase()]);

		const unhealthyCount = services.filter((s) => s.status === 'unhealthy').length;
		const status: Health['status'] =
			unhealthyCount === 0 ? 'healthy' : unhealthyCount === services.length ? 'unhealthy' : 'degraded';

		return {
			status,
			timestamp: new Date().toISOString(),
			uptime: Math.floor((Date.now() - startTime) / 1000),
			version: process.env.npm_package_version || '1.0.0',
			services,
		};
	},
});
