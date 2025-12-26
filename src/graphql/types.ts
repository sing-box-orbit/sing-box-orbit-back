import type { auth } from '@/libs/auth/auth'

type AuthSession = typeof auth.$Infer.Session

export type GraphQLContext = {
	user: AuthSession['user'] | null
	session: AuthSession['session'] | null
}
