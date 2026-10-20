import { describe, it, expect } from 'vitest';
import {
	authClient,
	signIn,
	signUp,
	signOut,
	requestPasswordReset,
	resetPassword
} from '#lib/auth-client.js';
import {
	validateRegisterInput,
	validateLoginInput,
	validateForgotPasswordInput,
	validateResetPasswordInput
} from '#lib/validation/auth.js';

describe('Auth Client & Route Interfaces', () => {
	it('exports working client methods from auth-client', () => {
		expect(authClient).toBeDefined();
		expect(typeof signIn.email).toBe('function');
		expect(typeof signUp.email).toBe('function');
		expect(typeof signOut).toBe('function');
		expect(typeof requestPasswordReset).toBe('function');
		expect(typeof resetPassword).toBe('function');
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
});
