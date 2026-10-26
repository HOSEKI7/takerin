import { fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types.js';
import {
	getUserSettingsWithProfile,
	updateUserProfile,
	updateUserSettings,
	deleteUserData,
	getAllUserPeriodsForExportSelection
} from '#lib/server/db/settings.js';
import {
	validateDisplayName,
	validatePayDate,
	validateLanguage,
	validateTheme
} from '#lib/validation/settings.js';

export const load: PageServerLoad = async ({ locals, platform }) => {
	if (!locals.user) {
		throw redirect(303, '/auth/login');
	}

	const d1 = platform?.env?.DB;
	if (!d1) {
		throw new Error('Database D1 tidak tersedia.');
	}

	const data = await getUserSettingsWithProfile(d1, locals.user.id);
	if (!data) {
		throw redirect(303, '/auth/login');
	}

	const periods = await getAllUserPeriodsForExportSelection(d1, locals.user.id);

	return {
		profile: data.user,
		settings: data.settings,
		activePeriod: data.activePeriod,
		periods
	};
};

export const actions: Actions = {
	updateProfile: async ({ request, locals, platform }) => {
		if (!locals.user) {
			throw redirect(303, '/auth/login');
		}

		const d1 = platform?.env?.DB;
		if (!d1) {
			return fail(500, { profileError: 'Database tidak tersedia.' });
		}

		const formData = await request.formData();
		const name = formData.get('name');

		const val = validateDisplayName(name);
		if (!val.valid || !val.name) {
			return fail(400, { profileError: val.error || 'Nama tampilan tidak valid.' });
		}

		await updateUserProfile(d1, locals.user.id, { name: val.name });

		return {
			success: true,
			profileMessage: 'Nama tampilan berhasil diperbarui.'
		};
	},

	updateSettings: async ({ request, locals, platform, cookies }) => {
		if (!locals.user) {
			throw redirect(303, '/auth/login');
		}

		const d1 = platform?.env?.DB;
		if (!d1) {
			return fail(500, { settingsError: 'Database tidak tersedia.' });
		}

		const formData = await request.formData();
		const rawPayDay = formData.get('payDay');
		const rawLanguage = formData.get('language');
		const rawTheme = formData.get('theme');

		const currentData = await getUserSettingsWithProfile(d1, locals.user.id);
		if (!currentData) {
			throw redirect(303, '/auth/login');
		}

		const payload: { payDay?: number; language?: string; theme?: string } = {};

		// 1. Pay Day update
		if (rawPayDay !== null && rawPayDay !== '') {
			const activePeriodEndDate = currentData.activePeriod?.endDate ?? '';
			const valPayDay = validatePayDate(
				rawPayDay,
				currentData.settings.payDay,
				activePeriodEndDate,
				new Date()
			);

			if (!valPayDay.valid || valPayDay.payDay === undefined) {
				return fail(400, { settingsError: valPayDay.error });
			}
			payload.payDay = valPayDay.payDay;
		}

		// 2. Language update
		if (rawLanguage !== null && rawLanguage !== '') {
			const valLang = validateLanguage(rawLanguage);
			if (!valLang.valid || !valLang.language) {
				return fail(400, { settingsError: valLang.error });
			}
			payload.language = valLang.language;
			cookies?.set?.('takerin_lang', valLang.language, {
				path: '/',
				maxAge: 31536000,
				httpOnly: false,
				sameSite: 'lax'
			});
		}

		// 3. Theme update
		if (rawTheme !== null && rawTheme !== '') {
			const valTheme = validateTheme(rawTheme);
			if (!valTheme.valid || !valTheme.theme) {
				return fail(400, { settingsError: valTheme.error });
			}
			payload.theme = valTheme.theme;
		}

		await updateUserSettings(d1, locals.user.id, payload);

		return {
			success: true,
			settingsMessage: 'Pengaturan berhasil disimpan.'
		};
	},

	deleteAccount: async ({ request, locals, platform, cookies }) => {
		if (!locals.user) {
			throw redirect(303, '/auth/login');
		}

		const d1 = platform?.env?.DB;
		if (!d1) {
			return fail(500, { deleteError: 'Database tidak tersedia.' });
		}

		const formData = await request.formData();
		const confirmText = formData.get('confirmText');

		if (confirmText !== 'HAPUS AKUN SAYA' && confirmText !== 'DELETE MY ACCOUNT') {
			return fail(400, {
				deleteError:
					'Teks konfirmasi tidak sesuai. Harap ketik "HAPUS AKUN SAYA" atau "DELETE MY ACCOUNT" dengan huruf kapital.'
			});
		}

		// Delete all data in D1
		await deleteUserData(d1, locals.user.id);

		// Clear session cookie
		cookies.delete('better-auth.session_token', { path: '/' });

		throw redirect(303, '/');
	}
};
