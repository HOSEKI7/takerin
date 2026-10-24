import { betterAuth } from 'better-auth';
import { twoFactor, emailOTP } from 'better-auth/plugins';
import { drizzleAdapter } from '@better-auth/drizzle-adapter';
import { eq } from 'drizzle-orm';
import { getDb } from '#lib/server/db/index.js';
import * as schema from '#lib/server/db/schema.js';
import { getRuntimeEnv } from '#lib/server/env.js';
import {
	sendVerificationEmail as defaultSendVerification,
	sendResetPasswordEmail as defaultSendResetPassword,
	sendOTPEmail as defaultSendOTP,
	type EmailOptions,
	type OTPEmailOptions,
	type EmailResult
} from '#lib/server/email/index.js';

export interface AuthOptions {
	secret?: string;
	baseURL?: string;
	adminEmails?: string;
	platformEnv?: Record<string, unknown>;
	emailService?: {
		sendVerificationEmail: (opts: EmailOptions) => Promise<EmailResult>;
		sendResetPasswordEmail: (opts: EmailOptions) => Promise<EmailResult>;
		sendOTPEmail?: (opts: OTPEmailOptions) => Promise<EmailResult>;
	};
}

export function parseAdminEmails(raw?: string | null): Set<string> {
	if (!raw || typeof raw !== 'string') return new Set();
	return new Set(
		raw
			.split(',')
			.map((e) => e.trim().toLowerCase())
			.filter(Boolean)
	);
}

export function isAdminEmail(email?: string | null, rawAdminEmails?: string | null): boolean {
	if (!email || !rawAdminEmails) return false;
	const adminSet = parseAdminEmails(rawAdminEmails);
	return adminSet.has(email.trim().toLowerCase());
}

export function createAuth(d1: D1Database, options: AuthOptions = {}) {
	const db = getDb(d1);
	const secret =
		options.secret ||
		getRuntimeEnv('BETTER_AUTH_SECRET', options.platformEnv) ||
		'takerin-default-secret-key-for-development-32-chars';
	const baseURL =
		options.baseURL ||
		getRuntimeEnv('BETTER_AUTH_URL', options.platformEnv) ||
		'http://localhost:5173';

	const adminEmailsRaw = options.adminEmails ?? getRuntimeEnv('ADMIN_EMAILS', options.platformEnv);

	const emailService = options.emailService || {
		sendVerificationEmail: defaultSendVerification,
		sendResetPasswordEmail: defaultSendResetPassword,
		sendOTPEmail: defaultSendOTP
	};

	return betterAuth({
		database: drizzleAdapter(db, {
			provider: 'sqlite',
			schema: {
				user: schema.user,
				session: schema.session,
				account: schema.account,
				verification: schema.verification,
				twoFactor: schema.twoFactor
			}
		}),
		databaseHooks: {
			user: {
				create: {
					before: async (user) => {
						if (isAdminEmail(user.email, adminEmailsRaw)) {
							return {
								data: {
									...user,
									role: 'admin'
								}
							};
						}
					}
				}
			}
		},
		secret,
		baseURL,
		plugins: [
			twoFactor({
				appName: 'Takerin',
				skipVerificationOnEnable: true,
				otpOptions: {
					async sendOTP({ user, otp }) {
						if (emailService.sendOTPEmail) {
							await emailService.sendOTPEmail({
								to: user.email,
								otp,
								type: 'sign-in-2fa'
							});
						}
					}
				}
			}),
			emailOTP({
				overrideDefaultEmailVerification: true,
				expiresIn: 300,
				allowedAttempts: 5,
				changeEmail: {
					enabled: true
				},
				async sendVerificationOTP({ email, otp, type }) {
					if (emailService.sendOTPEmail) {
						await emailService.sendOTPEmail({
							to: email,
							otp,
							type
						});
					}
				}
			})
		],
		user: {
			additionalFields: {
				role: {
					type: 'string',
					defaultValue: 'user',
					input: false
				},
				onboardingCompleted: {
					type: 'boolean',
					defaultValue: false,
					input: false
				}
			}
		},
		emailVerification: {
			sendOnSignUp: true,
			autoSignInAfterVerification: true
		},
		emailAndPassword: {
			enabled: true,
			autoSignIn: false,
			sendResetPassword: async ({ user, url, token }) => {
				await emailService.sendResetPasswordEmail({ to: user.email, url, token });
			}
		}
	});
}

// Global cached instances keyed by D1 binding
const authCache = new WeakMap<D1Database, ReturnType<typeof createAuth>>();

export function getAuth(d1: D1Database, options?: AuthOptions) {
	const instance = authCache.get(d1);
	if (!instance || options) {
		const created = createAuth(d1, options);
		if (!options) {
			authCache.set(d1, created);
		}
		return created;
	}
	return instance;
}

export async function setUserRole(d1: D1Database, userId: string, role: 'user' | 'admin') {
	const db = getDb(d1);
	return db
		.update(schema.user)
		.set({ role, updatedAt: new Date() })
		.where(eq(schema.user.id, userId));
}

function tryDecode(str: string): string {
	if (str.indexOf('%') === -1) return str;
	try {
		return decodeURIComponent(str);
	} catch {
		return str;
	}
}

/**
 * Parses and propagates Set-Cookie headers from a Better Auth Response to SvelteKit cookies.
 */
export function applyAuthCookies(
	res: Response,
	cookies?: { set: (name: string, value: string, options: Record<string, unknown>) => void }
) {
	if (!cookies || typeof cookies.set !== 'function') return;

	const rawCookies =
		typeof res.headers.getSetCookie === 'function'
			? res.headers.getSetCookie()
			: res.headers.get('set-cookie')
				? [res.headers.get('set-cookie')!]
				: [];

	for (const header of rawCookies) {
		const parts = header.split(';').map((p) => p.trim());
		const [nameValue, ...attributePairs] = parts;
		const [rawName, ...rawVal] = (nameValue || '').split('=');
		const cookieName = rawName?.trim();
		if (!cookieName) continue;
		const cookieValue = rawVal.join('=');

		const options: Record<string, unknown> = { path: '/' };
		for (const attr of attributePairs) {
			const [attributeKey, ...attributeValueParts] = attr.split('=');
			const key = attributeKey?.trim().toLowerCase();
			const val = attributeValueParts.join('=').trim();
			if (key === 'path') options.path = val;
			else if (key === 'expires') options.expires = new Date(val);
			else if (key === 'max-age') options.maxAge = parseInt(val, 10);
			else if (key === 'domain') options.domain = val;
			else if (key === 'secure') options.secure = true;
			else if (key === 'httponly') options.httpOnly = true;
			else if (key === 'samesite') {
				const sameSiteValue = val.toLowerCase();
				if (sameSiteValue === 'lax' || sameSiteValue === 'strict' || sameSiteValue === 'none') {
					options.sameSite = sameSiteValue;
				}
			}
		}

		cookies.set(cookieName, tryDecode(cookieValue), options);
	}
}
