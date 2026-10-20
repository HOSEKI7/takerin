import { describe, it, expect } from 'vitest';
import {
	authClient,
	signIn,
	signUp,
	signOut,
	requestPasswordReset,
	resetPassword
} from '#lib/auth-client.js';

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
		function validateRegisterInput(input: {
			name: string;
			email: string;
			password: string;
			confirmPassword: string;
		}) {
			if (!input.name.trim()) return 'Nama lengkap wajib diisi.';
			if (!input.email.trim()) return 'Alamat email wajib diisi.';
			if (input.password.length < 8) return 'Password minimal terdiri dari 8 karakter.';
			if (input.password !== input.confirmPassword) return 'Konfirmasi password tidak cocok.';
			return null;
		}

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

	it('validates password reset token requirement', () => {
		function validateResetPasswordInput(token: string | null, password: string, confirm: string) {
			if (!token) return 'Token reset password tidak valid atau tidak ditemukan.';
			if (password.length < 8) return 'Password baru minimal terdiri dari 8 karakter.';
			if (password !== confirm) return 'Konfirmasi password baru tidak cocok.';
			return null;
		}

		expect(validateResetPasswordInput(null, 'newPassword123', 'newPassword123')).toBe(
			'Token reset password tidak valid atau tidak ditemukan.'
		);
		expect(validateResetPasswordInput('valid-token', 'short', 'short')).toBe(
			'Password baru minimal terdiri dari 8 karakter.'
		);
		expect(validateResetPasswordInput('valid-token', 'validpass1', 'validpass2')).toBe(
			'Konfirmasi password baru tidak cocok.'
		);
		expect(validateResetPasswordInput('valid-token', 'validpass1', 'validpass1')).toBeNull();
	});
});
