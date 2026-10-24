import { fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types.js';
import {
	getActiveAdmins,
	getAdminInvitations,
	isEmailAdmin,
	hasPendingInvitation,
	createAdminInvitation,
	revokeAdminInvitation
} from '#lib/server/db/admin.js';
import { sendAdminInvitationEmail } from '#lib/server/email/index.js';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const load: PageServerLoad = async ({ platform }) => {
	const d1 = platform?.env.DB;
	if (!d1) {
		return {
			admins: [],
			invitations: []
		};
	}

	const [admins, invitations] = await Promise.all([getActiveAdmins(d1), getAdminInvitations(d1)]);

	return {
		admins,
		invitations
	};
};

export const actions: Actions = {
	invite: async ({ request, locals, url, platform }) => {
		if (!locals.user || locals.user.role !== 'admin') {
			return fail(403, { error: 'Akses ditolak. Hanya admin yang diizinkan.' });
		}

		const d1 = platform?.env.DB;
		if (!d1) {
			return fail(500, { error: 'Database tidak tersedia.' });
		}

		const formData = await request.formData();
		const rawEmail = formData.get('email');
		const email = typeof rawEmail === 'string' ? rawEmail.trim().toLowerCase() : '';

		if (!email) {
			return fail(400, { error: 'Alamat email wajib diisi.', email });
		}

		if (!EMAIL_REGEX.test(email)) {
			return fail(400, { error: 'Format alamat email tidak valid.', email });
		}

		// 1. Check if email already belongs to an active administrator
		const alreadyAdmin = await isEmailAdmin(d1, email);
		if (alreadyAdmin) {
			return fail(400, {
				error: 'Pengguna dengan email ini sudah terdaftar sebagai Administrator.',
				email
			});
		}

		// 2. Check if email already has an active pending invitation
		const pendingExists = await hasPendingInvitation(d1, email);
		if (pendingExists) {
			return fail(400, {
				error: 'Sudah ada undangan tertunda yang masih aktif untuk email ini.',
				email
			});
		}

		// 3. Create invitation record
		const invitation = await createAdminInvitation(d1, {
			email,
			invitedBy: locals.user.id,
			origin: url.origin
		});

		// 4. Send invitation email via Resend
		await sendAdminInvitationEmail({
			to: email,
			url: invitation.url,
			invitedByName: locals.user.name || undefined
		});

		return {
			success: true,
			invitedEmail: email,
			inviteUrl: invitation.url,
			message: 'Undangan administrator berhasil dikirim.'
		};
	},

	revoke: async ({ request, locals, platform }) => {
		if (!locals.user || locals.user.role !== 'admin') {
			return fail(403, { error: 'Akses ditolak. Hanya admin yang diizinkan.' });
		}

		const d1 = platform?.env.DB;
		if (!d1) {
			return fail(500, { error: 'Database tidak tersedia.' });
		}

		const formData = await request.formData();
		const invitationId = String(formData.get('invitationId') || '').trim();

		if (!invitationId) {
			return fail(400, { error: 'ID undangan wajib diisi.' });
		}

		const result = await revokeAdminInvitation(d1, invitationId, locals.user.id);

		if (!result.success) {
			if (result.reason === 'unauthorized') {
				return fail(403, { error: 'Akses ditolak. Hanya admin yang diizinkan.' });
			}
			if (result.reason === 'not_found') {
				return fail(404, { error: 'Undangan tidak ditemukan.' });
			}
			return fail(400, { error: 'Hanya undangan berstatus pending yang dapat dibatalkan.' });
		}

		return {
			success: true,
			revokedId: invitationId,
			message: 'Undangan berhasil dibatalkan.'
		};
	}
};
