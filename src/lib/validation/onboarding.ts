export interface IncomeSourceInput {
	name: string;
	amount: number | string;
}

/**
 * Validates Tanggal Gajian (pay day).
 * Must be an integer between 1 and 31.
 */
export function validatePayDay(payDay: unknown): string | null {
	if (payDay === '' || payDay === null || payDay === undefined) {
		return 'Tanggal gajian wajib diisi.';
	}

	const num = Number(payDay);
	if (Number.isNaN(num) || typeof payDay === 'boolean') {
		return 'Tanggal gajian harus berupa angka.';
	}

	if (!Number.isInteger(num)) {
		return 'Tanggal gajian harus berupa bilangan bulat.';
	}

	if (num < 1 || num > 31) {
		return 'Tanggal gajian harus berada di antara tanggal 1 sampai 31.';
	}

	return null;
}

/**
 * Validates a list of income sources.
 * Must contain at least one item, all names non-empty, all amounts > 0.
 */
export function validateIncomeSources(
	sources: IncomeSourceInput[] | null | undefined
): string | null {
	if (!sources || !Array.isArray(sources) || sources.length === 0) {
		return 'Minimal harus menambahkan satu sumber pemasukan.';
	}

	for (const source of sources) {
		if (!source.name || source.name.trim().length === 0) {
			return 'Nama sumber pemasukan tidak boleh kosong.';
		}

		const amountNum = Number(source.amount);
		if (Number.isNaN(amountNum) || source.amount === '') {
			return 'Nominal pemasukan harus berupa angka yang valid.';
		}

		if (amountNum <= 0) {
			return 'Nominal pemasukan harus lebih besar dari 0.';
		}
	}

	return null;
}

/**
 * Calculates total monthly income from income sources.
 */
export function calculateTotalIncome(
	sources: Array<{ amount: number | string }> | null | undefined
): number {
	if (!sources || !Array.isArray(sources)) return 0;
	return sources.reduce((total, s) => {
		const val = Number(s.amount);
		return total + (Number.isNaN(val) ? 0 : val);
	}, 0);
}

/**
 * Formats a numeric value to Indonesian Rupiah (e.g. "Rp 10.000.000").
 */
export function formatRupiah(amount: number | string): string {
	const num = Number(amount);
	if (Number.isNaN(num)) return 'Rp 0';
	const formatted = Math.round(num)
		.toString()
		.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
	return `Rp ${formatted}`;
}
