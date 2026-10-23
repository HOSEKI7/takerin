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
