import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
	authClient,
	signIn,
	signUp,
	signOut,
	requestPasswordReset,
	resetPassword,
	twoFactor,
	emailOtp
} from '#lib/auth-client.js';
import {
	validateRegisterInput,
	validateLoginInput,
	validateForgotPasswordInput,
	validateResetPasswordInput,
	validateResetPasswordWithOTPInput,
	validateOTPInput,
	validateBackupCodeInput,
	validateAdminInviteActivationInput,
	formatAuthError
} from '#lib/validation/auth.js';
import {
	load as adminInviteLoad,
	actions as adminInviteActions
} from './admin-invite/[token]/+page.server.js';
import { load as resetPasswordLoad } from './reset-password/+page.server.js';
import * as adminDb from '#lib/server/db/admin.js';
import * as authServer from '#lib/server/auth/index.js';
import * as dbModule from '#lib/server/db/index.js';
import RegisterPage from './register/+page.svelte';
import ForgotPasswordPage from './forgot-password/+page.svelte';
import { render } from 'svelte/server';
import idDict from '#lib/i18n/id.json';
import enDict from '#lib/i18n/en.json';

describe('Auth Client & Route Interfaces', () => {
	it('exports working client methods from auth-client', () => {
		expect(authClient).toBeDefined();
		expect(typeof signIn.email).toBe('function');
		expect(typeof signUp.email).toBe('function');
		expect(typeof signOut).toBe('function');
		expect(typeof requestPasswordReset).toBe('function');
		expect(typeof resetPassword).toBe('function');
		expect(twoFactor).toBeDefined();
		expect(typeof twoFactor.enable).toBe('function');
		expect(typeof twoFactor.disable).toBe('function');
		expect(typeof twoFactor.sendOtp).toBe('function');
		expect(typeof twoFactor.verifyOtp).toBe('function');
		expect(typeof twoFactor.verifyBackupCode).toBe('function');
		expect(emailOtp).toBeDefined();
		expect(typeof emailOtp.sendVerificationOtp).toBe('function');
		expect(typeof emailOtp.verifyEmail).toBe('function');
		expect(typeof emailOtp.resetPassword).toBe('function');
	});

	it('validates registration input requirements', () => {
		expect(
			validateRegisterInput({
				name: '',
				email: 'user@example.com',
				password: 'password123',
				confirmPassword: 'password123'
			})
		).toBe('Nama lengkap wajib diisi.');

		expect(
			validateRegisterInput({
				name: 'User',
				email: '',
				password: 'password123',
				confirmPassword: 'password123'
			})
		).toBe('Alamat email wajib diisi.');

		expect(
			validateRegisterInput({
				name: 'User',
				email: 'user@example.com',
				password: '123',
				confirmPassword: '123'
			})
		).toBe('Password minimal terdiri dari 8 karakter.');

		expect(
			validateRegisterInput({
				name: 'User',
				email: 'user@example.com',
				password: 'password123',
				confirmPassword: 'password321'
			})
		).toBe('Konfirmasi password tidak cocok.');

		expect(
			validateRegisterInput({
				name: 'User',
				email: 'user@example.com',
				password: 'password123',
				confirmPassword: 'password123'
			})
		).toBeNull();
	});

	it('validates login and forgot password input', () => {
		expect(validateLoginInput({ email: '', password: '123' })).toBe('Alamat email wajib diisi.');
		expect(validateLoginInput({ email: 'user@example.com', password: '' })).toBe(
			'Password wajib diisi.'
		);
		expect(validateLoginInput({ email: 'user@example.com', password: 'password123' })).toBeNull();

		expect(validateForgotPasswordInput({ email: '' })).toBe('Alamat email wajib diisi.');
		expect(validateForgotPasswordInput({ email: 'user@example.com' })).toBeNull();
	});

	it('validates password reset token requirement', () => {
		expect(
			validateResetPasswordInput({
				token: null,
				password: 'newPassword123',
				confirmPassword: 'newPassword123'
			})
		).toBe('Token reset password tidak valid atau tidak ditemukan.');

		expect(
			validateResetPasswordInput({
				token: 'valid-token',
				password: 'short',
				confirmPassword: 'short'
			})
		).toBe('Password baru minimal terdiri dari 8 karakter.');

		expect(
			validateResetPasswordInput({
				token: 'valid-token',
				password: 'validpass1',
				confirmPassword: 'validpass2'
			})
		).toBe('Konfirmasi password baru tidak cocok.');

		expect(
			validateResetPasswordInput({
				token: 'valid-token',
				password: 'validpass1',
				confirmPassword: 'validpass1'
			})
		).toBeNull();
	});

	it('validates unified password reset with OTP inputs', () => {
		expect(
			validateResetPasswordWithOTPInput({
				email: '',
				otp: '123456',
				password: 'newPassword123',
				confirmPassword: 'newPassword123'
			})
		).toBe('Alamat email wajib diisi.');

		expect(
			validateResetPasswordWithOTPInput({
				email: 'user@example.com',
				otp: '',
				password: 'newPassword123',
				confirmPassword: 'newPassword123'
			})
		).toBe('Kode OTP wajib diisi.');

		expect(
			validateResetPasswordWithOTPInput({
				email: 'user@example.com',
				otp: '12345',
				password: 'newPassword123',
				confirmPassword: 'newPassword123'
			})
		).toBe('Kode OTP harus terdiri dari 6 digit angka.');

		expect(
			validateResetPasswordWithOTPInput({
				email: 'user@example.com',
				otp: '123456',
				password: 'short',
				confirmPassword: 'short'
			})
		).toBe('Password baru minimal terdiri dari 8 karakter.');

		expect(
			validateResetPasswordWithOTPInput({
				email: 'user@example.com',
				otp: '123456',
				password: 'newPassword123',
				confirmPassword: 'differentPassword123'
			})
		).toBe('Konfirmasi password baru tidak cocok.');

		expect(
			validateResetPasswordWithOTPInput({
				email: 'user@example.com',
				otp: '123456',
				password: 'newPassword123',
				confirmPassword: 'newPassword123'
			})
		).toBeNull();
	});

	it('validates OTP and backup code inputs', () => {
		expect(validateOTPInput('')).toBe('Kode OTP wajib diisi.');
		expect(validateOTPInput('123')).toBe('Kode OTP harus terdiri dari 6 digit angka.');
		expect(validateOTPInput('12345a')).toBe('Kode OTP harus terdiri dari 6 digit angka.');
		expect(validateOTPInput('123456')).toBeNull();

		expect(validateBackupCodeInput('')).toBe('Kode cadangan wajib diisi.');
		expect(validateBackupCodeInput('123')).toBe('Format kode cadangan tidak valid.');
		expect(validateBackupCodeInput('a1b2c3d4e5')).toBeNull();
	});

	it('formats auth error messages into Indonesian', () => {
		expect(formatAuthError({ message: 'Invalid code' })).toBe(
			'Kode verifikasi salah atau tidak valid.'
		);
		expect(formatAuthError({ code: 'INVALID_OTP' })).toBe(
			'Kode verifikasi salah atau tidak valid.'
		);
		expect(formatAuthError({ message: 'OTP has expired' })).toBe(
			'Kode verifikasi sudah kedaluwarsa. Silakan minta kode baru.'
		);
		expect(formatAuthError({ code: 'OTP_EXPIRED' })).toBe(
			'Kode verifikasi sudah kedaluwarsa. Silakan minta kode baru.'
		);
		expect(formatAuthError({ code: 'TOO_MANY_ATTEMPTS' })).toBe(
			'Terlalu banyak percobaan gagal. Silakan tunggu beberapa saat atau minta kode baru.'
		);
		expect(formatAuthError({ message: 'Too many attempts' })).toBe(
			'Terlalu banyak percobaan gagal. Silakan tunggu beberapa saat atau minta kode baru.'
		);
		expect(formatAuthError({ message: 'User not found' })).toBe('Alamat email tidak terdaftar.');
		expect(formatAuthError({ code: 'USER_NOT_FOUND' })).toBe('Alamat email tidak terdaftar.');
		expect(formatAuthError({ message: 'Invalid password' })).toBe(
			'Password yang Anda masukkan salah.'
		);
		expect(formatAuthError({ message: 'Invalid two factor cookie' })).toBe(
			'Sesi verifikasi dua langkah tidak valid atau kedaluwarsa. Silakan masuk kembali.'
		);
		expect(formatAuthError({ message: 'Invalid backup code' })).toBe(
			'Kode cadangan tidak valid atau sudah digunakan.'
		);
		expect(formatAuthError(null)).toBe('Terjadi kesalahan. Silakan coba lagi.');
	});

	it('validates admin invite activation inputs', () => {
		expect(
			validateAdminInviteActivationInput({
				name: 'A',
				password: 'password123',
				confirmPassword: 'password123'
			})
		).toBe('Nama lengkap minimal 2 karakter.');

		expect(
			validateAdminInviteActivationInput({
				name: 'Farid',
				password: 'short',
				confirmPassword: 'short'
			})
		).toBe('Password minimal terdiri dari 8 karakter.');

		expect(
			validateAdminInviteActivationInput({
				name: 'Farid',
				password: 'password123',
				confirmPassword: 'password321'
			})
		).toBe('Konfirmasi password tidak cocok.');

		expect(
			validateAdminInviteActivationInput({
				name: 'Farid Zahran',
				password: 'password123',
				confirmPassword: 'password123'
			})
		).toBeNull();
	});

	describe('Register Page Multi-step OTP Flow (Issue #33)', () => {
		it('defines required registration OTP translation keys in id.json and en.json', () => {
			const idRegister = idDict.auth.register as Record<string, string>;
			const enRegister = enDict.auth.register as Record<string, string>;

			expect(idRegister.otpTitle).toBe('Verifikasi Kode OTP');
			expect(idRegister.otpLabel).toBe('Kode OTP');
			expect(idRegister.verifyButton).toBe('Verifikasi & Lanjutkan');
			expect(idRegister.resendButton).toBe('Kirim Ulang Kode OTP');
			expect(idRegister.changeEmail).toBeDefined();

			expect(enRegister.otpTitle).toBe('Verify OTP Code');
			expect(enRegister.otpLabel).toBe('OTP Code');
			expect(enRegister.verifyButton).toBe('Verify & Continue');
			expect(enRegister.resendButton).toBe('Resend OTP Code');
			expect(enRegister.changeEmail).toBeDefined();
		});

		it('renders RegisterPage in initial form step', () => {
			const { html } = render(RegisterPage);
			expect(html).toContain('Daftar Akun Takerin');
			expect(html).toContain('register-name');
			expect(html).toContain('register-email');
			expect(html).toContain('register-password');
			expect(html).toContain('register-confirm-password');
		});
	});

	describe('Unified Forgot Password & Reset Password Flow (Issue #34)', () => {
		it('defines required unified forgot password translation keys in id.json and en.json', () => {
			const idForgot = idDict.auth.forgotPassword as Record<string, string>;
			const enForgot = enDict.auth.forgotPassword as Record<string, string>;
			const idLogin = idDict.auth.login as Record<string, string>;
			const enLogin = enDict.auth.login as Record<string, string>;

			expect(idForgot.title).toBe('Lupa Kata Sandi?');
			expect(idForgot.resetTitle).toBe('Atur Ulang Kata Sandi');
			expect(idForgot.otpLabel).toBe('Kode OTP');
			expect(idForgot.newPasswordLabel).toBe('Kata Sandi Baru');
			expect(idForgot.confirmPasswordLabel).toBe('Konfirmasi Kata Sandi Baru');
			expect(idForgot.resetButton).toBe('Simpan Kata Sandi Baru');
			expect(idForgot.resendButton).toBe('Kirim Ulang Kode OTP');
			expect(idForgot.changeEmail).toBe('Salah memasukkan email? Ubah email');
			expect(idLogin.resetSuccess).toBeDefined();

			expect(enForgot.title).toBe('Forgot Password?');
			expect(enForgot.resetTitle).toBe('Reset Password');
			expect(enForgot.otpLabel).toBe('OTP Code');
			expect(enForgot.newPasswordLabel).toBe('New Password');
			expect(enForgot.confirmPasswordLabel).toBe('Confirm New Password');
			expect(enForgot.resetButton).toBe('Save New Password');
			expect(enForgot.resendButton).toBe('Resend OTP Code');
			expect(enForgot.changeEmail).toBe('Mistyped email? Change email');
			expect(enLogin.resetSuccess).toBeDefined();
		});

		it('renders ForgotPasswordPage in initial request step', () => {
			const { html } = render(ForgotPasswordPage);
			expect(html).toContain('Lupa Kata Sandi?');
			expect(html).toContain('forgot-email');
			expect(html).toContain('Kirim Kode OTP');
		});

		it('redirects /auth/reset-password to /auth/forgot-password with 303', () => {
			try {
				resetPasswordLoad({} as Parameters<typeof resetPasswordLoad>[0]);
				expect.unreachable('Should have thrown redirect');
			} catch (err: unknown) {
				const redirectErr = err as { status?: number; location?: string };
				expect(redirectErr.status).toBe(303);
				expect(redirectErr.location).toBe('/auth/forgot-password');
			}
		});
	});
});

describe('Admin Invite Activation Route (/auth/admin-invite/[token])', () => {
	const mockD1 = {} as D1Database;
	const mockInvitation: adminDb.AdminInvitationRecord = {
		id: 'inv-test-123',
		email: 'candidate@takerin.my.id',
		token: 'valid-test-token',
		invitedBy: 'u-super-1',
		status: 'pending',
		expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
		createdAt: new Date(),
		inviterName: 'Super Admin'
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('+page.server.ts load', () => {
		it('returns error when database is missing', async () => {
			const result = await adminInviteLoad({
				params: { token: 'some-token' },
				platform: undefined
			} as unknown as Parameters<typeof adminInviteLoad>[0]);

			expect(result).toMatchObject({
				valid: false,
				reason: 'error'
			});
		});

		it('returns error status when token is not found', async () => {
			vi.spyOn(adminDb, 'getValidInvitationByToken').mockResolvedValueOnce({
				valid: false,
				status: 'not_found'
			});

			const result = await adminInviteLoad({
				params: { token: 'invalid-token' },
				platform: { env: { DB: mockD1 } }
			} as unknown as Parameters<typeof adminInviteLoad>[0]);

			expect(result).toEqual({
				valid: false,
				reason: 'not_found',
				email: undefined
			});
		});

		it('returns error status when token is expired', async () => {
			vi.spyOn(adminDb, 'getValidInvitationByToken').mockResolvedValueOnce({
				valid: false,
				invitation: mockInvitation,
				status: 'expired'
			});

			const result = await adminInviteLoad({
				params: { token: 'expired-token' },
				platform: { env: { DB: mockD1 } }
			} as unknown as Parameters<typeof adminInviteLoad>[0]);

			expect(result).toEqual({
				valid: false,
				reason: 'expired',
				email: 'candidate@takerin.my.id'
			});
		});

		it('returns error status when token is revoked', async () => {
			vi.spyOn(adminDb, 'getValidInvitationByToken').mockResolvedValueOnce({
				valid: false,
				invitation: mockInvitation,
				status: 'revoked'
			});

			const result = await adminInviteLoad({
				params: { token: 'revoked-token' },
				platform: { env: { DB: mockD1 } }
			} as unknown as Parameters<typeof adminInviteLoad>[0]);

			expect(result).toEqual({
				valid: false,
				reason: 'revoked',
				email: 'candidate@takerin.my.id'
			});
		});

		it('returns error status when token is already accepted', async () => {
			vi.spyOn(adminDb, 'getValidInvitationByToken').mockResolvedValueOnce({
				valid: false,
				invitation: mockInvitation,
				status: 'accepted'
			});

			const result = await adminInviteLoad({
				params: { token: 'accepted-token' },
				platform: { env: { DB: mockD1 } }
			} as unknown as Parameters<typeof adminInviteLoad>[0]);

			expect(result).toEqual({
				valid: false,
				reason: 'accepted',
				email: 'candidate@takerin.my.id'
			});
		});

		it('returns invitation data when token is valid', async () => {
			vi.spyOn(adminDb, 'getValidInvitationByToken').mockResolvedValueOnce({
				valid: true,
				invitation: mockInvitation,
				status: 'valid'
			});

			const result = await adminInviteLoad({
				params: { token: 'valid-test-token' },
				platform: { env: { DB: mockD1 } }
			} as unknown as Parameters<typeof adminInviteLoad>[0]);

			expect(result).toEqual({
				valid: true,
				email: 'candidate@takerin.my.id',
				token: 'valid-test-token'
			});
		});
	});

	describe('+page.server.ts default action', () => {
		it('rejects activation if token is invalid or expired', async () => {
			vi.spyOn(adminDb, 'getValidInvitationByToken').mockResolvedValueOnce({
				valid: false,
				status: 'expired'
			});

			const formData = new FormData();
			formData.append('name', 'Admin Baru');
			formData.append('password', 'password123');
			formData.append('confirmPassword', 'password123');

			const mockRequest = { formData: vi.fn().mockResolvedValue(formData) } as unknown as Request;

			const result = await adminInviteActions.default({
				request: mockRequest,
				params: { token: 'expired-token' },
				platform: { env: { DB: mockD1 } }
			} as unknown as Parameters<typeof adminInviteActions.default>[0]);

			expect(result).toMatchObject({
				status: 400,
				data: {
					error: 'Tautan undangan tidak valid atau telah kedaluwarsa.',
					reason: 'expired'
				}
			});
		});

		it('rejects activation when validation fails (short password or mismatch)', async () => {
			vi.spyOn(adminDb, 'getValidInvitationByToken').mockResolvedValueOnce({
				valid: true,
				invitation: mockInvitation,
				status: 'valid'
			});

			const formData = new FormData();
			formData.append('name', 'Admin Baru');
			formData.append('password', 'password123');
			formData.append('confirmPassword', 'passwordMismatch');

			const mockRequest = { formData: vi.fn().mockResolvedValue(formData) } as unknown as Request;

			const result = await adminInviteActions.default({
				request: mockRequest,
				params: { token: 'valid-test-token' },
				platform: { env: { DB: mockD1 } }
			} as unknown as Parameters<typeof adminInviteActions.default>[0]);

			expect(result).toMatchObject({
				status: 400,
				data: {
					error: 'Konfirmasi password tidak cocok.',
					name: 'Admin Baru'
				}
			});
		});

		it('registers new admin user, marks invitation accepted, sets session cookies, and redirects to /admin', async () => {
			vi.spyOn(adminDb, 'getValidInvitationByToken').mockResolvedValueOnce({
				valid: true,
				invitation: mockInvitation,
				status: 'valid'
			});

			const markAcceptedSpy = vi
				.spyOn(adminDb, 'markInvitationAccepted')
				.mockResolvedValueOnce({ success: true });

			const mockSignUpEmail = vi.fn().mockResolvedValue({
				user: { id: 'u-new-admin', email: 'candidate@takerin.my.id' }
			});

			const mockHeaders = new Headers();
			mockHeaders.append(
				'set-cookie',
				'better-auth.session_token=session-token-xyz; Path=/; HttpOnly; SameSite=Lax'
			);

			const mockSignInResponse = new Response(JSON.stringify({ status: true }), {
				status: 200,
				headers: mockHeaders
			});

			const mockSignInEmail = vi.fn().mockResolvedValue(mockSignInResponse);

			const mockAuth = {
				api: {
					signUpEmail: mockSignUpEmail,
					signInEmail: mockSignInEmail
				}
			};

			vi.spyOn(authServer, 'getAuth').mockReturnValue(
				mockAuth as unknown as ReturnType<typeof authServer.getAuth>
			);

			const mockWhere = vi.fn().mockResolvedValue([]);
			const mockSet = vi.fn().mockReturnValue({ where: mockWhere });
			const mockUpdate = vi.fn().mockReturnValue({ set: mockSet });
			const mockDb = { update: mockUpdate };
			vi.spyOn(dbModule, 'getDb').mockReturnValue(
				mockDb as unknown as ReturnType<typeof dbModule.getDb>
			);

			const cookieSetSpy = vi.fn();
			const mockCookies = {
				set: cookieSetSpy,
				get: vi.fn(),
				delete: vi.fn()
			};

			const formData = new FormData();
			formData.append('name', 'Admin Baru');
			formData.append('password', 'password123');
			formData.append('confirmPassword', 'password123');

			const mockRequest = { formData: vi.fn().mockResolvedValue(formData) } as unknown as Request;

			await expect(
				adminInviteActions.default({
					request: mockRequest,
					params: { token: 'valid-test-token' },
					platform: { env: { DB: mockD1 } },
					cookies: mockCookies
				} as unknown as Parameters<typeof adminInviteActions.default>[0])
			).rejects.toMatchObject({
				status: 303,
				location: '/admin'
			});

			// Verify signUpEmail called
			expect(mockSignUpEmail).toHaveBeenCalledWith({
				body: {
					name: 'Admin Baru',
					email: 'candidate@takerin.my.id',
					password: 'password123'
				}
			});

			// Verify user role, emailVerified, and onboardingCompleted updated
			expect(mockUpdate).toHaveBeenCalled();
			expect(mockSet).toHaveBeenCalledWith(
				expect.objectContaining({
					role: 'admin',
					emailVerified: true,
					onboardingCompleted: true
				})
			);

			// Verify signInEmail called with asResponse: true
			expect(mockSignInEmail).toHaveBeenCalledWith({
				body: {
					email: 'candidate@takerin.my.id',
					password: 'password123'
				},
				asResponse: true
			});

			// Verify invitation marked accepted
			expect(markAcceptedSpy).toHaveBeenCalledWith(mockD1, 'inv-test-123');

			// Verify session cookie set
			expect(cookieSetSpy).toHaveBeenCalledWith(
				'better-auth.session_token',
				'session-token-xyz',
				expect.objectContaining({
					path: '/',
					httpOnly: true,
					sameSite: 'lax'
				})
			);
		});
	});
});
