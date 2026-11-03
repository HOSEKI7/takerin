import { describe, it, expect, vi } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as periodDb from '#lib/server/db/period.js';

describe('App Route Group & Centralized Layout (Issue #26)', () => {
	const appDir = path.resolve('src/routes/(app)');

	it('creates the (app) route group directory with all protected routes', () => {
		expect(fs.existsSync(appDir)).toBe(true);

		const expectedProtectedRoutes = ['dashboard', 'categories', 'expenses', 'history', 'settings'];

		for (const route of expectedProtectedRoutes) {
			const routePath = path.join(appDir, route);
			expect(fs.existsSync(routePath), `Route directory for ${route} should exist in (app)`).toBe(
				true
			);
			expect(
				fs.existsSync(path.join(routePath, '+page.svelte')),
				`+page.svelte for ${route} should exist in (app)/${route}`
			).toBe(true);
		}
	});

	it('creates centralized (app)/+layout.svelte shell with children() render', () => {
		const layoutPath = path.join(appDir, '+layout.svelte');
		expect(fs.existsSync(layoutPath)).toBe(true);

		const content = fs.readFileSync(layoutPath, 'utf-8');
		expect(content).toContain('{@render children()}');
		expect(content).toContain('DesktopSidebar');
		expect(content).toContain('MobileNav');
		expect(content).toContain('handleLogout');
	});

	it('integrates DesktopSidebar with responsive desktop padding shell (Issue #27)', () => {
		const layoutPath = path.join(appDir, '+layout.svelte');
		const content = fs.readFileSync(layoutPath, 'utf-8');

		expect(content).toContain('DesktopSidebar');
		expect(content).toContain('bind:isCollapsed');
		expect(content).toContain('lg:pl-[72px]');
		expect(content).toContain('lg:pl-64');
	});

	it('integrates MobileNav with slide-over drawer and thin header for mobile & tablet (Issue #28)', () => {
		const layoutPath = path.join(appDir, '+layout.svelte');
		const content = fs.readFileSync(layoutPath, 'utf-8');

		expect(content).toContain('MobileNav');
		expect(content).not.toContain('min-w-max items-center justify-around');
	});

	it('removes duplicated topbars from protected page views', () => {
		const pagesToCheck = [
			'dashboard/+page.svelte',
			'categories/+page.svelte',
			'expenses/+page.svelte',
			'history/+page.svelte',
			'settings/+page.svelte'
		];

		for (const pageRel of pagesToCheck) {
			const pagePath = path.join(appDir, pageRel);
			const content = fs.readFileSync(pagePath, 'utf-8');
			expect(content).not.toContain('<header');
		}
	});

	it('properly evaluates isNavActive for exact and prefix matches', () => {
		function isNavActive(currentPath: string, itemHref: string, exact: boolean) {
			if (exact) {
				return currentPath === itemHref;
			}
			return currentPath.startsWith(itemHref);
		}

		// Exact matching for dashboard
		expect(isNavActive('/dashboard', '/dashboard', true)).toBe(true);
		expect(isNavActive('/dashboard/sub', '/dashboard', true)).toBe(false);

		// Prefix matching for expenses
		expect(isNavActive('/expenses', '/expenses', false)).toBe(true);
		expect(isNavActive('/expenses/new', '/expenses', false)).toBe(true);
		expect(isNavActive('/expenses/123/edit', '/expenses', false)).toBe(true);
		expect(isNavActive('/categories', '/expenses', false)).toBe(false);

		// Prefix matching for history
		expect(isNavActive('/history', '/history', false)).toBe(true);
		expect(isNavActive('/history/period-1', '/history', false)).toBe(true);
	});

	it('integrates ContentHeader with dynamic breadcrumbs inside (app)/+layout.svelte (Issue #29)', () => {
		const layoutPath = path.join(appDir, '+layout.svelte');
		const content = fs.readFileSync(layoutPath, 'utf-8');

		expect(content).toContain('ContentHeader');
		expect(content).toContain('<ContentHeader');
	});

	it('removes redundant manual back buttons from sub-route pages (Issue #29)', () => {
		const expensesNew = fs.readFileSync(path.join(appDir, 'expenses/new/+page.svelte'), 'utf-8');
		const expensesEdit = fs.readFileSync(
			path.join(appDir, 'expenses/[id]/edit/+page.svelte'),
			'utf-8'
		);
		const historyPeriod = fs.readFileSync(
			path.join(appDir, 'history/[periodId]/+page.svelte'),
			'utf-8'
		);

		// Manual back button with aria-label common.back should be removed in favor of breadcrumbs
		expect(expensesNew).not.toContain("aria-label={t('common.back')}");
		expect(expensesEdit).not.toContain("aria-label={t('common.back')}");
		expect(historyPeriod).not.toContain("aria-label={t('common.back')}");
		expect(historyPeriod).not.toContain("{t('history.periodList')}");
	});

	it('provides activePeriod and incomeSources from +layout.server.ts (Issue #46)', async () => {
		const { load } = await import('./+layout.server.js');

		// 1. When no user or period
		const emptyResult = await load({
			locals: { user: null, activePeriod: null },
			platform: undefined
		} as unknown as Parameters<typeof load>[0]);

		expect(emptyResult).toBeDefined();
		if (!emptyResult) return;
		expect(emptyResult.activePeriod).toBeNull();
		expect(emptyResult.incomeConfirmedAt).toBeNull();
		expect(emptyResult.incomeSources).toEqual([]);

		// 2. When activePeriod and user exist
		const mockPeriod = {
			id: 'p-1',
			userId: 'u-1',
			startDate: '2026-10-25',
			endDate: '2026-11-24',
			payDay: 25,
			totalIncome: 10000000,
			status: 'active' as const,
			aiSummary: null,
			incomeConfirmedAt: null,
			createdAt: new Date()
		};

		const populatedResult = await load({
			locals: {
				user: { id: 'u-1', name: 'Tester', email: 'test@example.com' },
				activePeriod: mockPeriod
			},
			platform: {
				env: {
					DB: undefined
				}
			}
		} as unknown as Parameters<typeof load>[0]);

		expect(populatedResult).toBeDefined();
		if (!populatedResult) return;
		expect(populatedResult.activePeriod).toEqual(mockPeriod);
		expect(populatedResult.incomeConfirmedAt).toBeNull();
		expect(populatedResult.incomeSources).toEqual([]);
	});

	it('integrates IncomeConfirmationModal as blocking gate in (app)/+layout.svelte (Issue #48)', () => {
		const layoutPath = path.join(appDir, '+layout.svelte');
		const content = fs.readFileSync(layoutPath, 'utf-8');

		expect(content).toContain('IncomeConfirmationModal');
		expect(content).toContain('<IncomeConfirmationModal');
		expect(content).toContain('showIncomeGate');
		expect(content).toContain('data.incomeSources');
		expect(content).toContain('inert={showIncomeGate');
		expect(content).toContain('beforeNavigate');
	});

	describe('confirmIncome Form Action (Issue #48)', () => {
		it('redirects to login when unauthenticated', async () => {
			const { _confirmIncome } = await import('./+layout.server.js');
			expect(_confirmIncome).toBeDefined();

			await expect(
				_confirmIncome({
					locals: { user: null, activePeriod: null },
					platform: { env: { DB: {} as unknown as D1Database } },
					request: { formData: async () => new FormData() }
				} as unknown as Parameters<typeof _confirmIncome>[0])
			).rejects.toMatchObject({
				status: 303,
				location: '/auth/login'
			});
		});

		it('returns fail(500) when D1 database is unavailable (supporting bilingual messages)', async () => {
			const { _confirmIncome } = await import('./+layout.server.js');

			// Default / Indonesian
			const resultId = await _confirmIncome({
				locals: {
					user: { id: 'u-1', email: 'user@example.com' },
					activePeriod: { id: 'p-1', totalIncome: 5000000 }
				},
				platform: undefined,
				request: { formData: async () => new FormData() },
				cookies: { get: () => 'id' }
			} as unknown as Parameters<typeof _confirmIncome>[0]);

			expect(resultId).toMatchObject({
				status: 500,
				data: expect.objectContaining({ error: 'Database tidak tersedia.' })
			});

			// English
			const resultEn = await _confirmIncome({
				locals: {
					user: { id: 'u-1', email: 'user@example.com' },
					activePeriod: { id: 'p-1', totalIncome: 5000000 }
				},
				platform: undefined,
				request: { formData: async () => new FormData() },
				cookies: { get: () => 'en' }
			} as unknown as Parameters<typeof _confirmIncome>[0]);

			expect(resultEn).toMatchObject({
				status: 500,
				data: expect.objectContaining({ error: 'Database is unavailable.' })
			});
		});

		it('returns fail(400) when no active period exists', async () => {
			const { _confirmIncome } = await import('./+layout.server.js');
			vi.spyOn(periodDb, 'ensureActivePeriod').mockResolvedValueOnce({
				period: null,
				transitioned: false
			});

			const formData = new FormData();
			formData.set('incomeSources', JSON.stringify([{ name: 'Gaji', amount: 10000000 }]));

			const result = await _confirmIncome({
				locals: {
					user: { id: 'u-1', email: 'user@example.com' },
					activePeriod: null
				},
				platform: { env: { DB: {} as unknown as D1Database } },
				request: { formData: async () => formData }
			} as unknown as Parameters<typeof _confirmIncome>[0]);

			expect(result).toMatchObject({
				status: 400,
				data: expect.objectContaining({ error: expect.any(String) })
			});
		});

		it('returns fail(400) when incomeSources payload is invalid or empty', async () => {
			const { _confirmIncome } = await import('./+layout.server.js');

			// Empty string
			const formDataEmpty = new FormData();
			formDataEmpty.set('incomeSources', '');

			const resEmpty = await _confirmIncome({
				locals: {
					user: { id: 'u-1', email: 'user@example.com' },
					activePeriod: { id: 'p-1' }
				},
				platform: { env: { DB: {} as unknown as D1Database } },
				request: { formData: async () => formDataEmpty }
			} as unknown as Parameters<typeof _confirmIncome>[0]);

			expect(resEmpty).toMatchObject({
				status: 400
			});

			// Empty array
			const formDataEmptyArr = new FormData();
			formDataEmptyArr.set('incomeSources', '[]');

			const resEmptyArr = await _confirmIncome({
				locals: {
					user: { id: 'u-1', email: 'user@example.com' },
					activePeriod: { id: 'p-1' }
				},
				platform: { env: { DB: {} as unknown as D1Database } },
				request: { formData: async () => formDataEmptyArr }
			} as unknown as Parameters<typeof _confirmIncome>[0]);

			expect(resEmptyArr).toMatchObject({
				status: 400
			});

			// Item with empty name
			const formDataInvalidName = new FormData();
			formDataInvalidName.set('incomeSources', JSON.stringify([{ name: '  ', amount: 5000000 }]));

			const resInvalidName = await _confirmIncome({
				locals: {
					user: { id: 'u-1', email: 'user@example.com' },
					activePeriod: { id: 'p-1' }
				},
				platform: { env: { DB: {} as unknown as D1Database } },
				request: { formData: async () => formDataInvalidName }
			} as unknown as Parameters<typeof _confirmIncome>[0]);

			expect(resInvalidName).toMatchObject({
				status: 400
			});

			// Item with zero or negative amount
			const formDataZero = new FormData();
			formDataZero.set('incomeSources', JSON.stringify([{ name: 'Gaji', amount: 0 }]));

			const resZero = await _confirmIncome({
				locals: {
					user: { id: 'u-1', email: 'user@example.com' },
					activePeriod: { id: 'p-1' }
				},
				platform: { env: { DB: {} as unknown as D1Database } },
				request: { formData: async () => formDataZero }
			} as unknown as Parameters<typeof _confirmIncome>[0]);

			expect(resZero).toMatchObject({
				status: 400
			});
		});

		it('confirms income, updates database and mutates locals.activePeriod successfully', async () => {
			const { _confirmIncome } = await import('./+layout.server.js');
			const confirmedAt = new Date();
			const confirmSpy = vi.spyOn(periodDb, 'confirmPeriodIncome').mockResolvedValueOnce({
				success: true,
				totalIncome: 15000000,
				incomeConfirmedAt: confirmedAt
			});

			const formData = new FormData();
			formData.set(
				'incomeSources',
				JSON.stringify([
					{ name: 'Gaji Utama', amount: 10000000 },
					{ name: 'Freelance', amount: 5000000 }
				])
			);

			const mockActivePeriod = {
				id: 'p-1',
				userId: 'u-1',
				totalIncome: 10000000,
				incomeConfirmedAt: null as Date | null
			};

			const result = await _confirmIncome({
				locals: {
					user: { id: 'u-1', email: 'user@example.com' },
					activePeriod: mockActivePeriod
				},
				platform: { env: { DB: {} as unknown as D1Database } },
				request: { formData: async () => formData }
			} as unknown as Parameters<typeof _confirmIncome>[0]);

			expect(confirmSpy).toHaveBeenCalledWith(expect.anything(), 'u-1', 'p-1', [
				{ name: 'Gaji Utama', amount: 10000000 },
				{ name: 'Freelance', amount: 5000000 }
			]);

			expect(result).toMatchObject({
				success: true,
				totalIncome: 15000000
			});

			expect(mockActivePeriod.totalIncome).toBe(15000000);
			expect(mockActivePeriod.incomeConfirmedAt).toBe(confirmedAt);
		});
	});
});
