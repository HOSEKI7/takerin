import { Resend } from 'resend';
import { env } from 'cloudflare:workers';

export interface EmailOptions {
	to: string;
	url: string;
	token?: string;
}

export interface EmailServiceConfig {
	apiKey?: string;
	fromEmail?: string;
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

function getEnvVar(key: string): string | undefined {
	try {
		const val = (env as unknown as Record<string, string | undefined>)?.[key];
		if (typeof val === 'string') return val;
	} catch {
		// Fallback when accessed outside Cloudflare request context
	}
	if (typeof process !== 'undefined') {
		return process.env?.[key];
	}
	return undefined;
}

export function createEmailService(config: EmailServiceConfig = {}) {
	const apiKey = config.apiKey ?? getEnvVar('RESEND_API_KEY');

	const from = config.fromEmail ?? getEnvVar('EMAIL_FROM') ?? 'Takerin <onboarding@resend.dev>';

	const client = config.resendClient ?? (apiKey ? new Resend(apiKey) : null);

	async function sendVerificationEmail({ to, url }: EmailOptions): Promise<EmailResult> {
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

	async function sendResetPasswordEmail({ to, url }: EmailOptions): Promise<EmailResult> {
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

	return {
		sendVerificationEmail,
		sendResetPasswordEmail
	};
}

// Default singleton instance based on environment variables
const defaultService = createEmailService();

export const sendVerificationEmail = defaultService.sendVerificationEmail;
export const sendResetPasswordEmail = defaultService.sendResetPasswordEmail;
