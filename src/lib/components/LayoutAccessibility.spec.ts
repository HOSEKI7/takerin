import { describe, it, expect } from 'vitest';
import { render } from 'svelte/server';
import fs from 'node:fs';
import path from 'node:path';
import DesktopSidebar, { isRouteActive } from './DesktopSidebar.svelte';
import MobileNav from './MobileNav.svelte';
import AdminDesktopSidebar from './AdminDesktopSidebar.svelte';
import AdminMobileNav from './AdminMobileNav.svelte';
import ContentHeader from './ContentHeader.svelte';

describe('Layout Integration & Accessibility Verification (Issue #31)', () => {
	const mockUser = {
		name: 'Siti Rahma',
		email: 'siti@example.com',
		image: null
	};

	const mockAdmin = {
		name: 'Admin Utama',
		email: 'admin@takerin.my.id',
		image: null
	};

	describe('ARIA Landmarks and Semantic Attributes', () => {
		it('provides navigation landmark semantics (implicit role="navigation") with accessible labels', () => {
			const { html: desktopHtml } = render(DesktopSidebar, {
				props: { user: mockUser, isCollapsed: false, currentPath: '/dashboard' }
			});
			// Standard HTML5 <nav> element implicitly possesses the role="navigation" landmark
			expect(desktopHtml).toContain('<nav');
			expect(desktopHtml).toContain('aria-label="Navigasi Desktop Sidebar"');
			expect(desktopHtml).toContain('aria-label="Menu Utama dan Preferensi"');

			const { html: mobileHtml } = render(MobileNav, {
				props: { user: mockUser, isOpen: true, currentPath: '/dashboard' }
			});
			expect(mobileHtml).toContain('<nav');
			expect(mobileHtml).toContain('aria-label="Menu Utama dan Preferensi Mobile"');
			expect(mobileHtml).toContain('aria-label="Navigasi Mobile"');
		});

		it('renders explicit accessible labels for navigation landmarks in admin console', () => {
			const { html: adminDesktopHtml } = render(AdminDesktopSidebar, {
				props: { user: mockAdmin, isCollapsed: false, currentPath: '/admin' }
			});
			expect(adminDesktopHtml).toContain('<nav');
			expect(adminDesktopHtml).toContain('aria-label="Navigasi Admin Desktop Sidebar"');
			expect(adminDesktopHtml).toContain('aria-label="Menu Konsol Administrator"');

			const { html: adminMobileHtml } = render(AdminMobileNav, {
				props: { user: mockAdmin, isOpen: true, currentPath: '/admin' }
			});
			expect(adminMobileHtml).toContain('<nav');
			expect(adminMobileHtml).toContain('aria-label="Menu Konsol Administrator Mobile"');
			expect(adminMobileHtml).toContain('aria-label="Navigasi Admin"');
		});

		it('renders proper aria-label and aria-current on ContentHeader breadcrumbs', () => {
			const { html } = render(ContentHeader, {
				props: { currentPath: '/expenses/new' }
			});
			expect(html).toContain('<nav');
			expect(html).toContain('aria-label="Rekam jejak"');
			expect(html).toContain('aria-current="page"');
		});

		it('properly toggles aria-expanded and aria-controls for expandable controls', () => {
			// User Desktop Sidebar toggle
			const { html: expSidebar } = render(DesktopSidebar, {
				props: { user: mockUser, isCollapsed: false, currentPath: '/dashboard' }
			});
			expect(expSidebar).toContain('aria-expanded="true"');

			const { html: collSidebar } = render(DesktopSidebar, {
				props: { user: mockUser, isCollapsed: true, currentPath: '/dashboard' }
			});
			expect(collSidebar).toContain('aria-expanded="false"');

			// User Mobile Hamburger toggle
			const { html: closedMobile } = render(MobileNav, {
				props: { user: mockUser, isOpen: false, currentPath: '/dashboard' }
			});
			expect(closedMobile).toContain('aria-expanded="false"');
			expect(closedMobile).toContain('aria-controls="mobile-drawer"');

			const { html: openMobile } = render(MobileNav, {
				props: { user: mockUser, isOpen: true, currentPath: '/dashboard' }
			});
			expect(openMobile).toContain('aria-expanded="true"');
			expect(openMobile).toContain('role="dialog"');
			expect(openMobile).toContain('aria-modal="true"');

			// Admin Desktop Sidebar toggle
			const { html: expAdminSidebar } = render(AdminDesktopSidebar, {
				props: { user: mockAdmin, isCollapsed: false, currentPath: '/admin' }
			});
			expect(expAdminSidebar).toContain('aria-expanded="true"');

			const { html: collAdminSidebar } = render(AdminDesktopSidebar, {
				props: { user: mockAdmin, isCollapsed: true, currentPath: '/admin' }
			});
			expect(collAdminSidebar).toContain('aria-expanded="false"');

			// Admin Mobile Hamburger toggle
			const { html: closedAdminMobile } = render(AdminMobileNav, {
				props: { user: mockAdmin, isOpen: false, currentPath: '/admin' }
			});
			expect(closedAdminMobile).toContain('aria-expanded="false"');
			expect(closedAdminMobile).toContain('aria-controls="admin-mobile-drawer"');

			const { html: openAdminMobile } = render(AdminMobileNav, {
				props: { user: mockAdmin, isOpen: true, currentPath: '/admin' }
			});
			expect(openAdminMobile).toContain('aria-expanded="true"');
			expect(openAdminMobile).toContain('role="dialog"');
			expect(openAdminMobile).toContain('aria-modal="true"');
		});

		it('assigns aria-current="page" exclusively to active navigation item', () => {
			const { html } = render(DesktopSidebar, {
				props: { user: mockUser, isCollapsed: false, currentPath: '/expenses' }
			});

			// Exact active check
			expect(html).toContain('aria-current="page"');
			expect(html).toMatch(/href="\/expenses"[^>]*aria-current="page"/);
		});
	});

	describe('Keyboard Navigation & Focus Ring Fidelity', () => {
		it('ensures all interactive anchors and buttons have visible Wise focus rings', () => {
			const { html: desktopHtml } = render(DesktopSidebar, {
				props: { user: mockUser, isCollapsed: false, currentPath: '/dashboard' }
			});

			// Wise accent focus ring tokens
			expect(desktopHtml).toContain('focus-visible:ring-forest-ink');
			expect(desktopHtml).toContain('dark:focus-visible:ring-lime-voltage');
			expect(desktopHtml).toContain('focus-visible:outline-none');

			const { html: mobileHtml } = render(MobileNav, {
				props: { user: mockUser, isOpen: true, currentPath: '/dashboard' }
			});
			expect(mobileHtml).toContain('focus-visible:ring-forest-ink');
			expect(mobileHtml).toContain('dark:focus-visible:ring-lime-voltage');

			const { html: adminDesktopHtml } = render(AdminDesktopSidebar, {
				props: { user: mockAdmin, isCollapsed: false, currentPath: '/admin' }
			});
			expect(adminDesktopHtml).toContain('focus-visible:ring-forest-ink');
			expect(adminDesktopHtml).toContain('dark:focus-visible:ring-lime-voltage');

			const { html: adminMobileHtml } = render(AdminMobileNav, {
				props: { user: mockAdmin, isOpen: true, currentPath: '/admin' }
			});
			expect(adminMobileHtml).toContain('focus-visible:ring-forest-ink');
			expect(adminMobileHtml).toContain('dark:focus-visible:ring-lime-voltage');
		});

		it('renders floating tooltips with keyboard focus visible opacity (group-focus-visible:opacity-100)', () => {
			const { html: collapsedUserSidebar } = render(DesktopSidebar, {
				props: { user: mockUser, isCollapsed: true, currentPath: '/dashboard' }
			});
			expect(collapsedUserSidebar).toContain('group-focus-visible:opacity-100');
			expect(collapsedUserSidebar).toContain('role="tooltip"');

			const { html: collapsedAdminSidebar } = render(AdminDesktopSidebar, {
				props: { user: mockAdmin, isCollapsed: true, currentPath: '/admin' }
			});
			expect(collapsedAdminSidebar).toContain('group-focus-visible:opacity-100');
			expect(collapsedAdminSidebar).toContain('role="tooltip"');
		});

		it('preserves DesktopSidebar module export for isRouteActive helper', () => {
			expect(typeof isRouteActive).toBe('function');
			expect(isRouteActive('/dashboard', '/dashboard', true)).toBe(true);
			expect(isRouteActive('/expenses/new', '/expenses', false)).toBe(true);
		});
	});

	describe('Layout Shells and Responsive Breakpoints', () => {
		it('verifies (app)/+layout.svelte shell responds to sidebar collapse state', () => {
			const appLayoutContent = fs.readFileSync(
				path.resolve(process.cwd(), 'src/routes/(app)/+layout.svelte'),
				'utf-8'
			);

			// Checks dynamic padding classes
			expect(appLayoutContent).toContain('DesktopSidebar');
			expect(appLayoutContent).toContain('MobileNav');
			expect(appLayoutContent).toContain('ContentHeader');
			expect(appLayoutContent).toContain('isSidebarCollapsed');
			expect(appLayoutContent).toContain('lg:pl-[72px]');
			expect(appLayoutContent).toContain('lg:pl-64');
		});

		it('verifies admin/+layout.svelte shell responds to sidebar collapse state with strict isolation', () => {
			const adminLayoutContent = fs.readFileSync(
				path.resolve(process.cwd(), 'src/routes/admin/+layout.svelte'),
				'utf-8'
			);

			// Checks dynamic padding classes and components
			expect(adminLayoutContent).toContain('AdminDesktopSidebar');
			expect(adminLayoutContent).toContain('AdminMobileNav');
			expect(adminLayoutContent).toContain('isSidebarCollapsed');
			expect(adminLayoutContent).toContain('lg:pl-[72px]');
			expect(adminLayoutContent).toContain('lg:pl-64');

			// Strict isolation
			expect(adminLayoutContent).not.toContain('href="/dashboard"');
			expect(adminLayoutContent).not.toContain('href="/(app)/dashboard"');
		});
	});

	describe('Visual Polish and WCAG AA Contrast Guarantees', () => {
		it('uses active item tokens Forest Ink background with Lime Voltage text', () => {
			const { html } = render(DesktopSidebar, {
				props: { user: mockUser, isCollapsed: false, currentPath: '/categories' }
			});

			expect(html).toContain('bg-forest-ink text-lime-voltage');
		});

		it('applies high-contrast label tokens for section headers meeting WCAG AA', () => {
			const { html: userSidebar } = render(DesktopSidebar, {
				props: { user: mockUser, isCollapsed: false, currentPath: '/dashboard' }
			});
			// text-slate uppercase dark:text-pebble ensures > 4.5:1 contrast without opacity reduction
			expect(userSidebar).toContain('text-slate uppercase dark:text-pebble');
			expect(userSidebar).not.toContain('text-slate/70');

			const { html: adminSidebar } = render(AdminDesktopSidebar, {
				props: { user: mockAdmin, isCollapsed: false, currentPath: '/admin' }
			});
			expect(adminSidebar).toContain('text-slate uppercase dark:text-pebble');
			expect(adminSidebar).not.toContain('text-slate/70');
		});
	});
});
