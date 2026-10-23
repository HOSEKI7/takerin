import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getPlatformProxy } from 'wrangler';
import { createAuth, setUserRole, parseAdminEmails, isAdminEmail } from './index';
import fs from 'node:fs';
import path from 'node:path';

function extractCookies(res: Response): string {
	const raw = res.headers.getSetCookie
		? res.headers.getSetCookie()
		: [res.headers.get('set-cookie') || ''];
	return raw
		.map((c) => c.split(';')[0].trim())
		.filter(Boolean)
		.join('; ');
}

describe('Better Auth Server Integration (Miniflare D1)', () => {
	let proxy: Awaited<ReturnType<typeof getPlatformProxy<Env>>>;
	let auth: ReturnType<typeof createAuth>;

	const sentVerificationEmails: Array<{ to: string; url: string; token?: string }> = [];
	const sentResetPasswordEmails: Array<{ to: string; url: string; token?: string }> = [];
	const sentOTPEmails: Array<{ to: string; otp: string; type?: string }> = [];

	beforeAll(async () => {
		proxy = await getPlatformProxy<Env>();

		// Reset D1 tables
		await proxy.env.DB.exec('DROP TABLE IF EXISTS expense;');
		await proxy.env.DB.exec('DROP TABLE IF EXISTS category;');
		await proxy.env.DB.exec('DROP TABLE IF EXISTS monthly_period;');
		await proxy.env.DB.exec('DROP TABLE IF EXISTS category_template;');
		await proxy.env.DB.exec('DROP TABLE IF EXISTS income_source;');
		await proxy.env.DB.exec('DROP TABLE IF EXISTS user_settings;');
		await proxy.env.DB.exec('DROP TABLE IF EXISTS two_factor;');
		await proxy.env.DB.exec('DROP TABLE IF EXISTS verification;');
		await proxy.env.DB.exec('DROP TABLE IF EXISTS account;');
		await proxy.env.DB.exec('DROP TABLE IF EXISTS session;');
		await proxy.env.DB.exec('DROP TABLE IF EXISTS user;');
		await proxy.env.DB.exec('DROP TABLE IF EXISTS health_check;');

		// Run drizzle migrations
		const drizzleDir = path.resolve('drizzle');
		const migrationFiles = fs
			.readdirSync(drizzleDir)
			.filter((file) => file.endsWith('.sql'))
			.sort();

		for (const file of migrationFiles) {
			const migrationSql = fs.readFileSync(path.join(drizzleDir, file), 'utf-8');
			const chunks = migrationSql
				.split('--> statement-breakpoint')
				.map((c) => c.trim())
				.filter(Boolean);

			for (const chunk of chunks) {
				const stmts = chunk
					.split(';')
					.map((s) => s.trim().replace(/\s+/g, ' '))
					.filter(Boolean);
				for (const s of stmts) {
					await proxy.env.DB.exec(s + ';');
				}
			}
		}

		auth = createAuth(proxy.env.DB, {
			emailService: {
				sendVerificationEmail: async (opts) => {
					sentVerificationEmails.push(opts);
					return { success: true };
				},
				sendResetPasswordEmail: async (opts) => {
					sentResetPasswordEmails.push(opts);
					return { success: true };
				},
				sendOTPEmail: async (opts) => {
					sentOTPEmails.push(opts);
					return { success: true };
				}
			}
		});
	});

	afterAll(async () => {
		if (proxy) {
			await proxy.dispose();
		}
	});

	it('registers a user with email + password and assigns default role "user"', async () => {
		const res = await auth.api.signUpEmail({
			body: {
				name: 'Budi Santoso',
				email: 'budi@example.com',
				password: 'securePassword123'
			}
		});

		expect(res.user).toBeDefined();
		expect(res.user.email).toBe('budi@example.com');
		expect(res.user.name).toBe('Budi Santoso');
		expect((res.user as { role?: string }).role).toBe('user');
		expect(res.user.emailVerified).toBe(false);

		// Verify verification email was triggered
		expect(sentVerificationEmails.length).toBeGreaterThan(0);
		const lastEmail = sentVerificationEmails[sentVerificationEmails.length - 1];
		expect(lastEmail.to).toBe('budi@example.com');
		expect(lastEmail.url).toBeDefined();
	});

	it('logs in user with email + password, creating a valid session', async () => {
		const res = await auth.api.signInEmail({
			body: {
				email: 'budi@example.com',
				password: 'securePassword123'
			}
		});

		expect(res.user).toBeDefined();
		expect(res.user.email).toBe('budi@example.com');
	});

	it('validates session and populates user info via getSession', async () => {
		const loginRes = await auth.api.signInEmail({
			body: {
				email: 'budi@example.com',
				password: 'securePassword123'
			},
			asResponse: true
		});

		const setCookie = loginRes.headers.get('set-cookie');
		const headers = new Headers();
		if (setCookie) {
			headers.set('cookie', setCookie);
		}

		const sessionRes = await auth.api.getSession({
			headers
		});

		expect(sessionRes).toBeDefined();
		expect(sessionRes?.user).toBeDefined();
		expect(sessionRes?.user.email).toBe('budi@example.com');
		expect((sessionRes?.user as { role?: string }).role).toBe('user');
	});

	it('logs out and revokes the session', async () => {
		const loginRes = await auth.api.signInEmail({
			body: {
				email: 'budi@example.com',
				password: 'securePassword123'
			}
		});

		const token = loginRes.token;
		const headers = new Headers();
		headers.set('Authorization', `Bearer ${token}`);
		headers.set('cookie', `better-auth.session_token=${token}`);

		const signOutRes = await auth.api.signOut({
			headers
		});

		expect(signOutRes.success).toBe(true);

		const checkSession = await auth.api.getSession({
			headers
		});

		expect(checkSession).toBeNull();
	});

	it('sends forgot password email and allows resetting password with token', async () => {
		await auth.api.requestPasswordReset({
			body: {
				email: 'budi@example.com',
				redirectTo: 'http://localhost:5173/auth/reset-password'
			}
		});

		expect(sentResetPasswordEmails.length).toBeGreaterThan(0);
		const lastReset = sentResetPasswordEmails[sentResetPasswordEmails.length - 1];
		expect(lastReset.to).toBe('budi@example.com');
		expect(lastReset.url).toBeDefined();

		// Extract token from URL
		const resetUrl = new URL(lastReset.url);
		const token = resetUrl.searchParams.get('token') || lastReset.token;
		expect(token).toBeDefined();

		const resetRes = await auth.api.resetPassword({
			body: {
				newPassword: 'newSecretPassword789',
				token: token!
			}
		});

		expect(resetRes.status).toBe(true);

		// Verify login with new password
		const newLogin = await auth.api.signInEmail({
			body: {
				email: 'budi@example.com',
				password: 'newSecretPassword789'
			}
		});

		expect(newLogin.user.email).toBe('budi@example.com');
	});

	it('allows updating user role to admin via setUserRole', async () => {
		const loginRes = await auth.api.signInEmail({
			body: {
				email: 'budi@example.com',
				password: 'newSecretPassword789'
			}
		});

		expect((loginRes.user as { role?: string }).role).toBe('user');

		await setUserRole(proxy.env.DB, loginRes.user.id, 'admin');

		const userRecord = await proxy.env.DB.prepare('SELECT role FROM user WHERE id = ?')
			.bind(loginRes.user.id)
			.first<{ role: string }>();

		expect(userRecord?.role).toBe('admin');
	});

	it('enables 2FA, requires OTP or backup code on login, and allows disabling 2FA', async () => {
		// 1. Sign in to get active session
		const loginRes = await auth.api.signInEmail({
			body: {
				email: 'budi@example.com',
				password: 'newSecretPassword789'
			},
			asResponse: true
		});

		const sessionHeaders = new Headers();
		sessionHeaders.set('cookie', extractCookies(loginRes));

		// 2. Enable 2FA
		const enableRes = await auth.api.enableTwoFactor({
			headers: sessionHeaders,
			body: {
				password: 'newSecretPassword789'
			}
		});

		expect(enableRes.method).toBe('totp');
		expect('backupCodes' in enableRes).toBe(true);
		const backupCodes = (enableRes as { backupCodes: string[] }).backupCodes;
		expect(Array.isArray(backupCodes)).toBe(true);
		expect(backupCodes.length).toBeGreaterThan(0);

		// Verify twoFactorEnabled in user DB
		const userDb = await proxy.env.DB.prepare('SELECT two_factor_enabled FROM user WHERE email = ?')
			.bind('budi@example.com')
			.first<{ two_factor_enabled: number }>();
		expect(userDb?.two_factor_enabled).toBe(1);

		// 3. Attempt login with password -> receives 2FA challenge / redirect
		const challengeLoginRes = await auth.api.signInEmail({
			body: {
				email: 'budi@example.com',
				password: 'newSecretPassword789'
			},
			asResponse: true
		});

		const challengeCookies = extractCookies(challengeLoginRes);
		expect(challengeCookies).toBeDefined();

		const challengeJson = (await challengeLoginRes.json()) as { twoFactorRedirect?: boolean };
		expect(challengeJson.twoFactorRedirect).toBe(true);

		const challengeHeaders = new Headers();
		challengeHeaders.set('cookie', challengeCookies);

		// 4. Request 2FA OTP code
		sentOTPEmails.length = 0;
		const sendOtpRes = await auth.api.sendTwoFactorOTP({
			headers: challengeHeaders
		});
		expect(sendOtpRes.status).toBe(true);
		expect(sentOTPEmails.length).toBe(1);
		expect(sentOTPEmails[0].to).toBe('budi@example.com');
		expect(sentOTPEmails[0].otp).toBeDefined();

		const otpCode = sentOTPEmails[0].otp;

		// 5. Verify invalid OTP code -> rejected
		await expect(
			auth.api.verifyTwoFactorOTP({
				headers: challengeHeaders,
				body: {
					code: '000000'
				}
			})
		).rejects.toThrow();

		// 6. Verify valid OTP code -> succeeds and grants session
		const verifyOtpRes = await auth.api.verifyTwoFactorOTP({
			headers: challengeHeaders,
			body: {
				code: otpCode
			},
			asResponse: true
		});

		const validOtpSessionCookie = extractCookies(verifyOtpRes);
		expect(validOtpSessionCookie).toContain('better-auth');

		// 7. Test login with backup code
		const secondChallengeRes = await auth.api.signInEmail({
			body: {
				email: 'budi@example.com',
				password: 'newSecretPassword789'
			},
			asResponse: true
		});
		const secondChallengeHeaders = new Headers();
		secondChallengeHeaders.set('cookie', extractCookies(secondChallengeRes));

		const backupCode = backupCodes[0];
		const verifyBackupRes = await auth.api.verifyBackupCode({
			headers: secondChallengeHeaders,
			body: {
				code: backupCode
			},
			asResponse: true
		});
		expect(extractCookies(verifyBackupRes)).toContain('better-auth');

		// Trying the same backup code again should fail because backup codes are one-time use
		const thirdChallengeRes = await auth.api.signInEmail({
			body: {
				email: 'budi@example.com',
				password: 'newSecretPassword789'
			},
			asResponse: true
		});
		const thirdChallengeHeaders = new Headers();
		thirdChallengeHeaders.set('cookie', extractCookies(thirdChallengeRes));

		await expect(
			auth.api.verifyBackupCode({
				headers: thirdChallengeHeaders,
				body: {
					code: backupCode
				}
			})
		).rejects.toThrow();

		// 8. Disable 2FA with user session
		const authenticatedSessionHeaders = new Headers();
		authenticatedSessionHeaders.set('cookie', extractCookies(verifyBackupRes));

		const disableRes = await auth.api.disableTwoFactor({
			headers: authenticatedSessionHeaders,
			body: {
				password: 'newSecretPassword789'
			}
		});
		expect(disableRes.status).toBe(true);

		// Verify twoFactorEnabled in user DB is now 0
		const userAfterDisable = await proxy.env.DB.prepare(
			'SELECT two_factor_enabled FROM user WHERE email = ?'
		)
			.bind('budi@example.com')
			.first<{ two_factor_enabled: number }>();
		expect(userAfterDisable?.two_factor_enabled).toBe(0);
	});

	describe('parseAdminEmails & isAdminEmail utilities', () => {
		it('correctly parses comma-separated emails with whitespace, casing, and empty elements', () => {
			const emails = parseAdminEmails(
				'  Admin@Takerin.my.id , boss@example.com, ,  OWNER@Domain.COM  '
			);
			expect(emails.size).toBe(3);
			expect(emails.has('admin@takerin.my.id')).toBe(true);
			expect(emails.has('boss@example.com')).toBe(true);
			expect(emails.has('owner@domain.com')).toBe(true);
		});

		it('returns empty set for null, undefined, or empty string', () => {
			expect(parseAdminEmails(null).size).toBe(0);
			expect(parseAdminEmails(undefined).size).toBe(0);
			expect(parseAdminEmails('').size).toBe(0);
			expect(parseAdminEmails('   ').size).toBe(0);
		});

		it('validates email matching with case and whitespace insensitivity', () => {
			const raw = 'admin@takerin.my.id, root@takerin.my.id';
			expect(isAdminEmail('Admin@Takerin.my.id', raw)).toBe(true);
			expect(isAdminEmail('  admin@takerin.my.id  ', raw)).toBe(true);
			expect(isAdminEmail('other@example.com', raw)).toBe(false);
			expect(isAdminEmail(null, raw)).toBe(false);
			expect(isAdminEmail('admin@takerin.my.id', undefined)).toBe(false);
			expect(isAdminEmail('admin@takerin.my.id', '')).toBe(false);
		});
	});

	describe('Bootstrap Admin via adminEmails option', () => {
		it('automatically assigns role "admin" on registration if email matches adminEmails', async () => {
			const customAuth = createAuth(proxy.env.DB, {
				adminEmails: 'superadmin@example.com, owner@takerin.my.id',
				emailService: {
					sendVerificationEmail: async () => ({ success: true }),
					sendResetPasswordEmail: async () => ({ success: true })
				}
			});

			const res = await customAuth.api.signUpEmail({
				body: {
					name: 'Super Administrator',
					email: 'SuperAdmin@example.com',
					password: 'adminPassword123'
				}
			});

			expect(res.user).toBeDefined();
			expect(res.user.role).toBe('admin');

			const dbUser = await proxy.env.DB.prepare('SELECT role FROM user WHERE email = ?')
				.bind('superadmin@example.com')
				.first<{ role: string }>();
			expect(dbUser?.role).toBe('admin');
		});

		it('assigns role "user" on registration if email does NOT match adminEmails', async () => {
			const customAuth = createAuth(proxy.env.DB, {
				adminEmails: 'superadmin@example.com',
				emailService: {
					sendVerificationEmail: async () => ({ success: true }),
					sendResetPasswordEmail: async () => ({ success: true })
				}
			});

			const res = await customAuth.api.signUpEmail({
				body: {
					name: 'Regular Customer',
					email: 'customer@example.com',
					password: 'customerPassword123'
				}
			});

			expect(res.user).toBeDefined();
			expect(res.user.role).toBe('user');

			const dbUser = await proxy.env.DB.prepare('SELECT role FROM user WHERE email = ?')
				.bind('customer@example.com')
				.first<{ role: string }>();
			expect(dbUser?.role).toBe('user');
		});
	});
});
