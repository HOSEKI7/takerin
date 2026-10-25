import type { RequestHandler } from './$types';
import { getAuth } from '#lib/server/auth/index.js';
import { env } from 'cloudflare:workers';

export const fallback: RequestHandler = async ({ request, platform, url }) => {
	const d1 = platform?.env?.DB ?? env?.DB;
	if (!d1) {
		return new Response('Database tidak tersedia', { status: 500 });
	}
	const auth = getAuth(d1, {
		platformEnv: platform?.env as unknown as Record<string, unknown>,
		baseURL: url.origin
	});
	return auth.handler(request);
};

export const GET: RequestHandler = fallback;
export const POST: RequestHandler = fallback;
