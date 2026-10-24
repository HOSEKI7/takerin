import { describe, it, expect, vi, beforeEach } from 'vitest';
import { load as layoutLoad } from './+layout.server.js';
import { load as dashboardLoad } from './+page.server.js';
import { load as usersLoad } from './users/+page.server.js';
import { load as templatesLoad, actions as templateActions } from './templates/+page.server.js';
import { load as healthLoad } from './health/+page.server.js';
import { load as adminsLoad, actions as adminActions } from './admins/+page.server.js';
import * as adminDb from '#lib/server/db/admin.js';
import * as emailModule from '#lib/server/email/index.js';

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

		it('enforces strict role boundary: admin users are authenticated and allowed on admin console routes', async () => {
			const adminEvent = {
				locals: { user: adminUser },
				url: new URL('http://localhost:5173/admin/health')
			} as unknown as Parameters<typeof layoutLoad>[0];

			const result = (await layoutLoad(adminEvent)) as { user: typeof adminUser };
			expect(result.user.role).toBe('admin');
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

	describe('/admin/admins (+page.server.ts)', () => {
		const mockAdmins: adminDb.AdminUserRecord[] = [
			{
				id: 'u-admin-1',
				name: 'Admin Takerin',
				email: 'admin@takerin.my.id',
				role: 'admin',
				emailVerified: true,
				onboardingCompleted: true,
				createdAt: new Date('2026-10-01'),
				lastActiveAt: new Date('2026-10-24')
			}
		];

		const mockInvitations: adminDb.AdminInvitationRecord[] = [
			{
				id: 'inv-1',
				email: 'invited@takerin.my.id',
				token: 'tok-123',
				invitedBy: 'u-admin-1',
				status: 'pending',
				expiresAt: new Date(Date.now() + 48 * 3600 * 1000),
				createdAt: new Date(),
				inviterName: 'Admin Takerin',
				inviterEmail: 'admin@takerin.my.id'
			}
		];

		it('loads active admins and invitations list', async () => {
			vi.spyOn(adminDb, 'getActiveAdmins').mockResolvedValueOnce(mockAdmins);
			vi.spyOn(adminDb, 'getAdminInvitations').mockResolvedValueOnce(mockInvitations);

			const result = (await adminsLoad({
				locals: { user: adminUser },
				platform: { env: { DB: {} as unknown as D1Database } }
			} as unknown as Parameters<typeof adminsLoad>[0])) as {
				admins: adminDb.AdminUserRecord[];
				invitations: adminDb.AdminInvitationRecord[];
			};

			expect(result.admins).toEqual(mockAdmins);
			expect(result.invitations).toEqual(mockInvitations);
		});

		it('rejects non-admin users attempting invite action with 403', async () => {
			const mockRequest = {
				formData: vi.fn().mockResolvedValue(new FormData())
			} as unknown as Request;

			const result = await adminActions.invite({
				request: mockRequest,
				locals: { user: regularUser },
				url: new URL('http://localhost:5173/admin/admins'),
				platform: { env: { DB: {} as unknown as D1Database } }
			} as unknown as Parameters<typeof adminActions.invite>[0]);

			expect(result).toMatchObject({
				status: 403,
				data: { error: 'Akses ditolak. Hanya admin yang diizinkan.' }
			});
		});

		it('validates email presence and format on invite', async () => {
			const formData1 = new FormData();
			const mockRequest1 = { formData: vi.fn().mockResolvedValue(formData1) } as unknown as Request;

			const result1 = await adminActions.invite({
				request: mockRequest1,
				locals: { user: adminUser },
				url: new URL('http://localhost:5173/admin/admins'),
				platform: { env: { DB: {} as unknown as D1Database } }
			} as unknown as Parameters<typeof adminActions.invite>[0]);

			expect(result1).toMatchObject({
				status: 400,
				data: { error: 'Alamat email wajib diisi.' }
			});

			const formData2 = new FormData();
			formData2.append('email', 'not-an-email');
			const mockRequest2 = { formData: vi.fn().mockResolvedValue(formData2) } as unknown as Request;

			const result2 = await adminActions.invite({
				request: mockRequest2,
				locals: { user: adminUser },
				url: new URL('http://localhost:5173/admin/admins'),
				platform: { env: { DB: {} as unknown as D1Database } }
			} as unknown as Parameters<typeof adminActions.invite>[0]);

			expect(result2).toMatchObject({
				status: 400,
				data: { error: 'Format alamat email tidak valid.' }
			});
		});

		it('rejects invite if email already belongs to an active administrator', async () => {
			vi.spyOn(adminDb, 'isEmailAdmin').mockResolvedValueOnce(true);

			const formData = new FormData();
			formData.append('email', 'existingadmin@takerin.my.id');
			const mockRequest = { formData: vi.fn().mockResolvedValue(formData) } as unknown as Request;

			const result = await adminActions.invite({
				request: mockRequest,
				locals: { user: adminUser },
				url: new URL('http://localhost:5173/admin/admins'),
				platform: { env: { DB: {} as unknown as D1Database } }
			} as unknown as Parameters<typeof adminActions.invite>[0]);

			expect(result).toMatchObject({
				status: 400,
				data: { error: 'Pengguna dengan email ini sudah terdaftar sebagai Administrator.' }
			});
		});

		it('rejects invite if email already has a pending active invitation', async () => {
			vi.spyOn(adminDb, 'isEmailAdmin').mockResolvedValueOnce(false);
			vi.spyOn(adminDb, 'hasPendingInvitation').mockResolvedValueOnce(true);

			const formData = new FormData();
			formData.append('email', 'pendingadmin@takerin.my.id');
			const mockRequest = { formData: vi.fn().mockResolvedValue(formData) } as unknown as Request;

			const result = await adminActions.invite({
				request: mockRequest,
				locals: { user: adminUser },
				url: new URL('http://localhost:5173/admin/admins'),
				platform: { env: { DB: {} as unknown as D1Database } }
			} as unknown as Parameters<typeof adminActions.invite>[0]);

			expect(result).toMatchObject({
				status: 400,
				data: { error: 'Sudah ada undangan tertunda yang masih aktif untuk email ini.' }
			});
		});

		it('successfully creates invitation and sends invitation email', async () => {
			vi.spyOn(adminDb, 'isEmailAdmin').mockResolvedValueOnce(false);
			vi.spyOn(adminDb, 'hasPendingInvitation').mockResolvedValueOnce(false);
			const createSpy = vi.spyOn(adminDb, 'createAdminInvitation').mockResolvedValueOnce({
				id: 'inv-new',
				email: 'newadmin@takerin.my.id',
				token: 'tok-secret-xyz',
				url: 'http://localhost:5173/auth/admin-invite/tok-secret-xyz',
				expiresAt: new Date(Date.now() + 48 * 3600 * 1000),
				status: 'pending'
			});
			const emailSpy = vi.spyOn(emailModule, 'sendAdminInvitationEmail').mockResolvedValueOnce({
				success: true
			});

			const formData = new FormData();
			formData.append('email', 'newadmin@takerin.my.id');
			const mockRequest = { formData: vi.fn().mockResolvedValue(formData) } as unknown as Request;

			const result = await adminActions.invite({
				request: mockRequest,
				locals: { user: adminUser },
				url: new URL('http://localhost:5173/admin/admins'),
				platform: { env: { DB: {} as unknown as D1Database } }
			} as unknown as Parameters<typeof adminActions.invite>[0]);

			expect(createSpy).toHaveBeenCalledWith(expect.anything(), {
				email: 'newadmin@takerin.my.id',
				invitedBy: adminUser.id,
				origin: 'http://localhost:5173'
			});
			expect(emailSpy).toHaveBeenCalledWith({
				to: 'newadmin@takerin.my.id',
				url: 'http://localhost:5173/auth/admin-invite/tok-secret-xyz',
				invitedByName: adminUser.name
			});
			expect(result).toEqual({
				success: true,
				invitedEmail: 'newadmin@takerin.my.id',
				inviteUrl: 'http://localhost:5173/auth/admin-invite/tok-secret-xyz',
				message: 'Undangan administrator berhasil dikirim.'
			});
		});

		it('rejects non-admin users attempting revoke action with 403', async () => {
			const mockRequest = {
				formData: vi.fn().mockResolvedValue(new FormData())
			} as unknown as Request;

			const result = await adminActions.revoke({
				request: mockRequest,
				locals: { user: regularUser },
				platform: { env: { DB: {} as unknown as D1Database } }
			} as unknown as Parameters<typeof adminActions.revoke>[0]);

			expect(result).toMatchObject({
				status: 403,
				data: { error: 'Akses ditolak. Hanya admin yang diizinkan.' }
			});
		});

		it('validates invitationId on revoke', async () => {
			const formData = new FormData();
			const mockRequest = { formData: vi.fn().mockResolvedValue(formData) } as unknown as Request;

			const result = await adminActions.revoke({
				request: mockRequest,
				locals: { user: adminUser },
				platform: { env: { DB: {} as unknown as D1Database } }
			} as unknown as Parameters<typeof adminActions.revoke>[0]);

			expect(result).toMatchObject({
				status: 400,
				data: { error: 'ID undangan wajib diisi.' }
			});
		});

		it('handles revoke failures (not_found and invalid_status)', async () => {
			vi.spyOn(adminDb, 'revokeAdminInvitation').mockResolvedValueOnce({
				success: false,
				reason: 'not_found'
			});

			const formData1 = new FormData();
			formData1.append('invitationId', 'missing-id');
			const mockRequest1 = { formData: vi.fn().mockResolvedValue(formData1) } as unknown as Request;

			const result1 = await adminActions.revoke({
				request: mockRequest1,
				locals: { user: adminUser },
				platform: { env: { DB: {} as unknown as D1Database } }
			} as unknown as Parameters<typeof adminActions.revoke>[0]);

			expect(result1).toMatchObject({
				status: 404,
				data: { error: 'Undangan tidak ditemukan.' }
			});

			vi.spyOn(adminDb, 'revokeAdminInvitation').mockResolvedValueOnce({
				success: false,
				reason: 'invalid_status'
			});

			const formData2 = new FormData();
			formData2.append('invitationId', 'already-accepted');
			const mockRequest2 = { formData: vi.fn().mockResolvedValue(formData2) } as unknown as Request;

			const result2 = await adminActions.revoke({
				request: mockRequest2,
				locals: { user: adminUser },
				platform: { env: { DB: {} as unknown as D1Database } }
			} as unknown as Parameters<typeof adminActions.revoke>[0]);

			expect(result2).toMatchObject({
				status: 400,
				data: { error: 'Hanya undangan tertunda yang dapat dibatalkan.' }
			});
		});

		it('successfully revokes an invitation', async () => {
			const revokeSpy = vi.spyOn(adminDb, 'revokeAdminInvitation').mockResolvedValueOnce({
				success: true
			});

			const formData = new FormData();
			formData.append('invitationId', 'inv-to-revoke');
			const mockRequest = { formData: vi.fn().mockResolvedValue(formData) } as unknown as Request;

			const result = await adminActions.revoke({
				request: mockRequest,
				locals: { user: adminUser },
				platform: { env: { DB: {} as unknown as D1Database } }
			} as unknown as Parameters<typeof adminActions.revoke>[0]);

			expect(revokeSpy).toHaveBeenCalledWith(expect.anything(), 'inv-to-revoke', adminUser.id);
			expect(result).toEqual({
				success: true,
				revokedId: 'inv-to-revoke',
				message: 'Undangan berhasil dibatalkan.'
			});
		});
	});
});
