import type { Handle } from '@sveltejs/kit/hooks';
import { redirect } from '@sveltejs/kit';
import { building } from '$app/env';
import { getAuth, setUserRole, isAdminEmail } from '#lib/server/auth/index.js';
import { ensureActivePeriod } from '#lib/server/db/period.js';
import { getRuntimeEnv } from '#lib/server/env.js';
import { env } from 'cloudflare:workers';

const PROTECTED_PREFIXES = [
	'/dashboard',
	'/expenses',
	'/history',
	'/settings',
	'/categories',
	'/onboarding',
	'/admin'
];

const USER_PREFIXES = ['/dashboard', '/expenses', '/categories', '/history', '/onboarding'];

function tryGetEnv(): Record<string, unknown> | undefined {
	try {
		if (typeof env === 'object' && env !== null) {
			void (env as unknown as Record<string, unknown>)['__test__'];
			return env as unknown as Record<string, unknown>;
		}
	} catch {
		return undefined;
	}
	return undefined;
}

export const handle: Handle = async ({ event, resolve }) => {
	if (building) {
		event.locals.user = null;
		event.locals.session = null;
		return resolve(event);
	}

	let ambientDb: D1Database | undefined;
	try {
		ambientDb = env?.DB;
	} catch {
		ambientDb = undefined;
	}

	const d1 = event.platform?.env?.DB ?? ambientDb;

	const mutableEvent = event as { platform?: App.Platform };
	if (!mutableEvent.platform) {
		mutableEvent.platform = {
			env: (tryGetEnv() ?? {}) as unknown as Env,
			ctx: {} as ExecutionContext,
			caches: (globalThis.caches as CacheStorage) ?? ({} as CacheStorage)
		};
	} else if (!mutableEvent.platform.env) {
		(mutableEvent.platform as { env: Env }).env = (tryGetEnv() ?? {}) as unknown as Env;
	}

	if (d1 && !mutableEvent.platform.env.DB) {
		(mutableEvent.platform.env as { DB: D1Database }).DB = d1;
	}

	if (d1) {
		try {
			const auth = getAuth(d1, {
				platformEnv: event.platform?.env as unknown as Record<string, unknown>,
				baseURL: event.url?.origin
			});
			const sessionData = await auth.api.getSession({
				headers: event.request.headers
			});

			if (sessionData) {
				event.locals.user = sessionData.user as App.Locals['user'];
				event.locals.session = sessionData.session as App.Locals['session'];

				const adminEmailsRaw = getRuntimeEnv('ADMIN_EMAILS', event.platform?.env);
				if (
					d1 &&
					event.locals.user?.role !== 'admin' &&
					event.locals.user?.email &&
					isAdminEmail(event.locals.user.email, adminEmailsRaw)
				) {
					try {
						await setUserRole(d1, event.locals.user.id, 'admin');
						event.locals.user.role = 'admin';
					} catch (err) {
						console.error('Error synchronizing admin role in hooks:', err);
					}
				}
			} else {
				event.locals.user = null;
				event.locals.session = null;
			}
		} catch (error) {
			console.error('Error in session validation hook:', error);
			event.locals.user = null;
			event.locals.session = null;
		}
	} else {
		event.locals.user = null;
		event.locals.session = null;
	}

	const isProtected = PROTECTED_PREFIXES.some((prefix) => event.url.pathname.startsWith(prefix));

	if (isProtected && !event.locals.user) {
		throw redirect(303, '/auth/login');
	}

	if (event.locals.user) {
		const isAdminRoute = event.url.pathname.startsWith('/admin');
		const isAdmin = event.locals.user.role === 'admin';

		if (isAdminRoute && !isAdmin) {
			throw redirect(303, '/dashboard');
		}

		const isUserRoute = USER_PREFIXES.some((prefix) => event.url.pathname.startsWith(prefix));

		if (isAdmin && isUserRoute) {
			throw redirect(303, '/admin');
		}

		if (!isAdmin) {
			const isOnboardingRoute = event.url.pathname.startsWith('/onboarding');
			const hasCompletedOnboarding = Boolean(event.locals.user.onboardingCompleted);

			if (!hasCompletedOnboarding && isProtected && !isOnboardingRoute) {
				throw redirect(303, '/onboarding');
			}

			if (hasCompletedOnboarding && isOnboardingRoute) {
				throw redirect(303, '/dashboard');
			}

			if (
				d1 &&
				typeof (d1 as { prepare?: unknown }).prepare === 'function' &&
				isProtected &&
				!isOnboardingRoute &&
				hasCompletedOnboarding
			) {
				try {
					await ensureActivePeriod(d1, event.locals.user.id);
				} catch (err) {
					console.error('Error ensuring active period in hook:', err);
				}
			}
		}
	}

	return resolve(event);
};
