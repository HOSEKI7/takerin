import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from 'svelte/server';
import DashboardPage from './+page.svelte';
import type { PageProps } from './$types.js';

const mockGetDashboardData = vi.fn();

vi.mock(import('#lib/server/db/dashboard.js'), async (importOriginal) => {
	const actual = await importOriginal();
	return {
		...actual,
		getDashboardData: (...args: unknown[]) => mockGetDashboardData(...args)
	};
});

import { load, actions } from './+page.server';

describe('Dashboard Route Server (+page.server.ts)', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('loads dashboard data and returns user, period, summary, categories, and recentExpenses', async () => {
		const mockDashboardData = {
			period: {
				id: 'period-123',
				startDate: '2026-10-21',
				endDate: '2026-11-20',
				payDay: 21,
				totalIncome: 10000000,
				status: 'active'
			},
			summary: {
				totalIncome: 10000000,
				totalSpent: 0,
				remaining: 10000000,
				spentPercentage: 0,
				isWarning80: false
			},
			categories: [
				{
					id: 'cat-1',
					name: 'Kebutuhan',
					percentage: 50,
					allocation: 5000000,
					spent: 0,
					balance: 5000000,
					spentPercentage: 0,
					remainingPercentage: 100,
					isSavings: false,
					status: 'active'
				},
				{
					id: 'cat-2',
					name: 'Tabungan',
					percentage: 20,
					allocation: 2000000,
					spent: 0,
					balance: 2000000,
					spentPercentage: 0,
					remainingPercentage: 100,
					isSavings: true,
					status: 'active'
				}
			],
			recentExpenses: []
		};

		mockGetDashboardData.mockResolvedValue(mockDashboardData);

		const mockEvent = {
			locals: {
				user: { id: 'u-1', name: 'User 1', email: 'u1@example.com', onboardingCompleted: true }
			},
			platform: { env: { DB: {} as unknown as D1Database } }
		} as unknown as Parameters<typeof load>[0];

		const result = (await load(mockEvent)) as typeof mockDashboardData & { user: unknown };

		expect(mockGetDashboardData).toHaveBeenCalledWith(expect.anything(), 'u-1', undefined);
		expect(result).toHaveProperty('user');
		expect(result).toHaveProperty('period');
		expect(result).toHaveProperty('summary');
		expect(result).toHaveProperty('categories');
		expect(result).toHaveProperty('recentExpenses');
		expect(result.summary.totalIncome).toBe(10000000);
		expect(result.categories).toHaveLength(2);
		expect(result.categories[1].isSavings).toBe(true);
	});

	it('loads frozen categories retaining their balance and frozen status', async () => {
		const mockDashboardData = {
			period: {
				id: 'period-123',
				startDate: '2026-10-21',
				endDate: '2026-11-20',
				payDay: 21,
				totalIncome: 10000000,
				status: 'active'
			},
			summary: {
				totalIncome: 10000000,
				totalSpent: 500000,
				remaining: 9500000,
				spentPercentage: 5,
				isWarning80: false
			},
			categories: [
				{
					id: 'cat-active',
					name: 'Kebutuhan',
					percentage: 100,
					allocation: 10000000,
					spent: 300000,
					balance: 9700000,
					spentPercentage: 3,
					remainingPercentage: 97,
					isSavings: false,
					status: 'active'
				},
				{
					id: 'cat-frozen',
					name: 'Kategori Beku',
					percentage: 10,
					allocation: 1000000,
					spent: 200000,
					balance: 800000,
					spentPercentage: 20,
					remainingPercentage: 80,
					isSavings: false,
					status: 'frozen'
				}
			],
			recentExpenses: []
		};

		mockGetDashboardData.mockResolvedValueOnce(mockDashboardData);

		const mockEvent = {
			locals: {
				user: { id: 'u-1', name: 'User 1', email: 'u1@example.com', onboardingCompleted: true }
			},
			platform: { env: { DB: {} as unknown as D1Database } }
		} as unknown as Parameters<typeof load>[0];

		const result = (await load(mockEvent)) as typeof mockDashboardData & { user: unknown };

		expect(result.categories).toHaveLength(2);
		const frozen = result.categories.find((c) => c.status === 'frozen');
		expect(frozen).toBeDefined();
		expect(frozen?.name).toBe('Kategori Beku');
		expect(frozen?.status).toBe('frozen');
		expect(frozen?.balance).toBe(800000);
	});

	it('returns default empty structures if database is not available', async () => {
		const mockEvent = {
			locals: {
				user: { id: 'u-1', name: 'User 1', email: 'u1@example.com' }
			},
			platform: undefined
		} as unknown as Parameters<typeof load>[0];

		const result = (await load(mockEvent)) as {
			user: unknown;
			period: unknown;
			summary: { totalIncome: number };
			categories: unknown[];
			recentExpenses: unknown[];
		};

		expect(result.period).toBeNull();
		expect(result.summary.totalIncome).toBe(0);
		expect(result.categories).toEqual([]);
		expect(result.recentExpenses).toEqual([]);
	});

	it('reuses locals.activePeriod when present instead of re-executing ensureActivePeriod', async () => {
		const mockActivePeriod = {
			id: 'cached-p-1',
			userId: 'u-1',
			startDate: '2026-10-21',
			endDate: '2026-11-20',
			payDay: 21,
			totalIncome: 10000000,
			status: 'active',
			aiSummary: null,
			createdAt: new Date()
		};

		mockGetDashboardData.mockResolvedValue({
			period: mockActivePeriod,
			summary: {
				totalIncome: 10000000,
				totalSpent: 0,
				remaining: 10000000,
				spentPercentage: 0,
				isWarning80: false
			},
			categories: [],
			recentExpenses: []
		});

		const mockEvent = {
			locals: {
				user: { id: 'u-1', name: 'User 1' },
				activePeriod: mockActivePeriod
			},
			platform: { env: { DB: {} as unknown as D1Database } }
		} as unknown as Parameters<typeof load>[0];

		await load(mockEvent);

		expect(mockGetDashboardData).toHaveBeenCalledWith(expect.anything(), 'u-1', mockActivePeriod);
	});

	it('exports confirmIncome form action that delegates to confirmIncomeAction', async () => {
		expect(actions).toBeDefined();
		expect(actions.confirmIncome).toBeDefined();

		// Calling without user rejects with redirect to login
		await expect(
			actions.confirmIncome({
				locals: { user: null },
				platform: { env: { DB: {} as unknown as D1Database } },
				request: { formData: async () => new FormData() }
			} as unknown as Parameters<typeof actions.confirmIncome>[0])
		).rejects.toMatchObject({
			status: 303,
			location: '/auth/login'
		});
	});
});

describe('Dashboard Page Component UI (Issue #65 Hero Balance & Categories)', () => {
	const mockData = {
		user: { id: 'u-1', name: 'Budi Santoso', email: 'budi@example.com' },
		period: {
			id: 'p-1',
			startDate: '2026-10-21',
			endDate: '2026-11-20',
			payDay: 21,
			totalIncome: 10000000,
			status: 'active'
		},
		summary: {
			totalIncome: 10000000,
			totalSpent: 4000000,
			remaining: 6000000,
			spentPercentage: 40,
			isWarning80: false
		},
		categories: [
			{
				id: 'c-1',
				name: 'Kebutuhan Pokok',
				percentage: 40,
				allocation: 4000000,
				spent: 2000000,
				balance: 2000000,
				spentPercentage: 50,
				remainingPercentage: 50,
				isSavings: false,
				status: 'active'
			},
			{
				id: 'c-2',
				name: 'Investasi Masa Depan',
				percentage: 20,
				allocation: 2000000,
				spent: 1000000,
				balance: 1000000,
				spentPercentage: 50,
				remainingPercentage: 50,
				isSavings: true,
				status: 'active'
			},
			{
				id: 'c-3',
				name: 'Hiburan',
				percentage: 15,
				allocation: 1500000,
				spent: 500000,
				balance: 1000000,
				spentPercentage: 33,
				remainingPercentage: 67,
				isSavings: false,
				status: 'active'
			},
			{
				id: 'c-4',
				name: 'Tagihan Listrik & Air',
				percentage: 10,
				allocation: 1000000,
				spent: 500000,
				balance: 500000,
				spentPercentage: 50,
				remainingPercentage: 50,
				isSavings: false,
				status: 'active'
			},
			{
				id: 'c-5',
				name: 'Sedekah',
				percentage: 10,
				allocation: 1000000,
				spent: 0,
				balance: 1000000,
				spentPercentage: 0,
				remainingPercentage: 100,
				isSavings: false,
				status: 'active'
			},
			{
				id: 'c-6',
				name: 'Lain-lain',
				percentage: 5,
				allocation: 500000,
				spent: 0,
				balance: 500000,
				spentPercentage: 0,
				remainingPercentage: 100,
				isSavings: false,
				status: 'active'
			}
		],
		recentExpenses: []
	} as unknown as PageProps['data'];

	it('renders Hero Balance Card with prominent remaining balance and total income/spent', () => {
		const { html } = render(DashboardPage, {
			props: {
				data: mockData,
				params: {} as any,
				form: null
			}
		});

		// Hero Balance display
		expect(html).toContain('data-testid="hero-remaining-balance"');
		expect(html).toContain('6.000.000');
		expect(html).toContain('10.000.000');
		expect(html).toContain('4.000.000');
		expect(html).toContain('40%');
	});

	it('renders top 4 categories by default and shows toggle button when categories > 4', () => {
		const { html } = render(DashboardPage, {
			props: {
				data: mockData,
				params: {} as any,
				form: null
			}
		});

		// Top 4 categories are visible
		expect(html).toContain('Kebutuhan Pokok');
		expect(html).toContain('Investasi Masa Depan');
		expect(html).toContain('Hiburan');
		expect(html).toContain('Tagihan Listrik &amp; Air');

		// 5th and 6th categories should NOT be rendered in default view
		expect(html).not.toContain('Sedekah');
		expect(html).not.toContain('Lain-lain');

		// In-place expansion toggle button is present
		expect(html).toMatch(/Tampilkan Semua Kategori \(6\)|Show All Categories \(6\)/);
	});

	it('renders all categories without toggle button when count <= 4', () => {
		const fewCategoriesData = {
			...mockData,
			categories: mockData.categories.slice(0, 3)
		};

		const { html } = render(DashboardPage, {
			props: {
				data: fewCategoriesData,
				params: {} as any,
				form: null
			}
		});

		expect(html).toContain('Kebutuhan Pokok');
		expect(html).toContain('Investasi Masa Depan');
		expect(html).toContain('Hiburan');
		expect(html).not.toMatch(/Tampilkan Semua Kategori|Show All Categories/);
	});

	it('ensures 2FA / account security module is removed from the dashboard', () => {
		const { html } = render(DashboardPage, {
			props: {
				data: mockData,
				params: {} as any,
				form: null
			}
		});

		// Module 2FA must not exist in dashboard HTML
		expect(html).not.toContain('enable-2fa-password');
		expect(html).not.toContain('disable-2fa-password');
		expect(html).not.toContain('Keamanan Akun &amp; 2FA');
		expect(html).not.toContain('Account Security &amp; 2FA');
	});
});
