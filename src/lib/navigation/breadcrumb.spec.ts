import { describe, it, expect } from 'vitest';
import { getBreadcrumbs, type BreadcrumbItem } from './breadcrumb.js';

describe('Breadcrumb Navigation Logic (Seam 1)', () => {
	it('generates breadcrumb for dashboard as active root', () => {
		const items = getBreadcrumbs('/dashboard');
		expect(items).toEqual<BreadcrumbItem[]>([
			{ label: 'Keuangan', href: '/dashboard' },
			{ label: 'Dashboard', href: '/dashboard', current: true }
		]);
	});

	it('handles root path / or /(app)/dashboard identically', () => {
		const fromRoot = getBreadcrumbs('/');
		expect(fromRoot).toEqual<BreadcrumbItem[]>([
			{ label: 'Keuangan', href: '/dashboard' },
			{ label: 'Dashboard', href: '/dashboard', current: true }
		]);

		const fromRouteGroup = getBreadcrumbs('/(app)/dashboard');
		expect(fromRouteGroup).toEqual<BreadcrumbItem[]>([
			{ label: 'Keuangan', href: '/dashboard' },
			{ label: 'Dashboard', href: '/dashboard', current: true }
		]);
	});

	it('generates breadcrumbs for 1st level main routes (expenses, categories, history, settings)', () => {
		expect(getBreadcrumbs('/expenses')).toEqual<BreadcrumbItem[]>([
			{ label: 'Keuangan', href: '/dashboard' },
			{ label: 'Pengeluaran', href: '/expenses', current: true }
		]);

		expect(getBreadcrumbs('/categories')).toEqual<BreadcrumbItem[]>([
			{ label: 'Keuangan', href: '/dashboard' },
			{ label: 'Kategori', href: '/categories', current: true }
		]);

		expect(getBreadcrumbs('/history')).toEqual<BreadcrumbItem[]>([
			{ label: 'Keuangan', href: '/dashboard' },
			{ label: 'Riwayat', href: '/history', current: true }
		]);

		expect(getBreadcrumbs('/settings')).toEqual<BreadcrumbItem[]>([
			{ label: 'Keuangan', href: '/dashboard' },
			{ label: 'Pengaturan', href: '/settings', current: true }
		]);
	});

	it('generates multi-level breadcrumb for /expenses/new (Catat Baru)', () => {
		const items = getBreadcrumbs('/expenses/new');
		expect(items).toEqual<BreadcrumbItem[]>([
			{ label: 'Keuangan', href: '/dashboard' },
			{ label: 'Pengeluaran', href: '/expenses' },
			{ label: 'Catat Baru', href: '/expenses/new', current: true }
		]);
	});

	it('generates multi-level breadcrumb for /expenses/:id/edit', () => {
		const items = getBreadcrumbs('/expenses/exp_12345/edit');
		expect(items).toEqual<BreadcrumbItem[]>([
			{ label: 'Keuangan', href: '/dashboard' },
			{ label: 'Pengeluaran', href: '/expenses' },
			{ label: 'Edit Pengeluaran', href: '/expenses/exp_12345/edit', current: true }
		]);
	});

	it('generates multi-level breadcrumb for /history/:periodId (Detail Periode)', () => {
		const items = getBreadcrumbs('/history/period_oct_2026');
		expect(items).toEqual<BreadcrumbItem[]>([
			{ label: 'Keuangan', href: '/dashboard' },
			{ label: 'Riwayat', href: '/history' },
			{ label: 'Detail Periode', href: '/history/period_oct_2026', current: true }
		]);
	});

	it('generates fallback breadcrumbs for arbitrary nested paths', () => {
		const items = getBreadcrumbs('/settings/security');
		expect(items).toEqual<BreadcrumbItem[]>([
			{ label: 'Keuangan', href: '/dashboard' },
			{ label: 'Pengaturan', href: '/settings' },
			{ label: 'Security', href: '/settings/security', current: true }
		]);
	});
});
