import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from 'svelte/server';
import CategoryHistoryDetailPage from './+page.svelte';
import type { PageProps } from './$types.js';

const mockGetCompletedCategoryDetail = vi.fn();
const mockGetExpenses = vi.fn();
const mockCountExpenses = vi.fn();

vi.mock('#lib/server/db/history.js', () => ({
	getCompletedCategoryDetail: (...args: unknown[]) => mockGetCompletedCategoryDetail(...args)
}));

vi.mock('#lib/server/db/expense.js', () => ({
	getExpenses: (...args: unknown[]) => mockGetExpenses(...args),
	countExpenses: (...args: unknown[]) => mockCountExpenses(...args)
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

		it('loads completed category overview with period, category metrics, and initial 50 expenses', async () => {
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

			const sampleExpenses = [
				{
					id: 'exp-1',
					userId: mockUser.id,
					periodId: 'p-1',
					categoryId: 'c-1',
					categoryName: 'Kebutuhan',
					isSavings: false,
					name: 'Belanja Mingguan',
					amount: 1500000,
					date: '2026-02-01',
					time: '10:00',
					notes: 'Bahan makanan',
					createdAt: new Date(),
					updatedAt: new Date()
				}
			];

			mockGetCompletedCategoryDetail.mockResolvedValue(sampleOverview);
			mockGetExpenses.mockResolvedValue(sampleExpenses);
			mockCountExpenses.mockResolvedValue(1);

			const mockEvent = {
				locals: { user: mockUser },
				platform: { env: { DB: mockD1 } },
				params: { periodId: 'p-1', categoryId: 'c-1' }
			} as unknown as Parameters<typeof load>[0];

			const result = (await load(mockEvent)) as typeof sampleOverview & {
				user: typeof mockUser;
				expenses: typeof sampleExpenses;
				totalCount: number;
			};

			expect(result.period).toEqual(sampleOverview.period);
			expect(result.category).toEqual(sampleOverview.category);
			expect(result.user).toEqual(mockUser);
			expect(result.expenses).toEqual(sampleExpenses);
			expect(result.totalCount).toBe(1);

			expect(mockGetExpenses).toHaveBeenCalledWith(mockD1, {
				userId: mockUser.id,
				periodId: 'p-1',
				categoryId: 'c-1',
				limit: 50,
				offset: 0
			});
			expect(mockCountExpenses).toHaveBeenCalledWith(mockD1, {
				userId: mockUser.id,
				periodId: 'p-1',
				categoryId: 'c-1'
			});
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

		it('renders historical expense cards view-only without edit or delete buttons', () => {
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
							name: 'Kebutuhan',
							percentage: 50,
							allocation: 5000000,
							spent: 1500000,
							balance: 3500000,
							spentPercentage: 30,
							isSavings: false,
							status: 'active'
						},
						expenses: [
							{
								id: 'exp-1',
								userId: mockUser.id,
								periodId: 'p-1',
								categoryId: 'c-1',
								categoryName: 'Kebutuhan',
								isSavings: false,
								name: 'Belanja Sayur & Buah',
								amount: 1500000,
								date: '2026-02-01',
								time: '08:30',
								notes: 'Pasar tradisional',
								createdAt: new Date(),
								updatedAt: new Date()
							}
						],
						totalCount: 1
					},
					params: { periodId: 'p-1', categoryId: 'c-1' },
					form: null
				} as unknown as PageProps
			});

			expect(html).toContain('Belanja Sayur &amp; Buah');
			expect(html).toContain('Kebutuhan');
			expect(html).toContain('08:30');
			expect(html).toContain('Pasar tradisional');
			expect(html).toContain('Rp 1.500.000');

			// Strictly view-only: no edit links, no delete buttons
			expect(html).not.toContain('/edit');
			expect(html).not.toContain('aria-label="Hapus');
			expect(html).not.toContain('aria-label="Ubah');
		});

		it('renders informative empty state card when expenses list is empty', () => {
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
							id: 'c-empty',
							name: 'Dana Darurat',
							percentage: 10,
							allocation: 1000000,
							spent: 0,
							balance: 1000000,
							spentPercentage: 0,
							isSavings: true,
							status: 'active'
						},
						expenses: [],
						totalCount: 0
					},
					params: { periodId: 'p-1', categoryId: 'c-empty' },
					form: null
				} as unknown as PageProps
			});

			expect(html).toContain('Belum Ada Catatan Pengeluaran');
			expect(html).toContain('Tidak ada catatan pengeluaran untuk kategori ini pada periode terkait');
		});

		it('renders "Muat Lebih Banyak" button when totalCount exceeds displayed expenses (Issue #60)', () => {
			const dummyExpenses = Array.from({ length: 50 }, (_, i) => ({
				id: `exp-${i + 1}`,
				userId: mockUser.id,
				periodId: 'p-1',
				categoryId: 'c-1',
				categoryName: 'Kebutuhan',
				isSavings: false,
				name: `Pengeluaran ke-${i + 1}`,
				amount: 50000,
				date: '2026-02-01',
				time: '12:00',
				notes: null,
				createdAt: new Date(),
				updatedAt: new Date()
			}));

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
							name: 'Kebutuhan',
							percentage: 50,
							allocation: 5000000,
							spent: 2500000,
							balance: 2500000,
							spentPercentage: 50,
							isSavings: false,
							status: 'active'
						},
						expenses: dummyExpenses,
						totalCount: 75
					},
					params: { periodId: 'p-1', categoryId: 'c-1' },
					form: null
				} as unknown as PageProps
			});

			expect(html).toContain('Muat Lebih Banyak');
		});

		it('does not render "Muat Lebih Banyak" button when totalCount is less than or equal to displayed expenses (Issue #60)', () => {
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
							name: 'Kebutuhan',
							percentage: 50,
							allocation: 5000000,
							spent: 100000,
							balance: 4900000,
							spentPercentage: 2,
							isSavings: false,
							status: 'active'
						},
						expenses: [
							{
								id: 'exp-1',
								userId: mockUser.id,
								periodId: 'p-1',
								categoryId: 'c-1',
								categoryName: 'Kebutuhan',
								isSavings: false,
								name: 'Sarapan',
								amount: 100000,
								date: '2026-02-01',
								time: '07:00',
								notes: null,
								createdAt: new Date(),
								updatedAt: new Date()
							}
						],
						totalCount: 1
					},
					params: { periodId: 'p-1', categoryId: 'c-1' },
					form: null
				} as unknown as PageProps
			});

			expect(html).not.toContain('Muat Lebih Banyak');
		});
	});
});
