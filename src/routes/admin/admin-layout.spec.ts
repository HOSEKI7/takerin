import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';

describe('Admin Layout Modernization & Strict Isolation (Issue #30)', () => {
	const layoutPath = path.resolve('src/routes/admin/+layout.svelte');

	it('integrates AdminDesktopSidebar and AdminMobileNav into admin/+layout.svelte', () => {
		expect(fs.existsSync(layoutPath)).toBe(true);
		const content = fs.readFileSync(layoutPath, 'utf-8');

		expect(content).toContain('AdminDesktopSidebar');
		expect(content).toContain('AdminMobileNav');
		expect(content).toContain('handleLogout');
		expect(content).toContain('{@render children?.()}');
	});

	it('uses responsive desktop shell padding matching sidebar collapse state', () => {
		const content = fs.readFileSync(layoutPath, 'utf-8');

		expect(content).toContain('bind:isCollapsed');
		expect(content).toContain('lg:pl-[72px]');
		expect(content).toContain('lg:pl-64');
	});

	it('removes legacy horizontal topbar and mobile horizontal scrollbar from admin layout', () => {
		const content = fs.readFileSync(layoutPath, 'utf-8');

		// Legacy horizontal topbar & horizontal scrollbar indicators
		expect(content).not.toContain('<!-- ADMIN TOPBAR -->');
		expect(content).not.toContain('overflow-x-auto');
		expect(content).not.toContain('min-w-max items-center justify-around');
	});

	it('enforces strict admin isolation with zero links to user dashboard or app routes', () => {
		const content = fs.readFileSync(layoutPath, 'utf-8');

		expect(content).not.toContain('href="/dashboard"');
		expect(content).not.toContain('href="/(app)/dashboard"');
		expect(content).not.toContain('toApp');
		expect(content).not.toContain('Ke Aplikasi');
	});

	it('includes /admin/feedback link in both AdminDesktopSidebar and AdminMobileNav (Issue #56)', () => {
		const desktopSidebarPath = path.resolve('src/lib/components/AdminDesktopSidebar.svelte');
		const mobileNavPath = path.resolve('src/lib/components/AdminMobileNav.svelte');

		const desktopContent = fs.readFileSync(desktopSidebarPath, 'utf-8');
		const mobileContent = fs.readFileSync(mobileNavPath, 'utf-8');

		expect(desktopContent).toContain("resolve('/admin/feedback')");
		expect(desktopContent).toContain("t('admin.navFeedback')");
		expect(desktopContent).toContain('Comment01Icon');

		expect(mobileContent).toContain("resolve('/admin/feedback')");
		expect(mobileContent).toContain("t('admin.navFeedback')");
		expect(mobileContent).toContain('Comment01Icon');
	});
});
