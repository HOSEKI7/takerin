import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGetDashboardData = vi.fn();

vi.mock(import('#lib/server/db/dashboard.js'), async (importOriginal) => {
	const actual = await importOriginal();
	return {
		...actual,
		getDashboardData: (...args: unknown[]) => mockGetDashboardData(...args)
	};
});

import { load } from './+page.server';

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

		expect(mockGetDashboardData).toHaveBeenCalledWith(expect.anything(), 'u-1');
		expect(result).toHaveProperty('user');
		expect(result).toHaveProperty('period');
		expect(result).toHaveProperty('summary');
		expect(result).toHaveProperty('categories');
		expect(result).toHaveProperty('recentExpenses');
		expect(result.summary.totalIncome).toBe(10000000);
		expect(result.categories).toHaveLength(2);
		expect(result.categories[1].isSavings).toBe(true);
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
});
