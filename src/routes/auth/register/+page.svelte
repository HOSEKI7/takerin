<script lang="ts">
	import Button from '#lib/components/Button.svelte';
	import Input from '#lib/components/Input.svelte';
	import Card from '#lib/components/Card.svelte';
	import ThemeToggle from '#lib/components/ThemeToggle.svelte';
	import BrandLogo from '#lib/components/BrandLogo.svelte';
	import { t, getLocale } from '#lib/i18n/index.js';
	import { authClient } from '#lib/auth-client.js';
	import {
		validateRegisterInput,
		validateOTPInput,
		formatAuthError
	} from '#lib/validation/auth.js';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';

	let step = $state<'form' | 'otp'>('form');
	let name = $state('');
	let email = $state('');
	let password = $state('');
	let confirmPassword = $state('');
	let otp = $state('');
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

	async function handleSubmit(event: SubmitEvent) {
		event.preventDefault();
		errorMessage = '';
		successMessage = '';

		const validationError = validateRegisterInput(
			{
				name,
				email,
				password,
				confirmPassword
			},
			getLocale()
		);

		if (validationError) {
			errorMessage = validationError;
			return;
		}

		isLoading = true;
		try {
			const { error } = await authClient.signUp.email({
				name: name.trim(),
				email: email.trim(),
				password
			});

			if (error) {
				errorMessage = formatAuthError(error, getLocale());
				isLoading = false;
				return;
			}

			step = 'otp';
			startCooldown(60);
			isLoading = false;
		} catch (err: unknown) {
			errorMessage = formatAuthError(err as { message?: string }, getLocale());
			isLoading = false;
		}
	}

	async function handleVerifyOtp(event: SubmitEvent) {
		event.preventDefault();
		errorMessage = '';
		successMessage = '';

		const otpError = validateOTPInput(otp, getLocale());
		if (otpError) {
			errorMessage = otpError;
			return;
		}

		isLoading = true;
		try {
			const { data, error } = await authClient.emailOtp.verifyEmail({
				email: email.trim(),
				otp: otp.trim()
			});

			if (error) {
				errorMessage = formatAuthError(error, getLocale());
				isLoading = false;
				return;
			}

			if (data?.user?.role === 'admin') {
				isLoading = false;
				goto(resolve('/admin'));
				return;
			}

			isLoading = false;
			goto(resolve('/onboarding'));
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
				type: 'email-verification'
			});

			if (error) {
				errorMessage = formatAuthError(error, getLocale());
				isResending = false;
				return;
			}

			successMessage = t('auth.register.resendSuccess');
			startCooldown(60);
			isResending = false;
		} catch (err: unknown) {
			errorMessage = formatAuthError(err as { message?: string }, getLocale());
			isResending = false;
		}
	}

	function handleBackToForm() {
		step = 'form';
		errorMessage = '';
		successMessage = '';
		otp = '';
		if (timer) {
			clearInterval(timer);
			timer = null;
		}
	}
</script>

<svelte:head>
	<title>{t('auth.register.title')} — Takerin</title>
	<meta name="description" content={t('auth.register.subtitle')} />
	<link rel="canonical" href="https://takerin.my.id/auth/register" />

	<!-- Open Graph -->
	<meta property="og:type" content="website" />
	<meta property="og:url" content="https://takerin.my.id/auth/register" />
	<meta property="og:title" content={`${t('auth.register.title')} — Takerin`} />
	<meta property="og:description" content={t('auth.register.subtitle')} />
	<meta property="og:image" content="https://takerin.my.id/brand/og-image.png" />
	<meta property="og:image:secure_url" content="https://takerin.my.id/brand/og-image.png" />
	<meta property="og:image:width" content="1200" />
	<meta property="og:image:height" content="630" />
	<meta property="og:image:type" content="image/png" />
	<meta property="og:site_name" content="Takerin" />

	<!-- Twitter Cards -->
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:url" content="https://takerin.my.id/auth/register" />
	<meta name="twitter:title" content={`${t('auth.register.title')} — Takerin`} />
	<meta name="twitter:description" content={t('auth.register.subtitle')} />
	<meta name="twitter:image" content="https://takerin.my.id/brand/og-image.png" />
</svelte:head>

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
				{#if step === 'otp'}
					<div class="mb-6">
						<h1 class="text-2xl font-extrabold text-obsidian dark:text-paper">
							{t('auth.register.otpTitle')}
						</h1>
						<p class="mt-1 text-sm text-slate dark:text-stone-300">
							{t('auth.register.otpSubtitle', { email })}
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

					<form onsubmit={handleVerifyOtp} class="space-y-4">
						<Input
							id="register-otp"
							label={t('auth.register.otpLabel')}
							type="text"
							inputmode="numeric"
							maxlength={6}
							placeholder={t('auth.register.otpPlaceholder')}
							autocomplete="one-time-code"
							required
							bind:value={otp}
							disabled={isLoading}
						/>

						<div class="pt-2">
							<Button type="submit" variant="primary" size="md" class="w-full" disabled={isLoading}>
								{isLoading ? t('auth.register.verifying') : t('auth.register.verifyButton')}
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
								{t('auth.register.resending')}
							{:else if resendCooldown > 0}
								{t('auth.register.resendCooldown', { seconds: resendCooldown })}
							{:else}
								{t('auth.register.resendButton')}
							{/if}
						</Button>

						<div class="text-center">
							<button
								type="button"
								class="text-xs font-medium text-slate transition-colors hover:text-forest-ink hover:underline dark:text-stone-400 dark:hover:text-lime-voltage"
								onclick={handleBackToForm}
							>
								{t('auth.register.changeEmail')}
							</button>
						</div>
					</div>
				{:else}
					<div class="mb-6">
						<h1 class="text-2xl font-extrabold text-obsidian dark:text-paper">
							{t('auth.register.title')}
						</h1>
						<p class="mt-1 text-sm text-slate dark:text-stone-300">
							{t('auth.register.subtitle')}
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

					<form onsubmit={handleSubmit} class="space-y-4">
						<Input
							id="register-name"
							label={t('auth.register.nameLabel')}
							type="text"
							placeholder={t('auth.register.namePlaceholder')}
							autocomplete="name"
							required
							bind:value={name}
							disabled={isLoading}
						/>

						<Input
							id="register-email"
							label={t('auth.register.emailLabel')}
							type="email"
							placeholder={t('auth.register.emailPlaceholder')}
							autocomplete="email"
							required
							bind:value={email}
							disabled={isLoading}
						/>

						<Input
							id="register-password"
							label={t('auth.register.passwordLabel')}
							type="password"
							placeholder={t('auth.register.passwordPlaceholder')}
							autocomplete="new-password"
							required
							bind:value={password}
							disabled={isLoading}
						/>

						<Input
							id="register-confirm-password"
							label={t('auth.register.confirmPasswordLabel')}
							type="password"
							placeholder={t('auth.register.confirmPasswordPlaceholder')}
							autocomplete="new-password"
							required
							bind:value={confirmPassword}
							disabled={isLoading}
						/>

						<div class="pt-2">
							<Button type="submit" variant="primary" size="md" class="w-full" disabled={isLoading}>
								{isLoading ? t('auth.register.submitting') : t('auth.register.submitButton')}
							</Button>
						</div>
					</form>

					<div
						class="mt-6 border-t border-fog pt-4 text-center text-sm text-slate dark:border-dark-border dark:text-stone-400"
					>
						{t('auth.register.alreadyHaveAccount')}
						<a
							href={resolve('/auth/login')}
							class="font-semibold text-forest-ink hover:underline dark:text-lime-voltage"
						>
							{t('auth.register.loginLink')}
						</a>
					</div>
				{/if}
			</Card>
		</div>
	</main>
</div>
