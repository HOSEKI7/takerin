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
});
