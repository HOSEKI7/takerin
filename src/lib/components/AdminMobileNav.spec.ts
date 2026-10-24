import { describe, it, expect } from 'vitest';
import AdminMobileNav from './AdminMobileNav.svelte';
import { render } from 'svelte/server';

describe('AdminMobileNav Component & Navigation Seam (Issue #30)', () => {
	it('exports AdminMobileNav component', () => {
		expect(AdminMobileNav).toBeDefined();
	});

	it('renders mobile top header with hamburger button, brand logo (/admin), Admin Panel badge, theme toggle, and admin avatar', () => {
		const mockAdmin = {
			name: 'Super Admin',
			email: 'admin@takerin.my.id',
			image: null
		};

		const { html } = render(AdminMobileNav, {
			props: {
				user: mockAdmin,
				isOpen: false,
				currentPath: '/admin'
			}
		});

		// Header is hidden on desktop (lg:hidden) and thin
		expect(html).toContain('lg:hidden');
		expect(html).toContain('<header');

		// Hamburger button with accessibility attributes
		expect(html).toContain('aria-label="Buka menu navigasi"');
		expect(html).toContain('aria-expanded="false"');
		expect(html).toContain('aria-controls="admin-mobile-drawer"');

		// Brand Logo link strictly to /admin
		expect(html).toContain('href="/admin"');
		expect(html).not.toContain('href="/dashboard"');

		// Badge Lime Voltage Admin Panel
		expect(html).toContain('Admin Panel');
		expect(html).toContain('bg-lime-voltage');

		// Admin initial avatar in top header
		expect(html).toContain('S');
	});

	it('renders slide-over drawer with backdrop overlay, admin navigation menu, and admin profile when isOpen is true', () => {
		const mockAdmin = {
			name: 'Super Admin',
			email: 'admin@takerin.my.id',
			image: null
		};

		const { html } = render(AdminMobileNav, {
			props: {
				user: mockAdmin,
				isOpen: true,
				currentPath: '/admin/templates'
			}
		});

		// Backdrop overlay
		expect(html).toContain('bg-obsidian/40');
		expect(html).toContain('backdrop-blur-sm');

		// Drawer modal container
		expect(html).toContain('id="admin-mobile-drawer"');
		expect(html).toContain('role="dialog"');
		expect(html).toContain('aria-modal="true"');
		expect(html).toContain('aria-label="Navigasi Admin"');

		// Close button
		expect(html).toContain('aria-label="Tutup menu navigasi"');

		// Admin Panel badge in drawer header
		expect(html).toContain('Admin Panel');

		// Navigation links
		expect(html).toContain('href="/admin"');
		expect(html).toContain('href="/admin/users"');
		expect(html).toContain('href="/admin/admins"');
		expect(html).toContain('href="/admin/templates"');
		expect(html).toContain('href="/admin/health"');

		// Strict isolation check
		expect(html).not.toContain('href="/dashboard"');
		expect(html).not.toContain('href="/(app)/dashboard"');
		expect(html).not.toContain('Ke Aplikasi');

		// Active styling for current route (/admin/templates)
		expect(html).toContain('aria-current="page"');
		expect(html).toContain('bg-forest-ink text-lime-voltage');

		// Admin profile & logout in drawer footer
		expect(html).toContain('Super Admin');
		expect(html).toContain('admin@takerin.my.id');
		expect(html).toContain('Keluar');
	});

	it('does not render drawer or backdrop overlay when isOpen is false', () => {
		const { html } = render(AdminMobileNav, {
			props: {
				isOpen: false,
				currentPath: '/admin'
			}
		});

		expect(html).not.toContain('id="admin-mobile-drawer"');
		expect(html).not.toContain('bg-obsidian/40');
	});
});
