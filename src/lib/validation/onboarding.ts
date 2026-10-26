export interface IncomeSourceInput {
	name: string;
	amount: number | string;
}

/**
 * Validates Tanggal Gajian (pay day).
 * Must be an integer between 1 and 31.
 */
export function validatePayDay(payDay: unknown, locale: 'id' | 'en' = 'id'): string | null {
	if (payDay === '' || payDay === null || payDay === undefined) {
		return locale === 'en' ? 'Pay day is required.' : 'Tanggal gajian wajib diisi.';
	}

	const num = Number(payDay);
	if (Number.isNaN(num) || typeof payDay === 'boolean') {
		return locale === 'en' ? 'Pay day must be a number.' : 'Tanggal gajian harus berupa angka.';
	}

	if (!Number.isInteger(num)) {
		return locale === 'en'
			? 'Pay day must be an integer.'
			: 'Tanggal gajian harus berupa bilangan bulat.';
	}

	if (num < 1 || num > 31) {
		return locale === 'en'
			? 'Pay day must be between day 1 and 31.'
			: 'Tanggal gajian harus berada di antara tanggal 1 sampai 31.';
	}

	return null;
}

/**
 * Validates a list of income sources.
 * Must contain at least one item, all names non-empty, all amounts > 0.
 */
export function validateIncomeSources(
	sources: IncomeSourceInput[] | null | undefined,
	locale: 'id' | 'en' = 'id'
): string | null {
	if (!sources || !Array.isArray(sources) || sources.length === 0) {
		return locale === 'en'
			? 'Must add at least one income source.'
			: 'Minimal harus menambahkan satu sumber pemasukan.';
	}

	for (const source of sources) {
		if (!source.name || source.name.trim().length === 0) {
			return locale === 'en'
				? 'Income source name cannot be empty.'
				: 'Nama sumber pemasukan tidak boleh kosong.';
		}

		const amountNum = Number(source.amount);
		if (Number.isNaN(amountNum) || source.amount === '') {
			return locale === 'en'
				? 'Income amount must be a valid number.'
				: 'Nominal pemasukan harus berupa angka yang valid.';
		}

		if (amountNum <= 0) {
			return locale === 'en'
				? 'Income amount must be greater than 0.'
				: 'Nominal pemasukan harus lebih besar dari 0.';
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

const MONTH_NAMES_EN = [
	'Jan',
	'Feb',
	'Mar',
	'Apr',
	'May',
	'Jun',
	'Jul',
	'Aug',
	'Sep',
	'Oct',
	'Nov',
	'Dec'
];

/**
 * Formats a Date or ISO date string (YYYY-MM-DD) to a locale-aware formatted date string:
 * e.g. 21 Okt 2026 (id) or 21 Oct 2026 (en)
 */
export function formatDate(dateInput: string | Date, locale: 'id' | 'en' = 'id'): string {
	if (!dateInput) return '';
	let year: string | number;
	let monthIdx: number;
	let day: number;

	if (dateInput instanceof Date) {
		if (isNaN(dateInput.getTime())) return '';
		year = dateInput.getFullYear();
		monthIdx = dateInput.getMonth();
		day = dateInput.getDate();
	} else {
		if (!dateInput.includes('-')) return dateInput;
		const parts = dateInput.split('-');
		if (parts.length !== 3) return dateInput;
		year = parts[0];
		monthIdx = parseInt(parts[1], 10) - 1;
		day = parseInt(parts[2], 10);
	}

	if (isNaN(monthIdx) || isNaN(day) || monthIdx < 0 || monthIdx > 11) {
		return typeof dateInput === 'string' ? dateInput : '';
	}

	const monthNames = locale === 'en' ? MONTH_NAMES_EN : MONTH_NAMES_ID;
	return `${day} ${monthNames[monthIdx]} ${year}`;
}

/**
 * Formats an ISO date string (YYYY-MM-DD) to Indonesian formatted date: e.g. 21 Okt 2026
 * Preserved for backward compatibility.
 */
export function formatDateIndonesian(dateStr: string): string {
	return formatDate(dateStr, 'id');
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
export function validateCategories(
	categories: CategoryInput[] | null | undefined,
	locale: 'id' | 'en' = 'id'
): string | null {
	if (!categories || !Array.isArray(categories) || categories.length === 0) {
		return locale === 'en'
			? 'Must have at least one category.'
			: 'Minimal harus memiliki satu kategori.';
	}

	let totalPercentage = 0;

	for (const cat of categories) {
		if (!cat.name || cat.name.trim().length === 0) {
			return locale === 'en'
				? 'Category name cannot be empty.'
				: 'Nama kategori tidak boleh kosong.';
		}

		const pct = Number(cat.percentage);
		if (Number.isNaN(pct) || cat.percentage === '' || pct <= 0) {
			return locale === 'en'
				? 'Category percentage must be greater than 0%.'
				: 'Persentase kategori harus lebih besar dari 0%.';
		}

		totalPercentage += pct;
	}

	// Total percentage must sum to 100% (allowing tolerance for minor float precision)
	if (Math.abs(totalPercentage - 100) > 0.001) {
		return locale === 'en'
			? `Total percentage must equal 100% (currently: ${Math.round(totalPercentage * 100) / 100}%).`
			: `Total persentase harus tepat 100% (saat ini: ${Math.round(totalPercentage * 100) / 100}%).`;
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
