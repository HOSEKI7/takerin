import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGetDashboardData = vi.fn();
const mockGetActivePeriodCategories = vi.fn();
const mockCreateExpense = vi.fn();
const mockGetExpenses = vi.fn();
const mockGetExpenseById = vi.fn();
const mockUpdateExpense = vi.fn();
const mockDeleteExpense = vi.fn();

vi.mock('#lib/server/db/dashboard.js', () => ({
	getDashboardData: (...args: unknown[]) => mockGetDashboardData(...args)
}));

vi.mock('#lib/server/db/expense.js', () => ({
	getActivePeriodCategories: (...args: unknown[]) => mockGetActivePeriodCategories(...args),
	createExpense: (...args: unknown[]) => mockCreateExpense(...args),
	getExpenses: (...args: unknown[]) => mockGetExpenses(...args),
	getExpenseById: (...args: unknown[]) => mockGetExpenseById(...args),
	updateExpense: (...args: unknown[]) => mockUpdateExpense(...args),
	deleteExpense: (...args: unknown[]) => mockDeleteExpense(...args)
}));

import { load as loadNew, actions as actionsNew } from './new/+page.server.js';
import { load as loadList, actions as actionsList } from './+page.server.js';
import { load as loadEdit, actions as actionsEdit } from './[id]/edit/+page.server.js';

describe('Expenses Route Server Handlers (Seam 3)', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('/expenses/new', () => {
		it('redirects unauthenticated users to /auth/login', async () => {
			const mockEvent = { locals: { user: null } } as unknown as Parameters<typeof loadNew>[0];
			await expect(loadNew(mockEvent)).rejects.toMatchObject({
				status: 303,
				location: '/auth/login'
			});
		});

		it('loads active period and active categories for new expense', async () => {
			mockGetDashboardData.mockResolvedValue({
				period: { id: 'p-1', startDate: '2026-10-21', endDate: '2026-11-20', totalIncome: 5000000 },
				categories: [
					{
						id: 'c-1',
						name: 'Makan',
						percentage: 50,
						balance: 2500000,
						isSavings: false,
						status: 'active'
					},
					{
						id: 'c-2',
						name: 'Frozen Cat',
						percentage: 10,
						balance: 500000,
						isSavings: false,
						status: 'frozen'
					}
				]
			});

			mockGetActivePeriodCategories.mockResolvedValue([
				{ id: 'c-1', name: 'Makan', percentage: 50, isSavings: false, status: 'active' }
			]);

			const mockEvent = {
				locals: { user: { id: 'u-1', name: 'User 1' } },
				platform: { env: { DB: {} as unknown as D1Database } }
			} as unknown as Parameters<typeof loadNew>[0];

			const data = (await loadNew(mockEvent)) as {
				period: { id: string };
				categories: Array<{ id: string; name: string }>;
			};
			expect(data.period?.id).toBe('p-1');
			expect(data.categories).toHaveLength(1);
			expect(data.categories[0].id).toBe('c-1');
		});

		it('creates expense and redirects to /expenses on valid form submission', async () => {
			mockGetDashboardData.mockResolvedValue({
				period: { id: 'p-1' },
				categories: [{ id: 'c-1', status: 'active' }]
			});
			mockCreateExpense.mockResolvedValue({ id: 'exp-1', success: true });

			const formData = new FormData();
			formData.set('name', 'Nasi Padang');
			formData.set('amount', '45000');
			formData.set('categoryId', 'c-1');
			formData.set('date', '2026-10-21');
			formData.set('time', '13:00');
			formData.set('notes', 'Rendang');

			const mockEvent = {
				locals: { user: { id: 'u-1' } },
				platform: { env: { DB: {} as unknown as D1Database } },
				request: {
					formData: async () => formData
				}
			} as unknown as Parameters<typeof actionsNew.default>[0];

			await expect(actionsNew.default(mockEvent)).rejects.toMatchObject({
				status: 303,
				location: '/expenses'
			});

			expect(mockCreateExpense).toHaveBeenCalledWith(
				expect.anything(),
				expect.objectContaining({
					userId: 'u-1',
					periodId: 'p-1',
					name: 'Nasi Padang',
					amount: 45000,
					categoryId: 'c-1',
					date: '2026-10-21',
					time: '13:00',
					notes: 'Rendang'
				})
			);
		});

		it('rejects submission with frozen or invalid category', async () => {
			mockGetDashboardData.mockResolvedValue({
				period: { id: 'p-1' },
				categories: [{ id: 'c-frozen', status: 'frozen' }]
			});

			const formData = new FormData();
			formData.set('name', 'Nasi Padang');
			formData.set('amount', '45000');
			formData.set('categoryId', 'c-frozen');
			formData.set('date', '2026-10-21');

			const mockEvent = {
				locals: { user: { id: 'u-1' } },
				platform: { env: { DB: {} as unknown as D1Database } },
				request: {
					formData: async () => formData
				}
			} as unknown as Parameters<typeof actionsNew.default>[0];

			const result = await actionsNew.default(mockEvent);
			expect(result).toMatchObject({
				status: 400,
				data: { error: 'Kategori tidak valid atau sudah dibekukan.' }
			});
			expect(mockCreateExpense).not.toHaveBeenCalled();
		});
	});

	describe('/expenses (Listing & Delete)', () => {
		it('loads expenses with category filter', async () => {
			mockGetDashboardData.mockResolvedValue({
				period: { id: 'p-1' },
				categories: [
					{
						id: 'c-1',
						name: 'Makan',
						percentage: 50,
						balance: 2500000,
						isSavings: false,
						status: 'active'
					}
				]
			});

			mockGetExpenses.mockResolvedValue([
				{
					id: 'exp-1',
					name: 'Nasi Padang',
					amount: 45000,
					categoryId: 'c-1',
					categoryName: 'Makan',
					isSavings: false,
					date: '2026-10-21'
				}
			]);

			const mockUrl = new URL('http://localhost/expenses?category=c-1');
			const mockEvent = {
				locals: { user: { id: 'u-1' } },
				platform: { env: { DB: {} as unknown as D1Database } },
				url: mockUrl
			} as unknown as Parameters<typeof loadList>[0];

			const data = (await loadList(mockEvent)) as {
				expenses: Array<{ id: string; name: string }>;
				selectedCategory: string;
			};
			expect(data.expenses).toHaveLength(1);
			expect(data.selectedCategory).toBe('c-1');
			expect(mockGetExpenses).toHaveBeenCalledWith(
				expect.anything(),
				expect.objectContaining({
					userId: 'u-1',
					periodId: 'p-1',
					categoryId: 'c-1'
				})
			);
		});

		it('deletes expense when requested by owner', async () => {
			mockDeleteExpense.mockResolvedValue({ success: true });

			const formData = new FormData();
			formData.set('id', 'exp-1');

			const mockEvent = {
				locals: { user: { id: 'u-1' } },
				platform: { env: { DB: {} as unknown as D1Database } },
				request: {
					formData: async () => formData
				}
			} as unknown as Parameters<typeof actionsList.delete>[0];

			const result = await actionsList.delete(mockEvent);
			expect(result).toEqual({ success: true });
			expect(mockDeleteExpense).toHaveBeenCalledWith(expect.anything(), {
				id: 'exp-1',
				userId: 'u-1'
			});
		});
	});

	describe('/expenses/[id]/edit', () => {
		it('loads expense by id for edit', async () => {
			mockGetDashboardData.mockResolvedValue({
				period: { id: 'p-1' }
			});
			mockGetExpenseById.mockResolvedValue({
				id: 'exp-1',
				name: 'Kopi Kenangan',
				amount: 25000,
				categoryId: 'c-1',
				categoryName: 'Makan',
				date: '2026-10-21'
			});
			mockGetActivePeriodCategories.mockResolvedValue([
				{ id: 'c-1', name: 'Makan', percentage: 50, isSavings: false, status: 'active' }
			]);

			const mockEvent = {
				locals: { user: { id: 'u-1' } },
				params: { id: 'exp-1' },
				platform: { env: { DB: {} as unknown as D1Database } }
			} as unknown as Parameters<typeof loadEdit>[0];

			const data = (await loadEdit(mockEvent)) as {
				expense: { id: string; name: string };
				categories: Array<{ id: string; name: string }>;
			};
			expect(data.expense.id).toBe('exp-1');
			expect(data.expense.name).toBe('Kopi Kenangan');
			expect(data.categories).toHaveLength(1);
		});

		it('updates expense and redirects to /expenses', async () => {
			mockGetDashboardData.mockResolvedValue({
				period: { id: 'p-1' },
				categories: [{ id: 'c-1', status: 'active' }]
			});
			mockGetExpenseById.mockResolvedValue({
				id: 'exp-1',
				userId: 'u-1',
				categoryId: 'c-1'
			});
			mockUpdateExpense.mockResolvedValue({ success: true });

			const formData = new FormData();
			formData.set('name', 'Kopi Kenangan Mantan');
			formData.set('amount', '28000');
			formData.set('categoryId', 'c-1');
			formData.set('date', '2026-10-21');

			const mockEvent = {
				locals: { user: { id: 'u-1' } },
				params: { id: 'exp-1' },
				platform: { env: { DB: {} as unknown as D1Database } },
				request: {
					formData: async () => formData
				}
			} as unknown as Parameters<typeof actionsEdit.default>[0];

			await expect(actionsEdit.default(mockEvent)).rejects.toMatchObject({
				status: 303,
				location: '/expenses'
			});

			expect(mockUpdateExpense).toHaveBeenCalledWith(
				expect.anything(),
				expect.objectContaining({
					id: 'exp-1',
					userId: 'u-1',
					name: 'Kopi Kenangan Mantan',
					amount: 28000
				})
			);
		});

		it('allows updating an expense retaining its existing category even if frozen', async () => {
			mockGetDashboardData.mockResolvedValue({
				period: { id: 'p-1' },
				categories: [{ id: 'c-frozen', status: 'frozen' }]
			});
			mockGetExpenseById.mockResolvedValue({
				id: 'exp-1',
				userId: 'u-1',
				categoryId: 'c-frozen'
			});
			mockUpdateExpense.mockResolvedValue({ success: true });

			const formData = new FormData();
			formData.set('name', 'Biaya Langganan');
			formData.set('amount', '50000');
			formData.set('categoryId', 'c-frozen');
			formData.set('date', '2026-10-21');

			const mockEvent = {
				locals: { user: { id: 'u-1' } },
				params: { id: 'exp-1' },
				platform: { env: { DB: {} as unknown as D1Database } },
				request: {
					formData: async () => formData
				}
			} as unknown as Parameters<typeof actionsEdit.default>[0];

			await expect(actionsEdit.default(mockEvent)).rejects.toMatchObject({
				status: 303,
				location: '/expenses'
			});
		});
	});
});
