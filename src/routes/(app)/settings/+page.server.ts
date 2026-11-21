import { fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types.js';
import {
	getUserSettingsWithProfile,
	updateUserProfile,
	updateUserSettings,
	deleteUserData,
	getAllUserPeriodsForExportSelection
} from '#lib/server/db/settings.js';
import { createFeedback } from '#lib/server/db/feedback.js';
import {
	validateDisplayName,
	validatePayDate,
	validateLanguage,
	validateTheme
} from '#lib/validation/settings.js';
import { validateFeedbackInput } from '#lib/validation/feedback.js';

export const load: PageServerLoad = async ({ locals, platform }) => {
	if (!locals.user) {
		throw redirect(303, '/auth/login');
	}

	const d1 = platform?.env?.DB;
	if (!d1) {
		throw new Error('Database D1 tidak tersedia.');
	}

	const [data, periods] = await Promise.all([
		getUserSettingsWithProfile(d1, locals.user.id, locals.activePeriod),
		getAllUserPeriodsForExportSelection(d1, locals.user.id)
	]);

	if (!data) {
		throw redirect(303, '/auth/login');
	}

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

		const rawLocale = cookies?.get?.('takerin_lang');
		const locale: 'id' | 'en' = rawLocale === 'en' ? 'en' : 'id';

		const d1 = platform?.env?.DB;
		if (!d1) {
			return fail(500, {
				deleteError: locale === 'en' ? 'Database service unavailable.' : 'Database tidak tersedia.'
			});
		}

		const formData = await request.formData();
		const confirmText = formData.get('confirmText');

		if (confirmText !== 'HAPUS AKUN SAYA' && confirmText !== 'DELETE MY ACCOUNT') {
			return fail(400, {
				deleteError:
					locale === 'en'
						? 'Confirmation text does not match. Please type "HAPUS AKUN SAYA" or "DELETE MY ACCOUNT" in capital letters.'
						: 'Teks konfirmasi tidak sesuai. Harap ketik "HAPUS AKUN SAYA" atau "DELETE MY ACCOUNT" dengan huruf kapital.'
			});
		}

		try {
			// Delete all data in D1 in strict relational dependency order
			await deleteUserData(d1, locals.user.id, locals.user.email);

			// Clear session cookies (standard and secure HTTPS variants)
			cookies.delete('better-auth.session_token', { path: '/' });
			cookies.delete('__Secure-better-auth.session_token', { path: '/' });
		} catch (error) {
			console.error('Failed to delete user account:', error);
			return fail(500, {
				deleteError:
					locale === 'en'
						? 'Failed to delete account. Please try again later.'
						: 'Gagal menghapus akun. Silakan coba beberapa saat lagi.'
			});
		}

		throw redirect(303, '/?deleted=true');
	},

	submitFeedback: async ({ request, locals, platform, cookies }) => {
		if (!locals.user) {
			throw redirect(303, '/auth/login');
		}

		const rawLocale = cookies?.get?.('takerin_lang');
		const locale: 'id' | 'en' = rawLocale === 'en' ? 'en' : 'id';

		const d1 = platform?.env?.DB;
		if (!d1) {
			return fail(500, {
				feedbackError:
					locale === 'en' ? 'Database service unavailable.' : 'Database tidak tersedia.'
			});
		}

		const formData = await request.formData();
		const type = formData.get('type');
		const rating = formData.get('rating');
		const category = formData.get('category');
		const content = formData.get('content');
		const currentRoute = formData.get('currentRoute');
		const deviceInfo = formData.get('deviceInfo');

		const validation = validateFeedbackInput(
			{
				type,
				rating,
				category,
				content,
				currentRoute,
				deviceInfo
			},
			locale
		);

		if (!validation.valid || !validation.data) {
			return fail(400, { feedbackError: validation.error });
		}

		await createFeedback(d1, {
			userId: locals.user.id,
			type: validation.data.type,
			rating: validation.data.rating,
			category: validation.data.category,
			content: validation.data.content,
			currentRoute: validation.data.currentRoute,
			deviceInfo: validation.data.deviceInfo
		});

		return {
			success: true,
			feedbackMessage:
				locale === 'en'
					? 'Your review or feedback has been sent successfully.'
					: 'Ulasan atau masukan Anda berhasil dikirimkan.'
		};
	}
};
