import { cleanEnv, makeValidator, num, str } from 'envalid';

const optionalEmail = makeValidator<string>((input) => {
	if (!input || input.trim() === '') {
		return 'admin@admin.com';
	}
	const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
	if (!emailRegex.test(input)) {
		throw new Error(`Invalid email address: "${input}"`);
	}
	return input;
});

export const appConfig = cleanEnv(process.env, {
	APP_PORT: num(),
	DATABASE_URL: str(),
	APP_URL: str(),
	FRONTEND_URL: str(),
	BETTER_AUTH_SECRET: str(),
	TRUSTED_ORIGINS: str(),
	COOKIE_DOMAIN: str(),
	ADMIN_EMAIL: optionalEmail({ default: 'admin@admin.com' }),
	ADMIN_PASSWORD: str({ default: '' }),
});

export const trustedOrigins = appConfig.TRUSTED_ORIGINS.split(',').map((origin) => {
	return origin.trim();
});
