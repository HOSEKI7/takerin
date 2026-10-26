<script lang="ts">
	import Button from '#lib/components/Button.svelte';
	import Input from '#lib/components/Input.svelte';
	import Card from '#lib/components/Card.svelte';
	import ThemeToggle from '#lib/components/ThemeToggle.svelte';
	import BrandLogo from '#lib/components/BrandLogo.svelte';
	import { t, getLocale } from '#lib/i18n/index.js';
	import { authClient } from '#lib/auth-client.js';
	import {
		validateForgotPasswordInput,
		validateResetPasswordWithOTPInput,
		formatAuthError
	} from '#lib/validation/auth.js';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';

	let step = $state<'request' | 'reset'>('request');
	let email = $state('');
	let otp = $state('');
	let newPassword = $state('');
	let confirmPassword = $state('');
	let errorMessage = $state('');
	let successMessage = $state('');
	let isLoading = $state(false);
	let isResending = $state(false);
	let resendCooldown = $state(60);

	let timer: ReturnType<typeof setInterval> | null = null;

	function startCooldown(seconds = 60) {
		resendCooldown = seconds;
		if (timer) clearInterval(timer);
		timer = setInterval(() => {
			if (resendCooldown > 0) {
				resendCooldown -= 1;
			} else {
				if (timer) clearInterval(timer);
				timer = null;
			}
		}, 1000);
	}

	$effect(() => {
		return () => {
			if (timer) clearInterval(timer);
		};
	});

	async function handleRequestOtp(event: SubmitEvent) {
		event.preventDefault();
		errorMessage = '';
		successMessage = '';

		const validationError = validateForgotPasswordInput({ email }, getLocale());
		if (validationError) {
			errorMessage = validationError;
			return;
		}

		isLoading = true;
		try {
			const { error } = await authClient.emailOtp.sendVerificationOtp({
				email: email.trim(),
				type: 'forget-password'
			});

			if (error) {
				errorMessage = formatAuthError(error, getLocale());
				isLoading = false;
				return;
			}

			step = 'reset';
			startCooldown(60);
			isLoading = false;
		} catch (err: unknown) {
			errorMessage = formatAuthError(err as { message?: string }, getLocale());
			isLoading = false;
		}
	}

	async function handleResetPassword(event: SubmitEvent) {
		event.preventDefault();
		errorMessage = '';
		successMessage = '';

		const validationError = validateResetPasswordWithOTPInput({
			email,
			otp,
			password: newPassword,
			confirmPassword
		}, getLocale());

		if (validationError) {
			errorMessage = validationError;
			return;
		}

		isLoading = true;
		try {
			const { error } = await authClient.emailOtp.resetPassword({
				email: email.trim(),
				otp: otp.trim(),
				password: newPassword
			});

			if (error) {
				errorMessage = formatAuthError(error, getLocale());
				isLoading = false;
				return;
			}

			isLoading = false;
			goto(resolve('/auth/login?reset=success'));
		} catch (err: unknown) {
			errorMessage = formatAuthError(err as { message?: string }, getLocale());
			isLoading = false;
		}
	}

	async function handleResendOtp() {
		if (resendCooldown > 0 || isResending || isLoading) return;
		errorMessage = '';
		successMessage = '';
		isResending = true;

		try {
			const { error } = await authClient.emailOtp.sendVerificationOtp({
				email: email.trim(),
				type: 'forget-password'
			});

			if (error) {
				errorMessage = formatAuthError(error, getLocale());
				isResending = false;
				return;
			}

			successMessage = t('auth.forgotPassword.resendSuccess');
			startCooldown(60);
			isResending = false;
		} catch (err: unknown) {
			errorMessage = formatAuthError(err as { message?: string }, getLocale());
			isResending = false;
		}
	}

	function handleChangeEmail() {
		step = 'request';
		errorMessage = '';
		successMessage = '';
		otp = '';
		newPassword = '';
		confirmPassword = '';
		if (timer) {
			clearInterval(timer);
			timer = null;
		}
	}
</script>

<div
	class="flex min-h-screen flex-col bg-paper font-sans text-charcoal transition-colors dark:bg-dark-surface dark:text-linen-mist"
>
	<header class="flex items-center justify-between px-6 py-6 sm:px-10">
		<BrandLogo href="/" size="md" />
		<ThemeToggle />
	</header>

	<main class="flex flex-1 items-center justify-center px-4 py-8 sm:px-6">
		<div class="w-full max-w-md">
			<Card variant="default" padding="lg" class="shadow-lg">
				{#if step === 'reset'}
					<div class="mb-6">
						<h1 class="text-2xl font-extrabold text-obsidian dark:text-paper">
							{t('auth.forgotPassword.resetTitle')}
						</h1>
						<p class="mt-1 text-sm text-slate dark:text-stone-300">
							{t('auth.forgotPassword.resetSubtitle', { email })}
						</p>
					</div>

					{#if errorMessage}
						<div
							role="alert"
							class="mb-6 rounded-lg border border-alarm-red/30 bg-red-50 p-3.5 text-sm font-medium text-alarm-red dark:bg-red-950/30 dark:text-red-300"
						>
							{errorMessage}
						</div>
					{/if}

					{#if successMessage}
						<div
							role="status"
							class="mb-6 rounded-lg border border-lime-500/30 bg-lime-50 p-3.5 text-sm font-medium text-forest-ink dark:bg-lime-950/30 dark:text-lime-300"
						>
							{successMessage}
						</div>
					{/if}

					<form onsubmit={handleResetPassword} class="space-y-4">
						<Input
							id="forgot-otp"
							label={t('auth.forgotPassword.otpLabel')}
							type="text"
							inputmode="numeric"
							maxlength={6}
							placeholder={t('auth.forgotPassword.otpPlaceholder')}
							autocomplete="one-time-code"
							required
							bind:value={otp}
							disabled={isLoading}
						/>

						<Input
							id="forgot-new-password"
							label={t('auth.forgotPassword.newPasswordLabel')}
							type="password"
							placeholder={t('auth.forgotPassword.newPasswordPlaceholder')}
							autocomplete="new-password"
							required
							bind:value={newPassword}
							disabled={isLoading}
						/>

						<Input
							id="forgot-confirm-password"
							label={t('auth.forgotPassword.confirmPasswordLabel')}
							type="password"
							placeholder={t('auth.forgotPassword.confirmPasswordPlaceholder')}
							autocomplete="new-password"
							required
							bind:value={confirmPassword}
							disabled={isLoading}
						/>

						<div class="pt-2">
							<Button type="submit" variant="primary" size="md" class="w-full" disabled={isLoading}>
								{isLoading
									? t('auth.forgotPassword.resetting')
									: t('auth.forgotPassword.resetButton')}
							</Button>
						</div>
					</form>

					<div class="mt-4 space-y-3">
						<Button
							type="button"
							variant="secondary"
							size="md"
							class="w-full"
							onclick={handleResendOtp}
							disabled={resendCooldown > 0 || isResending || isLoading}
						>
							{#if isResending}
								{t('auth.forgotPassword.resending')}
							{:else if resendCooldown > 0}
								{t('auth.forgotPassword.resendCooldown', { seconds: resendCooldown })}
							{:else}
								{t('auth.forgotPassword.resendButton')}
							{/if}
						</Button>

						<div class="text-center">
							<button
								type="button"
								class="text-xs font-medium text-slate transition-colors hover:text-forest-ink hover:underline dark:text-stone-400 dark:hover:text-lime-voltage"
								onclick={handleChangeEmail}
							>
								{t('auth.forgotPassword.changeEmail')}
							</button>
						</div>
					</div>
				{:else}
					<div class="mb-6">
						<h1 class="text-2xl font-extrabold text-obsidian dark:text-paper">
							{t('auth.forgotPassword.title')}
						</h1>
						<p class="mt-1 text-sm text-slate dark:text-stone-300">
							{t('auth.forgotPassword.subtitle')}
						</p>
					</div>

					{#if errorMessage}
						<div
							role="alert"
							class="mb-6 rounded-lg border border-alarm-red/30 bg-red-50 p-3.5 text-sm font-medium text-alarm-red dark:bg-red-950/30 dark:text-red-300"
						>
							{errorMessage}
						</div>
					{/if}

					<form onsubmit={handleRequestOtp} class="space-y-4">
						<Input
							id="forgot-email"
							label={t('auth.forgotPassword.emailLabel')}
							type="email"
							placeholder={t('auth.forgotPassword.emailPlaceholder')}
							autocomplete="email"
							required
							bind:value={email}
							disabled={isLoading}
						/>

						<div class="pt-2">
							<Button type="submit" variant="dark" size="md" class="w-full" disabled={isLoading}>
								{isLoading
									? t('auth.forgotPassword.submitting')
									: t('auth.forgotPassword.submitButton')}
							</Button>
						</div>
					</form>

					<div
						class="mt-6 border-t border-fog pt-4 text-center text-sm text-slate dark:border-dark-border dark:text-stone-400"
					>
						{t('auth.forgotPassword.rememberPassword')}
						<a
							href={resolve('/auth/login')}
							class="font-semibold text-forest-ink hover:underline dark:text-lime-voltage"
						>
							{t('auth.forgotPassword.loginAgain')}
						</a>
					</div>
				{/if}
			</Card>
		</div>
	</main>
</div>
