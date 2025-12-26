import { db } from '@/libs/db'
import { auth } from './auth'

export async function seedAdmin() {
	const adminUser = await db.user.findFirst({
		where: { role: 'admin' },
	})

	if (adminUser) {
		return
	}

	await auth.api.signUpEmail({
		body: {
			email: 'admin@admin.com',
			password: 'adminadmin',
			name: 'Admin',
		},
	})

	await db.user.update({
		where: { email: 'admin@admin.com' },
		data: { role: 'admin', username: 'admin' },
	})

	console.log('Admin user created: admin@admin.com / admin')
}
