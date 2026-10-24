export interface RegisterInput {
	name?: string;
	email?: string;
	password?: string;
	confirmPassword?: string;
}

export function validateRegisterInput(input: RegisterInput): string | null {
	if (!input.name || !input.name.trim()) {
		return 'Nama lengkap wajib diisi.';
	}
	if (!input.email || !input.email.trim()) {
		return 'Alamat email wajib diisi.';
	}
	if (!input.password || input.password.length < 8) {
		return 'Password minimal terdiri dari 8 karakter.';
	}
	if (input.password !== input.confirmPassword) {
		return 'Konfirmasi password tidak cocok.';
	}
	return null;
}

export interface LoginInput {
	email?: string;
	password?: string;
}

export function validateLoginInput(input: LoginInput): string | null {
	if (!input.email || !input.email.trim()) {
		return 'Alamat email wajib diisi.';
	}
	if (!input.password) {
		return 'Password wajib diisi.';
	}
	return null;
}

export interface ForgotPasswordInput {
	email?: string;
}

export function validateForgotPasswordInput(input: ForgotPasswordInput): string | null {
	if (!input.email || !input.email.trim()) {
		return 'Alamat email wajib diisi.';
	}
	return null;
}

export interface ResetPasswordWithOTPInput {
	email?: string;
	otp?: string;
	password?: string;
	confirmPassword?: string;
}

export function validateResetPasswordWithOTPInput(input: ResetPasswordWithOTPInput): string | null {
	if (!input.email || !input.email.trim()) {
		return 'Alamat email wajib diisi.';
	}
	const otpError = validateOTPInput(input.otp || '');
	if (otpError) {
		return otpError;
	}
	if (!input.password || input.password.length < 8) {
		return 'Kata sandi baru minimal terdiri dari 8 karakter.';
	}
	if (input.password !== input.confirmPassword) {
		return 'Konfirmasi kata sandi baru tidak cocok.';
	}
	return null;
}

export function validateOTPInput(code: string): string | null {
	if (!code || !code.trim()) {
		return 'Kode OTP wajib diisi.';
	}
	if (!/^\d{6}$/.test(code.trim())) {
		return 'Kode OTP harus terdiri dari 6 digit angka.';
	}
	return null;
}

export function validateBackupCodeInput(code: string): string | null {
	if (!code || !code.trim()) {
		return 'Kode cadangan wajib diisi.';
	}
	if (code.trim().length < 6) {
		return 'Format kode cadangan tidak valid.';
	}
	return null;
}

export interface AdminInviteActivationInput {
	name?: string;
	password?: string;
	confirmPassword?: string;
}

export function validateAdminInviteActivationInput(
	input: AdminInviteActivationInput
): string | null {
	if (!input.name || input.name.trim().length < 2) {
		return 'Nama lengkap minimal 2 karakter.';
	}
	if (!input.password || input.password.length < 8) {
		return 'Password minimal terdiri dari 8 karakter.';
	}
	if (input.password !== input.confirmPassword) {
		return 'Konfirmasi password tidak cocok.';
	}
	return null;
}

export function formatAuthError(
	error?: { message?: string; code?: string } | string | null
): string {
	if (!error) return 'Terjadi kesalahan. Silakan coba lagi.';
	const msg = typeof error === 'string' ? error : error.message || '';
	const code = typeof error === 'string' ? '' : error.code || '';
	const lower = (msg + ' ' + code).toLowerCase();
	if (lower.includes('backup')) {
		return 'Kode cadangan tidak valid atau sudah digunakan.';
	}
	if (lower.includes('too many attempts') || lower.includes('too_many_attempts')) {
		return 'Terlalu banyak percobaan gagal. Silakan tunggu beberapa saat atau minta kode baru.';
	}
	if (
		(lower.includes('invalid') && (lower.includes('code') || lower.includes('otp'))) ||
		lower.includes('invalid_otp')
	) {
		return 'Kode verifikasi salah atau tidak valid.';
	}
	if (lower.includes('expired') || lower.includes('otp_expired')) {
		return 'Kode verifikasi sudah kedaluwarsa. Silakan minta kode baru.';
	}
	if (lower.includes('user not found') || lower.includes('user_not_found')) {
		return 'Alamat email tidak terdaftar.';
	}
	if (lower.includes('invalid') && lower.includes('password')) {
		return 'Password yang Anda masukkan salah.';
	}
	if (lower.includes('invalid') && lower.includes('cookie')) {
		return 'Sesi verifikasi dua langkah tidak valid atau kedaluwarsa. Silakan masuk kembali.';
	}
	return 'Terjadi kesalahan saat memproses permintaan Anda.';
}
