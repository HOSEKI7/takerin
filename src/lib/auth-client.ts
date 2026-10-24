import { createAuthClient } from 'better-auth/svelte';
import { twoFactorClient, emailOTPClient } from 'better-auth/client/plugins';

export interface AuthClientExtended {
	requestPasswordReset: (opts: {
		email: string;
		redirectTo?: string;
	}) => Promise<{ error: { message?: string } | null }>;
	resetPassword: (opts: {
		newPassword: string;
		token: string;
	}) => Promise<{ error: { message?: string } | null }>;
	emailOtp: {
		sendVerificationOtp: (opts: {
			email: string;
			type: 'email-verification' | 'sign-in' | 'forget-password';
		}) => Promise<{ data?: unknown; error?: { message?: string; code?: string } | null }>;
		verifyEmail: (opts: { email: string; otp: string }) => Promise<{
			data?: {
				status: boolean;
				token?: string;
				user?: { id?: string; email?: string; role?: string; onboardingCompleted?: boolean };
			} | null;
			error?: { message?: string; code?: string } | null;
		}>;
		resetPassword: (opts: { email: string; otp: string; password: string }) => Promise<{
			data?: { success?: boolean } | null;
			error?: { message?: string; code?: string } | null;
		}>;
	};
}

export const authClient = createAuthClient({
	plugins: [
		twoFactorClient({
			twoFactorPage: '/auth/two-factor'
		}),
		emailOTPClient()
	]
}) as ReturnType<typeof createAuthClient> &
	AuthClientExtended & {
		twoFactor: {
			enable: (opts: { password: string; issuer?: string }) => Promise<{
				data: {
					method: 'totp' | 'otp';
					backupCodes?: string[];
					totpURI?: string;
				} | null;
				error: { message?: string } | null;
			}>;
			disable: (opts: { password: string }) => Promise<{
				data: { status: boolean } | null;
				error: { message?: string } | null;
			}>;
			sendOtp: () => Promise<{
				data: { status: boolean } | null;
				error: { message?: string } | null;
			}>;
			verifyOtp: (opts: { code: string; trustDevice?: boolean }) => Promise<{
				data: { token?: string; user?: unknown } | null;
				error: { message?: string } | null;
			}>;
			verifyTotp: (opts: { code: string; trustDevice?: boolean }) => Promise<{
				data: { token?: string; user?: unknown } | null;
				error: { message?: string } | null;
			}>;
			verifyBackupCode: (opts: { code: string; trustDevice?: boolean }) => Promise<{
				data: { token?: string; user?: unknown } | null;
				error: { message?: string } | null;
			}>;
			generateBackupCodes: (opts: { password: string }) => Promise<{
				data: { status: boolean; backupCodes: string[] } | null;
				error: { message?: string } | null;
			}>;
			getTotpUri: (opts: { password: string }) => Promise<{
				data: { totpURI: string } | null;
				error: { message?: string } | null;
			}>;
		};
	};

export const {
	signIn,
	signUp,
	signOut,
	useSession,
	requestPasswordReset,
	resetPassword,
	twoFactor,
	emailOtp
} = authClient;
