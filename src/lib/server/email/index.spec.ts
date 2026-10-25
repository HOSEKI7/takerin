import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createEmailService, type EmailServiceConfig } from './index';

describe('Email Service (Resend)', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('formats verification email and calls Resend emails.send when API key is present', async () => {
		const mockSend = vi.fn().mockResolvedValue({ data: { id: 'msg_123' }, error: null });
		const mockResend: NonNullable<EmailServiceConfig['resendClient']> = {
			emails: {
				send: mockSend
			}
		};

		const service = createEmailService({
			resendClient: mockResend,
			fromEmail: 'Takerin <noreply@takerin.my.id>'
		});

		const result = await service.sendVerificationEmail({
			to: 'user@example.com',
			url: 'https://takerin.my.id/auth/verify?token=abc'
		});

		expect(result.success).toBe(true);
		expect(mockSend).toHaveBeenCalledTimes(1);
		const callArg = mockSend.mock.calls[0][0];
		expect(callArg.to).toBe('user@example.com');
		expect(callArg.from).toBe('Takerin <noreply@takerin.my.id>');
		expect(callArg.subject).toContain('Verifikasi Email');
		expect(callArg.html).toContain('https://takerin.my.id/auth/verify?token=abc');
		expect(callArg.text).toContain('https://takerin.my.id/auth/verify?token=abc');
	});

	it('formats password reset email and calls Resend emails.send', async () => {
		const mockSend = vi.fn().mockResolvedValue({ data: { id: 'msg_456' }, error: null });
		const mockResend: NonNullable<EmailServiceConfig['resendClient']> = {
			emails: {
				send: mockSend
			}
		};

		const service = createEmailService({
			resendClient: mockResend,
			fromEmail: 'Takerin <noreply@takerin.my.id>'
		});

		const result = await service.sendResetPasswordEmail({
			to: 'user@example.com',
			url: 'https://takerin.my.id/auth/reset-password?token=xyz'
		});

		expect(result.success).toBe(true);
		expect(mockSend).toHaveBeenCalledTimes(1);
		const callArg = mockSend.mock.calls[0][0];
		expect(callArg.to).toBe('user@example.com');
		expect(callArg.subject).toContain('Reset Password');
		expect(callArg.html).toContain('https://takerin.my.id/auth/reset-password?token=xyz');
	});

	it('handles gracefully when no API key is provided in development/test', async () => {
		const consoleSpy = vi.spyOn(console, 'info').mockImplementation(() => {});

		const service = createEmailService({
			apiKey: undefined,
			fromEmail: 'Takerin <onboarding@resend.dev>'
		});

		const result = await service.sendVerificationEmail({
			to: 'test@example.com',
			url: 'http://localhost:5173/auth/verify?token=test'
		});

		expect(result.success).toBe(true);
		expect(result.mocked).toBe(true);
		expect(consoleSpy).toHaveBeenCalled();
		consoleSpy.mockRestore();
	});

	it('returns error when Resend API returns an error', async () => {
		const mockSend = vi.fn().mockResolvedValue({
			data: null,
			error: { message: 'Invalid API key', name: 'validation_error' }
		});
		const mockResend: NonNullable<EmailServiceConfig['resendClient']> = {
			emails: {
				send: mockSend
			}
		};

		const service = createEmailService({
			resendClient: mockResend
		});

		const result = await service.sendVerificationEmail({
			to: 'error@example.com',
			url: 'https://takerin.my.id/verify'
		});

		expect(result.success).toBe(false);
		expect(result.error).toBe('Invalid API key');
	});

	it('formats OTP email and calls Resend emails.send for 2FA sign in', async () => {
		const mockSend = vi.fn().mockResolvedValue({ data: { id: 'msg_otp_123' }, error: null });
		const mockResend: NonNullable<EmailServiceConfig['resendClient']> = {
			emails: {
				send: mockSend
			}
		};

		const service = createEmailService({
			resendClient: mockResend,
			fromEmail: 'Takerin <noreply@takerin.my.id>'
		});

		const result = await service.sendOTPEmail({
			to: 'user@example.com',
			otp: '123456',
			type: 'sign-in-2fa'
		});

		expect(result.success).toBe(true);
		expect(mockSend).toHaveBeenCalledTimes(1);
		const callArg = mockSend.mock.calls[0][0];
		expect(callArg.to).toBe('user@example.com');
		expect(callArg.subject).toContain('Kode Verifikasi');
		expect(callArg.html).toContain('123456');
		expect(callArg.text).toContain('123456');
	});

	it('formats OTP email for email verification and password reset with 5-minute notice', async () => {
		const mockSend = vi.fn().mockResolvedValue({ data: { id: 'msg_otp_456' }, error: null });
		const mockResend: NonNullable<EmailServiceConfig['resendClient']> = {
			emails: {
				send: mockSend
			}
		};

		const service = createEmailService({
			resendClient: mockResend
		});

		const verifyRes = await service.sendOTPEmail({
			to: 'user@example.com',
			otp: '654321',
			type: 'email-verification'
		});
		expect(verifyRes.success).toBe(true);
		expect(mockSend.mock.calls[0][0].subject).toContain('Verifikasi Email');
		expect(mockSend.mock.calls[0][0].html).toContain('654321');
		expect(mockSend.mock.calls[0][0].text).toContain('5 menit');

		const resetRes = await service.sendOTPEmail({
			to: 'user@example.com',
			otp: '987654',
			type: 'forget-password'
		});
		expect(resetRes.success).toBe(true);
		expect(mockSend.mock.calls[1][0].subject).toContain('Reset Password');
		expect(mockSend.mock.calls[1][0].html).toContain('987654');
		expect(mockSend.mock.calls[1][0].text).toContain('5 menit');
	});

	it('formats admin invitation email with 48-hour expiration notice and sends via Resend', async () => {
		const mockSend = vi.fn().mockResolvedValue({ data: { id: 'msg_invite_123' }, error: null });
		const mockResend: NonNullable<EmailServiceConfig['resendClient']> = {
			emails: {
				send: mockSend
			}
		};

		const service = createEmailService({
			resendClient: mockResend,
			fromEmail: 'Takerin <noreply@takerin.my.id>'
		});

		const result = await service.sendAdminInvitationEmail({
			to: 'calon.admin@example.com',
			url: 'https://takerin.my.id/auth/admin-invite/test-token-123',
			invitedByName: 'Admin Takerin'
		});

		expect(result.success).toBe(true);
		expect(mockSend).toHaveBeenCalledTimes(1);
		const callArg = mockSend.mock.calls[0][0];
		expect(callArg.to).toBe('calon.admin@example.com');
		expect(callArg.from).toBe('Takerin <noreply@takerin.my.id>');
		expect(callArg.subject).toContain('Undangan');
		expect(callArg.subject).toContain('Admin');
		expect(callArg.html).toContain('https://takerin.my.id/auth/admin-invite/test-token-123');
		expect(callArg.text).toContain('https://takerin.my.id/auth/admin-invite/test-token-123');
		expect(callArg.html).toContain('48 jam');
		expect(callArg.text).toContain('48 jam');
		expect(callArg.html).toContain('Admin Takerin');
	});

	it('handles gracefully when sending admin invitation in mock mode (no API key)', async () => {
		const consoleSpy = vi.spyOn(console, 'info').mockImplementation(() => {});

		const service = createEmailService({
			apiKey: undefined,
			fromEmail: 'Takerin <onboarding@resend.dev>'
		});

		const result = await service.sendAdminInvitationEmail({
			to: 'mock.admin@example.com',
			url: 'http://localhost:5173/auth/admin-invite/mock-token'
		});

		expect(result.success).toBe(true);
		expect(result.mocked).toBe(true);
		expect(consoleSpy).toHaveBeenCalled();
		consoleSpy.mockRestore();
	});

	it('handles error when Resend fails to send admin invitation', async () => {
		const mockSend = vi.fn().mockResolvedValue({
			data: null,
			error: { message: 'Quota exceeded' }
		});
		const mockResend: NonNullable<EmailServiceConfig['resendClient']> = {
			emails: {
				send: mockSend
			}
		};

		const service = createEmailService({
			resendClient: mockResend
		});

		const result = await service.sendAdminInvitationEmail({
			to: 'fail.admin@example.com',
			url: 'https://takerin.my.id/auth/admin-invite/token'
		});

		expect(result.success).toBe(false);
		expect(result.error).toBe('Quota exceeded');
	});

	it('resolves apiKey and fromEmail from platformEnv and defaults fromEmail to Takerin <noreply@takerin.my.id>', async () => {
		const mockSend = vi.fn().mockResolvedValue({ data: { id: 'msg_platform_1' }, error: null });
		const mockResend: NonNullable<EmailServiceConfig['resendClient']> = {
			emails: {
				send: mockSend
			}
		};

		const service = createEmailService({
			resendClient: mockResend,
			platformEnv: {
				RESEND_API_KEY: 'test-key-from-platform'
			}
		});

		const result = await service.sendOTPEmail({
			to: 'user@example.com',
			otp: '112233'
		});

		expect(result.success).toBe(true);
		expect(mockSend).toHaveBeenCalledTimes(1);
		expect(mockSend.mock.calls[0][0].from).toBe('Takerin <noreply@takerin.my.id>');
	});

	it('allows overriding platformEnv per individual send call', async () => {
		const mockSend = vi.fn().mockResolvedValue({ data: { id: 'msg_platform_2' }, error: null });
		const mockResend: NonNullable<EmailServiceConfig['resendClient']> = {
			emails: {
				send: mockSend
			}
		};

		const service = createEmailService({
			resendClient: mockResend
		});

		const result = await service.sendOTPEmail({
			to: 'user@example.com',
			otp: '445566',
			platformEnv: {
				EMAIL_FROM: 'Custom <custom@takerin.my.id>'
			}
		});

		expect(result.success).toBe(true);
		expect(mockSend).toHaveBeenCalledTimes(1);
		expect(mockSend.mock.calls[0][0].from).toBe('Custom <custom@takerin.my.id>');
	});
});
