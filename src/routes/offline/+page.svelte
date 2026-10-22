<script lang="ts">
	import { resolve } from '$app/paths';
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import { WifiOff01Icon, ArrowLeft02Icon, RefreshIcon } from '@hugeicons/core-free-icons';

	function handleRetry() {
		if (typeof window !== 'undefined') {
			window.location.reload();
		}
	}
</script>

<svelte:head>
	<title>Mode Offline | Takerin</title>
	<meta
		name="description"
		content="Koneksi internet terputus. Buka data tersimpan atau hubungkan kembali."
	/>
</svelte:head>

<div class="flex min-h-[calc(100vh-80px)] items-center justify-center px-4 py-12">
	<div class="w-full max-w-md text-center">
		<!-- Icon Container -->
		<div
			class="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-[var(--color-linen-mist)] text-[var(--color-forest-ink)] dark:bg-[var(--color-dark-surface)] dark:text-[var(--color-lime-voltage)]"
		>
			<HugeiconsIcon icon={WifiOff01Icon} size={40} />
		</div>

		<!-- Title -->
		<h1
			class="mb-3 text-2xl font-extrabold tracking-tight text-[var(--color-obsidian)] sm:text-3xl dark:text-white"
		>
			Anda Sedang Offline
		</h1>

		<!-- Description -->
		<p class="mb-8 text-base text-[var(--color-slate)] dark:text-[var(--color-pebble)]">
			Koneksi internet Anda terputus dan halaman ini belum tersimpan di memori cache perangkat. Anda
			tetap dapat membuka Dashboard yang sudah tersimpan sebelumnya.
		</p>

		<!-- Actions: Primary CTA paired with secondary text link per DESIGN.md -->
		<div class="flex flex-col items-center justify-center gap-4 sm:flex-row">
			<a
				href={resolve('/dashboard')}
				class="inline-flex items-center justify-center gap-2 rounded-full bg-[var(--color-lime-voltage)] px-6 py-2.5 text-sm font-semibold text-[var(--color-forest-ink)] shadow-sm transition hover:brightness-95 active:brightness-90"
			>
				<HugeiconsIcon icon={ArrowLeft02Icon} size={18} />
				Buka Dashboard
			</a>

			<button
				type="button"
				onclick={handleRetry}
				class="inline-flex cursor-pointer items-center justify-center gap-1.5 text-sm font-semibold text-[var(--color-forest-ink)] underline underline-offset-4 transition hover:opacity-80 dark:text-[var(--color-lime-voltage)]"
			>
				<HugeiconsIcon icon={RefreshIcon} size={16} />
				Coba Lagi
			</button>
		</div>
	</div>
</div>
