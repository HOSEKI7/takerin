import { describe, it, expect, vi } from 'vitest';
import { load, actions } from './+page.server.js';
import { GET as getCsvExport } from '../../api/export/csv/+server.js';
import { GET as getPdfExport } from '../../api/export/pdf/+server.js';
import * as settingsDb from '#lib/server/db/settings.js';
import * as feedbackDb from '#lib/server/db/feedback.js';

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
		it('fails if confirmation text does not match HAPUS AKUN SAYA or DELETE MY ACCOUNT', async () => {
			const formData = new FormData();
			formData.set('confirmText', 'salah');

			const result = await actions.deleteAccount({
				request: new Request('http://localhost/settings', { method: 'POST', body: formData }),
				locals: { user: mockUser },
				platform: { env: { DB: {} as unknown as D1Database } },
				cookies: { delete: vi.fn(), get: vi.fn().mockReturnValue('id') }
			} as unknown as Parameters<typeof actions.deleteAccount>[0]);

			expect(result?.status).toBe(400);
			expect(result?.data).toHaveProperty('deleteError');
		});

		it('deletes user data and redirects to /?deleted=true when confirmation text matches ID phrase', async () => {
			const spy = vi.spyOn(settingsDb, 'deleteUserData').mockResolvedValueOnce();
			const deleteCookieSpy = vi.fn();
			const formData = new FormData();
			formData.set('confirmText', 'HAPUS AKUN SAYA');

			await expect(
				actions.deleteAccount({
					request: new Request('http://localhost/settings', { method: 'POST', body: formData }),
					locals: { user: mockUser },
					platform: { env: { DB: {} as unknown as D1Database } },
					cookies: { delete: deleteCookieSpy, get: vi.fn().mockReturnValue('id') }
				} as unknown as Parameters<typeof actions.deleteAccount>[0])
			).rejects.toMatchObject({
				status: 303,
				location: '/?deleted=true'
			});

			expect(spy).toHaveBeenCalledWith(expect.anything(), mockUserId, mockUser.email);
			expect(deleteCookieSpy).toHaveBeenCalledWith('better-auth.session_token', { path: '/' });
			expect(deleteCookieSpy).toHaveBeenCalledWith('__Secure-better-auth.session_token', { path: '/' });
		});

		it('deletes user data and redirects to /?deleted=true when confirmation text matches EN phrase', async () => {
			const spy = vi.spyOn(settingsDb, 'deleteUserData').mockResolvedValueOnce();
			const deleteCookieSpy = vi.fn();
			const formData = new FormData();
			formData.set('confirmText', 'DELETE MY ACCOUNT');

			await expect(
				actions.deleteAccount({
					request: new Request('http://localhost/settings', { method: 'POST', body: formData }),
					locals: { user: mockUser },
					platform: { env: { DB: {} as unknown as D1Database } },
					cookies: { delete: deleteCookieSpy, get: vi.fn().mockReturnValue('en') }
				} as unknown as Parameters<typeof actions.deleteAccount>[0])
			).rejects.toMatchObject({
				status: 303,
				location: '/?deleted=true'
			});

			expect(spy).toHaveBeenCalledWith(expect.anything(), mockUserId, mockUser.email);
		});

		it('returns 500 fail with localized error when deleteUserData fails', async () => {
			vi.spyOn(settingsDb, 'deleteUserData').mockRejectedValueOnce(new Error('D1 error'));
			const formData = new FormData();
			formData.set('confirmText', 'HAPUS AKUN SAYA');

			const result = await actions.deleteAccount({
				request: new Request('http://localhost/settings', { method: 'POST', body: formData }),
				locals: { user: mockUser },
				platform: { env: { DB: {} as unknown as D1Database } },
				cookies: { delete: vi.fn(), get: vi.fn().mockReturnValue('id') }
			} as unknown as Parameters<typeof actions.deleteAccount>[0]);

			expect(result?.status).toBe(500);
			expect(result?.data).toHaveProperty('deleteError', 'Gagal menghapus akun. Silakan coba beberapa saat lagi.');
		});
	});

	describe('actions.submitFeedback', () => {
		it('redirects to /auth/login when unauthenticated', async () => {
			const formData = new FormData();
			formData.set('type', 'review');
			formData.set('rating', '5');
			formData.set('content', 'Mantap');

			await expect(
				actions.submitFeedback({
					request: new Request('http://localhost/settings?/submitFeedback', {
						method: 'POST',
						body: formData
					}),
					locals: { user: null },
					platform: { env: { DB: {} as unknown as D1Database } }
				} as unknown as Parameters<typeof actions.submitFeedback>[0])
			).rejects.toMatchObject({
				status: 303,
				location: '/auth/login'
			});
		});

		it('returns 500 when database is unavailable', async () => {
			const formData = new FormData();
			formData.set('type', 'review');
			formData.set('rating', '5');
			formData.set('content', 'Mantap');

			const result = await actions.submitFeedback({
				request: new Request('http://localhost/settings?/submitFeedback', {
					method: 'POST',
					body: formData
				}),
				locals: { user: mockUser },
				platform: { env: {} }
			} as unknown as Parameters<typeof actions.submitFeedback>[0]);

			expect(result?.status).toBe(500);
			expect((result?.data as { feedbackError?: string })?.feedbackError).toBeDefined();
		});

		it('returns 400 when review validation fails (missing rating)', async () => {
			const formData = new FormData();
			formData.set('type', 'review');
			formData.set('content', 'Ulasan tanpa rating');

			const result = await actions.submitFeedback({
				request: new Request('http://localhost/settings?/submitFeedback', {
					method: 'POST',
					body: formData
				}),
				locals: { user: mockUser },
				platform: { env: { DB: {} as unknown as D1Database } }
			} as unknown as Parameters<typeof actions.submitFeedback>[0]);

			expect(result?.status).toBe(400);
			expect((result?.data as { feedbackError?: string })?.feedbackError).toBeDefined();
		});

		it('returns 400 when feedback validation fails (missing category)', async () => {
			const formData = new FormData();
			formData.set('type', 'feedback');
			formData.set('content', 'Masukan tanpa kategori');

			const result = await actions.submitFeedback({
				request: new Request('http://localhost/settings?/submitFeedback', {
					method: 'POST',
					body: formData
				}),
				locals: { user: mockUser },
				platform: { env: { DB: {} as unknown as D1Database } }
			} as unknown as Parameters<typeof actions.submitFeedback>[0]);

			expect(result?.status).toBe(400);
			expect((result?.data as { feedbackError?: string })?.feedbackError).toBeDefined();
		});

		it('returns 400 when content is shorter than 3 characters', async () => {
			const formData = new FormData();
			formData.set('type', 'feedback');
			formData.set('category', 'bug');
			formData.set('content', 'ab');

			const result = await actions.submitFeedback({
				request: new Request('http://localhost/settings?/submitFeedback', {
					method: 'POST',
					body: formData
				}),
				locals: { user: mockUser },
				platform: { env: { DB: {} as unknown as D1Database } }
			} as unknown as Parameters<typeof actions.submitFeedback>[0]);

			expect(result?.status).toBe(400);
			expect((result?.data as { feedbackError?: string })?.feedbackError).toBeDefined();
		});

		it('saves valid review to database and returns success', async () => {
			const spy = vi.spyOn(feedbackDb, 'createFeedback').mockResolvedValueOnce({
				id: 'fb-test-1',
				userId: mockUserId,
				type: 'review',
				rating: 5,
				category: null,
				content: 'Aplikasi sangat membantu pengaturan budget bulanan saya.',
				currentRoute: '/settings',
				deviceInfo: 'Mac / Safari',
				status: 'pending',
				isFeatured: false,
				createdAt: new Date(),
				updatedAt: new Date()
			});

			const formData = new FormData();
			formData.set('type', 'review');
			formData.set('rating', '5');
			formData.set('content', 'Aplikasi sangat membantu pengaturan budget bulanan saya.');
			formData.set('currentRoute', '/settings');
			formData.set('deviceInfo', 'Mac / Safari');

			const result = await actions.submitFeedback({
				request: new Request('http://localhost/settings?/submitFeedback', {
					method: 'POST',
					body: formData
				}),
				locals: { user: mockUser },
				platform: { env: { DB: {} as unknown as D1Database } }
			} as unknown as Parameters<typeof actions.submitFeedback>[0]);

			expect(spy).toHaveBeenCalledWith(
				expect.anything(),
				expect.objectContaining({
					userId: mockUserId,
					type: 'review',
					rating: 5,
					content: 'Aplikasi sangat membantu pengaturan budget bulanan saya.',
					currentRoute: '/settings',
					deviceInfo: 'Mac / Safari'
				})
			);
			expect((result as { success?: boolean })?.success).toBe(true);
		});

		it('saves valid feedback to database and returns success', async () => {
			const spy = vi.spyOn(feedbackDb, 'createFeedback').mockResolvedValueOnce({
				id: 'fb-test-2',
				userId: mockUserId,
				type: 'feedback',
				rating: null,
				category: 'feature',
				content: 'Mohon tambahkan fitur dark mode otomatis berdasarkan jam.',
				currentRoute: '/dashboard',
				deviceInfo: null,
				status: 'pending',
				isFeatured: false,
				createdAt: new Date(),
				updatedAt: new Date()
			});

			const formData = new FormData();
			formData.set('type', 'feedback');
			formData.set('category', 'feature');
			formData.set('content', 'Mohon tambahkan fitur dark mode otomatis berdasarkan jam.');
			formData.set('currentRoute', '/dashboard');

			const result = await actions.submitFeedback({
				request: new Request('http://localhost/settings?/submitFeedback', {
					method: 'POST',
					body: formData
				}),
				locals: { user: mockUser },
				platform: { env: { DB: {} as unknown as D1Database } }
			} as unknown as Parameters<typeof actions.submitFeedback>[0]);

			expect(spy).toHaveBeenCalledWith(
				expect.anything(),
				expect.objectContaining({
					userId: mockUserId,
					type: 'feedback',
					category: 'feature',
					content: 'Mohon tambahkan fitur dark mode otomatis berdasarkan jam.'
				})
			);
			expect((result as { success?: boolean })?.success).toBe(true);
			expect((result as { feedbackMessage?: string })?.feedbackMessage).toBe(
				'Ulasan atau masukan Anda berhasil dikirimkan.'
			);
		});

		it('supports English locale responses when takerin_lang cookie is en', async () => {
			const spy = vi.spyOn(feedbackDb, 'createFeedback').mockResolvedValueOnce({
				id: 'fb-test-en',
				userId: mockUserId,
				type: 'review',
				rating: 5,
				category: null,
				content: 'Great personal finance application!',
				currentRoute: '/settings',
				deviceInfo: 'Mac / Chrome',
				status: 'pending',
				isFeatured: false,
				createdAt: new Date(),
				updatedAt: new Date()
			});

			const formData = new FormData();
			formData.set('type', 'review');
			formData.set('rating', '5');
			formData.set('content', 'Great personal finance application!');

			const result = await actions.submitFeedback({
				request: new Request('http://localhost/settings?/submitFeedback', {
					method: 'POST',
					body: formData
				}),
				locals: { user: mockUser },
				platform: { env: { DB: {} as unknown as D1Database } },
				cookies: { get: vi.fn((k: string) => (k === 'takerin_lang' ? 'en' : undefined)) }
			} as unknown as Parameters<typeof actions.submitFeedback>[0]);

			expect(spy).toHaveBeenCalled();
			expect((result as { success?: boolean })?.success).toBe(true);
			expect((result as { feedbackMessage?: string })?.feedbackMessage).toBe(
				'Your review or feedback has been sent successfully.'
			);
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
