import { describe, it, expect } from 'vitest';
import { validateIncomeEditable, validateIncomeSources } from './income.js';

describe('Income Validation (Seam 2)', () => {
	describe('validateIncomeEditable (H-1 Payday Cutoff Rule)', () => {
		it('allows editing when period is active and today is strictly before activePeriodEndDate (H-2 or earlier)', () => {
			const activePeriodEndDate = '2026-10-24'; // H-1 (payDay is 25)
			const today = new Date('2026-10-20T10:00:00Z');

			const result = validateIncomeEditable(activePeriodEndDate, 'active', today);
			expect(result.editable).toBe(true);
			expect(result.isLocked).toBe(false);
			expect(result.reason).toBeUndefined();
			expect(result.error).toBeUndefined();
		});

		it('locks editing when today is on the activePeriodEndDate (H-1 cutoff)', () => {
			const activePeriodEndDate = '2026-10-24';
			const today = new Date('2026-10-24T08:00:00Z'); // Exact H-1 date

			const result = validateIncomeEditable(activePeriodEndDate, 'active', today);
			expect(result.editable).toBe(false);
			expect(result.isLocked).toBe(true);
			expect(result.reason).toBe('h_minus_1_passed');
			expect(result.error).toBe(
				'Sumber Pemasukan hanya boleh diubah sebelum 1 hari sebelum Tanggal Gajian berikutnya.'
			);
		});

		it('locks editing when today has passed activePeriodEndDate', () => {
			const activePeriodEndDate = '2026-10-24';
			const today = new Date('2026-10-25T08:00:00Z'); // Payday itself

			const result = validateIncomeEditable(activePeriodEndDate, 'active', today);
			expect(result.editable).toBe(false);
			expect(result.isLocked).toBe(true);
			expect(result.reason).toBe('h_minus_1_passed');
		});

		it('locks editing when period status is completed regardless of date', () => {
			const activePeriodEndDate = '2026-11-24';
			const today = new Date('2026-10-20T10:00:00Z');

			const result = validateIncomeEditable(activePeriodEndDate, 'completed', today);
			expect(result.editable).toBe(false);
			expect(result.isLocked).toBe(true);
			expect(result.reason).toBe('period_completed');
			expect(result.error).toBe('Periode Bulan ini telah selesai dan tidak dapat diubah lagi.');
		});

		it('locks editing when activePeriodEndDate is missing or empty', () => {
			const today = new Date('2026-10-20T10:00:00Z');

			const result = validateIncomeEditable(null, 'active', today);
			expect(result.editable).toBe(false);
			expect(result.isLocked).toBe(true);
			expect(result.reason).toBe('no_active_period');
		});

		it('supports English error messages when locale is en', () => {
			const activePeriodEndDate = '2026-10-24';
			const today = new Date('2026-10-24T08:00:00Z');

			const result = validateIncomeEditable(activePeriodEndDate, 'active', today, 'en');
			expect(result.editable).toBe(false);
			expect(result.isLocked).toBe(true);
			expect(result.reason).toBe('h_minus_1_passed');
			expect(result.error).toBe(
				'Income sources can only be changed before 1 day prior to the next payday.'
			);
		});
	});

	describe('validateIncomeSources', () => {
		it('accepts valid income sources and returns normalized data', () => {
			const input = [
				{ name: '  Gaji Pokok  ', amount: '8000000' },
				{ name: 'Freelance Design', amount: 3500000 }
			];

			const result = validateIncomeSources(input);
			expect(result.valid).toBe(true);
			expect(result.sources).toEqual([
				{ name: 'Gaji Pokok', amount: 8000000 },
				{ name: 'Freelance Design', amount: 3500000 }
			]);
			expect(result.error).toBeUndefined();
		});

		it('rejects empty or non-array sources', () => {
			expect(validateIncomeSources([]).valid).toBe(false);
			expect(validateIncomeSources([]).error).toBe('Minimal harus memiliki satu Sumber Pemasukan.');

			expect(validateIncomeSources(null).valid).toBe(false);
			expect(validateIncomeSources(undefined).valid).toBe(false);
			expect(validateIncomeSources('invalid' as unknown).valid).toBe(false);
		});

		it('rejects empty or whitespace-only name', () => {
			const result = validateIncomeSources([{ name: '   ', amount: 5000000 }]);
			expect(result.valid).toBe(false);
			expect(result.error).toBe('Nama Sumber Pemasukan tidak boleh kosong.');
		});

		it('rejects name exceeding 100 characters', () => {
			const result = validateIncomeSources([{ name: 'A'.repeat(101), amount: 5000000 }]);
			expect(result.valid).toBe(false);
			expect(result.error).toBe('Nama Sumber Pemasukan maksimal 100 karakter.');
		});

		it('rejects zero or negative amount', () => {
			expect(validateIncomeSources([{ name: 'Gaji', amount: 0 }]).valid).toBe(false);
			expect(validateIncomeSources([{ name: 'Gaji', amount: 0 }]).error).toBe(
				'Nominal Sumber Pemasukan harus lebih besar dari 0.'
			);

			expect(validateIncomeSources([{ name: 'Gaji', amount: -50000 }]).valid).toBe(false);
			expect(validateIncomeSources([{ name: 'Gaji', amount: 'abc' }]).valid).toBe(false);
		});

		it('supports English error messages when locale is en', () => {
			expect(validateIncomeSources([], 'en').error).toBe('Must have at least one income source.');
			expect(validateIncomeSources([{ name: '', amount: 5000 }], 'en').error).toBe(
				'Income source name cannot be empty.'
			);
			expect(validateIncomeSources([{ name: 'Salary', amount: 0 }], 'en').error).toBe(
				'Income amount must be greater than 0.'
			);
		});
	});
});
