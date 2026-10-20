<script lang="ts">
	import Button from '#lib/components/Button.svelte';
	import Input from '#lib/components/Input.svelte';
	import Card from '#lib/components/Card.svelte';
	import ThemeToggle from '#lib/components/ThemeToggle.svelte';
	import { resetPassword } from '#lib/auth-client.js';
	import { validateResetPasswordInput } from '#lib/validation/auth.js';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';

	let newPassword = $state('');
	let confirmPassword = $state('');
	let errorMessage = $state('');
	let isSuccess = $state(false);
	let isLoading = $state(false);

	const token = $derived(page.url.searchParams.get('token') || '');

	async function handleSubmit(event: SubmitEvent) {
		event.preventDefault();
		errorMessage = '';

		const validationError = validateResetPasswordInput({
			token,
			password: newPassword,
			confirmPassword
		});

		if (validationError) {
			errorMessage = validationError;
			return;
		}

		isLoading = true;
		try {
			const { error } = await resetPassword({
				newPassword,
				token
			});

			if (error) {
				errorMessage =
					error.message || 'Gagal mengatur ulang password. Token mungkin sudah kedaluwarsa.';
				isLoading = false;
				return;
			}

			isSuccess = true;
			isLoading = false;
		} catch (err: unknown) {
			const message =
				err instanceof Error ? err.message : 'Terjadi kesalahan saat mereset password.';
			errorMessage = message;
			isLoading = false;
		}
	}
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
				{#if !token}
					<div class="space-y-4 text-center">
						<div
							class="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-100 text-alarm-red dark:bg-red-950/40"
						>
							<span class="text-2xl">⚠️</span>
						</div>
						<h1 class="text-2xl font-extrabold text-obsidian dark:text-paper">
							Tautan Tidak Valid
						</h1>
						<p class="text-sm leading-relaxed text-slate dark:text-stone-300">
							Tautan reset password ini tidak valid atau token tidak ditemukan di parameter URL.
						</p>
						<div class="pt-4">
							<Button
								variant="secondary"
								size="md"
								class="w-full"
								onclick={() => goto(resolve('/auth/forgot-password'))}
							>
								Minta Tautan Baru
							</Button>
						</div>
					</div>
				{:else if isSuccess}
					<div class="space-y-4 text-center">
						<div
							class="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-linen-mist dark:bg-spruce/60"
						>
							<span class="text-2xl">🎉</span>
						</div>
						<h1 class="text-2xl font-extrabold text-obsidian dark:text-paper">
							Password Berhasil Diubah!
						</h1>
						<p class="text-sm leading-relaxed text-slate dark:text-stone-300">
							Password akun Takerin Anda telah berhasil diperbarui. Silakan masuk menggunakan
							password baru Anda.
						</p>
						<div class="pt-4">
							<Button
								variant="primary"
								size="md"
								class="w-full"
								onclick={() => goto(resolve('/auth/login'))}
							>
								Masuk Sekarang
							</Button>
						</div>
					</div>
				{:else}
					<div class="mb-6">
						<h1 class="text-2xl font-extrabold text-obsidian dark:text-paper">
							Buat Password Baru
						</h1>
						<p class="mt-1 text-sm text-slate dark:text-stone-300">
							Masukkan password baru untuk akun Takerin Anda.
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
							id="reset-new-password"
							label="Password Baru"
							type="password"
							placeholder="Minimal 8 karakter"
							autocomplete="new-password"
							required
							bind:value={newPassword}
							disabled={isLoading}
						/>

						<Input
							id="reset-confirm-password"
							label="Konfirmasi Password Baru"
							type="password"
							placeholder="Ulangi password baru"
							autocomplete="new-password"
							required
							bind:value={confirmPassword}
							disabled={isLoading}
						/>

						<div class="pt-2">
							<Button type="submit" variant="primary" size="md" class="w-full" disabled={isLoading}>
								{isLoading ? 'Memperbarui...' : 'Simpan Password Baru'}
							</Button>
						</div>
					</form>
				{/if}
			</Card>
		</div>
	</main>
</div>
