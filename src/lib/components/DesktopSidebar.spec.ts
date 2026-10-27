import { describe, it, expect } from 'vitest';
import idDict from '../i18n/id.json';
import enDict from '../i18n/en.json';
import DesktopSidebar, { isRouteActive } from './DesktopSidebar.svelte';
import { render } from 'svelte/server';

describe('DesktopSidebar Component & Navigation Seam (Issue #27)', () => {
	it('exports DesktopSidebar component and verifies isRouteActive helper', () => {
		expect(DesktopSidebar).toBeDefined();
		expect(typeof isRouteActive).toBe('function');
	});

	it('defines required navigation translation keys in id.json and en.json', () => {
		const idNav = idDict.nav as unknown as Record<string, string>;
		const enNav = enDict.nav as unknown as Record<string, string>;

		expect(idNav.mainMenu).toBe('Menu Utama');
		expect(enNav.mainMenu).toBe('Main Menu');

		expect(idNav.preferences).toBe('Preferensi');
		expect(enNav.preferences).toBe('Preferences');

		expect(idNav.accountSettings).toBe('Pengaturan Akun');
		expect(enNav.accountSettings).toBe('Account Settings');

		expect(idNav.collapseSidebar).toBeDefined();
		expect(enNav.collapseSidebar).toBeDefined();

		expect(idNav.expandSidebar).toBeDefined();
		expect(enNav.expandSidebar).toBeDefined();
	});

	it('renders expanded desktop sidebar (~256px / w-64) with grouped navigation and active styling', () => {
		const mockUser = {
			name: 'Budi Santoso',
			email: 'budi@example.com',
			image: null
		};

		const { html } = render(DesktopSidebar, {
			props: {
				user: mockUser,
				isCollapsed: false,
				currentPath: '/expenses/new'
			}
		});

		// Check sidebar container
		expect(html).toContain('w-64');
		expect(html).toContain('bg-fog/40');
		expect(html).toContain('dark:bg-dark-surface');

		// Check menu groups
		expect(html).toContain('Menu Utama');
		expect(html).toContain('Preferensi');

		// Check nav links
		expect(html).toContain('/dashboard');
		expect(html).toContain('/expenses');
		expect(html).toContain('/categories');
		expect(html).toContain('/history');
		expect(html).toContain('/settings');
		expect(html).toContain('Pengaturan Akun');

		// Check active route matching on /expenses (prefix match on /expenses/new)
		expect(html).toContain('aria-current="page"');
		expect(html).toContain('bg-forest-ink text-lime-voltage');

		// Check CTA button
		expect(html).toContain('/expenses/new');
		expect(html).toContain('Catat Pengeluaran');

		// Check user profile in sticky footer
		expect(html).toContain('Budi Santoso');
		expect(html).toContain('budi@example.com');

		// Check developer support mini card with coffee mascot
		expect(html).toContain('mascot/mascot-coffee.webp');
		expect(html).toContain('Traktir Kopi ☕');
	});

	it('renders collapsed desktop sidebar (~72px / w-[72px]) with icon-only CTA, tooltips, and avatar', () => {
		const mockUser = {
			name: 'Budi Santoso',
			email: 'budi@example.com',
			image: null
		};

		const { html } = render(DesktopSidebar, {
			props: {
				user: mockUser,
				isCollapsed: true,
				currentPath: '/dashboard'
			}
		});

		// Check collapsed width
		expect(html).toContain('w-[72px]');

		// Check floating tooltips are rendered
		expect(html).toContain('Dashboard');
		expect(html).toContain('Pengeluaran');
		expect(html).toContain('Pengaturan Akun');

		// Check circular CTA button is present
		expect(html).toContain('/expenses/new');

		// Check initials avatar in sticky footer
		expect(html).toContain('B');

		// Check collapsed developer support button with tooltip
		expect(html).toContain('aria-label="Traktir Kopi ☕"');
	});

	it('correctly matches active route for exact and prefix routes via exported isRouteActive', () => {
		// Exact matches
		expect(isRouteActive('/dashboard', '/dashboard', true)).toBe(true);
		expect(isRouteActive('/dashboard/extra', '/dashboard', true)).toBe(false);

		// Prefix matches for sub-routes
		expect(isRouteActive('/expenses', '/expenses', false)).toBe(true);
		expect(isRouteActive('/expenses/new', '/expenses', false)).toBe(true);
		expect(isRouteActive('/expenses/abc/edit', '/expenses', false)).toBe(true);
		expect(isRouteActive('/expenses-other', '/expenses', false)).toBe(false);

		expect(isRouteActive('/history', '/history', false)).toBe(true);
		expect(isRouteActive('/history/period-2026-10', '/history', false)).toBe(true);

		expect(isRouteActive('/categories', '/categories', false)).toBe(true);
		expect(isRouteActive('/settings', '/settings', false)).toBe(true);
	});
});
