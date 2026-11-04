import type { PageServerLoad, Actions } from './$types.js';
import { redirect, fail } from '@sveltejs/kit';
import { confirmPeriodIncome } from '#lib/server/db/period.js';
import { getIncomeSources } from '#lib/server/db/onboarding.js';
import { validateIncomeEditable, validateIncomeSources } from '#lib/validation/income.js';

export const load: PageServerLoad = async ({ locals, platform, cookies }) => {
	if (!locals.user) {
		throw redirect(303, '/auth/login');
	}

	const rawLocale = cookies?.get?.('takerin_lang');
	const locale: 'id' | 'en' = rawLocale === 'en' ? 'en' : 'id';

	const activePeriod = locals.activePeriod ?? null;

	if (!activePeriod || !platform?.env?.DB) {
		const editability = validateIncomeEditable(
			activePeriod?.endDate,
			activePeriod?.status,
			new Date(),
			locale
		);
		return {
			activePeriod: null,
			incomeSources: [],
			isLocked: true,
			lockReason: editability.reason ?? 'no_active_period'
		};
	}

	// Fetch income sources for this active period (with fallback to legacy if modern period records are not yet initialized)
	const rawSources = await getIncomeSources(platform.env.DB, locals.user.id, activePeriod.id);

	const incomeSources = rawSources.map((s) => ({
		id: s.id,
		name: s.name,
		amount: s.amount
	}));

	const editability = validateIncomeEditable(
		activePeriod.endDate,
		activePeriod.status,
		new Date(),
		locale
	);

	return {
		activePeriod,
		incomeSources,
		isLocked: editability.isLocked,
		lockReason: editability.reason ?? null
	};
};

export const actions: Actions = {
	saveIncomes: async ({ locals, platform, request, cookies }) => {
		if (!locals.user) {
			throw redirect(303, '/auth/login');
		}

		const rawLocale = cookies?.get?.('takerin_lang');
		const locale: 'id' | 'en' = rawLocale === 'en' ? 'en' : 'id';

		if (!platform?.env?.DB) {
			return fail(500, {
				error: locale === 'en' ? 'Database is unavailable.' : 'Database tidak tersedia.'
			});
		}

		const activePeriod = locals.activePeriod ?? null;
		if (!activePeriod || activePeriod.status !== 'active') {
			return fail(400, {
				error:
					locale === 'en'
						? 'Active Monthly Period not found or inactive.'
						: 'Periode Bulan tidak aktif atau tidak ditemukan.'
			});
		}

		// Enforce H-1 payday lock rule
		const editability = validateIncomeEditable(
			activePeriod.endDate,
			activePeriod.status,
			new Date(),
			locale
		);
		if (editability.isLocked) {
			return fail(400, {
				error:
					editability.error ||
					(locale === 'en'
						? 'Income sources cannot be changed because the period is locked or has passed H-1 cutoff.'
						: 'Sumber Pemasukan tidak dapat diubah karena periode terkunci atau telah melewati batas H-1 gajian.')
			});
		}

		const formData = await request.formData();
		const rawSources = formData.get('sources');

		if (!rawSources || typeof rawSources !== 'string') {
			return fail(400, {
				error:
					locale === 'en'
						? 'Income sources data is required.'
						: 'Data Sumber Pemasukan wajib diisi.'
			});
		}

		let parsedSources: unknown;
		try {
			parsedSources = JSON.parse(rawSources);
		} catch {
			return fail(400, {
				error:
					locale === 'en'
						? 'Invalid income sources data format.'
						: 'Format data Sumber Pemasukan tidak valid.'
			});
		}

		const validation = validateIncomeSources(parsedSources, locale);
		if (!validation.valid || !validation.sources) {
			return fail(400, {
				error:
					validation.error ||
					(locale === 'en'
						? 'Income sources data is invalid.'
						: 'Data Sumber Pemasukan tidak valid.')
			});
		}

		try {
			const result = await confirmPeriodIncome(
				platform.env.DB,
				locals.user.id,
				activePeriod.id,
				validation.sources
			);

			return {
				success: true,
				totalIncome: result.totalIncome
			};
		} catch (err) {
			const message =
				err instanceof Error
					? err.message
					: locale === 'en'
						? 'Failed to update income sources.'
						: 'Gagal memperbarui Sumber Pemasukan.';
			return fail(400, { error: message });
		}
	}
};
