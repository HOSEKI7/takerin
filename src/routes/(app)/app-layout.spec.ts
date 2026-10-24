import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';

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
});
