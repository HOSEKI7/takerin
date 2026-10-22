<script lang="ts">
	import Button from '#lib/components/Button.svelte';
	import Input from '#lib/components/Input.svelte';
	import Card from '#lib/components/Card.svelte';
	import ThemeToggle from '#lib/components/ThemeToggle.svelte';
	import BrandLogo from '#lib/components/BrandLogo.svelte';
	import { t } from '#lib/i18n/index.js';
	import { authClient } from '#lib/auth-client.js';
	import { validateLoginInput } from '#lib/validation/auth.js';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';

	let email = $state('');
	let password = $state('');
	let errorMessage = $state('');
	let isLoading = $state(false);

	async function handleSubmit(event: SubmitEvent) {
		event.preventDefault();
		errorMessage = '';

		const validationError = validateLoginInput({ email, password });
		if (validationError) {
			errorMessage = validationError;
			return;
		}

		isLoading = true;
		try {
			const { data, error } = await authClient.signIn.email({
				email: email.trim(),
				password
			});

			if (error) {
				errorMessage = error.message || 'Email atau password tidak sesuai.';
				isLoading = false;
				return;
			}

			if (data) {
				if ('twoFactorRedirect' in data && data.twoFactorRedirect) {
					goto(resolve('/auth/two-factor'));
					return;
				}
				goto(resolve('/dashboard'));
			}
		} catch (err: unknown) {
			const message =
				err instanceof Error ? err.message : 'Terjadi kesalahan saat masuk. Silakan coba lagi.';
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
				<div class="mb-6">
					<h1 class="text-2xl font-extrabold text-obsidian dark:text-paper">{t('auth.login.title')}</h1>
					<p class="mt-1 text-sm text-slate dark:text-stone-300">
						{t('auth.login.subtitle')}
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
						id="login-email"
						label={t('auth.login.emailLabel')}
						type="email"
						placeholder={t('auth.login.emailPlaceholder')}
						autocomplete="email"
						required
						bind:value={email}
						disabled={isLoading}
					/>

					<div class="space-y-1">
						<Input
							id="login-password"
							label={t('auth.login.passwordLabel')}
							type="password"
							placeholder={t('auth.login.passwordPlaceholder')}
							autocomplete="current-password"
							required
							bind:value={password}
							disabled={isLoading}
						/>
						<div class="flex justify-end pt-1">
							<a
								href={resolve('/auth/forgot-password')}
								class="text-xs font-semibold text-forest-ink hover:underline dark:text-lime-voltage"
							>
								{t('auth.login.forgotPasswordLink')}
							</a>
						</div>
					</div>

					<div class="pt-2">
						<Button type="submit" variant="dark" size="md" class="w-full" disabled={isLoading}>
							{isLoading ? t('auth.login.submitting') : t('auth.login.submitButton')}
						</Button>
					</div>
				</form>

				<div
					class="mt-6 border-t border-fog pt-4 text-center text-sm text-slate dark:border-dark-border dark:text-stone-400"
				>
					{t('auth.login.noAccount')}
					<a
						href={resolve('/auth/register')}
						class="font-semibold text-forest-ink hover:underline dark:text-lime-voltage"
					>
						{t('auth.login.registerLink')}
					</a>
				</div>
			</Card>
		</div>
	</main>
</div>
