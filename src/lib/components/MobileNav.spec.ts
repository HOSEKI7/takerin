import { describe, it, expect } from 'vitest';
import idDict from '../i18n/id.json';
import enDict from '../i18n/en.json';
import MobileNav from './MobileNav.svelte';
import { render } from 'svelte/server';

describe('MobileNav Component & Navigation Seam (Issue #28)', () => {
	it('exports MobileNav component', () => {
		expect(MobileNav).toBeDefined();
	});

	it('defines required mobile navigation translation keys in id.json and en.json', () => {
		const idNav = idDict.nav as Record<string, string>;
		const enNav = enDict.nav as Record<string, string>;

		expect(idNav.openMenu).toBe('Buka menu navigasi');
		expect(enNav.openMenu).toBe('Open navigation menu');

		expect(idNav.closeMenu).toBe('Tutup menu navigasi');
		expect(enNav.closeMenu).toBe('Close navigation menu');

		expect(idNav.mobileNav).toBe('Navigasi Mobile');
		expect(enNav.mobileNav).toBe('Mobile Navigation');
	});

	it('renders mobile top header with hamburger button, brand logo, theme toggle, and user avatar', () => {
		const mockUser = {
			name: 'Budi Santoso',
			email: 'budi@example.com',
			image: null
		};

		const { html } = render(MobileNav, {
			props: {
				user: mockUser,
				isOpen: false,
				currentPath: '/dashboard'
			}
		});

		// Header is hidden on desktop (lg:hidden) and thin
		expect(html).toContain('lg:hidden');
		expect(html).toContain('<header');

		// Hamburger button with accessibility attributes
		expect(html).toContain('aria-label="Buka menu navigasi"');
		expect(html).toContain('aria-expanded="false"');
		expect(html).toContain('aria-controls="mobile-drawer"');

		// Brand Logo link to dashboard
		expect(html).toContain('/dashboard');

		// User initial avatar in top header
		expect(html).toContain('B');
	});

	it('renders slide-over drawer with backdrop overlay, navigation groups, CTA, and user profile when isOpen is true', () => {
		const mockUser = {
			name: 'Budi Santoso',
			email: 'budi@example.com',
			image: null
		};

		const { html } = render(MobileNav, {
			props: {
				user: mockUser,
				isOpen: true,
				currentPath: '/expenses/new'
			}
		});

		// Backdrop overlay
		expect(html).toContain('bg-obsidian/40');
		expect(html).toContain('backdrop-blur-sm');

		// Drawer modal container
		expect(html).toContain('id="mobile-drawer"');
		expect(html).toContain('role="dialog"');
		expect(html).toContain('aria-modal="true"');
		expect(html).toContain('aria-label="Navigasi Mobile"');

		// Close button
		expect(html).toContain('aria-label="Tutup menu navigasi"');

		// Menu groups
		expect(html).toContain('Menu Utama');
		expect(html).toContain('Preferensi');

		// Navigation links
		expect(html).toContain('/dashboard');
		expect(html).toContain('/expenses');
		expect(html).toContain('/categories');
		expect(html).toContain('/history');
		expect(html).toContain('/settings');

		// Active styling for current route (/expenses active on /expenses/new)
		expect(html).toContain('aria-current="page"');
		expect(html).toContain('bg-forest-ink text-lime-voltage');

		// Quick action CTA
		expect(html).toContain('/expenses/new');
		expect(html).toContain('Catat Pengeluaran');

		// User profile & logout in drawer footer
		expect(html).toContain('Budi Santoso');
		expect(html).toContain('budi@example.com');
		expect(html).toContain('Keluar');
	});

	it('does not render drawer or backdrop overlay when isOpen is false', () => {
		const { html } = render(MobileNav, {
			props: {
				isOpen: false,
				currentPath: '/dashboard'
			}
		});

		expect(html).not.toContain('id="mobile-drawer"');
		expect(html).not.toContain('bg-obsidian/40');
	});
});
