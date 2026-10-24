import { describe, it, expect } from 'vitest';
import ContentHeader from './ContentHeader.svelte';
import { render } from 'svelte/server';

describe('ContentHeader Component & Breadcrumbs Seam (Issue #29)', () => {
	it('exports ContentHeader component', () => {
		expect(ContentHeader).toBeDefined();
	});

	it('renders minimal header canvas container without heavy background or disruptive multi-layer borders', () => {
		const { html } = render(ContentHeader, {
			props: {
				currentPath: '/dashboard'
			}
		});

		// Minimalist header container
		expect(html).toContain('content-header');
		expect(html).not.toContain('bg-slate');
		expect(html).not.toContain('bg-obsidian');
	});

	it('renders ARIA-compliant breadcrumb markup with nav, ol, li, and aria-current="page"', () => {
		const { html } = render(ContentHeader, {
			props: {
				currentPath: '/expenses/new'
			}
		});

		// ARIA compliant navigation
		expect(html).toContain('<nav aria-label="Breadcrumb"');
		expect(html).toContain('<ol');
		expect(html).toContain('<li');
		expect(html).toContain('aria-current="page"');
		expect(html).toContain('aria-hidden="true"');
	});

	it('renders dynamic clickable breadcrumb for multi-level sub-route /expenses/new', () => {
		const { html } = render(ContentHeader, {
			props: {
				currentPath: '/expenses/new'
			}
		});

		// Should contain Keuangan link to /dashboard
		expect(html).toContain('/dashboard');
		expect(html).toContain('Keuangan');

		// Should contain Pengeluaran link to /expenses
		expect(html).toContain('/expenses');
		expect(html).toContain('Pengeluaran');

		// Should contain current page Catat Baru as current
		expect(html).toContain('Catat Baru');
	});

	it('renders dynamic clickable breadcrumb for multi-level sub-route /expenses/:id/edit', () => {
		const { html } = render(ContentHeader, {
			props: {
				currentPath: '/expenses/exp-999/edit'
			}
		});

		expect(html).toContain('/dashboard');
		expect(html).toContain('/expenses');
		expect(html).toContain('Edit Pengeluaran');
	});

	it('renders dynamic clickable breadcrumb for multi-level sub-route /history/:periodId', () => {
		const { html } = render(ContentHeader, {
			props: {
				currentPath: '/history/per-2026-10'
			}
		});

		expect(html).toContain('/dashboard');
		expect(html).toContain('/history');
		expect(html).toContain('Riwayat');
		expect(html).toContain('Detail Periode');
	});
});
