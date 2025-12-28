import { cleanEnv, num, str } from 'envalid';

export const appConfig = cleanEnv(process.env, {
	APP_PORT: num(),
	DATABASE_URL: str(),
	APP_URL: str(),
	FRONTEND_URL: str(),
	BETTER_AUTH_SECRET: str(),
	TRUSTED_ORIGINS: str(),
	COOKIE_DOMAIN: str(),
	ADMIN_EMAIL: str({ default: '' }),
	ADMIN_PASSWORD: str({ default: '' }),
});

export const trustedOrigins = appConfig.TRUSTED_ORIGINS.split(',').map((origin) => {
	return origin.trim();
});
