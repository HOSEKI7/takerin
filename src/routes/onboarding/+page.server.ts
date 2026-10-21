import type { PageServerLoad, Actions } from './$types.js';
import { fail, redirect } from '@sveltejs/kit';
import {
	validatePayDay,
	validateIncomeSources,
	type IncomeSourceInput
} from '#lib/validation/onboarding.js';
import {
	saveOnboardingStep1And2,
	getUserSettings,
	getIncomeSources
} from '#lib/server/db/onboarding.js';

export const load: PageServerLoad = async ({ locals, platform }) => {
	if (!locals.user) {
		throw redirect(303, '/auth/login');
	}

	if (locals.user.onboardingCompleted) {
		throw redirect(303, '/dashboard');
	}

	let userSettings = null;
	let incomeSources: Array<{ id: string; name: string; amount: number }> = [];

	if (platform?.env?.DB) {
		try {
			userSettings = await getUserSettings(platform.env.DB, locals.user.id);
			incomeSources = (await getIncomeSources(platform.env.DB, locals.user.id)) ?? [];
		} catch (err) {
			console.error('Failed to load user settings or income sources:', err);
		}
	}

	return {
		user: locals.user,
		userSettings,
		incomeSources
	};
};

export const actions: Actions = {
	default: async ({ request, locals, platform }) => {
		if (!locals.user) {
			throw redirect(303, '/auth/login');
		}

		const formData = await request.formData();
		const payDayRaw = formData.get('payDay');
		const incomeSourcesRaw = formData.get('incomeSources');

		const payDayError = validatePayDay(payDayRaw);
		if (payDayError) {
			return fail(400, {
				errorMessage: payDayError,
				payDay: payDayRaw?.toString()
			});
		}

		let parsedSources: IncomeSourceInput[] = [];
		try {
			if (typeof incomeSourcesRaw === 'string') {
				parsedSources = JSON.parse(incomeSourcesRaw);
			}
		} catch {
			return fail(400, {
				errorMessage: 'Format data sumber pemasukan tidak valid.'
			});
		}

		const incomeError = validateIncomeSources(parsedSources);
		if (incomeError) {
			return fail(400, {
				errorMessage: incomeError,
				payDay: payDayRaw?.toString()
			});
		}

		if (!platform?.env?.DB) {
			return fail(500, {
				errorMessage: 'Database tidak tersedia. Silakan hubungi administrator.'
			});
		}

		const payDay = Number(payDayRaw);
		const sources = parsedSources.map((s) => ({
			name: s.name.trim(),
			amount: Math.round(Number(s.amount))
		}));

		try {
			await saveOnboardingStep1And2(platform.env.DB, locals.user.id, {
				payDay,
				incomeSources: sources
			});
		} catch (err: unknown) {
			console.error('Failed to save onboarding data:', err);
			return fail(500, {
				errorMessage: 'Gagal menyimpan data onboarding. Silakan coba lagi.'
			});
		}

		throw redirect(303, '/dashboard');
	}
};
