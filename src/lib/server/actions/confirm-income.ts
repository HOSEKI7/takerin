import { redirect, fail, type RequestEvent } from '@sveltejs/kit';
import { confirmPeriodIncome, ensureActivePeriod } from '#lib/server/db/period.js';
import { validateIncomeSources, type IncomeSourceInput } from '#lib/validation/onboarding.js';

/**
 * Handles monthly income confirmation form action.
 * Atomically verifies active monthly period, validates income source records,
 * and updates monthly period total_income + income_confirmed_at in D1.
 */
export async function confirmIncomeAction(event: RequestEvent) {
	const { locals, platform, request, cookies } = event;

	if (!locals.user) {
		throw redirect(303, '/auth/login');
	}

	const rawLocale = cookies?.get?.('takerin_lang');
	const locale: 'id' | 'en' = rawLocale === 'en' ? 'en' : 'id';

	const d1 = platform?.env?.DB;
	if (!d1) {
		return fail(500, {
			error: locale === 'en' ? 'Database is unavailable.' : 'Database tidak tersedia.'
		});
	}

	let activePeriod = locals.activePeriod;
	if (!activePeriod) {
		try {
			const periodResult = await ensureActivePeriod(d1, locals.user.id);
			activePeriod = periodResult.period;
		} catch (err) {
			console.error('Error finding active monthly period during income confirmation:', err);
			activePeriod = null;
		}
	}

	if (!activePeriod) {
		return fail(400, {
			error:
				locale === 'en'
					? 'Active Monthly Period not found.'
					: 'Periode Bulan aktif tidak ditemukan.'
		});
	}

	const formData = await request.formData();
	const rawSources = formData.get('incomeSources');

	if (typeof rawSources !== 'string' || !rawSources.trim()) {
		return fail(400, {
			error:
				locale === 'en'
					? 'Must add at least one income source.'
					: 'Minimal harus memiliki satu Sumber Pemasukan.'
		});
	}

	let parsedSources: unknown;
	try {
		parsedSources = JSON.parse(rawSources);
	} catch {
		return fail(400, {
			error:
				locale === 'en'
					? 'Invalid income sources format.'
					: 'Format data sumber pemasukan tidak valid.'
		});
	}

	if (!Array.isArray(parsedSources) || parsedSources.length === 0) {
		return fail(400, {
			error:
				locale === 'en'
					? 'Must add at least one income source.'
					: 'Minimal harus memiliki satu Sumber Pemasukan.'
		});
	}

	const candidateSources = parsedSources as IncomeSourceInput[];
	const validationError = validateIncomeSources(candidateSources, locale);
	if (validationError) {
		return fail(400, { error: validationError });
	}

	const validatedSources = candidateSources.map((s) => ({
		name: String(s.name).trim(),
		amount: Math.round(Number(s.amount))
	}));

	try {
		const result = await confirmPeriodIncome(d1, locals.user.id, activePeriod.id, validatedSources);

		if (!locals.activePeriod && activePeriod) {
			locals.activePeriod = activePeriod;
		}

		if (locals.activePeriod) {
			locals.activePeriod.totalIncome = result.totalIncome;
			locals.activePeriod.incomeConfirmedAt = result.incomeConfirmedAt;
		}

		return {
			success: true,
			totalIncome: result.totalIncome,
			incomeConfirmedAt: result.incomeConfirmedAt.toISOString()
		};
	} catch (err) {
		const message =
			err instanceof Error
				? err.message
				: locale === 'en'
					? 'Failed to confirm monthly income.'
					: 'Gagal mengonfirmasi pemasukan bulanan.';
		return fail(400, { error: message });
	}
}
