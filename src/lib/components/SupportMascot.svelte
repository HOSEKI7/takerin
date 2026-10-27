<script lang="ts">
	import { onMount } from 'svelte';
	import { asset } from '$app/paths';
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import { Cancel01Icon } from '@hugeicons/core-free-icons';
	import { t } from '#lib/i18n/index.js';
	import DonationModal from './DonationModal.svelte';

	interface DonationPlatform {
		id: string;
		name: string;
		href: string;
		label: string;
	}

	interface Props {
		class?: string;
		donationPlatforms?: DonationPlatform[];
	}

	let {
		class: className = '',
		donationPlatforms = [
			{
				id: 'sociabuzz',
				name: 'SociaBuzz',
				href: 'https://sociabuzz.com/hoseki/tribe',
				label: 'Donasi via Sociabuzz'
			}
		]
	}: Props = $props();

	// Asset URLs
	const idle1Src = asset('mascot/mascot-idle1.webp');
	const idle2Src = asset('mascot/mascot-idle2.webp');
	const happySrc = asset('mascot/mascot-happy.webp');
	const thanksSrc = asset('mascot/mascot-thanks.webp');

	// Mascot state
	let isDismissed = $state(false);
	let isModalOpen = $state(false);
	let hasClicked = $state(false);
	let isHovered = $state(false);
	let idleVariant = $state<'idle1' | 'idle2'>('idle1');

	// Randomize idle image on client mount to prevent SSR hydration mismatch
	onMount(() => {
		idleVariant = Math.random() < 0.5 ? 'idle1' : 'idle2';
	});

	// Derive current mascot image based on interaction state
	const currentMascotSrc = $derived.by(() => {
		if (hasClicked) return thanksSrc;
		if (isHovered) return happySrc;
		return idleVariant === 'idle1' ? idle1Src : idle2Src;
	});

	function handleMascotClick() {
		hasClicked = true;
		isModalOpen = true;
	}

	function dismissWidget(e: MouseEvent) {
		e.stopPropagation();
		isDismissed = true;
	}
</script>

{#if !isDismissed}
	<!-- Floating Mascot Widget Container (Bottom-Right) -->
	<aside
		aria-label={t('support.mascotAria')}
		class="fixed right-5 bottom-5 z-30 sm:right-6 sm:bottom-6 {className}"
	>
		<div class="group relative flex flex-col items-end">
			<!-- Speech bubble tooltip (hover on desktop) -->
			<div
				role="tooltip"
				class="pointer-events-none absolute right-0 bottom-full mb-2.5 hidden rounded-xl bg-forest-ink px-3 py-1.5 text-xs font-semibold whitespace-nowrap text-lime-voltage shadow-lg transition-all duration-200 sm:block {isHovered
					? 'translate-y-0 opacity-100'
					: 'translate-y-1 opacity-0'} dark:bg-forest-ink dark:text-lime-voltage"
			>
				<span>{hasClicked ? t('support.tooltipThanks') : t('support.tooltipIdle')}</span>
				<div
					class="absolute right-8 -bottom-1 h-2 w-2 rotate-45 bg-forest-ink sm:right-10 dark:bg-forest-ink"
					aria-hidden="true"
				></div>
			</div>

			<!-- Small Dismiss Button ('x') -->
			<button
				type="button"
				onclick={dismissWidget}
				aria-label={t('support.dismissAria')}
				class="absolute -top-1.5 -right-1.5 z-10 flex h-6 w-6 cursor-pointer items-center justify-center rounded-full border border-fog/80 bg-paper/95 text-slate shadow-sm backdrop-blur-xs transition-transform duration-150 hover:scale-110 hover:bg-fog hover:text-charcoal focus-visible:ring-2 focus-visible:ring-forest-ink focus-visible:outline-none active:scale-95 sm:h-7 sm:w-7 dark:border-dark-border dark:bg-dark-card/95 dark:text-pebble dark:hover:bg-dark-surface dark:hover:text-white dark:focus-visible:ring-lime-voltage"
			>
				<HugeiconsIcon icon={Cancel01Icon} size={14} />
			</button>

			<!-- Mascot Interactive Button -->
			<button
				type="button"
				onclick={handleMascotClick}
				onmouseenter={() => (isHovered = true)}
				onmouseleave={() => (isHovered = false)}
				aria-label={t('support.openModalAria')}
				aria-haspopup="dialog"
				aria-expanded={isModalOpen}
				class="cursor-pointer rounded-2xl p-1 transition-transform duration-200 ease-out select-none hover:scale-105 focus-visible:ring-2 focus-visible:ring-forest-ink focus-visible:outline-none active:scale-95 dark:focus-visible:ring-lime-voltage"
			>
				<img
					src={currentMascotSrc}
					alt={t('support.mascotAlt')}
					width="112"
					height="112"
					class="pointer-events-none h-20 w-20 object-contain drop-shadow-md select-none sm:h-24 sm:w-24 md:h-28 md:w-28"
				/>
			</button>
		</div>
	</aside>
{/if}

<!-- Accessible Donation Modal -->
<DonationModal bind:isOpen={isModalOpen} {donationPlatforms} />
