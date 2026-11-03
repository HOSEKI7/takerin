import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGetExpenses = vi.fn();
const mockCountExpenses = vi.fn();

vi.mock('#lib/server/db/expense.js', () => ({
	getExpenses: (...args: unknown[]) => mockGetExpenses(...args),
	countExpenses: (...args: unknown[]) => mockCountExpenses(...args)
}));

import { GET } from './+server.js';

describe('GET /api/expenses Route Handler (Issue #41)', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('returns 401 when user is not authenticated', async () => {
		const url = new URL('http://localhost/api/expenses');
		const res = await GET({
			locals: { user: null },
			platform: { env: { DB: {} as unknown as D1Database } },
			url
		} as unknown as Parameters<typeof GET>[0]);

		expect(res.status).toBe(401);
		const json = await res.json();
		expect(json).toEqual({ error: 'Unauthorized' });
	});

	it('returns 500 when database is unavailable', async () => {
		const url = new URL('http://localhost/api/expenses');
		const res = await GET({
			locals: { user: { id: 'u-1' } },
			platform: { env: {} },
			url
		} as unknown as Parameters<typeof GET>[0]);

		expect(res.status).toBe(500);
		const json = await res.json();
		expect(json).toEqual({ error: 'Database unavailable' });
	});

	it('returns 400 when periodId is missing and no activePeriod exists', async () => {
		const url = new URL('http://localhost/api/expenses');
		const res = await GET({
			locals: { user: { id: 'u-1' } },
			platform: { env: { DB: {} as unknown as D1Database } },
			url
		} as unknown as Parameters<typeof GET>[0]);

		expect(res.status).toBe(400);
		const json = await res.json();
		expect(json).toEqual({ error: 'Active period not found' });
	});

	it('returns paginated expenses with hasMore flag', async () => {
		const mockExpenses = Array.from({ length: 20 }, (_, i) => ({
			id: `exp-${i + 1}`,
			name: `Expense ${i + 1}`,
			amount: 10000 * (i + 1)
		}));

		mockGetExpenses.mockResolvedValue(mockExpenses);
		mockCountExpenses.mockResolvedValue(45);

		const url = new URL('http://localhost/api/expenses?periodId=p-1&limit=20&offset=0');
		const res = await GET({
			locals: { user: { id: 'u-1' } },
			platform: { env: { DB: {} as unknown as D1Database } },
			url
		} as unknown as Parameters<typeof GET>[0]);

		expect(res.status).toBe(200);
		const json = (await res.json()) as {
			expenses: unknown[];
			totalCount: number;
			hasMore: boolean;
			limit: number;
			offset: number;
		};
		expect(json.expenses).toHaveLength(20);
		expect(json.totalCount).toBe(45);
		expect(json.hasMore).toBe(true);
		expect(json.limit).toBe(20);
		expect(json.offset).toBe(0);

		expect(mockGetExpenses).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({
				userId: 'u-1',
				periodId: 'p-1',
				limit: 20,
				offset: 0
			})
		);
		expect(mockCountExpenses).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({
				userId: 'u-1',
				periodId: 'p-1'
			})
		);
	});

	it('correctly reports hasMore as false on last page', async () => {
		const mockExpenses = Array.from({ length: 5 }, (_, i) => ({
			id: `exp-${i + 41}`,
			name: `Expense ${i + 41}`,
			amount: 50000
		}));

		mockGetExpenses.mockResolvedValue(mockExpenses);
		mockCountExpenses.mockResolvedValue(45);

		const url = new URL('http://localhost/api/expenses?periodId=p-1&limit=20&offset=40');
		const res = await GET({
			locals: { user: { id: 'u-1' } },
			platform: { env: { DB: {} as unknown as D1Database } },
			url
		} as unknown as Parameters<typeof GET>[0]);

		expect(res.status).toBe(200);
		const json = (await res.json()) as {
			expenses: unknown[];
			totalCount: number;
			hasMore: boolean;
		};
		expect(json.expenses).toHaveLength(5);
		expect(json.totalCount).toBe(45);
		expect(json.hasMore).toBe(false);
	});
});
