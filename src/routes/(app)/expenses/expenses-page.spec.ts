import { describe, it, expect } from 'vitest';
import { render } from 'svelte/server';
import ExpensesPage from './+page.svelte';
import type { PageProps } from './$types.js';

describe('Expenses Page Component (Issue #63 Compact Rows & Pagination)', () => {
	const mockData = {
		period: {
			id: 'p-1',
			startDate: '2026-10-21',
			endDate: '2026-11-20',
			totalIncome: 10000000
		},
		summary: {
			totalSpent: 45000,
			remaining: 9955000
		},
		categories: [
			{ id: 'c-1', name: 'Makan', percentage: 50, isSavings: false, status: 'active' },
			{ id: 'c-2', name: 'Investasi', percentage: 20, isSavings: true, status: 'active' }
		],
		expenses: [
			{
				id: 'exp-1',
				name: 'Nasi Padang',
				amount: 45000,
				categoryId: 'c-1',
				categoryName: 'Makan',
				isSavings: false,
				date: '2026-10-21',
				time: '12:30',
				notes: 'Makan siang'
			}
		],
		totalCount: 35,
		allExpensesCount: 35,
		page: 1,
		limit: 15,
		totalPages: 3,
		hasMore: true,
		selectedCategory: ''
	} as unknown as PageProps['data'];

	it('renders compact 2-line list row with edit link and quick delete button', () => {
		const { html } = render(ExpensesPage, {
			props: {
				data: mockData,
				params: {} as any,
				form: null
			}
		});

		// Top line: Name and bold Amount
		expect(html).toContain('Nasi Padang');
		expect(html).toContain('45.000');

		// Bottom line: Category badge, date/time, and quick delete button
		expect(html).toContain('Makan');
		expect(html).toContain('12:30');
		expect(html).toContain('aria-label="Hapus Nasi Padang"');

		// Stretched edit link
		expect(html).toContain('/expenses/exp-1/edit');
		expect(html).toContain('aria-label="Edit Nasi Padang"');

		// Old "Muat Lebih Banyak" button should NOT exist
		expect(html).not.toContain('Muat Lebih Banyak');
	});

	it('renders compact pagination controls with previous disabled on page 1', () => {
		const { html } = render(ExpensesPage, {
			props: {
				data: mockData,
				params: {} as any,
				form: null
			}
		});

		// Status text and semantic aria-label
		expect(html).toContain('Halaman 1 dari 3');
		expect(html).toContain('aria-label="Navigasi halaman pengeluaran"');

		// Previous button disabled on page 1
		expect(html).toMatch(/<button[^>]*disabled[^>]*aria-label="Sebelumnya"/);

		// Next button enabled on page 1 of 3
		expect(html).toContain('aria-label="Berikutnya"');
	});

	it('disables next button on the last page', () => {
		const { html } = render(ExpensesPage, {
			props: {
				data: {
					...mockData,
					page: 3,
					totalPages: 3,
					hasMore: false
				} as unknown as PageProps['data'],
				params: {} as any,
				form: null
			}
		});

		expect(html).toContain('Halaman 3 dari 3');

		// Next button disabled on page 3
		expect(html).toMatch(/<button[^>]*disabled[^>]*aria-label="Berikutnya"/);
	});

	it('renders pagination bar with both buttons disabled when totalPages === 1', () => {
		const { html } = render(ExpensesPage, {
			props: {
				data: {
					...mockData,
					page: 1,
					totalPages: 1,
					totalCount: 1,
					hasMore: false
				} as unknown as PageProps['data'],
				params: {} as any,
				form: null
			}
		});

		expect(html).toContain('Halaman 1 dari 1');
		expect(html).toMatch(/<button[^>]*disabled[^>]*aria-label="Sebelumnya"/);
		expect(html).toMatch(/<button[^>]*disabled[^>]*aria-label="Berikutnya"/);
	});
});
