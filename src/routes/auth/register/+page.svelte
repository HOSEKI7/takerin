<script lang="ts">
	import Button from '#lib/components/Button.svelte';
	import Input from '#lib/components/Input.svelte';
	import Card from '#lib/components/Card.svelte';
	import ThemeToggle from '#lib/components/ThemeToggle.svelte';
	import BrandLogo from '#lib/components/BrandLogo.svelte';
	import { t } from '#lib/i18n/index.js';
	import { authClient } from '#lib/auth-client.js';
	import { validateRegisterInput } from '#lib/validation/auth.js';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';

	let name = $state('');
	let email = $state('');
	let password = $state('');
	let confirmPassword = $state('');
	let errorMessage = $state('');
	let isSuccess = $state(false);
	let isLoading = $state(false);

	async function handleSubmit(event: SubmitEvent) {
		event.preventDefault();
		errorMessage = '';

		const validationError = validateRegisterInput({
			name,
			email,
			password,
			confirmPassword
		});

		if (validationError) {
			errorMessage = validationError;
			return;
		}

		isLoading = true;
		try {
			const { data, error } = await authClient.signUp.email({
				name: name.trim(),
				email: email.trim(),
				password
			});

			if (error) {
				errorMessage = error.message || 'Gagal mendaftarkan akun. Silakan coba lagi.';
				isLoading = false;
				return;
			}

			if (data) {
				if ((data as { user?: { role?: string } })?.user?.role === 'admin') {
					goto(resolve('/admin'));
					return;
				}
				isSuccess = true;
				isLoading = false;
			}
		} catch (err: unknown) {
			const message =
				err instanceof Error
					? err.message
					: 'Terjadi kesalahan saat pendaftaran. Silakan coba lagi.';
			errorMessage = message;
			isLoading = false;
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
				{#if isSuccess}
					<div class="space-y-4 text-center">
						<div
							class="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-linen-mist dark:bg-spruce/60"
						>
							<span class="text-2xl">✉️</span>
						</div>
						<h1 class="text-2xl font-extrabold text-obsidian dark:text-paper">
							{t('auth.register.successTitle')}
						</h1>
						<p class="text-sm leading-relaxed text-slate dark:text-stone-300">
							{t('auth.register.successDesc', { email })}
						</p>
						<div class="flex flex-col gap-3 pt-4 sm:flex-row">
							<a href={resolve('/auth/login')} class="flex-1">
								<Button variant="secondary" size="md" class="w-full">
									{t('auth.register.toLogin')}
								</Button>
							</a>
							<Button
								variant="primary"
								size="md"
								class="flex-1"
								onclick={() => goto(resolve('/onboarding'))}
							>
								{t('auth.register.startOnboarding')}
							</Button>
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
