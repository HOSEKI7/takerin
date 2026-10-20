import { betterAuth } from 'better-auth';
import { drizzleAdapter } from '@better-auth/drizzle-adapter';
import { getDb } from '#lib/server/db/index.js';
import * as schema from '#lib/server/db/schema.js';
import { env } from 'cloudflare:workers';
import {
	sendVerificationEmail as defaultSendVerification,
	sendResetPasswordEmail as defaultSendResetPassword,
	type EmailOptions,
	type EmailResult
} from '#lib/server/email/index.js';

export interface AuthOptions {
	secret?: string;
	baseURL?: string;
	emailService?: {
		sendVerificationEmail: (opts: EmailOptions) => Promise<EmailResult>;
		sendResetPasswordEmail: (opts: EmailOptions) => Promise<EmailResult>;
	};
}

function getEnvVar(key: string): string | undefined {
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

export function createAuth(d1: D1Database, options: AuthOptions = {}) {
	const db = getDb(d1);
	const secret =
		options.secret ||
		getEnvVar('BETTER_AUTH_SECRET') ||
		'takerin-default-secret-key-for-development-32-chars';
	const baseURL = options.baseURL || getEnvVar('BETTER_AUTH_URL') || 'http://localhost:5173';

	const emailService = options.emailService || {
		sendVerificationEmail: defaultSendVerification,
		sendResetPasswordEmail: defaultSendResetPassword
	};

	return betterAuth({
		database: drizzleAdapter(db, {
			provider: 'sqlite',
			schema: {
				user: schema.user,
				session: schema.session,
				account: schema.account,
				verification: schema.verification
			}
		}),
		secret,
		baseURL,
		user: {
			additionalFields: {
				role: {
					type: 'string',
					defaultValue: 'user',
					input: false
				}
			}
		},
		emailVerification: {
			sendOnSignUp: true,
			autoSignInAfterVerification: true,
			sendVerificationEmail: async ({ user, url, token }) => {
				await emailService.sendVerificationEmail({ to: user.email, url, token });
			}
		},
		emailAndPassword: {
			enabled: true,
			sendResetPassword: async ({ user, url, token }) => {
				await emailService.sendResetPasswordEmail({ to: user.email, url, token });
			}
		}
	});
}

// Global cached instances keyed by D1 binding
const authCache = new WeakMap<D1Database, ReturnType<typeof createAuth>>();

export function getAuth(d1: D1Database, options?: AuthOptions) {
	if (!authCache.has(d1) || options) {
		const instance = createAuth(d1, options);
		if (!options) {
			authCache.set(d1, instance);
		}
		return instance;
	}
	return authCache.get(d1)!;
}
