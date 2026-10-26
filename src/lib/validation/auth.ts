export interface RegisterInput {
	name?: string;
	email?: string;
	password?: string;
	confirmPassword?: string;
}

export function validateRegisterInput(input: RegisterInput, locale: 'id' | 'en' = 'id'): string | null {
	if (!input.name || !input.name.trim()) {
		return locale === 'en' ? 'Full name is required.' : 'Nama lengkap wajib diisi.';
	}
	if (!input.email || !input.email.trim()) {
		return locale === 'en' ? 'Email address is required.' : 'Alamat email wajib diisi.';
	}
	if (!input.password || input.password.length < 8) {
		return locale === 'en'
			? 'Password must be at least 8 characters.'
			: 'Password minimal terdiri dari 8 karakter.';
	}
	if (input.password !== input.confirmPassword) {
		return locale === 'en'
			? 'Password confirmation does not match.'
			: 'Konfirmasi password tidak cocok.';
	}
	return null;
}

export interface LoginInput {
	email?: string;
	password?: string;
}

export function validateLoginInput(input: LoginInput, locale: 'id' | 'en' = 'id'): string | null {
	if (!input.email || !input.email.trim()) {
		return locale === 'en' ? 'Email address is required.' : 'Alamat email wajib diisi.';
	}
	if (!input.password) {
		return locale === 'en' ? 'Password is required.' : 'Password wajib diisi.';
	}
	return null;
}

export interface ForgotPasswordInput {
	email?: string;
}

export function validateForgotPasswordInput(
	input: ForgotPasswordInput,
	locale: 'id' | 'en' = 'id'
): string | null {
	if (!input.email || !input.email.trim()) {
		return locale === 'en' ? 'Email address is required.' : 'Alamat email wajib diisi.';
	}
	return null;
}

export interface ResetPasswordWithOTPInput {
	email?: string;
	otp?: string;
	password?: string;
	confirmPassword?: string;
}

export function validateResetPasswordWithOTPInput(
	input: ResetPasswordWithOTPInput,
	locale: 'id' | 'en' = 'id'
): string | null {
	if (!input.email || !input.email.trim()) {
		return locale === 'en' ? 'Email address is required.' : 'Alamat email wajib diisi.';
	}
	const otpError = validateOTPInput(input.otp || '', locale);
	if (otpError) {
		return otpError;
	}
	if (!input.password || input.password.length < 8) {
		return locale === 'en'
			? 'New password must be at least 8 characters.'
			: 'Kata sandi baru minimal terdiri dari 8 karakter.';
	}
	if (input.password !== input.confirmPassword) {
		return locale === 'en'
			? 'New password confirmation does not match.'
			: 'Konfirmasi kata sandi baru tidak cocok.';
	}
	return null;
}

export function validateOTPInput(code: string, locale: 'id' | 'en' = 'id'): string | null {
	if (!code || !code.trim()) {
		return locale === 'en' ? 'OTP code is required.' : 'Kode OTP wajib diisi.';
	}
	if (!/^\d{6}$/.test(code.trim())) {
		return locale === 'en'
			? 'OTP code must be 6 digits.'
			: 'Kode OTP harus terdiri dari 6 digit angka.';
	}
	return null;
}

export function validateBackupCodeInput(code: string, locale: 'id' | 'en' = 'id'): string | null {
	if (!code || !code.trim()) {
		return locale === 'en' ? 'Backup code is required.' : 'Kode cadangan wajib diisi.';
	}
	if (code.trim().length < 6) {
		return locale === 'en'
			? 'Invalid backup code format.'
			: 'Format kode cadangan tidak valid.';
	}
	return null;
}

export interface AdminInviteActivationInput {
	name?: string;
	password?: string;
	confirmPassword?: string;
}

export function validateAdminInviteActivationInput(
	input: AdminInviteActivationInput,
	locale: 'id' | 'en' = 'id'
): string | null {
	if (!input.name || input.name.trim().length < 2) {
		return locale === 'en'
			? 'Full name must be at least 2 characters.'
			: 'Nama lengkap minimal 2 karakter.';
	}
	if (!input.password || input.password.length < 8) {
		return locale === 'en'
			? 'Password must be at least 8 characters.'
			: 'Password minimal terdiri dari 8 karakter.';
	}
	if (input.password !== input.confirmPassword) {
		return locale === 'en'
			? 'Password confirmation does not match.'
			: 'Konfirmasi password tidak cocok.';
	}
	return null;
}

export function formatAuthError(
	error?: { message?: string; code?: string } | string | null,
	locale: 'id' | 'en' = 'id'
): string {
	if (!error) {
		return locale === 'en'
			? 'An error occurred. Please try again.'
			: 'Terjadi kesalahan. Silakan coba lagi.';
	}
	const msg = typeof error === 'string' ? error : error.message || '';
	const code = typeof error === 'string' ? '' : error.code || '';
	const lower = (msg + ' ' + code).toLowerCase();
	if (lower.includes('backup')) {
		return locale === 'en'
			? 'Invalid or already used backup code.'
			: 'Kode cadangan tidak valid atau sudah digunakan.';
	}
	if (lower.includes('too many attempts') || lower.includes('too_many_attempts')) {
		return locale === 'en'
			? 'Too many failed attempts. Please wait a moment or request a new code.'
			: 'Terlalu banyak percobaan gagal. Silakan tunggu beberapa saat atau minta kode baru.';
	}
	if (
		(lower.includes('invalid') && (lower.includes('code') || lower.includes('otp'))) ||
		lower.includes('invalid_otp')
	) {
		return locale === 'en'
			? 'Invalid or incorrect verification code.'
			: 'Kode verifikasi salah atau tidak valid.';
	}
	if (lower.includes('expired') || lower.includes('otp_expired')) {
		return locale === 'en'
			? 'Verification code has expired. Please request a new code.'
			: 'Kode verifikasi sudah kedaluwarsa. Silakan minta kode baru.';
	}
	if (lower.includes('user not found') || lower.includes('user_not_found')) {
		return locale === 'en'
			? 'Email address is not registered.'
			: 'Alamat email tidak terdaftar.';
	}
	if (lower.includes('invalid') && lower.includes('password')) {
		return locale === 'en'
			? 'The password you entered is incorrect.'
			: 'Password yang Anda masukkan salah.';
	}
	if (lower.includes('invalid') && lower.includes('cookie')) {
		return locale === 'en'
			? 'Two-factor session is invalid or expired. Please log in again.'
			: 'Sesi verifikasi dua langkah tidak valid atau kedaluwarsa. Silakan masuk kembali.';
	}
	return locale === 'en'
		? 'An error occurred while processing your request.'
		: 'Terjadi kesalahan saat memproses permintaan Anda.';
}
