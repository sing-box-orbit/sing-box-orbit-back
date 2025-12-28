import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { admin, bearer, jwt, username } from 'better-auth/plugins';
import { appConfig } from '@/libs/appConfig';
import { db } from '@/libs/db';

export const auth = betterAuth({
	database: prismaAdapter(db, {
		provider: 'postgresql',
	}),
	secret: appConfig.BETTER_AUTH_SECRET,
	baseURL: appConfig.APP_URL,
	trustedOrigins: [appConfig.FRONTEND_URL],
	emailAndPassword: {
		enabled: true,
	},
	session: {
		expiresIn: 60 * 60 * 24 * 7,
		updateAge: 60 * 60 * 24,
	},
	plugins: [admin(), bearer(), jwt(), username()],
});
