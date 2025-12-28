import type { auth } from '@/libs/auth/auth';

type AuthSession = typeof auth.$Infer.Session;

export type GraphQLContext = {
	user: AuthSession['user'] | null;
	session: AuthSession['session'] | null;
};

declare module 'gqtx' {
	interface GqlContext extends GraphQLContext {}
}
