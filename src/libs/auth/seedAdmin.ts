import { appConfig } from '@/libs/appConfig';
import { db } from '@/libs/db';
import { createChildLogger } from '@/libs/logger';
import { auth } from './auth';

const logger = createChildLogger('seed');

function generatePassword(length = 16): string {
	const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
	const randomBytes = crypto.getRandomValues(new Uint8Array(length));
	return Array.from(randomBytes, (byte) => charset[byte % charset.length]).join('');
}

export async function seedAdmin() {
	const adminUser = await db.user.findFirst({
		where: { role: 'admin' },
	});

	if (adminUser) {
		return;
	}

	const email = appConfig.ADMIN_EMAIL || 'admin@admin.com';
	const password = appConfig.ADMIN_PASSWORD || generatePassword();
	const isGeneratedPassword = !appConfig.ADMIN_PASSWORD;

	await auth.api.signUpEmail({
		body: {
			email,
			password,
			name: 'Admin',
		},
	});

	await db.user.update({
		where: { email },
		data: { role: 'admin', username: 'admin' },
	});

	if (isGeneratedPassword) {
		logger.warn(`Admin created — email: ${email}, password: ${password} (save it now!)`);
	} else {
		logger.info(`Admin created — email: ${email}`);
	}
}
