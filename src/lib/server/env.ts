import { env } from 'cloudflare:workers';

/**
 * Safely resolves runtime environment variables across Cloudflare Workers (platform.env / cloudflare:workers)
 * and Node.js (process.env).
 */
export function getRuntimeEnv(
	key: string,
	platformEnv?: Record<string, unknown>
): string | undefined {
	if (platformEnv && typeof platformEnv[key] === 'string') {
		return platformEnv[key] as string;
	}

	try {
		const val = (env as unknown as Record<string, string | undefined>)?.[key];
		if (typeof val === 'string') return val;
	} catch {
		// Fallback when accessed outside Cloudflare request context
	}

	if (typeof process !== 'undefined') {
		return process.env?.[key];
	}

	return undefined;
}
