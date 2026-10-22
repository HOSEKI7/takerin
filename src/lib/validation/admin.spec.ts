import { describe, it, expect } from 'vitest';
import {
	validateTemplateInput,
	type CategoryTemplateInputItem,
	type CreateTemplateInput
} from './admin.js';

describe('Admin Template Validation (Seam 1)', () => {
	const validCategories: CategoryTemplateInputItem[] = [
		{ name: 'Kebutuhan', percentage: 50, isSavings: false },
		{ name: 'Keinginan', percentage: 30, isSavings: false },
		{ name: 'Tabungan', percentage: 20, isSavings: true }
	];

	it('validates a valid template input successfully', () => {
		const input: CreateTemplateInput = {
			name: '50/30/20 Klasik',
			description: 'Template populer untuk pemula',
			categories: validCategories
		};

		const result = validateTemplateInput(input);
		expect(result.isValid).toBe(true);
		expect(result.errors).toEqual({});
		expect(result.sanitizedData).toBeDefined();
		expect(result.sanitizedData?.name).toBe('50/30/20 Klasik');
		expect(result.sanitizedData?.categories).toHaveLength(3);
	});

	it('rejects empty or whitespace-only template name', () => {
		const input: CreateTemplateInput = {
			name: '   ',
			description: 'Test',
			categories: validCategories
		};

		const result = validateTemplateInput(input);
		expect(result.isValid).toBe(false);
		expect(result.errors.name).toBe('Nama template wajib diisi.');
	});

	it('rejects template with fewer than 1 category', () => {
		const input: CreateTemplateInput = {
			name: 'Template Kosong',
			categories: []
		};

		const result = validateTemplateInput(input);
		expect(result.isValid).toBe(false);
		expect(result.errors.categories).toBe('Minimal harus ada 1 kategori.');
	});

	it('rejects when category name is empty', () => {
		const input: CreateTemplateInput = {
			name: 'Template Tanpa Nama Kategori',
			categories: [
				{ name: '', percentage: 70, isSavings: false },
				{ name: 'Tabungan', percentage: 30, isSavings: true }
			]
		};

		const result = validateTemplateInput(input);
		expect(result.isValid).toBe(false);
		expect(result.errors.categories).toBe('Setiap kategori harus memiliki nama.');
	});

	it('rejects duplicate category names within the template', () => {
		const input: CreateTemplateInput = {
			name: 'Template Duplikat',
			categories: [
				{ name: 'Kebutuhan', percentage: 50, isSavings: false },
				{ name: 'kebutuhan', percentage: 50, isSavings: false }
			]
		};

		const result = validateTemplateInput(input);
		expect(result.isValid).toBe(false);
		expect(result.errors.categories).toBe('Nama kategori tidak boleh duplikat.');
	});

	it('rejects category percentage <= 0', () => {
		const input: CreateTemplateInput = {
			name: 'Template Persentase Nol',
			categories: [
				{ name: 'Kebutuhan', percentage: 0, isSavings: false },
				{ name: 'Lainnya', percentage: 100, isSavings: false }
			]
		};

		const result = validateTemplateInput(input);
		expect(result.isValid).toBe(false);
		expect(result.errors.categories).toBe('Persentase setiap kategori harus lebih dari 0%.');
	});

	it('rejects when sum of percentages is not exactly 100%', () => {
		const input: CreateTemplateInput = {
			name: 'Template 90%',
			categories: [
				{ name: 'Kebutuhan', percentage: 50, isSavings: false },
				{ name: 'Keinginan', percentage: 40, isSavings: false }
			]
		};

		const result = validateTemplateInput(input);
		expect(result.isValid).toBe(false);
		expect(result.errors.percentageTotal).toBe(
			'Total persentase kategori harus tepat 100%. Saat ini 90%.'
		);
	});

	it('rounds percentages cleanly and accepts 100% total with decimals summing to 100', () => {
		const input: CreateTemplateInput = {
			name: 'Template Desimal',
			categories: [
				{ name: 'A', percentage: 33.33, isSavings: false },
				{ name: 'B', percentage: 33.33, isSavings: false },
				{ name: 'C', percentage: 33.34, isSavings: true }
			]
		};

		const result = validateTemplateInput(input);
		expect(result.isValid).toBe(true);
		expect(result.errors).toEqual({});
	});
});
