<script lang="ts">
	import { onMount } from 'svelte';
	import Button from '#lib/components/Button.svelte';
	import Input from '#lib/components/Input.svelte';
	import Card from '#lib/components/Card.svelte';
	import ThemeToggle from '#lib/components/ThemeToggle.svelte';
	import { authClient } from '#lib/auth-client.js';
	import {
		validateOTPInput,
		validateBackupCodeInput,
		formatAuthError
	} from '#lib/validation/auth.js';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';

	type VerificationMode = 'otp' | 'totp' | 'backup';

	let mode = $state<VerificationMode>('otp');
	let otpCode = $state('');
	let totpCode = $state('');
	let backupCode = $state('');
	let errorMessage = $state('');
	let successInfo = $state('');
	let hasSessionError = $state(false);
	let isLoading = $state(false);
	let isResending = $state(false);
	let resendCountdown = $state(0);

	let timer: ReturnType<typeof setInterval> | null = null;

	function startCountdown(seconds = 30) {
		resendCountdown = seconds;
		if (timer) clearInterval(timer);
		timer = setInterval(() => {
			resendCountdown -= 1;
			if (resendCountdown <= 0) {
				if (timer) clearInterval(timer);
				timer = null;
			}
		}, 1000);
	}

	async function sendInitialOtp() {
		try {
			const { error } = await authClient.twoFactor.sendOtp();
			if (error) {
				const errorLower = (error.message || '').toLowerCase();
				if (errorLower.includes('cookie') || errorLower.includes('session')) {
					hasSessionError = true;
					errorMessage =
						'Sesi verifikasi dua langkah tidak ditemukan atau telah kedaluwarsa. Silakan masuk kembali.';
				} else {
					console.warn('Initial OTP send warning:', error.message);
				}
			} else {
				successInfo = 'Kode OTP telah dikirimkan ke email Anda.';
				startCountdown(30);
			}
		} catch (err: unknown) {
			console.warn('Initial OTP send error:', err);
		}
	}

	async function handleResendOtp() {
		if (resendCountdown > 0 || isResending) return;
		isResending = true;
		errorMessage = '';
		successInfo = '';

		try {
			const { error } = await authClient.twoFactor.sendOtp();
			if (error) {
				errorMessage = formatAuthError(error);
			} else {
				successInfo = 'Kode OTP baru berhasil dikirim ke email Anda.';
				startCountdown(30);
			}
		} catch (err: unknown) {
			errorMessage = formatAuthError(err instanceof Error ? err.message : null);
		} finally {
			isResending = false;
		}
	}

	async function handleSubmit(event: SubmitEvent) {
		event.preventDefault();
		errorMessage = '';
		successInfo = '';

		if (mode === 'otp') {
			const validationError = validateOTPInput(otpCode);
			if (validationError) {
				errorMessage = validationError;
				return;
			}

			isLoading = true;
			try {
				const { data, error } = await authClient.twoFactor.verifyOtp({
					code: otpCode.trim()
				});

				if (error) {
					errorMessage = formatAuthError(error);
					isLoading = false;
					return;
				}

				if (data) {
					goto(resolve('/dashboard'));
				}
			} catch (err: unknown) {
				errorMessage = formatAuthError(err instanceof Error ? err.message : null);
				isLoading = false;
			}
		} else if (mode === 'totp') {
			const validationError = validateOTPInput(totpCode);
			if (validationError) {
				errorMessage = validationError;
				return;
			}

			isLoading = true;
			try {
				const { data, error } = await authClient.twoFactor.verifyTotp({
					code: totpCode.trim()
				});

				if (error) {
					errorMessage = formatAuthError(error);
					isLoading = false;
					return;
				}

				if (data) {
					goto(resolve('/dashboard'));
				}
			} catch (err: unknown) {
				errorMessage = formatAuthError(err instanceof Error ? err.message : null);
				isLoading = false;
			}
		} else {
			const validationError = validateBackupCodeInput(backupCode);
			if (validationError) {
				errorMessage = validationError;
				return;
			}

			isLoading = true;
			try {
				const { data, error } = await authClient.twoFactor.verifyBackupCode({
					code: backupCode.trim()
				});

				if (error) {
					errorMessage = formatAuthError(error);
					isLoading = false;
					return;
				}

				if (data) {
					goto(resolve('/dashboard'));
				}
			} catch (err: unknown) {
				errorMessage = formatAuthError(err instanceof Error ? err.message : null);
				isLoading = false;
			}
		}
	}

	onMount(() => {
		sendInitialOtp();
		return () => {
			if (timer) clearInterval(timer);
		};
	});
</script>

<div
	class="flex min-h-screen flex-col bg-paper font-sans text-charcoal transition-colors dark:bg-dark-surface dark:text-linen-mist"
>
	<header class="flex items-center justify-between px-6 py-6 sm:px-10">
		<a
			href={resolve('/')}
			class="text-2xl font-black tracking-tight text-forest-ink dark:text-lime-voltage"
		>
			Takerin
		</a>
		<ThemeToggle />
	</header>

	<main class="flex flex-1 items-center justify-center px-4 py-8 sm:px-6">
		<div class="w-full max-w-md">
			<Card variant="default" padding="lg" class="shadow-lg">
				<div class="mb-6">
					<h1 class="text-2xl font-extrabold text-obsidian dark:text-paper">
						{mode === 'otp'
							? 'Verifikasi Email OTP'
							: mode === 'totp'
								? 'Verifikasi Aplikasi Autentikator'
								: 'Gunakan Kode Cadangan'}
					</h1>
					<p class="mt-1 text-sm text-slate dark:text-linen-mist/80">
						{mode === 'otp'
							? 'Masukkan 6 digit kode OTP yang kami kirimkan ke alamat email akun Anda.'
							: mode === 'totp'
								? 'Buka aplikasi autentikator Anda (Google Authenticator dll.) dan masukkan 6 digit kode saat ini.'
								: 'Masukkan salah satu kode cadangan Anda untuk masuk ke akun Takerin.'}
					</p>
				</div>

				{#if errorMessage}
					<div
						role="alert"
						class="mb-6 rounded-lg border border-alarm-red/40 bg-linen-mist/30 p-3.5 text-sm font-medium text-alarm-red dark:border-alarm-red/50 dark:bg-spruce/20 dark:text-alarm-red"
					>
						{errorMessage}
					</div>
				{/if}

				{#if successInfo && !errorMessage}
					<div
						role="status"
						class="mb-6 rounded-lg border border-lime-voltage/40 bg-linen-mist p-3.5 text-sm font-medium text-forest-ink dark:bg-spruce/40 dark:text-linen-mist"
					>
						{successInfo}
					</div>
				{/if}

				{#if hasSessionError}
					<div class="pt-2">
						<a href={resolve('/auth/login')} class="block w-full">
							<Button variant="dark" size="md" class="w-full">Kembali ke Halaman Masuk</Button>
						</a>
					</div>
				{:else}
					<form onsubmit={handleSubmit} class="space-y-4">
						{#if mode === 'otp'}
							<Input
								id="otp-code"
								label="Kode OTP Email (6 digit)"
								type="text"
								placeholder="123456"
								autocomplete="one-time-code"
								maxlength={6}
								required
								bind:value={otpCode}
								disabled={isLoading}
							/>

							<div class="flex items-center justify-between pt-1">
								<button
									type="button"
									onclick={handleResendOtp}
									disabled={resendCountdown > 0 || isResending}
									class="cursor-pointer text-xs font-semibold text-forest-ink hover:underline disabled:cursor-not-allowed disabled:opacity-50 dark:text-lime-voltage"
								>
									{isResending
										? 'Mengirim...'
										: resendCountdown > 0
											? `Kirim ulang OTP (${resendCountdown}d)`
											: 'Kirim Ulang Kode OTP'}
								</button>

								<button
									type="button"
									onclick={() => {
										mode = 'totp';
										errorMessage = '';
										successInfo = '';
									}}
									class="cursor-pointer text-xs font-semibold text-slate hover:underline dark:text-linen-mist/80"
								>
									Pakai Aplikasi Autentikator
								</button>
							</div>
						{:else if mode === 'totp'}
							<Input
								id="totp-code"
								label="Kode Autentikator (6 digit)"
								type="text"
								placeholder="123456"
								autocomplete="one-time-code"
								maxlength={6}
								required
								bind:value={totpCode}
								disabled={isLoading}
							/>

							<div class="flex items-center justify-between pt-1">
								<button
									type="button"
									onclick={() => {
										mode = 'otp';
										errorMessage = '';
										successInfo = '';
									}}
									class="cursor-pointer text-xs font-semibold text-forest-ink hover:underline dark:text-lime-voltage"
								>
									Pakai Email OTP
								</button>

								<button
									type="button"
									onclick={() => {
										mode = 'backup';
										errorMessage = '';
										successInfo = '';
									}}
									class="cursor-pointer text-xs font-semibold text-slate hover:underline dark:text-linen-mist/80"
								>
									Gunakan Kode Cadangan
								</button>
							</div>
						{:else}
							<Input
								id="backup-code"
								label="Kode Cadangan (Backup Code)"
								type="text"
								placeholder="Contoh: a1b2c3d4e5"
								autocomplete="off"
								required
								bind:value={backupCode}
								disabled={isLoading}
							/>

							<div class="flex justify-end pt-1">
								<button
									type="button"
									onclick={() => {
										mode = 'otp';
										errorMessage = '';
										successInfo = '';
									}}
									class="cursor-pointer text-xs font-semibold text-forest-ink hover:underline dark:text-lime-voltage"
								>
									Kembali ke Verifikasi Email OTP
								</button>
							</div>
						{/if}

						<div class="pt-4">
							<Button type="submit" variant="dark" size="md" class="w-full" disabled={isLoading}>
								{isLoading
									? 'Memverifikasi...'
									: mode === 'otp'
										? 'Verifikasi OTP & Masuk'
										: mode === 'totp'
											? 'Verifikasi TOTP & Masuk'
											: 'Masuk dengan Kode Cadangan'}
							</Button>
						</div>
					</form>
				{/if}

				<div
					class="mt-6 border-t border-fog pt-4 text-center text-sm text-slate dark:border-dark-border dark:text-pebble"
				>
					Bukan akun Anda?
					<a
						href={resolve('/auth/login')}
						class="font-semibold text-forest-ink hover:underline dark:text-lime-voltage"
					>
						Kembali ke halaman masuk
					</a>
				</div>
			</Card>
		</div>
	</main>
</div>
