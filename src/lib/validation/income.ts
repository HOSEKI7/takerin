import { formatDateISO } from './onboarding.js';

export interface IncomeSourceInput {
	id?: string;
	name: string;
	amount: number | string;
}

export interface IncomeEditableResult {
	editable: boolean;
	isLocked: boolean;
	reason?: 'no_active_period' | 'period_completed' | 'h_minus_1_passed';
	error?: string;
}

/**
 * Validates whether the income sources for a monthly period are editable.
 * Follows the strict H-1 cutoff rule identical to validatePayDate:
 * - Only active periods can be edited.
 * - today must be strictly before activePeriodEndDate (todayISO < activePeriodEndDate).
 * - When todayISO >= activePeriodEndDate (the day of H-1 or payday itself), income becomes locked.
 */
export function validateIncomeEditable(
	activePeriodEndDate: string | null | undefined,
	periodStatus: string | null | undefined,
	today: Date = new Date(),
	locale: 'id' | 'en' = 'id'
): IncomeEditableResult {
	if (!periodStatus || !activePeriodEndDate) {
		return {
			editable: false,
			isLocked: true,
			reason: 'no_active_period',
			error:
				locale === 'en'
					? 'No active Monthly Period found.'
					: 'Periode Bulan aktif tidak ditemukan.'
		};
	}

	if (periodStatus !== 'active') {
		return {
			editable: false,
			isLocked: true,
			reason: 'period_completed',
			error:
				locale === 'en'
					? 'This Monthly Period has completed and cannot be modified.'
					: 'Periode Bulan ini telah selesai dan tidak dapat diubah lagi.'
		};
	}

	const todayISO = formatDateISO(today);

	// Option A - Strict H-1 cutoff: today must be strictly before activePeriodEndDate
	if (todayISO >= activePeriodEndDate) {
		return {
			editable: false,
			isLocked: true,
			reason: 'h_minus_1_passed',
			error:
				locale === 'en'
					? 'Income sources can only be changed before 1 day prior to the next payday.'
					: 'Sumber Pemasukan hanya boleh diubah sebelum 1 hari sebelum Tanggal Gajian berikutnya.'
		};
	}

	return {
		editable: true,
		isLocked: false
	};
}

export interface ValidatedSourcesResult {
	valid: boolean;
	sources?: Array<{ name: string; amount: number }>;
	error?: string;
}

/**
 * Validates and normalizes an array of income sources.
 * - Must be a non-empty array.
 * - Each item must have non-empty name (trimmed, max 100 chars).
 * - Each item must have positive numeric amount > 0.
 */
export function validateIncomeSources(
	sources: unknown,
	locale: 'id' | 'en' = 'id'
): ValidatedSourcesResult {
	if (!sources || !Array.isArray(sources) || sources.length === 0) {
		return {
			valid: false,
			error:
				locale === 'en'
					? 'Must have at least one income source.'
					: 'Minimal harus memiliki satu Sumber Pemasukan.'
		};
	}

	const normalized: Array<{ name: string; amount: number }> = [];

	for (const source of sources) {
		if (!source || typeof source !== 'object') {
			return {
				valid: false,
				error:
					locale === 'en'
						? 'Invalid income source data.'
						: 'Data Sumber Pemasukan tidak valid.'
			};
		}

		const rawName = (source as { name?: unknown }).name;
		const name = typeof rawName === 'string' ? rawName.trim() : '';

		if (!name) {
			return {
				valid: false,
				error:
					locale === 'en'
						? 'Income source name cannot be empty.'
						: 'Nama Sumber Pemasukan tidak boleh kosong.'
			};
		}

		if (name.length > 100) {
			return {
				valid: false,
				error:
					locale === 'en'
						? 'Income source name cannot exceed 100 characters.'
						: 'Nama Sumber Pemasukan maksimal 100 karakter.'
			};
		}

		const rawAmount = (source as { amount?: unknown }).amount;
		const amount = Math.round(Number(rawAmount));

		if (isNaN(amount) || amount <= 0 || !Number.isFinite(amount)) {
			return {
				valid: false,
				error:
					locale === 'en'
						? 'Income amount must be greater than 0.'
						: 'Nominal Sumber Pemasukan harus lebih besar dari 0.'
			};
		}

		normalized.push({ name, amount });
	}

	return {
		valid: true,
		sources: normalized
	};
}
