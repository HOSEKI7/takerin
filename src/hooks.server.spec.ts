import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { RequestEvent } from '@sveltejs/kit';

const mockGetSession = vi.fn();
const mockEnsureActivePeriod = vi.fn();
const mockSetUserRole = vi.fn();
const mockAuth = {
	api: {
		getSession: mockGetSession
	}
};

vi.mock('#lib/server/auth/index.js', async (importOriginal) => {
	const actual = await importOriginal<typeof import('#lib/server/auth/index.js')>();
	return {
		...actual,
		getAuth: () => mockAuth,
		setUserRole: (...args: unknown[]) => mockSetUserRole(...args)
	};
});

vi.mock('#lib/server/db/period.js', () => ({
	ensureActivePeriod: (...args: unknown[]) => mockEnsureActivePeriod(...args)
}));

import { handle } from './hooks.server';

describe('Server Hooks & Route Protection', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('redirects unauthenticated requests targeting /dashboard to /auth/login', async () => {
		mockGetSession.mockResolvedValue(null);

		const mockEvent = {
			url: new URL('http://localhost:5173/dashboard'),
			request: new Request('http://localhost:5173/dashboard'),
			platform: { env: { DB: {} as unknown as D1Database } },
			locals: {} as App.Locals
		} as unknown as RequestEvent;

		const mockResolve = vi.fn().mockResolvedValue(new Response('OK'));

		await expect(handle({ event: mockEvent, resolve: mockResolve })).rejects.toMatchObject({
			status: 303,
			location: '/auth/login'
		});

		expect(mockResolve).not.toHaveBeenCalled();
		expect(mockEvent.locals.user).toBeNull();
	});

	it('allows unauthenticated requests targeting public routes like /auth/login', async () => {
		mockGetSession.mockResolvedValue(null);

		const mockEvent = {
			url: new URL('http://localhost:5173/auth/login'),
			request: new Request('http://localhost:5173/auth/login'),
			platform: { env: { DB: {} as unknown as D1Database } },
			locals: {} as App.Locals
		} as unknown as RequestEvent;

		const mockResolve = vi.fn().mockResolvedValue(new Response('OK'));

		const response = await handle({ event: mockEvent, resolve: mockResolve });
		expect(response.status).toBe(200);
		expect(mockResolve).toHaveBeenCalled();
		expect(mockEvent.locals.user).toBeNull();
	});

	it('populates event.locals.user and allows access to /dashboard when authenticated', async () => {
		const mockUser = {
			id: 'user_1',
			name: 'Budi',
			email: 'budi@example.com',
			role: 'user',
			emailVerified: false,
			onboardingCompleted: true,
			createdAt: new Date(),
			updatedAt: new Date()
		};
		const mockSession = {
			id: 'sess_1',
			userId: 'user_1',
			token: 'token_123',
			expiresAt: new Date(),
			createdAt: new Date(),
			updatedAt: new Date()
		};

		mockGetSession.mockResolvedValue({
			user: mockUser,
			session: mockSession
		});

		const mockEvent = {
			url: new URL('http://localhost:5173/dashboard'),
			request: new Request('http://localhost:5173/dashboard', {
				headers: { cookie: 'better-auth.session_token=token_123' }
			}),
			platform: { env: { DB: {} as unknown as D1Database } },
			locals: {} as App.Locals
		} as unknown as RequestEvent;

		const mockResolve = vi.fn().mockResolvedValue(new Response('Dashboard content'));

		const response = await handle({ event: mockEvent, resolve: mockResolve });
		expect(response.status).toBe(200);
		expect(mockResolve).toHaveBeenCalled();
		expect(mockEvent.locals.user).toEqual(mockUser);
		expect(mockEvent.locals.session).toEqual(mockSession);
	});

	it('redirects unauthenticated requests targeting /onboarding to /auth/login', async () => {
		mockGetSession.mockResolvedValue(null);

		const mockEvent = {
			url: new URL('http://localhost:5173/onboarding'),
			request: new Request('http://localhost:5173/onboarding'),
			platform: { env: { DB: {} as unknown as D1Database } },
			locals: {} as App.Locals
		} as unknown as RequestEvent;

		const mockResolve = vi.fn().mockResolvedValue(new Response('OK'));

		await expect(handle({ event: mockEvent, resolve: mockResolve })).rejects.toMatchObject({
			status: 303,
			location: '/auth/login'
		});
		expect(mockResolve).not.toHaveBeenCalled();
	});

	it('redirects user who has NOT completed onboarding from /dashboard to /onboarding', async () => {
		const mockUser = {
			id: 'user_pending',
			name: 'Pending User',
			email: 'pending@example.com',
			role: 'user',
			emailVerified: false,
			onboardingCompleted: false,
			createdAt: new Date(),
			updatedAt: new Date()
		};

		mockGetSession.mockResolvedValue({
			user: mockUser,
			session: { id: 'sess_pending', userId: 'user_pending' }
		});

		const mockEvent = {
			url: new URL('http://localhost:5173/dashboard'),
			request: new Request('http://localhost:5173/dashboard'),
			platform: { env: { DB: {} as unknown as D1Database } },
			locals: {} as App.Locals
		} as unknown as RequestEvent;

		const mockResolve = vi.fn().mockResolvedValue(new Response('Dashboard content'));

		await expect(handle({ event: mockEvent, resolve: mockResolve })).rejects.toMatchObject({
			status: 303,
			location: '/onboarding'
		});
		expect(mockResolve).not.toHaveBeenCalled();
	});

	it('allows user who has NOT completed onboarding to access /onboarding', async () => {
		const mockUser = {
			id: 'user_pending',
			name: 'Pending User',
			email: 'pending@example.com',
			role: 'user',
			emailVerified: false,
			onboardingCompleted: false,
			createdAt: new Date(),
			updatedAt: new Date()
		};

		mockGetSession.mockResolvedValue({
			user: mockUser,
			session: { id: 'sess_pending', userId: 'user_pending' }
		});

		const mockEvent = {
			url: new URL('http://localhost:5173/onboarding'),
			request: new Request('http://localhost:5173/onboarding'),
			platform: { env: { DB: {} as unknown as D1Database } },
			locals: {} as App.Locals
		} as unknown as RequestEvent;

		const mockResolve = vi.fn().mockResolvedValue(new Response('Onboarding content'));

		const response = await handle({ event: mockEvent, resolve: mockResolve });
		expect(response.status).toBe(200);
		expect(mockResolve).toHaveBeenCalled();
	});

	it('redirects user who HAS completed onboarding from /onboarding to /dashboard', async () => {
		const mockUser = {
			id: 'user_done',
			name: 'Done User',
			email: 'done@example.com',
			role: 'user',
			emailVerified: false,
			onboardingCompleted: true,
			createdAt: new Date(),
			updatedAt: new Date()
		};

		mockGetSession.mockResolvedValue({
			user: mockUser,
			session: { id: 'sess_done', userId: 'user_done' }
		});

		const mockEvent = {
			url: new URL('http://localhost:5173/onboarding'),
			request: new Request('http://localhost:5173/onboarding'),
			platform: { env: { DB: {} as unknown as D1Database } },
			locals: {} as App.Locals
		} as unknown as RequestEvent;

		const mockResolve = vi.fn().mockResolvedValue(new Response('Onboarding content'));

		await expect(handle({ event: mockEvent, resolve: mockResolve })).rejects.toMatchObject({
			status: 303,
			location: '/dashboard'
		});
		expect(mockResolve).not.toHaveBeenCalled();
	});

	it('redirects unauthenticated requests targeting /categories to /auth/login', async () => {
		mockGetSession.mockResolvedValue(null);

		const mockEvent = {
			url: new URL('http://localhost:5173/categories'),
			request: new Request('http://localhost:5173/categories'),
			platform: { env: { DB: {} as unknown as D1Database } },
			locals: {} as App.Locals
		} as unknown as RequestEvent;

		const mockResolve = vi.fn().mockResolvedValue(new Response('OK'));

		await expect(handle({ event: mockEvent, resolve: mockResolve })).rejects.toMatchObject({
			status: 303,
			location: '/auth/login'
		});
		expect(mockResolve).not.toHaveBeenCalled();
	});

	it('calls ensureActivePeriod when authenticated user accesses a protected route', async () => {
		const mockUser = {
			id: 'user_active',
			name: 'Active User',
			email: 'active@example.com',
			role: 'user',
			emailVerified: true,
			onboardingCompleted: true,
			createdAt: new Date(),
			updatedAt: new Date()
		};

		mockGetSession.mockResolvedValue({
			user: mockUser,
			session: { id: 'sess_active', userId: 'user_active' }
		});

		const mockDb = { prepare: vi.fn() } as unknown as D1Database;

		const mockEvent = {
			url: new URL('http://localhost:5173/dashboard'),
			request: new Request('http://localhost:5173/dashboard'),
			platform: { env: { DB: mockDb } },
			locals: {} as App.Locals
		} as unknown as RequestEvent;

		const mockResolve = vi.fn().mockResolvedValue(new Response('Dashboard content'));

		const response = await handle({ event: mockEvent, resolve: mockResolve });
		expect(response.status).toBe(200);
		expect(mockEnsureActivePeriod).toHaveBeenCalledWith(mockDb, 'user_active');
	});

	it('redirects unauthenticated requests targeting /admin to /auth/login', async () => {
		mockGetSession.mockResolvedValue(null);

		const mockEvent = {
			url: new URL('http://localhost:5173/admin'),
			request: new Request('http://localhost:5173/admin'),
			platform: { env: { DB: {} as unknown as D1Database } },
			locals: {} as App.Locals
		} as unknown as RequestEvent;

		const mockResolve = vi.fn().mockResolvedValue(new Response('OK'));

		await expect(handle({ event: mockEvent, resolve: mockResolve })).rejects.toMatchObject({
			status: 303,
			location: '/auth/login'
		});
		expect(mockResolve).not.toHaveBeenCalled();
	});

	it('redirects non-admin authenticated users targeting /admin or /admin/* to /dashboard', async () => {
		const regularUser = {
			id: 'user_reg',
			name: 'Regular User',
			email: 'reg@example.com',
			role: 'user',
			emailVerified: true,
			onboardingCompleted: true,
			createdAt: new Date(),
			updatedAt: new Date()
		};

		mockGetSession.mockResolvedValue({
			user: regularUser,
			session: { id: 'sess_reg', userId: 'user_reg' }
		});

		const mockEvent = {
			url: new URL('http://localhost:5173/admin/users'),
			request: new Request('http://localhost:5173/admin/users'),
			platform: { env: { DB: {} as unknown as D1Database } },
			locals: {} as App.Locals
		} as unknown as RequestEvent;

		const mockResolve = vi.fn().mockResolvedValue(new Response('Admin content'));

		await expect(handle({ event: mockEvent, resolve: mockResolve })).rejects.toMatchObject({
			status: 303,
			location: '/dashboard'
		});
		expect(mockResolve).not.toHaveBeenCalled();
	});

	it('allows admin users to access /admin routes', async () => {
		const adminUser = {
			id: 'user_admin',
			name: 'Admin Boss',
			email: 'admin@example.com',
			role: 'admin',
			emailVerified: true,
			onboardingCompleted: true,
			createdAt: new Date(),
			updatedAt: new Date()
		};

		mockGetSession.mockResolvedValue({
			user: adminUser,
			session: { id: 'sess_admin', userId: 'user_admin' }
		});

		const mockEvent = {
			url: new URL('http://localhost:5173/admin/templates'),
			request: new Request('http://localhost:5173/admin/templates'),
			platform: { env: { DB: {} as unknown as D1Database } },
			locals: {} as App.Locals
		} as unknown as RequestEvent;

		const mockResolve = vi.fn().mockResolvedValue(new Response('Admin content'));

		const response = await handle({ event: mockEvent, resolve: mockResolve });
		expect(response.status).toBe(200);
		expect(mockResolve).toHaveBeenCalled();
	});

	it('lazy synchronizes role to "admin" when authenticated user email matches ADMIN_EMAILS', async () => {
		const userToPromote = {
			id: 'user_lazy',
			name: 'Lazy Admin',
			email: 'lazyadmin@example.com',
			role: 'user',
			emailVerified: true,
			onboardingCompleted: true,
			createdAt: new Date(),
			updatedAt: new Date()
		};

		mockGetSession.mockResolvedValue({
			user: userToPromote,
			session: { id: 'sess_lazy', userId: 'user_lazy' }
		});

		const mockDb = { prepare: vi.fn() } as unknown as D1Database;
		const mockEvent = {
			url: new URL('http://localhost:5173/admin/users'),
			request: new Request('http://localhost:5173/admin/users'),
			platform: {
				env: {
					DB: mockDb,
					ADMIN_EMAILS: 'lazyadmin@example.com, other@example.com'
				}
			},
			locals: {} as App.Locals
		} as unknown as RequestEvent;

		const mockResolve = vi.fn().mockResolvedValue(new Response('Admin content'));

		const response = await handle({ event: mockEvent, resolve: mockResolve });
		expect(response.status).toBe(200);
		expect(mockSetUserRole).toHaveBeenCalledWith(mockDb, 'user_lazy', 'admin');
		expect(mockEvent.locals.user?.role).toBe('admin');
		expect(mockResolve).toHaveBeenCalled();
	});

	it('does not synchronize role and redirects to /dashboard when authenticated user email does not match ADMIN_EMAILS targeting /admin', async () => {
		const normalUser = {
			id: 'user_normal',
			name: 'Normal User',
			email: 'normal@example.com',
			role: 'user',
			emailVerified: true,
			onboardingCompleted: true,
			createdAt: new Date(),
			updatedAt: new Date()
		};

		mockGetSession.mockResolvedValue({
			user: normalUser,
			session: { id: 'sess_normal', userId: 'user_normal' }
		});

		const mockDb = { prepare: vi.fn() } as unknown as D1Database;
		const mockEvent = {
			url: new URL('http://localhost:5173/admin/users'),
			request: new Request('http://localhost:5173/admin/users'),
			platform: {
				env: {
					DB: mockDb,
					ADMIN_EMAILS: 'boss@example.com'
				}
			},
			locals: {} as App.Locals
		} as unknown as RequestEvent;

		const mockResolve = vi.fn().mockResolvedValue(new Response('Admin content'));

		await expect(handle({ event: mockEvent, resolve: mockResolve })).rejects.toMatchObject({
			status: 303,
			location: '/dashboard'
		});
		expect(mockSetUserRole).not.toHaveBeenCalled();
		expect(mockEvent.locals.user?.role).toBe('user');
		expect(mockResolve).not.toHaveBeenCalled();
	});

	it('redirects admin users targeting regular user routes (/dashboard, /expenses, /categories, /history, /onboarding) to /admin with 303', async () => {
		const adminUser = {
			id: 'admin_1',
			name: 'Admin User',
			email: 'admin@example.com',
			role: 'admin',
			emailVerified: true,
			onboardingCompleted: true,
			createdAt: new Date(),
			updatedAt: new Date()
		};

		mockGetSession.mockResolvedValue({
			user: adminUser,
			session: { id: 'sess_admin', userId: 'admin_1' }
		});

		const userPaths = ['/dashboard', '/expenses', '/categories', '/history', '/onboarding'];

		for (const path of userPaths) {
			const mockEvent = {
				url: new URL(`http://localhost:5173${path}`),
				request: new Request(`http://localhost:5173${path}`),
				platform: { env: { DB: {} as unknown as D1Database } },
				locals: {} as App.Locals
			} as unknown as RequestEvent;

			const mockResolve = vi.fn().mockResolvedValue(new Response('User Route'));

			await expect(handle({ event: mockEvent, resolve: mockResolve })).rejects.toMatchObject({
				status: 303,
				location: '/admin'
			});
			expect(mockResolve).not.toHaveBeenCalled();
		}
	});

	it('bypasses onboarding check for admin users even if onboardingCompleted is false', async () => {
		const adminWithoutOnboarding = {
			id: 'admin_no_ob',
			name: 'New Admin',
			email: 'newadmin@example.com',
			role: 'admin',
			emailVerified: true,
			onboardingCompleted: false,
			createdAt: new Date(),
			updatedAt: new Date()
		};

		mockGetSession.mockResolvedValue({
			user: adminWithoutOnboarding,
			session: { id: 'sess_no_ob', userId: 'admin_no_ob' }
		});

		const mockEvent = {
			url: new URL('http://localhost:5173/admin'),
			request: new Request('http://localhost:5173/admin'),
			platform: { env: { DB: {} as unknown as D1Database } },
			locals: {} as App.Locals
		} as unknown as RequestEvent;

		const mockResolve = vi.fn().mockResolvedValue(new Response('Admin content'));

		const response = await handle({ event: mockEvent, resolve: mockResolve });
		expect(response.status).toBe(200);
		expect(mockResolve).toHaveBeenCalled();
	});

	it('does not call ensureActivePeriod for admin users', async () => {
		const adminUser = {
			id: 'admin_active',
			name: 'Admin Active',
			email: 'admin_active@example.com',
			role: 'admin',
			emailVerified: true,
			onboardingCompleted: true,
			createdAt: new Date(),
			updatedAt: new Date()
		};

		mockGetSession.mockResolvedValue({
			user: adminUser,
			session: { id: 'sess_admin_active', userId: 'admin_active' }
		});

		const mockDb = { prepare: vi.fn() } as unknown as D1Database;

		const mockEvent = {
			url: new URL('http://localhost:5173/admin'),
			request: new Request('http://localhost:5173/admin'),
			platform: { env: { DB: mockDb } },
			locals: {} as App.Locals
		} as unknown as RequestEvent;

		const mockResolve = vi.fn().mockResolvedValue(new Response('Admin content'));

		const response = await handle({ event: mockEvent, resolve: mockResolve });
		expect(response.status).toBe(200);
		expect(mockEnsureActivePeriod).not.toHaveBeenCalled();
	});

	it('populates event.platform and event.platform.env when platform is undefined', async () => {
		mockGetSession.mockResolvedValue(null);

		const mockEvent = {
			url: new URL('http://localhost:5173/auth/login'),
			request: new Request('http://localhost:5173/auth/login'),
			platform: undefined,
			locals: {} as App.Locals
		} as unknown as RequestEvent;

		const mockResolve = vi.fn().mockImplementation((event: RequestEvent) => {
			expect(event.platform).toBeDefined();
			expect(event.platform?.env).toBeDefined();
			return new Response('OK');
		});

		const response = await handle({ event: mockEvent, resolve: mockResolve });
		expect(response.status).toBe(200);
		expect(mockResolve).toHaveBeenCalled();
	});
});
