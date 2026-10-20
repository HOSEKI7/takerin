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

export interface ResetPasswordInput {
	token?: string | null;
	password?: string;
	confirmPassword?: string;
}

export function validateResetPasswordInput(input: ResetPasswordInput): string | null {
	if (!input.token) {
		return 'Token reset password tidak valid atau tidak ditemukan.';
	}
	if (!input.password || input.password.length < 8) {
		return 'Password baru minimal terdiri dari 8 karakter.';
	}
	if (input.password !== input.confirmPassword) {
		return 'Konfirmasi password baru tidak cocok.';
	}
	return null;
}
