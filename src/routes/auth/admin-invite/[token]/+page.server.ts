import { fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types.js';
import { getValidInvitationByToken, markInvitationAccepted } from '#lib/server/db/admin.js';
import { getAuth, applyAuthCookies } from '#lib/server/auth/index.js';
import { getDb } from '#lib/server/db/index.js';
import * as schema from '#lib/server/db/schema.js';
import { eq } from 'drizzle-orm';
import { validateAdminInviteActivationInput, formatAuthError } from '#lib/validation/auth.js';

export const load: PageServerLoad = async ({ params, platform }) => {
	const d1 = platform?.env?.DB;
	if (!d1) {
		return {
			valid: false,
			reason: 'error',
			message: 'Database tidak tersedia.'
		};
	}

	const token = params.token;
	const validation = await getValidInvitationByToken(d1, token);

	if (!validation.valid) {
		return {
			valid: false,
			reason: validation.status,
			email: validation.invitation?.email
		};
	}

	return {
		valid: true,
		email: validation.invitation.email,
		token
	};
};

export const actions: Actions = {
	default: async ({ request, params, platform, cookies }) => {
		const d1 = platform?.env?.DB;
		if (!d1) {
			return fail(500, { error: 'Database tidak tersedia.' });
		}

		const token = params.token;
		const validation = await getValidInvitationByToken(d1, token);

		if (!validation.valid) {
			return fail(400, {
				error: 'Tautan undangan tidak valid atau telah kedaluwarsa.',
				reason: validation.status
			});
		}

		const formData = await request.formData();
		const name = String(formData.get('name') || '').trim();
		const password = String(formData.get('password') || '');
		const confirmPassword = String(formData.get('confirmPassword') || '');

		const validationError = validateAdminInviteActivationInput({
			name,
			password,
			confirmPassword
		});

		if (validationError) {
			return fail(400, {
				error: validationError,
				name
			});
		}

		const email = validation.invitation.email;
		const auth = getAuth(d1, {
			platformEnv: platform?.env as unknown as Record<string, unknown>
		});

		try {
			await auth.api.signUpEmail({
				body: {
					name,
					email,
					password
				}
			});
		} catch (err: unknown) {
			console.error('Failed to register admin user via Better Auth:', err);
			return fail(400, {
				error: formatAuthError(err as { message?: string }),
				name
			});
		}

		// Update user record: role = 'admin', emailVerified = true, onboardingCompleted = true
		const db = getDb(d1);
		await db
			.update(schema.user)
			.set({
				role: 'admin',
				emailVerified: true,
				onboardingCompleted: true,
				updatedAt: new Date()
			})
			.where(eq(schema.user.email, email));

		// Mark invitation accepted
		await markInvitationAccepted(d1, validation.invitation.id);

		// Sign in user to create active session
		let signInRes: Response;
		try {
			signInRes = await auth.api.signInEmail({
				body: {
					email,
					password
				},
				asResponse: true
			});
		} catch (err: unknown) {
			console.error('Failed to create session after admin registration:', err);
			return fail(500, {
				error:
					'Akun berhasil dibuat namun gagal membuat sesi login. Silakan masuk via halaman login.',
				name
			});
		}

		// Apply session cookies to response
		applyAuthCookies(signInRes, cookies);

		// Redirect directly to /admin
		throw redirect(303, '/admin');
	}
};
