import { describe, it, expect } from 'vitest';
import idDict from '../i18n/id.json';
import enDict from '../i18n/en.json';
import AdminDesktopSidebar from './AdminDesktopSidebar.svelte';
import { isRouteActive } from './DesktopSidebar.svelte';
import { render } from 'svelte/server';

describe('AdminDesktopSidebar Component & Navigation Seam (Issue #30)', () => {
	it('defines required admin navigation translation keys in id.json and en.json', () => {
		expect(idDict.admin.adminPanel).toBe('Admin Panel');
		expect(enDict.admin.adminPanel).toBe('Admin Panel');

		expect(idDict.admin.navOverview).toBe('Ringkasan');
		expect(enDict.admin.navOverview).toBe('Overview');

		expect(idDict.admin.navUsers).toBe('Pengguna');
		expect(enDict.admin.navUsers).toBe('Users');

		expect(idDict.admin.navAdmins).toBe('Administrator');
		expect(enDict.admin.navAdmins).toBe('Administrator');

		expect(idDict.admin.navTemplates).toBe('Template Kategori');
		expect(enDict.admin.navTemplates).toBe('Category Templates');

		expect(idDict.admin.navHealth).toBe('Kesehatan Sistem');
		expect(enDict.admin.navHealth).toBe('System Health');
	});

	it('renders expanded admin desktop sidebar (~256px / w-64) with Lime Voltage badge and strict isolation', () => {
		const mockAdmin = {
			name: 'Super Admin',
			email: 'admin@takerin.my.id',
			image: null
		};

		const { html } = render(AdminDesktopSidebar, {
			props: {
				user: mockAdmin,
				isCollapsed: false,
				currentPath: '/admin/users'
			}
		});

		// Check sidebar container
		expect(html).toContain('w-64');
		expect(html).toContain('bg-fog/40');
		expect(html).toContain('dark:bg-dark-surface');

		// Check Admin Panel Badge (Lime Voltage)
		expect(html).toContain('Admin Panel');
		expect(html).toContain('bg-lime-voltage');

		// Check strict isolation: Brand logo points to /admin, NOT /dashboard
		expect(html).toContain('href="/admin"');
		expect(html).not.toContain('href="/dashboard"');
		expect(html).not.toContain('href="/(app)/dashboard"');
		expect(html).not.toContain('Ke Aplikasi');

		// Check all 5 admin nav links
		expect(html).toContain('href="/admin"');
		expect(html).toContain('href="/admin/users"');
		expect(html).toContain('href="/admin/admins"');
		expect(html).toContain('href="/admin/templates"');
		expect(html).toContain('href="/admin/health"');

		// Check link labels
		expect(html).toContain('Ringkasan');
		expect(html).toContain('Pengguna');
		expect(html).toContain('Administrator');
		expect(html).toContain('Template Kategori');
		expect(html).toContain('Kesehatan Sistem');

		// Check active route matching on /admin/users (prefix match)
		expect(html).toContain('aria-current="page"');
		expect(html).toContain('bg-forest-ink text-lime-voltage');

		// Check admin user profile in sticky footer
		expect(html).toContain('Super Admin');
		expect(html).toContain('admin@takerin.my.id');
		expect(html).toContain('Keluar');
	});

	it('renders collapsed admin desktop sidebar (~72px / w-[72px]) with icon-only and tooltips', () => {
		const mockAdmin = {
			name: 'Super Admin',
			email: 'admin@takerin.my.id',
			image: null
		};

		const { html } = render(AdminDesktopSidebar, {
			props: {
				user: mockAdmin,
				isCollapsed: true,
				currentPath: '/admin'
			}
		});

		// Check collapsed width
		expect(html).toContain('w-[72px]');

		// Check tooltips rendered
		expect(html).toContain('Ringkasan');
		expect(html).toContain('Pengguna');
		expect(html).toContain('Administrator');
		expect(html).toContain('Template Kategori');
		expect(html).toContain('Kesehatan Sistem');

		// Check initials avatar in sticky footer
		expect(html).toContain('S');
	});

	it('correctly matches active route for admin root and sub-routes', () => {
		// Exact match for /admin
		expect(isRouteActive('/admin', '/admin', true)).toBe(true);
		expect(isRouteActive('/admin/users', '/admin', true)).toBe(false);
		expect(isRouteActive('/admin/admins', '/admin', true)).toBe(false);

		// Prefix match for /admin/users
		expect(isRouteActive('/admin/users', '/admin/users', false)).toBe(true);
		expect(isRouteActive('/admin/users/details', '/admin/users', false)).toBe(true);
		expect(isRouteActive('/admin', '/admin/users', false)).toBe(false);

		// Prefix match for /admin/templates
		expect(isRouteActive('/admin/templates', '/admin/templates', false)).toBe(true);
		expect(isRouteActive('/admin/health', '/admin/templates', false)).toBe(false);
	});
});
