import { describe, it, expect } from 'vitest';
import {
	validatePayDay,
	validateIncomeSources,
	calculateTotalIncome,
	formatRupiah
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
	});
});
