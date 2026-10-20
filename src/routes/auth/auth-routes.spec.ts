import { describe, it, expect } from 'vitest';
import {
	authClient,
	signIn,
	signUp,
	signOut,
	requestPasswordReset,
	resetPassword,
	twoFactor
} from '#lib/auth-client.js';
import {
	validateRegisterInput,
	validateLoginInput,
	validateForgotPasswordInput,
	validateResetPasswordInput,
	validateOTPInput,
	validateBackupCodeInput,
	formatAuthError
} from '#lib/validation/auth.js';

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
		expect(formatAuthError({ message: 'OTP has expired' })).toBe(
			'Kode verifikasi sudah kedaluwarsa. Silakan minta kode baru.'
		);
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
});
