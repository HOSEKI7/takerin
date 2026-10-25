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
		await proxy.env.DB.exec('DROP TABLE IF EXISTS admin_invitations;');
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

	it('registers a user with email + password, sends 6-digit OTP email, and does not auto-sign-in before verification', async () => {
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
		expect(res.token).toBeNull();

		// Verify 6-digit OTP email was triggered instead of magic link
		expect(sentOTPEmails.length).toBeGreaterThan(0);
		const lastOtp = sentOTPEmails[sentOTPEmails.length - 1];
		expect(lastOtp.to).toBe('budi@example.com');
		expect(lastOtp.type).toBe('email-verification');
		expect(lastOtp.otp).toMatch(/^\d{6}$/);
	});

	it('fails email verification with wrong OTP and invalidates after 5 attempts', async () => {
		const lastOtp = sentOTPEmails[sentOTPEmails.length - 1];
		expect(lastOtp).toBeDefined();

		// Attempt 1 to 4 with invalid OTP
		for (let i = 0; i < 4; i++) {
			await expect(
				auth.api.verifyEmailOTP({
					body: {
						email: 'budi@example.com',
						otp: '000000'
					}
				})
			).rejects.toThrow();
		}

		// Attempt 5 exceeds allowedAttempts
		await expect(
			auth.api.verifyEmailOTP({
				body: {
					email: 'budi@example.com',
					otp: '000000'
				}
			})
		).rejects.toThrow();

		// Even correct OTP should now be rejected as code is invalidated / too many attempts
		await expect(
			auth.api.verifyEmailOTP({
				body: {
					email: 'budi@example.com',
					otp: lastOtp.otp
				}
			})
		).rejects.toThrow();
	});

	it('verifies email with valid OTP, creates session and sets emailVerified true', async () => {
		// Register a new user to verify fresh OTP flow
		const regRes = await auth.api.signUpEmail({
			body: {
				name: 'Siti Aminah',
				email: 'siti@example.com',
				password: 'securePassword123'
			}
		});
		expect(regRes.token).toBeNull();

		const otpRecord = sentOTPEmails.find(
			(e) => e.to === 'siti@example.com' && e.type === 'email-verification'
		);
		expect(otpRecord).toBeDefined();

		const verifyRes = await auth.api.verifyEmailOTP({
			body: {
				email: 'siti@example.com',
				otp: otpRecord!.otp
			}
		});

		expect(verifyRes.status).toBe(true);
		expect(verifyRes.user.emailVerified).toBe(true);
		expect(verifyRes.token).toBeTruthy();
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

	describe('Unified Password Reset with 6-digit OTP (Issue #34)', () => {
		beforeAll(async () => {
			// Register a dedicated user for OTP reset tests
			await auth.api.signUpEmail({
				body: {
					name: 'Dewi Lestari',
					email: 'dewi@example.com',
					password: 'initialSecretPassword123'
				}
			});
			const regOtp = sentOTPEmails.find((e) => e.to === 'dewi@example.com');
			if (regOtp) {
				await auth.api.verifyEmailOTP({
					body: {
						email: 'dewi@example.com',
						otp: regOtp.otp
					}
				});
			}
		});

		it('requests forgot password OTP, delivering 6-digit code via sendOTPEmail', async () => {
			const initialCount = sentOTPEmails.length;
			await auth.api.sendVerificationOTP({
				body: {
					email: 'dewi@example.com',
					type: 'forget-password'
				}
			});

			expect(sentOTPEmails.length).toBe(initialCount + 1);
			const lastOtp = sentOTPEmails[sentOTPEmails.length - 1];
			expect(lastOtp.to).toBe('dewi@example.com');
			expect(lastOtp.type).toBe('forget-password');
			expect(lastOtp.otp).toMatch(/^\d{6}$/);
		});

		it('rejects password reset with invalid OTP and invalidates code after 5 attempts', async () => {
			// Trigger fresh forget-password OTP
			await auth.api.sendVerificationOTP({
				body: {
					email: 'dewi@example.com',
					type: 'forget-password'
				}
			});
			const lastOtp = sentOTPEmails[sentOTPEmails.length - 1];
			expect(lastOtp).toBeDefined();

			// 4 invalid attempts
			for (let i = 0; i < 4; i++) {
				await expect(
					auth.api.resetPasswordEmailOTP({
						body: {
							email: 'dewi@example.com',
							otp: '999999',
							password: 'attemptPassword123'
						}
					})
				).rejects.toThrow();
			}

			// 5th attempt exhausts attempts
			await expect(
				auth.api.resetPasswordEmailOTP({
					body: {
						email: 'dewi@example.com',
						otp: '999999',
						password: 'attemptPassword123'
					}
				})
			).rejects.toThrow();

			// Even correct OTP is now rejected
			await expect(
				auth.api.resetPasswordEmailOTP({
					body: {
						email: 'dewi@example.com',
						otp: lastOtp.otp,
						password: 'attemptPassword123'
					}
				})
			).rejects.toThrow();
		});

		it('resets password successfully with valid OTP and allows login with updated password', async () => {
			// Request new OTP
			await auth.api.sendVerificationOTP({
				body: {
					email: 'dewi@example.com',
					type: 'forget-password'
				}
			});
			const validOtp = sentOTPEmails[sentOTPEmails.length - 1];

			const res = await auth.api.resetPasswordEmailOTP({
				body: {
					email: 'dewi@example.com',
					otp: validOtp.otp,
					password: 'myBrandNewPassword2026'
				}
			});

			expect(res.success).toBe(true);

			// Old password must fail
			await expect(
				auth.api.signInEmail({
					body: {
						email: 'dewi@example.com',
						password: 'initialSecretPassword123'
					}
				})
			).rejects.toThrow();

			// New password succeeds
			const loginRes = await auth.api.signInEmail({
				body: {
					email: 'dewi@example.com',
					password: 'myBrandNewPassword2026'
				}
			});
			expect(loginRes.user.email).toBe('dewi@example.com');
		});
	});

	describe('Account Email Change with 6-digit OTP (Issue #35)', () => {
		let andiHeaders: Headers;

		beforeAll(async () => {
			// Register a dedicated user for email change tests
			await auth.api.signUpEmail({
				body: {
					name: 'Andi Pratama',
					email: 'andi@example.com',
					password: 'passwordAndi123'
				}
			});
			const regOtp = sentOTPEmails.find((e) => e.to === 'andi@example.com');
			if (regOtp) {
				await auth.api.verifyEmailOTP({
					body: {
						email: 'andi@example.com',
						otp: regOtp.otp
					}
				});
			}

			// Sign in to establish active session
			const loginRes = await auth.api.signInEmail({
				body: {
					email: 'andi@example.com',
					password: 'passwordAndi123'
				},
				asResponse: true
			});

			const setCookie = loginRes.headers.get('set-cookie');
			andiHeaders = new Headers();
			if (setCookie) {
				andiHeaders.set('cookie', setCookie);
			}
		});

		it('verifies current password before requesting email change', async () => {
			// Wrong password rejected
			await expect(
				auth.api.verifyPassword({
					body: {
						password: 'wrongPassword'
					},
					headers: andiHeaders
				})
			).rejects.toThrow();

			// Correct password accepted
			const res = await auth.api.verifyPassword({
				body: {
					password: 'passwordAndi123'
				},
				headers: andiHeaders
			});
			expect(res.status).toBe(true);
		});

		it('requests email change OTP and delivers 6-digit code to new email address', async () => {
			const initialCount = sentOTPEmails.length;
			const res = await auth.api.requestEmailChangeEmailOTP({
				body: {
					newEmail: 'andi.baru@example.com'
				},
				headers: andiHeaders
			});

			expect(res.success).toBe(true);
			expect(sentOTPEmails.length).toBe(initialCount + 1);

			const lastOtp = sentOTPEmails[sentOTPEmails.length - 1];
			expect(lastOtp.to).toBe('andi.baru@example.com');
			expect(lastOtp.type).toBe('change-email');
			expect(lastOtp.otp).toMatch(/^\d{6}$/);
		});

		it('rejects email change with invalid OTP and invalidates code after 5 attempts', async () => {
			// Trigger fresh change-email OTP
			await auth.api.requestEmailChangeEmailOTP({
				body: {
					newEmail: 'andi.baru@example.com'
				},
				headers: andiHeaders
			});
			const lastOtp = sentOTPEmails[sentOTPEmails.length - 1];
			expect(lastOtp).toBeDefined();

			// 4 invalid attempts
			for (let i = 0; i < 4; i++) {
				await expect(
					auth.api.changeEmailEmailOTP({
						body: {
							newEmail: 'andi.baru@example.com',
							otp: '000000'
						},
						headers: andiHeaders
					})
				).rejects.toThrow();
			}

			// 5th attempt exhausts attempts
			await expect(
				auth.api.changeEmailEmailOTP({
					body: {
						newEmail: 'andi.baru@example.com',
						otp: '000000'
					},
					headers: andiHeaders
				})
			).rejects.toThrow();

			// Even correct OTP is now rejected
			await expect(
				auth.api.changeEmailEmailOTP({
					body: {
						newEmail: 'andi.baru@example.com',
						otp: lastOtp.otp
					},
					headers: andiHeaders
				})
			).rejects.toThrow();
		});

		it('updates user email with valid OTP and allows login with updated email', async () => {
			// Request new OTP
			await auth.api.requestEmailChangeEmailOTP({
				body: {
					newEmail: 'andi.update@example.com'
				},
				headers: andiHeaders
			});
			const validOtp = sentOTPEmails[sentOTPEmails.length - 1];

			const res = await auth.api.changeEmailEmailOTP({
				body: {
					newEmail: 'andi.update@example.com',
					otp: validOtp.otp
				},
				headers: andiHeaders
			});
			expect(res.success).toBe(true);

			// Old email login must fail
			await expect(
				auth.api.signInEmail({
					body: {
						email: 'andi@example.com',
						password: 'passwordAndi123'
					}
				})
			).rejects.toThrow();

			// New email login succeeds
			const loginRes = await auth.api.signInEmail({
				body: {
					email: 'andi.update@example.com',
					password: 'passwordAndi123'
				}
			});
			expect(loginRes.user.email).toBe('andi.update@example.com');
		});
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

		it('deduplicates identical emails regardless of casing and surrounding whitespace', () => {
			const emails = parseAdminEmails(
				'admin@takerin.my.id, ADMIN@TAKERIN.MY.ID,  Admin@Takerin.My.Id  '
			);
			expect(emails.size).toBe(1);
			expect(emails.has('admin@takerin.my.id')).toBe(true);
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

		it('requires Bootstrap Admin to verify OTP before receiving active session', async () => {
			const adminOtpEmails: Array<{ to: string; otp: string; type?: string }> = [];
			const customAuth = createAuth(proxy.env.DB, {
				adminEmails: 'adminbootstrap@example.com',
				emailService: {
					sendVerificationEmail: async () => ({ success: true }),
					sendResetPasswordEmail: async () => ({ success: true }),
					sendOTPEmail: async (opts) => {
						adminOtpEmails.push(opts);
						return { success: true };
					}
				}
			});

			const regRes = await customAuth.api.signUpEmail({
				body: {
					name: 'Admin Bootstrap',
					email: 'adminbootstrap@example.com',
					password: 'adminPassword123'
				}
			});

			expect(regRes.user.role).toBe('admin');
			expect(regRes.token).toBeNull();
			expect(adminOtpEmails.length).toBe(1);
			expect(adminOtpEmails[0].type).toBe('email-verification');

			const verifyRes = await customAuth.api.verifyEmailOTP({
				body: {
					email: 'adminbootstrap@example.com',
					otp: adminOtpEmails[0].otp
				}
			});

			expect(verifyRes.status).toBe(true);
			expect(verifyRes.user.role).toBe('admin');
			expect(verifyRes.token).toBeTruthy();
		});

		it('allows HTTP sign-up request with Origin https://takerin.my.id via auth handler without 403 Forbidden', async () => {
			const customAuth = createAuth(proxy.env.DB, {
				baseURL: 'https://takerin.my.id',
				adminEmails: 'adminlive@takerin.my.id',
				emailService: {
					sendVerificationEmail: async () => ({ success: true }),
					sendResetPasswordEmail: async () => ({ success: true }),
					sendOTPEmail: async () => ({ success: true })
				}
			});

			const request = new Request('https://takerin.my.id/api/auth/sign-up/email', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Origin: 'https://takerin.my.id'
				},
				body: JSON.stringify({
					name: 'Live Admin First',
					email: 'adminlive@takerin.my.id',
					password: 'secureLivePassword123'
				})
			});

			const res = await customAuth.handler(request);
			expect(res.status).not.toBe(403);
			expect(res.status).toBe(200);

			const body = (await res.json()) as { user?: { email: string; role: string } };
			expect(body.user?.email).toBe('adminlive@takerin.my.id');
			expect(body.user?.role).toBe('admin');
		});
	});
});
