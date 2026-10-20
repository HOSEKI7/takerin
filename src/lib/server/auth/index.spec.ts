import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getPlatformProxy } from 'wrangler';
import { createAuth, setUserRole } from './index';
import fs from 'node:fs';
import path from 'node:path';

describe('Better Auth Server Integration (Miniflare D1)', () => {
	let proxy: Awaited<ReturnType<typeof getPlatformProxy<Env>>>;
	let auth: ReturnType<typeof createAuth>;

	const sentVerificationEmails: Array<{ to: string; url: string; token?: string }> = [];
	const sentResetPasswordEmails: Array<{ to: string; url: string; token?: string }> = [];

	beforeAll(async () => {
		proxy = await getPlatformProxy<Env>();

		// Reset D1 tables
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
});
