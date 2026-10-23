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

export const handle: Handle = async ({ event, resolve }) => {
	if (building) {
		event.locals.user = null;
		event.locals.session = null;
		return resolve(event);
	}

	const d1 = event.platform?.env?.DB ?? env?.DB;

	if (d1) {
		try {
			const auth = getAuth(d1, {
				platformEnv: event.platform?.env as unknown as Record<string, unknown>
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
					event.locals.user?.email &&
					isAdminEmail(event.locals.user.email, adminEmailsRaw) &&
					event.locals.user.role !== 'admin'
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
		if (isAdminRoute && event.locals.user.role !== 'admin') {
			throw redirect(303, '/dashboard');
		}

		const isOnboardingRoute = event.url.pathname.startsWith('/onboarding');
		const hasCompletedOnboarding = Boolean(event.locals.user.onboardingCompleted);

		if (!hasCompletedOnboarding && isProtected && !isOnboardingRoute && !isAdminRoute) {
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
			!isAdminRoute &&
			hasCompletedOnboarding
		) {
			try {
				await ensureActivePeriod(d1, event.locals.user.id);
			} catch (err) {
				console.error('Error ensuring active period in hook:', err);
			}
		}
	}

	return resolve(event);
};
