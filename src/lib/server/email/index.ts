import { Resend } from 'resend';
import { getRuntimeEnv } from '#lib/server/env.js';

export interface EmailOptions {
	to: string;
	url: string;
	token?: string;
	platformEnv?: Record<string, unknown>;
}

export interface OTPEmailOptions {
	to: string;
	otp: string;
	type?: 'sign-in' | 'email-verification' | 'forget-password' | 'sign-in-2fa' | string;
	platformEnv?: Record<string, unknown>;
}

export interface AdminInvitationEmailOptions {
	to: string;
	url: string;
	invitedByName?: string;
	platformEnv?: Record<string, unknown>;
}

export interface EmailServiceConfig {
	apiKey?: string;
	fromEmail?: string;
	platformEnv?: Record<string, unknown>;
	resendClient?: {
		emails: {
			send: (payload: {
				from: string;
				to: string;
				subject: string;
				html: string;
				text: string;
			}) => Promise<{ data: unknown; error: { message?: string } | null }>;
		};
	};
}

export interface EmailResult {
	success: boolean;
	data?: unknown;
	error?: string;
	mocked?: boolean;
}

export function createEmailService(config: EmailServiceConfig = {}) {
	function getClient(platformEnv?: Record<string, unknown>) {
		if (config.resendClient) {
			return config.resendClient;
		}
		const env = config.platformEnv ?? platformEnv;
		const apiKey = config.apiKey ?? getRuntimeEnv('RESEND_API_KEY', env);
		return apiKey ? new Resend(apiKey) : null;
	}

	function getFrom(platformEnv?: Record<string, unknown>) {
		const env = config.platformEnv ?? platformEnv;
		return (
			config.fromEmail ?? getRuntimeEnv('EMAIL_FROM', env) ?? 'Takerin <noreply@takerin.my.id>'
		);
	}

	async function sendVerificationEmail(opts: EmailOptions): Promise<EmailResult> {
		const client = getClient(opts.platformEnv);
		const from = getFrom(opts.platformEnv);
		const { to, url } = opts;
		const subject = 'Verifikasi Email Akun Takerin Anda';
		const text = `Halo,

Terima kasih telah mendaftar di Takerin. Silakan buka tautan berikut untuk memverifikasi alamat email Anda:
${url}

Tautan ini berlaku selama 1 jam. Jika Anda tidak merasa mendaftar di Takerin, abaikan email ini.`;

		const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f7f9f6; color: #163300; margin: 0; padding: 24px; }
    .container { max-width: 540px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; padding: 32px; border: 1px solid #e8ebe6; }
    .logo { font-size: 24px; font-weight: 800; color: #163300; margin-bottom: 24px; }
    h1 { font-size: 20px; font-weight: 700; color: #0e0f0c; margin-bottom: 16px; }
    p { font-size: 15px; line-height: 1.6; color: #454745; margin-bottom: 20px; }
    .btn { display: inline-block; background-color: #163300; color: #ffffff !important; font-weight: 600; text-decoration: none; padding: 12px 28px; border-radius: 9999px; font-size: 15px; margin: 12px 0 24px 0; }
    .footer { font-size: 12px; color: #868685; margin-top: 32px; border-top: 1px solid #e8ebe6; pt: 16px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">Takerin</div>
    <h1>Verifikasi Email Anda</h1>
    <p>Halo,</p>
    <p>Terima kasih telah bergabung dengan Takerin — aplikasi atur dan catat pengeluaran berdasarkan pemasukan.</p>
    <p>Silakan klik tombol di bawah ini untuk memverifikasi email Anda:</p>
    <a href="${url}" class="btn" target="_blank">Verifikasi Email</a>
    <p>Atau salin dan tempel tautan berikut di browser Anda:<br/><a href="${url}" style="color: #163300; word-break: break-all;">${url}</a></p>
    <div class="footer">
      <p>Jika Anda tidak merasa mendaftar akun di Takerin, abaikan email ini.</p>
    </div>
  </div>
</body>
</html>
`;

		if (!client) {
			console.info(`[Email Service - Mock] Verification email to: ${to}, url: ${url}`);
			return { success: true, mocked: true };
		}

		try {
			const { data, error } = await client.emails.send({
				from,
				to,
				subject,
				html,
				text
			});

			if (error) {
				console.error('[Email Service] Failed to send verification email:', error);
				return { success: false, error: error.message || 'Gagal mengirim email verifikasi' };
			}

			return { success: true, data };
		} catch (err: unknown) {
			const message = err instanceof Error ? err.message : 'Error saat mengirim email';
			console.error('[Email Service] Unexpected error sending email:', err);
			return { success: false, error: message };
		}
	}

	async function sendResetPasswordEmail(opts: EmailOptions): Promise<EmailResult> {
		const client = getClient(opts.platformEnv);
		const from = getFrom(opts.platformEnv);
		const { to, url } = opts;
		const subject = 'Reset Password Akun Takerin Anda';
		const text = `Halo,

Kami menerima permintaan untuk mereset password akun Takerin Anda. Silakan klik tautan berikut untuk membuat password baru:
${url}

Tautan ini berlaku selama 1 jam. Jika Anda tidak meminta reset password, Anda dapat mengabaikan email ini.`;

		const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f7f9f6; color: #163300; margin: 0; padding: 24px; }
    .container { max-width: 540px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; padding: 32px; border: 1px solid #e8ebe6; }
    .logo { font-size: 24px; font-weight: 800; color: #163300; margin-bottom: 24px; }
    h1 { font-size: 20px; font-weight: 700; color: #0e0f0c; margin-bottom: 16px; }
    p { font-size: 15px; line-height: 1.6; color: #454745; margin-bottom: 20px; }
    .btn { display: inline-block; background-color: #163300; color: #ffffff !important; font-weight: 600; text-decoration: none; padding: 12px 28px; border-radius: 9999px; font-size: 15px; margin: 12px 0 24px 0; }
    .footer { font-size: 12px; color: #868685; margin-top: 32px; border-top: 1px solid #e8ebe6; pt: 16px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">Takerin</div>
    <h1>Reset Password Akun Anda</h1>
    <p>Halo,</p>
    <p>Kami menerima permintaan untuk mereset password akun Takerin Anda.</p>
    <p>Silakan klik tombol di bawah ini untuk membuat password baru:</p>
    <a href="${url}" class="btn" target="_blank">Reset Password</a>
    <p>Atau salin dan tempel tautan berikut di browser Anda:<br/><a href="${url}" style="color: #163300; word-break: break-all;">${url}</a></p>
    <div class="footer">
      <p>Tautan ini berlaku selama 1 jam. Jika Anda tidak meminta reset password, akun Anda tetap aman dan Anda dapat mengabaikan email ini.</p>
    </div>
  </div>
</body>
</html>
`;

		if (!client) {
			console.info(`[Email Service - Mock] Reset password email to: ${to}, url: ${url}`);
			return { success: true, mocked: true };
		}

		try {
			const { data, error } = await client.emails.send({
				from,
				to,
				subject,
				html,
				text
			});

			if (error) {
				console.error('[Email Service] Failed to send reset password email:', error);
				return { success: false, error: error.message || 'Gagal mengirim email reset password' };
			}

			return { success: true, data };
		} catch (err: unknown) {
			const message = err instanceof Error ? err.message : 'Error saat mengirim email';
			console.error('[Email Service] Unexpected error sending reset password email:', err);
			return { success: false, error: message };
		}
	}

	async function sendOTPEmail(opts: OTPEmailOptions): Promise<EmailResult> {
		const client = getClient(opts.platformEnv);
		const from = getFrom(opts.platformEnv);
		const { to, otp, type = 'sign-in-2fa' } = opts;

		let subject = 'Kode Verifikasi 2FA Akun Takerin Anda';
		let title = 'Kode Verifikasi Dua Langkah';
		let explanation =
			'Gunakan kode One-Time Password (OTP) berikut untuk menyelesaikan proses masuk ke akun Takerin Anda:';

		if (type === 'email-verification') {
			subject = 'Kode Verifikasi Email Akun Takerin Anda';
			title = 'Verifikasi Email Akun Takerin';
			explanation = 'Gunakan kode OTP berikut untuk memverifikasi alamat email akun Takerin Anda:';
		} else if (type === 'forget-password') {
			subject = 'Kode Reset Password Akun Takerin Anda';
			title = 'Reset Password Akun Takerin';
			explanation =
				'Gunakan kode OTP berikut untuk melanjutkan pengaturan ulang password akun Anda:';
		} else if (type === 'change-email') {
			subject = 'Kode Verifikasi Penggantian Email Akun Takerin';
			title = 'Verifikasi Penggantian Email';
			explanation =
				'Gunakan kode OTP berikut untuk memverifikasi dan melanjutkan penggantian alamat email akun Takerin Anda:';
		}

		const expiryMinutes = type === 'sign-in-2fa' ? 3 : 5;

		const text = `Halo,

${explanation}

${otp}

Kode ini berlaku selama ${expiryMinutes} menit. Demi keamanan akun Anda, jangan berikan kode ini kepada siapa pun.
Jika Anda tidak melakukan permintaan ini, segera amankan akun Anda.`;

		const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f7f9f6; color: #163300; margin: 0; padding: 24px; }
    .container { max-width: 540px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; padding: 32px; border: 1px solid #e8ebe6; }
    .logo { font-size: 24px; font-weight: 800; color: #163300; margin-bottom: 24px; }
    h1 { font-size: 20px; font-weight: 700; color: #0e0f0c; margin-bottom: 16px; }
    p { font-size: 15px; line-height: 1.6; color: #454745; margin-bottom: 20px; }
    .otp-box { background-color: #e2f6d5; border: 1px solid #9fe870; border-radius: 10px; padding: 18px 24px; text-align: center; margin: 24px 0; }
    .otp-code { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 32px; font-weight: 900; letter-spacing: 6px; color: #163300; }
    .notice { font-size: 13px; color: #6a6c6a; }
    .footer { font-size: 12px; color: #868685; margin-top: 32px; border-top: 1px solid #e8ebe6; padding-top: 16px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">Takerin</div>
    <h1>${title}</h1>
    <p>Halo,</p>
    <p>${explanation}</p>
    <div class="otp-box">
      <div class="otp-code">${otp}</div>
    </div>
    <p class="notice">Kode ini berlaku selama ${expiryMinutes} menit. Demi keamanan, jangan berikan kode ini kepada siapa pun termasuk pihak Takerin.</p>
    <div class="footer">
      <p>Jika Anda tidak merasa melakukan permintaan ini, abaikan email ini atau segera hubungi kami.</p>
    </div>
  </div>
</body>
</html>
`;

		if (!client) {
			console.info(`[Email Service - Mock] OTP email (${type}) to: ${to}, code: ${otp}`);
			return { success: true, mocked: true };
		}

		try {
			const { data, error } = await client.emails.send({
				from,
				to,
				subject,
				html,
				text
			});

			if (error) {
				console.error('[Email Service] Failed to send OTP email:', error);
				return { success: false, error: error.message || 'Gagal mengirim email OTP' };
			}

			return { success: true, data };
		} catch (err: unknown) {
			const message = err instanceof Error ? err.message : 'Error saat mengirim email';
			console.error('[Email Service] Unexpected error sending OTP email:', err);
			return { success: false, error: message };
		}
	}

	async function sendAdminInvitationEmail(opts: AdminInvitationEmailOptions): Promise<EmailResult> {
		const client = getClient(opts.platformEnv);
		const from = getFrom(opts.platformEnv);
		const { to, url, invitedByName } = opts;
		const subject = 'Undangan Menjadi Administrator Takerin';
		const inviterText = invitedByName ? `${invitedByName} mengundang Anda` : 'Anda telah diundang';
		const text = `Halo,

${inviterText} untuk menjadi Administrator di Takerin.
Silakan klik tautan berikut untuk melengkapi akun dan menerima undangan Administrator Anda:
${url}

Penting: Tautan undangan ini berlaku selama 48 jam. Jika Anda tidak merasa mengenal pengirim atau tidak berhak atas undangan ini, Anda dapat mengabaikan email ini.`;

		const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f7f9f6; color: #163300; margin: 0; padding: 24px; }
    .container { max-width: 540px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; padding: 32px; border: 1px solid #e8ebe6; }
    .logo { font-size: 24px; font-weight: 800; color: #163300; margin-bottom: 24px; }
    h1 { font-size: 20px; font-weight: 700; color: #0e0f0c; margin-bottom: 16px; }
    p { font-size: 15px; line-height: 1.6; color: #454745; margin-bottom: 20px; }
    .btn { display: inline-block; background-color: #163300; color: #ffffff !important; font-weight: 600; text-decoration: none; padding: 12px 28px; border-radius: 9999px; font-size: 15px; margin: 12px 0 24px 0; }
    .alert-box { background-color: #f3f6f1; border-left: 4px solid #163300; padding: 12px 16px; border-radius: 4px; margin: 20px 0; font-size: 14px; color: #2d332d; }
    .footer { font-size: 12px; color: #868685; margin-top: 32px; border-top: 1px solid #e8ebe6; padding-top: 16px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">Takerin</div>
    <h1>Undangan Administrator</h1>
    <p>Halo,</p>
    <p>${inviterText} untuk bergabung sebagai <strong>Administrator</strong> di platform Takerin.</p>
    <a href="${url}" class="btn" target="_blank">Terima Undangan Administrator</a>
    <div class="alert-box">
      <strong>Masa Berlaku:</strong> Tautan undangan ini hanya berlaku selama <strong>48 jam</strong> sejak dikirimkan.
    </div>
    <p>Atau salin dan tempel tautan berikut di browser Anda:<br/><a href="${url}" style="color: #163300; word-break: break-all;">${url}</a></p>
    <div class="footer">
      <p>Jika Anda tidak merasa berhak atas undangan ini atau tidak mengenal pihak pengundang, abaikan email ini.</p>
    </div>
  </div>
</body>
</html>
`;

		if (!client) {
			console.info(`[Email Service - Mock] Admin invitation email to: ${to}, url: ${url}`);
			return { success: true, mocked: true };
		}

		try {
			const { data, error } = await client.emails.send({
				from,
				to,
				subject,
				html,
				text
			});

			if (error) {
				console.error('[Email Service] Failed to send admin invitation email:', error);
				return { success: false, error: error.message || 'Gagal mengirim email undangan admin' };
			}

			return { success: true, data };
		} catch (err: unknown) {
			const message = err instanceof Error ? err.message : 'Error saat mengirim email';
			console.error('[Email Service] Unexpected error sending admin invitation email:', err);
			return { success: false, error: message };
		}
	}

	return {
		sendVerificationEmail,
		sendResetPasswordEmail,
		sendOTPEmail,
		sendAdminInvitationEmail
	};
}

// Default singleton instance based on environment variables
const defaultService = createEmailService();

export const sendVerificationEmail = defaultService.sendVerificationEmail;
export const sendResetPasswordEmail = defaultService.sendResetPasswordEmail;
export const sendOTPEmail = defaultService.sendOTPEmail;
export const sendAdminInvitationEmail = defaultService.sendAdminInvitationEmail;
