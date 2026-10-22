import { describe, it, expect, vi } from 'vitest';
import { load, actions } from './+page.server.js';
import { GET as getCsvExport } from '../api/export/csv/+server.js';
import { GET as getPdfExport } from '../api/export/pdf/+server.js';
import * as settingsDb from '#lib/server/db/settings.js';

describe('Settings Route Server Logic & Export Endpoints (Seam 4)', () => {
	const mockUserId = 'user-settings-route-test';
	const mockUser = {
		id: mockUserId,
		name: 'Budi Santoso',
		email: 'budi@example.com',
		role: 'user',
		emailVerified: true,
		twoFactorEnabled: false
	};

	describe('load', () => {
		it('redirects to /auth/login when unauthenticated', async () => {
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

		it('loads profile, settings, activePeriod, and periods list when authenticated', async () => {
			vi.spyOn(settingsDb, 'getUserSettingsWithProfile').mockResolvedValueOnce({
				user: mockUser,
				settings: { payDay: 25, language: 'id', theme: 'light' },
				activePeriod: { id: 'p1', startDate: '2026-09-25', endDate: '2026-10-24', payDay: 25 }
			});

			vi.spyOn(settingsDb, 'getAllUserPeriodsForExportSelection').mockResolvedValueOnce([
				{ id: 'p1', startDate: '2026-09-25', endDate: '2026-10-24', payDay: 25, status: 'active' }
			]);

			const result = (await load({
				locals: { user: mockUser },
				platform: { env: { DB: {} as unknown as D1Database } }
			} as unknown as Parameters<typeof load>[0])) as {
				profile: { name: string };
				settings: { payDay: number };
				periods: Array<{ id: string }>;
			};

			expect(result.profile.name).toBe('Budi Santoso');
			expect(result.settings.payDay).toBe(25);
			expect(result.periods.length).toBe(1);
		});
	});

	describe('actions.updateProfile', () => {
		it('returns 400 when display name is invalid', async () => {
			const formData = new FormData();
			formData.set('name', ' ');

			const result = await actions.updateProfile({
				request: new Request('http://localhost/settings', { method: 'POST', body: formData }),
				locals: { user: mockUser },
				platform: { env: { DB: {} as unknown as D1Database } }
			} as unknown as Parameters<typeof actions.updateProfile>[0]);

			expect(result?.status).toBe(400);
			expect((result?.data as { profileError?: string })?.profileError).toBeDefined();
		});

		it('updates display name successfully when valid', async () => {
			const spy = vi.spyOn(settingsDb, 'updateUserProfile').mockResolvedValueOnce();
			const formData = new FormData();
			formData.set('name', 'Budi Hartono');

			const result = await actions.updateProfile({
				request: new Request('http://localhost/settings', { method: 'POST', body: formData }),
				locals: { user: mockUser },
				platform: { env: { DB: {} as unknown as D1Database } }
			} as unknown as Parameters<typeof actions.updateProfile>[0]);

			expect(spy).toHaveBeenCalledWith(expect.anything(), mockUserId, { name: 'Budi Hartono' });
			expect((result as { success?: boolean })?.success).toBe(true);
		});
	});

	describe('actions.updateSettings', () => {
		it('rejects payDay change when timing validation fails (Option A)', async () => {
			// Mock active period whose endDate is in the past/today so timing check fails
			vi.spyOn(settingsDb, 'getUserSettingsWithProfile').mockResolvedValueOnce({
				user: mockUser,
				settings: { payDay: 25, language: 'id', theme: 'light' },
				activePeriod: { id: 'p1', startDate: '2026-09-20', endDate: '2026-10-20', payDay: 25 }
			});

			const formData = new FormData();
			formData.set('payDay', '28');

			const result = await actions.updateSettings({
				request: new Request('http://localhost/settings', { method: 'POST', body: formData }),
				locals: { user: mockUser },
				platform: { env: { DB: {} as unknown as D1Database } }
			} as unknown as Parameters<typeof actions.updateSettings>[0]);

			expect(result?.status).toBe(400);
			expect((result?.data as { settingsError?: string })?.settingsError).toBeDefined();
		});

		it('updates language and theme successfully', async () => {
			vi.spyOn(settingsDb, 'getUserSettingsWithProfile').mockResolvedValueOnce({
				user: mockUser,
				settings: { payDay: 25, language: 'id', theme: 'light' },
				activePeriod: { id: 'p1', startDate: '2026-09-25', endDate: '2026-10-24', payDay: 25 }
			});

			const spy = vi.spyOn(settingsDb, 'updateUserSettings').mockResolvedValueOnce();
			const formData = new FormData();
			formData.set('language', 'en');
			formData.set('theme', 'dark');

			const result = await actions.updateSettings({
				request: new Request('http://localhost/settings', { method: 'POST', body: formData }),
				locals: { user: mockUser },
				platform: { env: { DB: {} as unknown as D1Database } }
			} as unknown as Parameters<typeof actions.updateSettings>[0]);

			expect(spy).toHaveBeenCalledWith(expect.anything(), mockUserId, {
				language: 'en',
				theme: 'dark'
			});
			expect((result as { success?: boolean })?.success).toBe(true);
		});
	});

	describe('actions.deleteAccount', () => {
		it('fails if confirmation text does not match HAPUS AKUN SAYA', async () => {
			const formData = new FormData();
			formData.set('confirmText', 'salah');

			const result = await actions.deleteAccount({
				request: new Request('http://localhost/settings', { method: 'POST', body: formData }),
				locals: { user: mockUser },
				platform: { env: { DB: {} as unknown as D1Database } },
				cookies: { delete: vi.fn() }
			} as unknown as Parameters<typeof actions.deleteAccount>[0]);

			expect(result?.status).toBe(400);
		});

		it('deletes user data and redirects to / when confirmation text matches', async () => {
			const spy = vi.spyOn(settingsDb, 'deleteUserData').mockResolvedValueOnce();
			const deleteCookieSpy = vi.fn();
			const formData = new FormData();
			formData.set('confirmText', 'HAPUS AKUN SAYA');

			await expect(
				actions.deleteAccount({
					request: new Request('http://localhost/settings', { method: 'POST', body: formData }),
					locals: { user: mockUser },
					platform: { env: { DB: {} as unknown as D1Database } },
					cookies: { delete: deleteCookieSpy }
				} as unknown as Parameters<typeof actions.deleteAccount>[0])
			).rejects.toMatchObject({
				status: 303,
				location: '/'
			});

			expect(spy).toHaveBeenCalledWith(expect.anything(), mockUserId);
		});
	});

	describe('CSV Export Endpoint (GET /api/export/csv)', () => {
		it('returns 401 when not logged in', async () => {
			const res = await getCsvExport({
				locals: { user: null },
				platform: { env: { DB: {} as unknown as D1Database } }
			} as unknown as Parameters<typeof getCsvExport>[0]);

			expect(res.status).toBe(401);
		});

		it('returns CSV file attachment when logged in', async () => {
			vi.spyOn(settingsDb, 'getAllUserExpensesForExport').mockResolvedValueOnce([
				{
					date: '2026-10-10',
					time: '12:00',
					name: 'Makan Bakso',
					categoryName: 'Makanan',
					amount: 25000,
					notes: null,
					periodRange: '2026-09-25 s/d 2026-10-24'
				}
			]);

			const res = await getCsvExport({
				locals: { user: mockUser },
				platform: { env: { DB: {} as unknown as D1Database } }
			} as unknown as Parameters<typeof getCsvExport>[0]);

			expect(res.status).toBe(200);
			expect(res.headers.get('Content-Type')).toContain('text/csv');
			expect(res.headers.get('Content-Disposition')).toContain('attachment');
			const text = await res.text();
			expect(text).toContain('Makan Bakso');
		});
	});

	describe('PDF Export Endpoint (GET /api/export/pdf)', () => {
		it('returns 401 when not logged in', async () => {
			const res = await getPdfExport({
				url: new URL('http://localhost/api/export/pdf?periodId=p1'),
				locals: { user: null },
				platform: { env: { DB: {} as unknown as D1Database } }
			} as unknown as Parameters<typeof getPdfExport>[0]);

			expect(res.status).toBe(401);
		});

		it('returns 400 when periodId query param is missing', async () => {
			const res = await getPdfExport({
				url: new URL('http://localhost/api/export/pdf'),
				locals: { user: mockUser },
				platform: { env: { DB: {} as unknown as D1Database } }
			} as unknown as Parameters<typeof getPdfExport>[0]);

			expect(res.status).toBe(400);
		});

		it('returns 404 when period detail is not found', async () => {
			vi.spyOn(settingsDb, 'getPeriodDetailForExport').mockResolvedValueOnce(null);

			const res = await getPdfExport({
				url: new URL('http://localhost/api/export/pdf?periodId=notfound'),
				locals: { user: mockUser },
				platform: { env: { DB: {} as unknown as D1Database } }
			} as unknown as Parameters<typeof getPdfExport>[0]);

			expect(res.status).toBe(404);
		});
	});
});
