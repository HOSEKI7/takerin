<script lang="ts">
	import { onMount } from 'svelte';
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import { Download01Icon, Cancel01Icon, Share01Icon } from '@hugeicons/core-free-icons';
	import {
		isStandalone,
		isIOS,
		isInstallPromptDismissed,
		dismissInstallPrompt,
		type BeforeInstallPromptEvent
	} from '#lib/pwa/index.js';

	let deferredPrompt = $state<BeforeInstallPromptEvent | null>(null);
	let showPrompt = $state(false);
	let isIosDevice = $state(false);
	let installed = $state(false);

	onMount(() => {
		installed = isStandalone();
		isIosDevice = isIOS();

		window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
		window.addEventListener('appinstalled', handleAppInstalled);

		let timer: ReturnType<typeof setTimeout> | undefined;

		// On iOS Safari, beforeinstallprompt never fires.
		// If not installed and not dismissed, show iOS installation guidance.
		if (!installed && isIosDevice && !isInstallPromptDismissed()) {
			timer = setTimeout(() => {
				if (!installed && !isInstallPromptDismissed()) {
					showPrompt = true;
				}
			}, 2500);
		}

		return () => {
			window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
			window.removeEventListener('appinstalled', handleAppInstalled);
			if (timer) clearTimeout(timer);
		};
	});

	function handleBeforeInstallPrompt(e: Event) {
		e.preventDefault();
		deferredPrompt = e as BeforeInstallPromptEvent;
		if (!installed && !isInstallPromptDismissed()) {
			showPrompt = true;
		}
	}

	function handleAppInstalled() {
		installed = true;
		showPrompt = false;
		deferredPrompt = null;
	}

	async function handleInstall() {
		if (deferredPrompt) {
			await deferredPrompt.prompt();
			const { outcome } = await deferredPrompt.userChoice;
			if (outcome === 'accepted') {
				installed = true;
				showPrompt = false;
				deferredPrompt = null;
			} else {
				handleDismiss();
			}
		}
	}

	function handleDismiss() {
		showPrompt = false;
		dismissInstallPrompt();
	}
</script>

<!-- PWA Install Prompt Banner -->
{#if showPrompt && !installed}
	<aside
		aria-label="Pemasangan Aplikasi Takerin"
		class="fixed right-4 bottom-4 z-40 w-[calc(100%-2rem)] max-w-sm rounded-[10px] border border-[var(--color-fog)] bg-white p-4 shadow-xl transition-all sm:right-6 sm:bottom-6 dark:border-[var(--color-dark-border)] dark:bg-[var(--color-dark-card)]"
	>
		<div class="flex items-start gap-3">
			<img
				src="/icons/icon-192.png"
				alt="Takerin Icon"
				width="44"
				height="44"
				class="h-11 w-11 shrink-0 rounded-[10px] bg-[var(--color-forest-ink)] object-cover shadow-sm"
			/>
			<div class="min-w-0 flex-1">
				<div class="flex items-center justify-between gap-1">
					<h3 class="text-sm font-bold text-[var(--color-obsidian)] dark:text-white">
						Pasang Takerin
					</h3>
					<button
						type="button"
						onclick={handleDismiss}
						aria-label="Tutup saran pemasangan aplikasi"
						class="text-[var(--color-pebble)] transition hover:text-[var(--color-charcoal)] dark:hover:text-white"
					>
						<HugeiconsIcon icon={Cancel01Icon} size={16} />
					</button>
				</div>
				<p class="mt-1 text-xs text-[var(--color-slate)] dark:text-[var(--color-pebble)]">
					{#if isIosDevice}
						Akses cepat dan buka catatan keuangan saat offline dari layar utama iPhone/iPad.
					{:else}
						Aplikasi lebih cepat dibuka dan dapat diakses saat offline dari layar utama.
					{/if}
				</p>
			</div>
		</div>

		{#if isIosDevice}
			<!-- iOS Safari installation instructions -->
			<div
				class="mt-3 rounded-[10px] bg-[var(--color-fog)]/60 p-2.5 text-xs text-[var(--color-charcoal)] dark:bg-[var(--color-dark-surface)] dark:text-[var(--color-linen-mist)]"
			>
				<p class="flex items-center gap-1.5 font-medium">
					<span>1. Ketuk ikon Bagikan</span>
					<HugeiconsIcon icon={Share01Icon} size={14} class="shrink-0" />
					<span>di bilah Safari</span>
				</p>
				<p class="mt-1 font-medium">
					2. Pilih menu <strong>"Tambah ke Layar Utama"</strong>
				</p>
			</div>

			<div class="mt-3 flex justify-end">
				<button
					type="button"
					onclick={handleDismiss}
					class="inline-flex cursor-pointer items-center justify-center rounded-full bg-[var(--color-forest-ink)] px-4 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:opacity-90 dark:bg-[var(--color-lime-voltage)] dark:text-[var(--color-forest-ink)]"
				>
					Mengerti
				</button>
			</div>
		{:else}
			<!-- Android / Desktop Chromium direct install button -->
			<div class="mt-3 flex items-center justify-end gap-2">
				<button
					type="button"
					onclick={handleDismiss}
					class="cursor-pointer px-3 py-1.5 text-xs font-medium text-[var(--color-slate)] transition hover:text-[var(--color-charcoal)] dark:text-[var(--color-pebble)] dark:hover:text-white"
				>
					Nanti
				</button>
				<button
					type="button"
					onclick={handleInstall}
					class="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-[var(--color-lime-voltage)] px-4 py-1.5 text-xs font-bold text-[var(--color-forest-ink)] shadow-sm transition hover:brightness-95 active:brightness-90"
				>
					<HugeiconsIcon icon={Download01Icon} size={14} />
					<span>Pasang</span>
				</button>
			</div>
		{/if}
	</aside>
{/if}
