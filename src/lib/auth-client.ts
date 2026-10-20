import { createAuthClient } from 'better-auth/svelte';

export const authClient = createAuthClient();

export const { signIn, signUp, signOut, useSession } = authClient;

export const requestPasswordReset = (opts: { email: string; redirectTo?: string }) =>
	(
		authClient as unknown as {
			requestPasswordReset: (opts: {
				email: string;
				redirectTo?: string;
			}) => Promise<{ error: { message?: string } | null }>;
		}
	).requestPasswordReset(opts);

export const resetPassword = (opts: { newPassword: string; token: string }) =>
	(
		authClient as unknown as {
			resetPassword: (opts: {
				newPassword: string;
				token: string;
			}) => Promise<{ error: { message?: string } | null }>;
		}
	).resetPassword(opts);
