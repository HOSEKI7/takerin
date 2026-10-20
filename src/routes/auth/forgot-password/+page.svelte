<script lang="ts">
	import Button from '#lib/components/Button.svelte';
	import Input from '#lib/components/Input.svelte';
	import Card from '#lib/components/Card.svelte';
	import ThemeToggle from '#lib/components/ThemeToggle.svelte';
	import { requestPasswordReset } from '#lib/auth-client.js';
	import { validateForgotPasswordInput } from '#lib/validation/auth.js';
	import { resolve } from '$app/paths';

	let email = $state('');
	let errorMessage = $state('');
	let isSubmitted = $state(false);
	let isLoading = $state(false);

	async function handleSubmit(event: SubmitEvent) {
		event.preventDefault();
		errorMessage = '';

		const validationError = validateForgotPasswordInput({ email });
		if (validationError) {
			errorMessage = validationError;
			return;
		}

		isLoading = true;
		try {
			const { error } = await requestPasswordReset({
				email: email.trim(),
				redirectTo: `${window.location.origin}/auth/reset-password`
			});

			if (error) {
				errorMessage = error.message || 'Gagal mengirim link reset. Silakan coba lagi.';
				isLoading = false;
				return;
			}

			isSubmitted = true;
			isLoading = false;
		} catch (err: unknown) {
			const message =
				err instanceof Error
					? err.message
					: 'Terjadi kesalahan saat meminta reset password. Silakan coba lagi.';
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
				{#if isSubmitted}
					<div class="space-y-4 text-center">
						<div
							class="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-linen-mist dark:bg-spruce/60"
						>
							<span class="text-2xl">📬</span>
						</div>
						<h1 class="text-2xl font-extrabold text-obsidian dark:text-paper">
							Periksa Email Anda
						</h1>
						<p class="text-sm leading-relaxed text-slate dark:text-stone-300">
							Jika email <strong class="font-semibold text-forest-ink dark:text-lime-voltage"
								>{email}</strong
							> terdaftar di Takerin, tautan untuk mereset password telah dikirim ke email tersebut.
						</p>
						<div class="pt-4">
							<a
								href={resolve('/auth/login')}
								class="inline-block text-sm font-semibold text-forest-ink hover:underline dark:text-lime-voltage"
							>
								← Kembali ke Halaman Masuk
							</a>
						</div>
					</div>
				{:else}
					<div class="mb-6">
						<h1 class="text-2xl font-extrabold text-obsidian dark:text-paper">Lupa Password?</h1>
						<p class="mt-1 text-sm text-slate dark:text-stone-300">
							Masukkan alamat email Anda untuk menerima tautan pemulihan password akun Takerin.
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
							id="forgot-email"
							label="Alamat Email"
							type="email"
							placeholder="nama@email.com"
							autocomplete="email"
							required
							bind:value={email}
							disabled={isLoading}
						/>

						<div class="pt-2">
							<Button type="submit" variant="dark" size="md" class="w-full" disabled={isLoading}>
								{isLoading ? 'Mengirim...' : 'Kirim Link Reset'}
							</Button>
						</div>
					</form>

					<div
						class="mt-6 border-t border-fog pt-4 text-center text-sm text-slate dark:border-dark-border dark:text-stone-400"
					>
						Ingat password Anda?
						<a
							href={resolve('/auth/login')}
							class="font-semibold text-forest-ink hover:underline dark:text-lime-voltage"
						>
							Masuk kembali
						</a>
					</div>
				{/if}
			</Card>
		</div>
	</main>
</div>
