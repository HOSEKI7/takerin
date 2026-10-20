import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { RequestEvent } from '@sveltejs/kit';

const mockGetSession = vi.fn();
const mockAuth = {
	api: {
		getSession: mockGetSession
	}
};

vi.mock('#lib/server/auth/index.js', () => ({
	getAuth: () => mockAuth
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
});
