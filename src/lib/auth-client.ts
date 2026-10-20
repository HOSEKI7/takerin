import { createAuthClient } from 'better-auth/svelte';

export interface AuthClientExtended {
	requestPasswordReset: (opts: {
		email: string;
		redirectTo?: string;
	}) => Promise<{ error: { message?: string } | null }>;
	resetPassword: (opts: {
		newPassword: string;
		token: string;
	}) => Promise<{ error: { message?: string } | null }>;
}

export const authClient = createAuthClient() as ReturnType<typeof createAuthClient> &
	AuthClientExtended;

export const { signIn, signUp, signOut, useSession, requestPasswordReset, resetPassword } =
	authClient;
