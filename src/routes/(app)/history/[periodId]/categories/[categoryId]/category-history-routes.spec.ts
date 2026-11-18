import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from 'svelte/server';
import CategoryHistoryDetailPage from './+page.svelte';
import type { PageProps } from './$types.js';

const mockGetCompletedCategoryDetail = vi.fn();

vi.mock('#lib/server/db/history.js', () => ({
	getCompletedCategoryDetail: (...args: unknown[]) => mockGetCompletedCategoryDetail(...args)
}));

import { load } from './+page.server.js';

describe('Category History Routes & Component Rendering (Seam 3 - Issue #58)', () => {
	const mockUser = {
		id: 'user-cat-history-test',
		name: 'Cat History Tester',
		email: 'cat-history@example.com',
		emailVerified: true,
		createdAt: new Date(),
		updatedAt: new Date()
	};

	const mockD1 = {} as D1Database;

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('/history/[periodId]/categories/[categoryId] route server load', () => {
		it('redirects unauthenticated user to /auth/login with status 303', async () => {
			const mockEvent = {
				locals: { user: null },
				platform: { env: { DB: mockD1 } },
				params: { periodId: 'p-1', categoryId: 'c-1' }
			} as unknown as Parameters<typeof load>[0];

			await expect(load(mockEvent)).rejects.toMatchObject({
				status: 303,
				location: '/auth/login'
			});
		});

		it('throws 404 error if completed category overview is not found', async () => {
			mockGetCompletedCategoryDetail.mockResolvedValue(null);

			const mockEvent = {
				locals: { user: mockUser },
				platform: { env: { DB: mockD1 } },
				params: { periodId: 'p-1', categoryId: 'c-non-existent' }
			} as unknown as Parameters<typeof load>[0];

			await expect(load(mockEvent)).rejects.toMatchObject({
				status: 404
			});

			expect(mockGetCompletedCategoryDetail).toHaveBeenCalledWith(
				mockD1,
				mockUser.id,
				'p-1',
				'c-non-existent'
			);
		});

		it('loads completed category overview with period and category metrics', async () => {
			const sampleOverview = {
				period: {
					id: 'p-1',
					startDate: '2026-01-25',
					endDate: '2026-02-24',
					payDay: 25,
					totalIncome: 10000000,
					status: 'completed'
				},
				category: {
					id: 'c-1',
					name: 'Kebutuhan',
					percentage: 50,
					allocation: 5000000,
					spent: 3500000,
					balance: 1500000,
					spentPercentage: 70,
					isSavings: false,
					status: 'active'
				}
			};

			mockGetCompletedCategoryDetail.mockResolvedValue(sampleOverview);

			const mockEvent = {
				locals: { user: mockUser },
				platform: { env: { DB: mockD1 } },
				params: { periodId: 'p-1', categoryId: 'c-1' }
			} as unknown as Parameters<typeof load>[0];

			const result = (await load(mockEvent)) as typeof sampleOverview & { user: typeof mockUser };

			expect(result.period).toEqual(sampleOverview.period);
			expect(result.category).toEqual(sampleOverview.category);
			expect(result.user).toEqual(mockUser);
		});
	});

	describe('Category History Detail Page Component (+page.svelte)', () => {
		it('renders back navigation button linking to parent period history', () => {
			const { html } = render(CategoryHistoryDetailPage, {
				props: {
					data: {
						user: mockUser,
						period: {
							id: 'p-1',
							startDate: '2026-01-25',
							endDate: '2026-02-24',
							payDay: 25,
							totalIncome: 10000000,
							status: 'completed'
						},
						category: {
							id: 'c-1',
							name: 'Kebutuhan Pokok',
							percentage: 50,
							allocation: 5000000,
							spent: 3500000,
							balance: 1500000,
							spentPercentage: 70,
							isSavings: false,
							status: 'active'
						}
					},
					params: { periodId: 'p-1', categoryId: 'c-1' },
					form: null
				} as unknown as PageProps
			});

			expect(html).toContain('href="/history/p-1"');
			expect(html).toContain('Kembali ke Riwayat Periode');
			expect(html).toContain('Kebutuhan Pokok');
		});

		it('renders category summary card with metrics and progress bar', () => {
			const { html } = render(CategoryHistoryDetailPage, {
				props: {
					data: {
						user: mockUser,
						period: {
							id: 'p-1',
							startDate: '2026-01-25',
							endDate: '2026-02-24',
							payDay: 25,
							totalIncome: 10000000,
							status: 'completed'
						},
						category: {
							id: 'c-1',
							name: 'Kebutuhan Pokok',
							percentage: 50,
							allocation: 5000000,
							spent: 3500000,
							balance: 1500000,
							spentPercentage: 70,
							isSavings: false,
							status: 'active'
						}
					},
					params: { periodId: 'p-1', categoryId: 'c-1' },
					form: null
				} as unknown as PageProps
			});

			expect(html).toContain('Rp 5.000.000');
			expect(html).toContain('Rp 3.500.000');
			expect(html).toContain('Rp 1.500.000');
			expect(html).toContain('70%');
		});

		it('renders savings and frozen badges when applicable', () => {
			const { html } = render(CategoryHistoryDetailPage, {
				props: {
					data: {
						user: mockUser,
						period: {
							id: 'p-1',
							startDate: '2026-01-25',
							endDate: '2026-02-24',
							payDay: 25,
							totalIncome: 10000000,
							status: 'completed'
						},
						category: {
							id: 'c-savings',
							name: 'Tabungan Nikah',
							percentage: 20,
							allocation: 2000000,
							spent: 2000000,
							balance: 0,
							spentPercentage: 100,
							isSavings: true,
							status: 'frozen'
						}
					},
					params: { periodId: 'p-1', categoryId: 'c-savings' },
					form: null
				} as unknown as PageProps
			});

			expect(html).toContain('Tabungan');
			expect(html).toContain('Dibekukan');
		});
	});
});
