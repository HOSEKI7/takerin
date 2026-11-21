import { describe, it, expect, vi } from 'vitest';
import { render } from 'svelte/server';
import { load, actions } from './+page.server.js';
import CategoriesPage from './+page.svelte';
import * as categoryDb from '#lib/server/db/category.js';

describe('Categories Route Server Logic (Seam 3)', () => {
	it('redirects to login when unauthenticated', async () => {
		await expect(
			load({
				locals: { user: null },
				platform: { env: { DB: {} as unknown as D1Database } }
			} as unknown as Parameters<typeof load>[0])
		).rejects.toMatchObject({
			status: 303,
			location: '/auth/login'
		});
	});

	it('redirects to dashboard when user has no active period', async () => {
		vi.spyOn(categoryDb, 'getManageCategoriesData').mockResolvedValueOnce({
			period: null,
			activeCategories: [],
			frozenCategories: []
		});

		await expect(
			load({
				locals: { user: { id: 'u1' } },
				platform: { env: { DB: {} as unknown as D1Database } }
			} as unknown as Parameters<typeof load>[0])
		).rejects.toMatchObject({
			status: 303,
			location: '/dashboard'
		});
	});

	it('loads active and frozen categories with period details', async () => {
		vi.spyOn(categoryDb, 'getManageCategoriesData').mockResolvedValueOnce({
			period: {
				id: 'p1',
				startDate: '2026-10-21',
				endDate: '2026-11-20',
				payDay: 21,
				totalIncome: 10000000,
				status: 'active'
			},
			activeCategories: [
				{
					id: 'c1',
					name: 'Makan',
					percentage: 60,
					allocation: 6000000,
					spent: 1000000,
					balance: 5000000,
					isSavings: false,
					status: 'active'
				},
				{
					id: 'c2',
					name: 'Tabungan',
					percentage: 40,
					allocation: 4000000,
					spent: 0,
					balance: 4000000,
					isSavings: true,
					status: 'active'
				}
			],
			frozenCategories: [
				{
					id: 'c3',
					name: 'Hobi Beku',
					percentage: 0,
					allocation: 0,
					spent: 200000,
					balance: -200000,
					isSavings: false,
					status: 'frozen'
				}
			]
		});

		const result = (await load({
			locals: { user: { id: 'u1' } },
			platform: { env: { DB: {} as unknown as D1Database } }
		} as unknown as Parameters<typeof load>[0])) as {
			period: { id: string } | null;
			activeCategories: Array<{ id: string; name: string }>;
			frozenCategories: Array<{ id: string; name: string }>;
		};

		expect(result.period?.id).toBe('p1');
		expect(result.activeCategories).toHaveLength(2);
		expect(result.frozenCategories).toHaveLength(1);
		expect(result.frozenCategories[0].name).toBe('Hobi Beku');
	});

	it('action saves valid mid-period category changes', async () => {
		const updateSpy = vi
			.spyOn(categoryDb, 'updateCategoriesMidPeriod')
			.mockResolvedValueOnce({ success: true });

		const formData = new FormData();
		formData.set('periodId', 'p1');
		formData.set(
			'categories',
			JSON.stringify([
				{ id: 'c1', name: 'Makan Enak', percentage: 70, isSavings: false },
				{ id: 'c2', name: 'Tabungan', percentage: 30, isSavings: true }
			])
		);
		formData.set('freezeCategoryIds', JSON.stringify(['c-freeze']));
		formData.set(
			'frozenCategoryRenames',
			JSON.stringify([{ id: 'c-frozen', name: 'Hobi Lama Diedit' }])
		);

		const result = await actions.default({
			locals: { user: { id: 'u1' } },
			platform: { env: { DB: {} as unknown as D1Database } },
			request: { formData: async () => formData }
		} as unknown as Parameters<typeof actions.default>[0]);

		expect(updateSpy).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({
				userId: 'u1',
				periodId: 'p1',
				activeCategories: expect.arrayContaining([
					expect.objectContaining({ name: 'Makan Enak', percentage: 70 })
				]),
				freezeCategoryIds: ['c-freeze'],
				frozenCategoryRenames: [{ id: 'c-frozen', name: 'Hobi Lama Diedit' }]
			})
		);
		expect(result).toEqual({ success: true, message: 'Kategori berhasil diperbarui.' });
	});

	it('action rejects invalid category submission', async () => {
		const formData = new FormData();
		formData.set('periodId', 'p1');
		formData.set(
			'categories',
			JSON.stringify([
				{ id: 'c1', name: 'Makan Enak', percentage: 70, isSavings: false }
				// Sum only 70%
			])
		);

		const result = (await actions.default({
			locals: { user: { id: 'u1' } },
			platform: { env: { DB: {} as unknown as D1Database } },
			request: { formData: async () => formData }
		} as unknown as Parameters<typeof actions.default>[0])) as {
			status: number;
			data: { error: string };
		};

		expect(result.status).toBe(400);
		expect(result.data.error).toContain('Total persentase harus tepat 100%');
	});
});

describe('Categories Page UI & Stepper Controls (Issue #64)', () => {
	const mockPageData = {
		period: {
			id: 'p1',
			startDate: '2026-10-21',
			endDate: '2026-11-20',
			payDay: 21,
			totalIncome: 10000000,
			status: 'active'
		},
		activeCategories: [
			{
				id: 'c1',
				name: 'Kebutuhan',
				percentage: 50,
				allocation: 5000000,
				spent: 1000000,
				balance: 4000000,
				isSavings: false,
				status: 'active'
			},
			{
				id: 'c2',
				name: 'Tabungan',
				percentage: 1,
				allocation: 100000,
				spent: 0,
				balance: 100000,
				isSavings: true,
				status: 'active'
			},
			{
				id: 'c3',
				name: 'Keinginan',
				percentage: 49,
				allocation: 4900000,
				spent: 500000,
				balance: 4400000,
				isSavings: false,
				status: 'active'
			}
		],
		frozenCategories: []
	};

	it('renders full-width slider track and fine 0.5% step for each category', () => {
		const { html } = render(CategoriesPage, {
			props: {
				data: mockPageData as any,
				params: {} as any,
				form: null
			}
		});

		// Full-width slider check
		expect(html).toContain('w-full cursor-pointer rounded-lg bg-fog/80 accent-forest-ink');
		expect(html).toContain('step="0.5"');
		expect(html).toContain('aria-label="Geser persentase untuk Kebutuhan"');
	});

	it('renders micro stepper [-] and [+] buttons with semantic aria-labels', () => {
		const { html } = render(CategoriesPage, {
			props: {
				data: mockPageData as any,
				params: {} as any,
				form: null
			}
		});

		// Semantic bilingual aria-labels
		expect(html).toContain('aria-label="Kurangi 1% alokasi untuk Kebutuhan"');
		expect(html).toContain('aria-label="Tambah 1% alokasi untuk Kebutuhan"');
	});

	it('disables [-] stepper button when category percentage is at minimum (1%)', () => {
		const { html } = render(CategoriesPage, {
			props: {
				data: mockPageData as any,
				params: {} as any,
				form: null
			}
		});

		// Tabungan has 1% percentage, so step down button must be disabled
		expect(html).toMatch(
			/<button\b[^>]*\saria-label="Kurangi 1% alokasi untuk Tabungan"[^>]*\sdisabled[\s=>]/
		);
		// Kebutuhan has 50% percentage, so step down button must be enabled
		expect(html).not.toMatch(
			/<button\b[^>]*\saria-label="Kurangi 1% alokasi untuk Kebutuhan"[^>]*\sdisabled[\s=>]/
		);
	});

	it('prominently displays real-time Rupiah allocation above slider track', () => {
		const { html } = render(CategoriesPage, {
			props: {
				data: mockPageData as any,
				params: {} as any,
				form: null
			}
		});

		// 50% of 10.000.000 is Rp 5.000.000
		expect(html).toContain('Rp 5.000.000');
		// 1% of 10.000.000 is Rp 100.000
		expect(html).toContain('Rp 100.000');
		// 49% of 10.000.000 is Rp 4.900.000
		expect(html).toContain('Rp 4.900.000');
	});
});
