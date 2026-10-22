import { formatDateISO } from './onboarding.js';

export interface ValidationResult<T> {
	valid: boolean;
	data?: T;
	error?: string;
}

export interface CsvExpenseItem {
	date: string;
	time: string | null;
	name: string;
	categoryName: string;
	amount: number;
	notes: string | null;
	periodRange: string;
}

/**
 * Validates display name:
 * - Must be a string
 * - Length between 2 and 100 characters (trimmed)
 */
export function validateDisplayName(name: unknown): {
	valid: boolean;
	name?: string;
	error?: string;
} {
	if (typeof name !== 'string') {
		return { valid: false, error: 'Nama tampilan wajib diisi.' };
	}

	const trimmed = name.trim();
	if (trimmed.length < 2) {
		return { valid: false, error: 'Nama tampilan minimal 2 karakter.' };
	}

	if (trimmed.length > 100) {
		return { valid: false, error: 'Nama tampilan maksimal 100 karakter.' };
	}

	return { valid: true, name: trimmed };
}

/**
 * Validates Pay Date update:
 * - Must be an integer between 1 and 31.
 * - Timing validation (Option A - Strict):
 *   Hanya boleh diubah sebelum 1 hari sebelum Tanggal Gajian aktif berikutnya.
 *   activePeriodEndDate is exactly H-1 (1 day before next active pay day).
 *   Therefore, today must be strictly before activePeriodEndDate (todayISO < activePeriodEndDate).
 */
export function validatePayDate(
	newPayDay: unknown,
	currentPayDay: number,
	activePeriodEndDate: string,
	today: Date = new Date()
): { valid: boolean; payDay?: number; error?: string } {
	const parsed = typeof newPayDay === 'number' ? newPayDay : parseInt(String(newPayDay), 10);

	if (Number.isNaN(parsed) || !Number.isInteger(parsed) || parsed < 1 || parsed > 31) {
		return {
			valid: false,
			error: 'Tanggal Gajian harus berupa angka antara 1 sampai 31.'
		};
	}

	const todayISO = formatDateISO(today);

	// Option A: today must be strictly before activePeriodEndDate (H-2 or earlier)
	if (todayISO >= activePeriodEndDate) {
		return {
			valid: false,
			error:
				'Tanggal Gajian hanya boleh diubah sebelum 1 hari sebelum Tanggal Gajian aktif berikutnya.'
		};
	}

	return { valid: true, payDay: parsed };
}

/**
 * Validates Language selection:
 * - Must be 'id' or 'en'.
 */
export function validateLanguage(lang: unknown): {
	valid: boolean;
	language?: 'id' | 'en';
	error?: string;
} {
	if (lang === 'id' || lang === 'en') {
		return { valid: true, language: lang };
	}

	return {
		valid: false,
		error: 'Bahasa yang dipilih tidak valid. Pilihan: Bahasa Indonesia (id) atau English (en).'
	};
}

/**
 * Validates Theme selection:
 * - Must be 'light' or 'dark'.
 */
export function validateTheme(theme: unknown): {
	valid: boolean;
	theme?: 'light' | 'dark';
	error?: string;
} {
	if (theme === 'light' || theme === 'dark') {
		return { valid: true, theme };
	}

	return {
		valid: false,
		error: 'Tema yang dipilih tidak valid. Pilihan: Terang (light) atau Gelap (dark).'
	};
}

/**
 * Escapes a single CSV value according to RFC 4180.
 * If the value contains a comma, newline, or double quote, wrap in quotes
 * and escape any internal double quotes with double quotes ("").
 */
function escapeCsvValue(val: string | number | null | undefined): string {
	if (val === null || val === undefined) {
		return '';
	}

	const str = String(val);
	if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
		return `"${str.replace(/"/g, '""')}"`;
	}

	return str;
}

/**
 * Formats a list of expenses into an RFC 4180 compliant CSV string with UTF-8 BOM.
 */
export function formatExpensesCsv(expenses: CsvExpenseItem[]): string {
	const BOM = '\uFEFF';
	const headers = [
		'Tanggal',
		'Waktu',
		'Nama Pengeluaran',
		'Kategori',
		'Nominal',
		'Catatan',
		'Periode'
	];

	const rows = expenses.map((exp) => [
		escapeCsvValue(exp.date),
		escapeCsvValue(exp.time ?? '-'),
		escapeCsvValue(exp.name),
		escapeCsvValue(exp.categoryName),
		escapeCsvValue(exp.amount),
		escapeCsvValue(exp.notes ?? '-'),
		escapeCsvValue(exp.periodRange)
	]);

	const lines = [headers.join(','), ...rows.map((row) => row.join(','))];

	return BOM + lines.join('\r\n');
}
