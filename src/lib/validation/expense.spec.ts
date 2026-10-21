import { describe, it, expect } from 'vitest';
import { evaluateCalculatorExpression, validateExpenseInput, isOverBudget } from './expense.js';

describe('Expense Calculator & Validation (Seam 1)', () => {
	describe('evaluateCalculatorExpression', () => {
		it('evaluates simple numbers', () => {
			expect(evaluateCalculatorExpression('50000')).toBe(50000);
			expect(evaluateCalculatorExpression('0')).toBe(0);
			expect(evaluateCalculatorExpression('')).toBe(0);
		});

		it('evaluates addition correctly (e.g. acceptance criteria 50000+25000 = 75000)', () => {
			expect(evaluateCalculatorExpression('50000+25000')).toBe(75000);
			expect(evaluateCalculatorExpression('10000+20000+30000')).toBe(60000);
		});

		it('evaluates subtraction correctly', () => {
			expect(evaluateCalculatorExpression('100000-35000')).toBe(65000);
		});

		it('evaluates multiplication and division correctly with order of operations', () => {
			expect(evaluateCalculatorExpression('25000*3')).toBe(75000);
			expect(evaluateCalculatorExpression('100000/4')).toBe(25000);
			expect(evaluateCalculatorExpression('10000+5000*2')).toBe(20000);
		});

		it('handles trailing operator gracefully by evaluating expression up to that point', () => {
			expect(evaluateCalculatorExpression('50000+')).toBe(50000);
			expect(evaluateCalculatorExpression('50000-')).toBe(50000);
			expect(evaluateCalculatorExpression('50000*')).toBe(50000);
		});

		it('handles whitespace, formatted input, or invalid characters safely', () => {
			expect(evaluateCalculatorExpression(' 50 000 + 25 000 ')).toBe(75000);
			expect(evaluateCalculatorExpression('abc')).toBe(0);
			expect(evaluateCalculatorExpression('10000/0')).toBe(0);
		});

		it('floors or rounds fractional results to integer rupiah', () => {
			expect(evaluateCalculatorExpression('100/3')).toBe(33);
		});
	});

	describe('validateExpenseInput', () => {
		const validInput = {
			name: 'Makan Siang Nasi Padang',
			amount: 45000,
			categoryId: 'cat-makan-123',
			date: '2026-10-21',
			time: '12:30',
			notes: 'Rendang + es teh'
		};

		it('validates correct expense input', () => {
			const res = validateExpenseInput(validInput);
			expect(res.success).toBe(true);
			expect(res.data).toEqual(validInput);
			expect(res.error).toBeUndefined();
		});

		it('requires name to be non-empty', () => {
			const res1 = validateExpenseInput({ ...validInput, name: '' });
			expect(res1.success).toBe(false);
			expect(res1.error).toContain('Nama pengeluaran wajib diisi');

			const res2 = validateExpenseInput({ ...validInput, name: '   ' });
			expect(res2.success).toBe(false);
			expect(res2.error).toContain('Nama pengeluaran wajib diisi');
		});

		it('requires amount to be a positive integer', () => {
			const res1 = validateExpenseInput({ ...validInput, amount: 0 });
			expect(res1.success).toBe(false);
			expect(res1.error).toContain('Nominal pengeluaran harus lebih besar dari 0');

			const res2 = validateExpenseInput({ ...validInput, amount: -5000 });
			expect(res2.success).toBe(false);
			expect(res2.error).toContain('Nominal pengeluaran harus lebih besar dari 0');

			const res3 = validateExpenseInput({ ...validInput, amount: NaN });
			expect(res3.success).toBe(false);
			expect(res3.error).toContain('Nominal pengeluaran harus lebih besar dari 0');
		});

		it('requires categoryId to be non-empty', () => {
			const res = validateExpenseInput({ ...validInput, categoryId: '' });
			expect(res.success).toBe(false);
			expect(res.error).toContain('Kategori wajib dipilih');
		});

		it('requires date in YYYY-MM-DD format', () => {
			const res1 = validateExpenseInput({ ...validInput, date: '' });
			expect(res1.success).toBe(false);
			expect(res1.error).toContain('Tanggal pengeluaran tidak valid');

			const res2 = validateExpenseInput({ ...validInput, date: '21-10-2026' });
			expect(res2.success).toBe(false);
			expect(res2.error).toContain('Tanggal pengeluaran tidak valid');
		});

		it('allows optional time and notes', () => {
			const res = validateExpenseInput({
				name: 'Kopi Kenangan',
				amount: 22000,
				categoryId: 'cat-1',
				date: '2026-10-21'
			});
			expect(res.success).toBe(true);
			expect(res.data?.time).toBeUndefined();
			expect(res.data?.notes).toBeUndefined();
		});
	});

	describe('isOverBudget', () => {
		it('returns true when expense amount exceeds current category balance', () => {
			expect(isOverBudget(60000, 50000)).toBe(true);
			expect(isOverBudget(10000, -5000)).toBe(true);
		});

		it('returns false when expense amount is within category balance', () => {
			expect(isOverBudget(50000, 50000)).toBe(false);
			expect(isOverBudget(40000, 50000)).toBe(false);
			expect(isOverBudget(0, 0)).toBe(false);
		});
	});
});
