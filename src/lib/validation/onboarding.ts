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
 * Formats a numeric value to Indonesian Rupiah (e.g. "Rp 10.000.000" or "-Rp 2.000.000").
 */
export function formatRupiah(amount: number | string): string {
	const num = Number(amount);
	if (Number.isNaN(num)) return 'Rp 0';
	const isNegative = num < 0;
	const formatted = Math.round(Math.abs(num))
		.toString()
		.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
	return isNegative ? `-Rp ${formatted}` : `Rp ${formatted}`;
}

const MONTH_NAMES_ID = [
	'Jan',
	'Feb',
	'Mar',
	'Apr',
	'Mei',
	'Jun',
	'Jul',
	'Agu',
	'Sep',
	'Okt',
	'Nov',
	'Des'
];

/**
 * Formats an ISO date string (YYYY-MM-DD) to Indonesian formatted date: e.g. 21 Okt 2026
 */
export function formatDateIndonesian(dateStr: string): string {
	if (!dateStr || !dateStr.includes('-')) return dateStr;
	const parts = dateStr.split('-');
	if (parts.length !== 3) return dateStr;
	const year = parts[0];
	const monthIdx = parseInt(parts[1], 10) - 1;
	const day = parseInt(parts[2], 10);
	if (isNaN(monthIdx) || isNaN(day) || monthIdx < 0 || monthIdx > 11) {
		return dateStr;
	}
	return `${day} ${MONTH_NAMES_ID[monthIdx]} ${year}`;
}

export interface CategoryInput {
	name: string;
	percentage: number | string;
	isSavings?: boolean;
	is_savings?: boolean;
}

/**
 * Validates a list of categories.
 * Must have at least 1 category, all names non-empty, percentage > 0, and total sum === 100%.
 */
export function validateCategories(categories: CategoryInput[] | null | undefined): string | null {
	if (!categories || !Array.isArray(categories) || categories.length === 0) {
		return 'Minimal harus memiliki satu kategori.';
	}

	let totalPercentage = 0;

	for (const cat of categories) {
		if (!cat.name || cat.name.trim().length === 0) {
			return 'Nama kategori tidak boleh kosong.';
		}

		const pct = Number(cat.percentage);
		if (Number.isNaN(pct) || cat.percentage === '' || pct <= 0) {
			return 'Persentase kategori harus lebih besar dari 0%.';
		}

		totalPercentage += pct;
	}

	// Total percentage must sum to 100% (allowing tolerance for minor float precision)
	if (Math.abs(totalPercentage - 100) > 0.001) {
		return `Total persentase harus tepat 100% (saat ini: ${Math.round(totalPercentage * 100) / 100}%).`;
	}

	return null;
}

/**
 * Returns the number of days in a given month.
 */
export function getDaysInMonth(year: number, monthIndex: number): number {
	return new Date(year, monthIndex + 1, 0).getDate();
}

/**
 * Formats a Date to ISO date string 'YYYY-MM-DD'.
 */
export function formatDateISO(d: Date): string {
	const year = d.getFullYear();
	const month = String(d.getMonth() + 1).padStart(2, '0');
	const day = String(d.getDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
}

/**
 * Calculates start_date and end_date for the first Periode Bulan:
 * - start_date = today (ISO YYYY-MM-DD)
 * - end_date = 1 day before the next pay date (with fallback for day 31 / month length)
 */
export function calculatePeriodDates(
	today: Date,
	payDay: number
): { startDate: string; endDate: string } {
	const currentYear = today.getFullYear();
	const currentMonth = today.getMonth(); // 0-indexed
	const currentDay = today.getDate();

	const daysInCurrentMonth = getDaysInMonth(currentYear, currentMonth);
	const clampedPayDayCurrent = Math.min(payDay, daysInCurrentMonth);

	let nextPayYear: number;
	let nextPayMonth: number;
	let nextPayDay: number;

	if (currentDay < clampedPayDayCurrent) {
		// Pay day in current month is still upcoming
		nextPayYear = currentYear;
		nextPayMonth = currentMonth;
		nextPayDay = clampedPayDayCurrent;
	} else {
		// Pay day for this month has passed or is today; next pay day is next month
		if (currentMonth === 11) {
			nextPayYear = currentYear + 1;
			nextPayMonth = 0;
		} else {
			nextPayYear = currentYear;
			nextPayMonth = currentMonth + 1;
		}
		const daysInNextMonth = getDaysInMonth(nextPayYear, nextPayMonth);
		nextPayDay = Math.min(payDay, daysInNextMonth);
	}

	const endDateObj = new Date(nextPayYear, nextPayMonth, nextPayDay - 1);

	return {
		startDate: formatDateISO(today),
		endDate: formatDateISO(endDateObj)
	};
}
