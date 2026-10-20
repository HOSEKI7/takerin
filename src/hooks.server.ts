import type { Handle } from '@sveltejs/kit/hooks';
import { redirect } from '@sveltejs/kit';
import { getAuth } from '#lib/server/auth/index.js';
import { env } from 'cloudflare:workers';

const PROTECTED_PREFIXES = ['/dashboard'];

export const handle: Handle = async ({ event, resolve }) => {
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

	return resolve(event);
};
