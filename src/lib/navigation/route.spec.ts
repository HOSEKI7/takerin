import { describe, it, expect } from 'vitest';
import { isRouteActive } from './route.js';

describe('Route Navigation Helper (route.ts)', () => {
	it('matches exact routes correctly', () => {
		expect(isRouteActive('/admin', '/admin', true)).toBe(true);
		expect(isRouteActive('/admin/users', '/admin', true)).toBe(false);
		expect(isRouteActive('/dashboard', '/dashboard', true)).toBe(true);
		expect(isRouteActive('/dashboard/expenses', '/dashboard', true)).toBe(false);
	});

	it('matches prefix sub-routes correctly', () => {
		expect(isRouteActive('/admin/users', '/admin/users', false)).toBe(true);
		expect(isRouteActive('/admin/users/123', '/admin/users', false)).toBe(true);
		expect(isRouteActive('/admin/users-other', '/admin/users', false)).toBe(false);
		expect(isRouteActive('/admin', '/admin/users', false)).toBe(false);
	});
});
