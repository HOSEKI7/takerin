import { describe, it, expect } from 'vitest';
import {
	validateCategoryManagementInput,
	redistributePercentage,
	type ManagedCategoryInput
} from './category.js';

describe('Category Management Validation & Redistribution Logic (Seam 1)', () => {
	it('accepts valid categories that sum exactly to 100%', () => {
		const categories: ManagedCategoryInput[] = [
			{ name: 'Kebutuhan Pokok', percentage: 50, isSavings: false },
			{ name: 'Keinginan', percentage: 30, isSavings: false },
			{ name: 'Tabungan', percentage: 20, isSavings: true }
		];

		const result = validateCategoryManagementInput(categories);
		expect(result.success).toBe(true);
		expect(result.error).toBeUndefined();
	});

	it('rejects when active categories do not sum to 100%', () => {
		const categoriesUnder: ManagedCategoryInput[] = [
			{ name: 'Kebutuhan Pokok', percentage: 50, isSavings: false },
			{ name: 'Keinginan', percentage: 30, isSavings: false }
		];

		const resUnder = validateCategoryManagementInput(categoriesUnder);
		expect(resUnder.success).toBe(false);
		expect(resUnder.error).toContain('Total persentase harus tepat 100%');

		const categoriesOver: ManagedCategoryInput[] = [
			{ name: 'Kebutuhan Pokok', percentage: 60, isSavings: false },
			{ name: 'Keinginan', percentage: 50, isSavings: false }
		];

		const resOver = validateCategoryManagementInput(categoriesOver);
		expect(resOver.success).toBe(false);
		expect(resOver.error).toContain('Total persentase harus tepat 100%');
	});

	it('rejects empty or whitespace category names', () => {
		const categories: ManagedCategoryInput[] = [
			{ name: '   ', percentage: 50, isSavings: false },
			{ name: 'Tabungan', percentage: 50, isSavings: true }
		];

		const res = validateCategoryManagementInput(categories);
		expect(res.success).toBe(false);
		expect(res.error).toBe('Nama kategori tidak boleh kosong.');
	});

	it('rejects non-positive or invalid percentages', () => {
		const categoriesZero: ManagedCategoryInput[] = [
			{ name: 'Kebutuhan', percentage: 0, isSavings: false },
			{ name: 'Tabungan', percentage: 100, isSavings: true }
		];

		const resZero = validateCategoryManagementInput(categoriesZero);
		expect(resZero.success).toBe(false);
		expect(resZero.error).toBe('Persentase kategori harus lebih besar dari 0%.');

		const categoriesNaN: ManagedCategoryInput[] = [
			{ name: 'Kebutuhan', percentage: NaN, isSavings: false },
			{ name: 'Tabungan', percentage: 100, isSavings: true }
		];

		const resNaN = validateCategoryManagementInput(categoriesNaN);
		expect(resNaN.success).toBe(false);
		expect(resNaN.error).toBe('Persentase kategori harus lebih besar dari 0%.');
	});

	it('rejects empty list of active categories', () => {
		const res = validateCategoryManagementInput([]);
		expect(res.success).toBe(false);
		expect(res.error).toBe('Minimal harus memiliki satu kategori aktif.');
	});

	it('correctly redistributes freed percentage proportionally among remaining categories', () => {
		// Category being deleted had 20%. Remaining categories: A (50%), B (30%).
		// Total remaining = 80%.
		// A gets 20% * (50/80) = 12.5% -> 62.5%
		// B gets 20% * (30/80) = 7.5% -> 37.5%
		// Total = 100%
		const remaining = [
			{ id: '1', name: 'A', percentage: 50 },
			{ id: '2', name: 'B', percentage: 30 }
		];

		const redistributed = redistributePercentage(remaining, 20);
		expect(redistributed).toHaveLength(2);
		expect(redistributed[0].percentage).toBe(62.5);
		expect(redistributed[1].percentage).toBe(37.5);
		expect(redistributed[0].percentage + redistributed[1].percentage).toBe(100);
	});

	it('handles single remaining category during redistribution', () => {
		const remaining = [{ id: '1', name: 'A', percentage: 60 }];
		const redistributed = redistributePercentage(remaining, 40);
		expect(redistributed[0].percentage).toBe(100);
	});
});
