import { describe, it, expect } from 'vitest';
import {
	validatePayDay,
	validateIncomeSources,
	calculateTotalIncome,
	formatRupiah,
	formatDateIndonesian,
	validateCategories,
	calculatePeriodDates,
	type CategoryInput
} from './onboarding';

describe('Onboarding Validation: Tanggal Gajian', () => {
	it('accepts valid pay days between 1 and 31', () => {
		expect(validatePayDay(1)).toBeNull();
		expect(validatePayDay(15)).toBeNull();
		expect(validatePayDay(25)).toBeNull();
		expect(validatePayDay(31)).toBeNull();
		expect(validatePayDay('28')).toBeNull();
	});

	it('rejects numbers less than 1 or greater than 31', () => {
		expect(validatePayDay(0)).toBe('Tanggal gajian harus berada di antara tanggal 1 sampai 31.');
		expect(validatePayDay(-5)).toBe('Tanggal gajian harus berada di antara tanggal 1 sampai 31.');
		expect(validatePayDay(32)).toBe('Tanggal gajian harus berada di antara tanggal 1 sampai 31.');
		expect(validatePayDay(100)).toBe('Tanggal gajian harus berada di antara tanggal 1 sampai 31.');
	});

	it('rejects invalid inputs such as non-numeric strings, empty, or decimals', () => {
		expect(validatePayDay('')).toBe('Tanggal gajian wajib diisi.');
		expect(validatePayDay('abc')).toBe('Tanggal gajian harus berupa angka.');
		expect(validatePayDay(15.5)).toBe('Tanggal gajian harus berupa bilangan bulat.');
		expect(validatePayDay(NaN)).toBe('Tanggal gajian harus berupa angka.');
	});
});

describe('Onboarding Validation: Sumber Pemasukan', () => {
	it('accepts valid income sources', () => {
		const sources = [
			{ name: 'Gaji Pokok', amount: 8000000 },
			{ name: 'Freelance', amount: 2500000 }
		];
		expect(validateIncomeSources(sources)).toBeNull();
	});

	it('rejects when there are no income sources (empty array)', () => {
		expect(validateIncomeSources([])).toBe('Minimal harus menambahkan satu sumber pemasukan.');
		expect(validateIncomeSources(null as unknown as [])).toBe(
			'Minimal harus menambahkan satu sumber pemasukan.'
		);
	});

	it('rejects when an income source has an empty name', () => {
		const sources = [{ name: '  ', amount: 5000000 }];
		expect(validateIncomeSources(sources)).toBe('Nama sumber pemasukan tidak boleh kosong.');
	});

	it('rejects when an income source has non-positive amount', () => {
		expect(validateIncomeSources([{ name: 'Gaji', amount: 0 }])).toBe(
			'Nominal pemasukan harus lebih besar dari 0.'
		);
		expect(validateIncomeSources([{ name: 'Gaji', amount: -1000 }])).toBe(
			'Nominal pemasukan harus lebih besar dari 0.'
		);
		expect(validateIncomeSources([{ name: 'Gaji', amount: 'abc' as unknown as number }])).toBe(
			'Nominal pemasukan harus berupa angka yang valid.'
		);
	});
});

describe('Onboarding Calculations & Formatting', () => {
	it('calculates total monthly income accurately', () => {
		const sources = [
			{ name: 'Gaji', amount: 7500000 },
			{ name: 'Side Project', amount: 2500000 }
		];
		expect(calculateTotalIncome(sources)).toBe(10000000);
	});

	it('calculates total with string amounts safely', () => {
		const sources = [
			{ name: 'Gaji', amount: '5000000' as unknown as number },
			{ name: 'Bonus', amount: '1500000' as unknown as number }
		];
		expect(calculateTotalIncome(sources)).toBe(6500000);
	});

	it('returns 0 for empty sources', () => {
		expect(calculateTotalIncome([])).toBe(0);
	});

	it('formats currency correctly to Indonesian Rupiah', () => {
		expect(formatRupiah(10000000)).toBe('Rp 10.000.000');
		expect(formatRupiah(0)).toBe('Rp 0');
		expect(formatRupiah(750500)).toBe('Rp 750.500');
		expect(formatRupiah(-2000000)).toBe('-Rp 2.000.000');
	});

	it('formats ISO date to Indonesian date string', () => {
		expect(formatDateIndonesian('2026-10-21')).toBe('21 Okt 2026');
		expect(formatDateIndonesian('2026-05-05')).toBe('5 Mei 2026');
		expect(formatDateIndonesian('2026-11-20')).toBe('20 Nov 2026');
	});
});

describe('Onboarding Validation: Kategori & Persentase', () => {
	it('accepts categories summing to exactly 100%', () => {
		const valid503020: CategoryInput[] = [
			{ name: 'Kebutuhan', percentage: 50, isSavings: false },
			{ name: 'Keinginan', percentage: 30, isSavings: false },
			{ name: 'Tabungan & Investasi', percentage: 20, isSavings: true }
		];
		expect(validateCategories(valid503020)).toBeNull();
	});

	it('rejects empty category array', () => {
		expect(validateCategories([])).toBe('Minimal harus memiliki satu kategori.');
		expect(validateCategories(null as unknown as CategoryInput[])).toBe(
			'Minimal harus memiliki satu kategori.'
		);
	});

	it('rejects categories with empty name', () => {
		const invalid: CategoryInput[] = [
			{ name: '   ', percentage: 50, isSavings: false },
			{ name: 'Keinginan', percentage: 50, isSavings: false }
		];
		expect(validateCategories(invalid)).toBe('Nama kategori tidak boleh kosong.');
	});

	it('rejects categories with zero or negative percentage', () => {
		const zero: CategoryInput[] = [
			{ name: 'Kebutuhan', percentage: 0, isSavings: false },
			{ name: 'Keinginan', percentage: 100, isSavings: false }
		];
		expect(validateCategories(zero)).toBe('Persentase kategori harus lebih besar dari 0%.');

		const negative: CategoryInput[] = [
			{ name: 'Kebutuhan', percentage: -10, isSavings: false },
			{ name: 'Keinginan', percentage: 110, isSavings: false }
		];
		expect(validateCategories(negative)).toBe('Persentase kategori harus lebih besar dari 0%.');
	});

	it('rejects when sum of percentages is not 100%', () => {
		const under100: CategoryInput[] = [
			{ name: 'Kebutuhan', percentage: 50, isSavings: false },
			{ name: 'Keinginan', percentage: 30, isSavings: false }
		];
		expect(validateCategories(under100)).toContain('Total persentase harus tepat 100%');

		const over100: CategoryInput[] = [
			{ name: 'Kebutuhan', percentage: 60, isSavings: false },
			{ name: 'Keinginan', percentage: 50, isSavings: false }
		];
		expect(validateCategories(over100)).toContain('Total persentase harus tepat 100%');
	});
});

describe('Onboarding Calculations: calculatePeriodDates (Periode Bulan Pertama)', () => {
	it('calculates period when payDay is in current month in the future', () => {
		// Today: 2026-10-21, Pay day: 25 -> Next pay day is 2026-10-25 -> end date is 2026-10-24
		const today = new Date(2026, 9, 21); // Month is 0-indexed (9 = Oct)
		const dates = calculatePeriodDates(today, 25);
		expect(dates.startDate).toBe('2026-10-21');
		expect(dates.endDate).toBe('2026-10-24');
	});

	it('calculates period when today is payDay itself (next pay day is next month)', () => {
		// Today: 2026-10-25, Pay day: 25 -> Next pay day is 2026-11-25 -> end date is 2026-11-24
		const today = new Date(2026, 9, 25);
		const dates = calculatePeriodDates(today, 25);
		expect(dates.startDate).toBe('2026-10-25');
		expect(dates.endDate).toBe('2026-11-24');
	});

	it('calculates period when payDay has already passed this month', () => {
		// Today: 2026-10-28, Pay day: 25 -> Next pay day is 2026-11-25 -> end date is 2026-11-24
		const today = new Date(2026, 9, 28);
		const dates = calculatePeriodDates(today, 25);
		expect(dates.startDate).toBe('2026-10-28');
		expect(dates.endDate).toBe('2026-11-24');
	});

	it('handles payDay 31 with February fallback (28 days in non-leap year)', () => {
		// Today: 2026-01-31, Pay day: 31 -> Next pay day in Feb 2026 is clamped to Feb 28 -> end date is 2026-02-27
		const today = new Date(2026, 0, 31); // 0 = Jan
		const dates = calculatePeriodDates(today, 31);
		expect(dates.startDate).toBe('2026-01-31');
		expect(dates.endDate).toBe('2026-02-27');
	});

	it('handles payDay 31 during February', () => {
		// Today: 2026-02-10, Pay day: 31 -> Next pay day in Feb 2026 is clamped to Feb 28 -> end date is 2026-02-27
		const today = new Date(2026, 1, 10); // 1 = Feb
		const dates = calculatePeriodDates(today, 31);
		expect(dates.startDate).toBe('2026-02-10');
		expect(dates.endDate).toBe('2026-02-27');
	});

	it('handles year wrap-around (December to January)', () => {
		// Today: 2026-12-25, Pay day: 20 -> Next pay day is 2027-01-20 -> end date is 2027-01-19
		const today = new Date(2026, 11, 25); // 11 = Dec
		const dates = calculatePeriodDates(today, 20);
		expect(dates.startDate).toBe('2026-12-25');
		expect(dates.endDate).toBe('2027-01-19');
	});
});
