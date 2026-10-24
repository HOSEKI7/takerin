<script lang="ts">
	import Button from '#lib/components/Button.svelte';
	import Input from '#lib/components/Input.svelte';
	import Card from '#lib/components/Card.svelte';
	import ThemeToggle from '#lib/components/ThemeToggle.svelte';
	import BrandLogo from '#lib/components/BrandLogo.svelte';
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import { Alert02Icon } from '@hugeicons/core-free-icons';
	import { t } from '#lib/i18n/index.js';
	import { validateAdminInviteActivationInput } from '#lib/validation/auth.js';
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import type { PageProps } from './$types.js';

	let { data, form }: PageProps = $props();

	let name = $state('');
	let password = $state('');
	let confirmPassword = $state('');
	let clientError = $state('');
	let isSubmitting = $state(false);

	const errorMessage = $derived(clientError || form?.error || '');

	const invalidDescription = $derived.by(() => {
		if (data.reason === 'expired') {
			return t('auth.adminInvite.expiredDesc');
		}
		if (data.reason === 'revoked') {
			return t('auth.adminInvite.revokedDesc');
		}
		if (data.reason === 'accepted') {
			return t('auth.adminInvite.acceptedDesc');
		}
		return t('auth.adminInvite.invalidDesc');
	});
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
				{#if !data.valid}
					<!-- State 1: Token Invalid / Expired / Revoked / Accepted -->
					<div class="space-y-4 text-center">
						<div
							class="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-100 text-alarm-red dark:bg-red-950/40"
						>
							<HugeiconsIcon icon={Alert02Icon} size={28} />
						</div>
						<h1 class="text-2xl font-extrabold text-obsidian dark:text-paper">
							{t('auth.adminInvite.invalidTitle')}
						</h1>
						<p class="text-sm leading-relaxed text-slate dark:text-stone-300">
							{invalidDescription}
						</p>
						<div class="pt-4">
							<a href={resolve('/auth/login')} class="block w-full">
								<Button variant="secondary" size="md" class="w-full">
									{t('auth.adminInvite.backToLogin')}
								</Button>
							</a>
						</div>
					</div>
				{:else}
					<!-- State 2: Token Valid -> Activation Form -->
					<div class="mb-6">
						<h1 class="text-2xl font-extrabold text-obsidian dark:text-paper">
							{t('auth.adminInvite.title')}
						</h1>
						<p class="mt-1 text-sm text-slate dark:text-stone-300">
							{t('auth.adminInvite.subtitle')}
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

					<form
						method="POST"
						use:enhance={({ cancel }) => {
							clientError = '';

							const validationError = validateAdminInviteActivationInput({
								name,
								password,
								confirmPassword
							});

							if (validationError) {
								clientError = validationError;
								cancel();
								return;
							}

							isSubmitting = true;
							return async ({ update }) => {
								isSubmitting = false;
								await update();
							};
						}}
						class="space-y-4"
					>
						<!-- Read-only Email Field -->
						<Input
							id="invite-email"
							label={t('auth.adminInvite.emailLabel')}
							type="email"
							value={data.email}
							readonly
							class="cursor-not-allowed bg-stone-100 text-stone-500 dark:bg-spruce/40 dark:text-stone-400"
						/>

						<!-- Full Name Field -->
						<Input
							id="invite-name"
							name="name"
							label={t('auth.adminInvite.nameLabel')}
							placeholder={t('auth.adminInvite.namePlaceholder')}
							autocomplete="name"
							required
							bind:value={name}
							disabled={isSubmitting}
						/>

						<!-- New Password Field -->
						<Input
							id="invite-password"
							name="password"
							label={t('auth.adminInvite.passwordLabel')}
							type="password"
							placeholder={t('auth.adminInvite.passwordPlaceholder')}
							autocomplete="new-password"
							required
							bind:value={password}
							disabled={isSubmitting}
						/>

						<!-- Confirm Password Field -->
						<Input
							id="invite-confirm-password"
							name="confirmPassword"
							label={t('auth.adminInvite.confirmPasswordLabel')}
							type="password"
							placeholder={t('auth.adminInvite.confirmPasswordPlaceholder')}
							autocomplete="new-password"
							required
							bind:value={confirmPassword}
							disabled={isSubmitting}
						/>

						<!-- Submit Button -->
						<div class="pt-2">
							<Button
								type="submit"
								variant="primary"
								size="md"
								class="w-full"
								disabled={isSubmitting}
							>
								{isSubmitting
									? t('auth.adminInvite.submitting')
									: t('auth.adminInvite.submitButton')}
							</Button>
						</div>
					</form>
				{/if}
			</Card>
		</div>
	</main>
</div>
