<script lang="ts">
	import { fade, scale } from 'svelte/transition';
	import { asset } from '$app/paths';
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import { Cancel01Icon, LinkSquare02Icon, HeartIcon } from '@hugeicons/core-free-icons';
	import { t } from '#lib/i18n/index.js';

	interface DonationPlatform {
		id: string;
		name: string;
		href: string;
		label: string;
	}

	interface Props {
		isOpen?: boolean;
		onClose?: () => void;
		donationPlatforms?: DonationPlatform[];
	}

	let {
		isOpen = $bindable(false),
		onClose,
		donationPlatforms = [
			{
				id: 'sociabuzz',
				name: 'SociaBuzz',
				href: 'https://sociabuzz.com/hoseki/tribe',
				label: 'Donasi via Sociabuzz'
			}
		]
	}: Props = $props();

	const qrisSrc = asset('donate/QRIS-Gopay.webp');

	function closeModal() {
		isOpen = false;
		onClose?.();
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape' && isOpen) {
			closeModal();
		}
	}

	// Lock body scroll when modal is open
	$effect(() => {
		if (typeof document !== 'undefined') {
			if (isOpen) {
				const originalOverflow = document.body.style.overflow;
				document.body.style.overflow = 'hidden';
				return () => {
					document.body.style.overflow = originalOverflow;
				};
			}
		}
	});
</script>

<!-- eslint-disable svelte/no-navigation-without-resolve -->

<svelte:window onkeydown={handleKeydown} />

{#if isOpen}
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4" role="presentation">
		<!-- Backdrop Overlay -->
		<button
			type="button"
			transition:fade={{ duration: 180 }}
			onclick={closeModal}
			class="fixed inset-0 h-full w-full cursor-default border-none bg-obsidian/60 backdrop-blur-xs"
			aria-label={t('support.modalCloseAria')}
			tabindex="-1"
		></button>

		<!-- Modal Card Container -->
		<div
			role="dialog"
			aria-modal="true"
			aria-labelledby="donation-modal-title"
			aria-describedby="donation-modal-description"
			transition:scale={{ start: 0.95, duration: 200 }}
			class="relative z-10 flex max-h-[90vh] w-full max-w-sm flex-col items-center overflow-y-auto rounded-3xl border border-fog bg-paper p-5 text-center shadow-2xl transition-all sm:p-6 dark:border-dark-border dark:bg-dark-surface"
		>
			<!-- Close Modal Button -->
			<button
				type="button"
				onclick={closeModal}
				aria-label={t('support.modalCloseAria')}
				class="absolute top-4 right-4 inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-slate transition-colors hover:bg-fog hover:text-charcoal focus-visible:ring-2 focus-visible:ring-forest-ink focus-visible:outline-none dark:text-pebble dark:hover:bg-dark-card dark:hover:text-white dark:focus-visible:ring-lime-voltage"
			>
				<HugeiconsIcon icon={Cancel01Icon} size={18} />
			</button>

			<!-- Header Badge -->
			<div
				class="mb-2 inline-flex items-center gap-1.5 rounded-full bg-linen-mist/80 px-3 py-1 text-xs font-bold text-forest-ink dark:bg-dark-card dark:text-lime-voltage"
			>
				<HugeiconsIcon icon={HeartIcon} size={13} class="text-alarm-red dark:text-lime-voltage" />
				<span>{t('support.badge')}</span>
			</div>

			<!-- Title & Description -->
			<h2
				id="donation-modal-title"
				class="font-display text-lg font-bold text-obsidian sm:text-xl dark:text-white"
			>
				{t('support.modalTitle')}
			</h2>
			<p
				id="donation-modal-description"
				class="mt-1 text-xs leading-relaxed text-slate sm:text-[13px] dark:text-pebble"
			>
				{t('support.modalDesc')}
			</p>

			<!-- QRIS High-Contrast Rounded Container -->
			<div
				class="mt-4 flex w-full flex-col items-center rounded-2xl border border-fog/80 bg-white p-3.5 shadow-xs dark:border-dark-border"
			>
				<img
					src={qrisSrc}
					alt={t('support.qrisAlt')}
					width="256"
					height="256"
					class="mx-auto h-auto max-h-64 w-full max-w-[240px] rounded-[3rem] object-contain sm:max-w-[260px]"
				/>
				<p class="mt-2 text-[11px] font-medium text-slate">
					{t('support.qrisHint')}
				</p>
			</div>

			<!-- Additional Third-Party Platforms -->
			{#if donationPlatforms.length > 0}
				<div class="mt-4 flex w-full flex-col gap-2">
					{#each donationPlatforms as platform (platform.id)}
						<a
							href={platform.href}
							target="_blank"
							rel="noopener noreferrer"
							class="inline-flex w-full items-center justify-center gap-2 rounded-full bg-forest-ink px-4 py-2.5 text-xs font-bold text-paper shadow-xs transition hover:bg-spruce focus-visible:ring-2 focus-visible:ring-forest-ink focus-visible:outline-none active:scale-[0.99] sm:text-sm dark:bg-lime-voltage dark:text-forest-ink dark:hover:brightness-95 dark:focus-visible:ring-lime-voltage"
						>
							<HugeiconsIcon icon={LinkSquare02Icon} size={16} />
							<span
								>{platform.id === 'sociabuzz' && platform.label === 'Donasi via Sociabuzz'
									? t('support.sociabuzzLabel')
									: platform.label}</span
							>
						</a>
					{/each}
				</div>
			{/if}
		</div>
	</div>
{/if}
