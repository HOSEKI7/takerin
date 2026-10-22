import { describe, it, expect, vi, beforeEach } from 'vitest';
import { load as layoutLoad } from './+layout.server.js';
import { load as dashboardLoad } from './+page.server.js';
import { load as usersLoad } from './users/+page.server.js';
import { load as templatesLoad, actions as templateActions } from './templates/+page.server.js';
import { load as healthLoad } from './health/+page.server.js';
import * as adminDb from '#lib/server/db/admin.js';

describe('Admin Routes Server Logic (Seam 4)', () => {
	const adminUser = {
		id: 'u-admin-1',
		name: 'Super Admin',
		email: 'admin@takerin.my.id',
		role: 'admin' as const,
		emailVerified: true,
		createdAt: new Date(),
		updatedAt: new Date()
	};

	const regularUser = {
		id: 'u-reg-1',
		name: 'Regular User',
		email: 'user@example.com',
		role: 'user' as const,
		emailVerified: true,
		createdAt: new Date(),
		updatedAt: new Date()
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('+layout.server.ts', () => {
		it('redirects unauthenticated users to /auth/login', async () => {
			await expect(
				layoutLoad({
					locals: { user: null },
					url: new URL('http://localhost:5173/admin')
				} as unknown as Parameters<typeof layoutLoad>[0])
			).rejects.toMatchObject({
				status: 303,
				location: '/auth/login'
			});
		});

		it('redirects non-admin users to /dashboard', async () => {
			await expect(
				layoutLoad({
					locals: { user: regularUser },
					url: new URL('http://localhost:5173/admin')
				} as unknown as Parameters<typeof layoutLoad>[0])
			).rejects.toMatchObject({
				status: 303,
				location: '/dashboard'
			});
		});

		it('allows admin users through and returns user', async () => {
			const result = await layoutLoad({
				locals: { user: adminUser },
				url: new URL('http://localhost:5173/admin')
			} as unknown as Parameters<typeof layoutLoad>[0]);

			expect(result).toEqual({ user: adminUser });
		});
	});

	describe('/admin (+page.server.ts)', () => {
		it('loads analytics from getAdminAnalytics', async () => {
			const mockAnalytics: adminDb.AdminAnalyticsData = {
				totalUsers: 42,
				dau: 12,
				totalExpenses: 350,
				totalExpenseAmount: 15000000,
				topCategories: [{ name: 'makanan', count: 28 }]
			};

			vi.spyOn(adminDb, 'getAdminAnalytics').mockResolvedValueOnce(mockAnalytics);

			const result = (await dashboardLoad({
				locals: { user: adminUser },
				platform: { env: { DB: {} as unknown as D1Database } }
			} as unknown as Parameters<typeof dashboardLoad>[0])) as {
				analytics: adminDb.AdminAnalyticsData;
			};

			expect(result.analytics).toEqual(mockAnalytics);
		});
	});

	describe('/admin/users (+page.server.ts)', () => {
		it('loads user list from getAdminUsers without financial data', async () => {
			const mockUsers: adminDb.AdminUserRecord[] = [
				{
					id: 'u1',
					name: 'User Satu',
					email: 'u1@example.com',
					role: 'user',
					emailVerified: true,
					onboardingCompleted: true,
					createdAt: new Date('2026-10-01'),
					lastActiveAt: new Date('2026-10-22')
				}
			];

			vi.spyOn(adminDb, 'getAdminUsers').mockResolvedValueOnce(mockUsers);

			const result = (await usersLoad({
				locals: { user: adminUser },
				platform: { env: { DB: {} as unknown as D1Database } }
			} as unknown as Parameters<typeof usersLoad>[0])) as {
				users: adminDb.AdminUserRecord[];
			};

			expect(result.users).toEqual(mockUsers);
		});
	});

	describe('/admin/templates (+page.server.ts)', () => {
		it('loads template list from getAdminTemplates', async () => {
			const mockTemplates = [
				{
					id: 'tpl_50_30_20',
					name: '50/30/20',
					description: 'Klasik',
					categories: [{ name: 'Kebutuhan', percentage: 50, isSavings: false }],
					isSystem: true,
					createdAt: new Date(),
					updatedAt: new Date()
				}
			];

			vi.spyOn(adminDb, 'getAdminTemplates').mockResolvedValueOnce(mockTemplates);

			const result = (await templatesLoad({
				locals: { user: adminUser },
				platform: { env: { DB: {} as unknown as D1Database } }
			} as unknown as Parameters<typeof templatesLoad>[0])) as {
				templates: typeof mockTemplates;
			};

			expect(result.templates).toEqual(mockTemplates);
		});

		it('creates a new template via createTemplate action', async () => {
			const createSpy = vi.spyOn(adminDb, 'createCategoryTemplate').mockResolvedValueOnce({
				id: 'tpl-new',
				name: 'Budget Baru',
				description: 'Desc',
				categories: [
					{ name: 'Living', percentage: 60, isSavings: false },
					{ name: 'Saving', percentage: 40, isSavings: true }
				],
				isSystem: false,
				createdAt: new Date(),
				updatedAt: new Date()
			});

			const formData = new FormData();
			formData.append('name', 'Budget Baru');
			formData.append('description', 'Desc');
			formData.append(
				'categories',
				JSON.stringify([
					{ name: 'Living', percentage: 60, isSavings: false },
					{ name: 'Saving', percentage: 40, isSavings: true }
				])
			);

			const mockRequest = {
				formData: vi.fn().mockResolvedValue(formData)
			} as unknown as Request;

			const actionResult = await templateActions.createTemplate({
				request: mockRequest,
				locals: { user: adminUser },
				platform: { env: { DB: {} as unknown as D1Database } }
			} as unknown as Parameters<typeof templateActions.createTemplate>[0]);

			expect(createSpy).toHaveBeenCalled();
			expect(actionResult).toEqual({ success: true, message: 'Template berhasil dibuat.' });
		});

		it('deletes a template via deleteTemplate action', async () => {
			const deleteSpy = vi
				.spyOn(adminDb, 'deleteCategoryTemplate')
				.mockResolvedValueOnce({ success: true });

			const formData = new FormData();
			formData.append('id', 'tpl-to-delete');

			const mockRequest = {
				formData: vi.fn().mockResolvedValue(formData)
			} as unknown as Request;

			const actionResult = await templateActions.deleteTemplate({
				request: mockRequest,
				locals: { user: adminUser },
				platform: { env: { DB: {} as unknown as D1Database } }
			} as unknown as Parameters<typeof templateActions.deleteTemplate>[0]);

			expect(deleteSpy).toHaveBeenCalledWith(expect.anything(), 'tpl-to-delete');
			expect(actionResult).toEqual({ success: true, message: 'Template berhasil dihapus.' });
		});

		it('rejects non-admin users attempting template actions with 403', async () => {
			const mockRequest = {
				formData: vi.fn().mockResolvedValue(new FormData())
			} as unknown as Request;

			const result = await templateActions.createTemplate({
				request: mockRequest,
				locals: { user: regularUser },
				platform: { env: { DB: {} as unknown as D1Database } }
			} as unknown as Parameters<typeof templateActions.createTemplate>[0]);

			expect(result).toMatchObject({
				status: 403,
				data: { error: 'Akses ditolak. Hanya admin yang diizinkan.' }
			});
		});
	});

	describe('/admin/health (+page.server.ts)', () => {
		it('loads system health data from getSystemHealth', async () => {
			const mockHealth: adminDb.SystemHealthData = {
				totalD1RowsEstimate: 120,
				tableBreakdown: {
					user: 10,
					session: 5,
					monthlyPeriod: 10,
					category: 40,
					expense: 50,
					incomeSource: 5,
					categoryTemplate: 2,
					userSettings: 8,
					healthCheck: 0
				},
				aiCallsCount: 15,
				resendUsageLink: 'https://resend.com/emails',
				databaseStatus: 'healthy',
				databaseLatencyMs: 4
			};

			vi.spyOn(adminDb, 'getSystemHealth').mockResolvedValueOnce(mockHealth);

			const result = (await healthLoad({
				locals: { user: adminUser },
				platform: { env: { DB: {} as unknown as D1Database } }
			} as unknown as Parameters<typeof healthLoad>[0])) as {
				health: adminDb.SystemHealthData;
			};

			expect(result.health).toEqual(mockHealth);
		});
	});
});
