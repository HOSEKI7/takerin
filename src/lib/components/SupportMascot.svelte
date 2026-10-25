<script lang="ts">
	import { onMount } from 'svelte';
	import { fade, fly, scale } from 'svelte/transition';
	import { asset } from '$app/paths';
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import { Cancel01Icon, LinkSquare02Icon, HeartIcon } from '@hugeicons/core-free-icons';

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
	const qrisSrc = asset('donate/QRIS-Gopay.webp');

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

	function closeModal() {
		isModalOpen = false;
	}

	function dismissWidget(e: MouseEvent) {
		e.stopPropagation();
		isDismissed = true;
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape' && isModalOpen) {
			closeModal();
		}
	}

	// Lock body scroll when modal is open
	$effect(() => {
		if (typeof document !== 'undefined') {
			if (isModalOpen) {
				const originalOverflow = document.body.style.overflow;
				document.body.style.overflow = 'hidden';
				return () => {
					document.body.style.overflow = originalOverflow;
				};
			}
		}
	});
</script>

<svelte:window onkeydown={handleKeydown} />

{#if !isDismissed}
	<!-- Floating Mascot Widget Container (Bottom-Right) -->
	<aside
		aria-label="Dukungan Pengembang Takerin"
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
				<span>{hasClicked ? 'Terima kasih banyak! 💚' : 'Traktir kopi developer ☕'}</span>
				<div
					class="absolute right-5 -bottom-1 h-2 w-2 rotate-45 bg-forest-ink dark:bg-forest-ink"
					aria-hidden="true"
				></div>
			</div>

			<!-- Small Dismiss Button ('x') -->
			<button
				type="button"
				onclick={dismissWidget}
				aria-label="Tutup maskot dukungan"
				class="absolute -top-1 -right-1 z-10 flex h-6 w-6 cursor-pointer items-center justify-center rounded-full border border-fog/80 bg-paper/95 text-slate shadow-sm backdrop-blur-xs transition-transform duration-150 hover:scale-110 hover:bg-fog hover:text-charcoal focus-visible:ring-2 focus-visible:ring-forest-ink focus-visible:outline-none active:scale-95 dark:border-dark-border dark:bg-dark-card/95 dark:text-pebble dark:hover:bg-dark-surface dark:hover:text-white dark:focus-visible:ring-lime-voltage"
			>
				<HugeiconsIcon icon={Cancel01Icon} size={13} />
			</button>

			<!-- Mascot Interactive Button -->
			<button
				type="button"
				onclick={handleMascotClick}
				onmouseenter={() => (isHovered = true)}
				onmouseleave={() => (isHovered = false)}
				aria-label="Buka popup donasi sukarela untuk pengembang"
				aria-haspopup="dialog"
				aria-expanded={isModalOpen}
				class="cursor-pointer rounded-2xl p-1 transition-transform duration-200 ease-out select-none hover:scale-105 focus-visible:ring-2 focus-visible:ring-forest-ink focus-visible:outline-none active:scale-95 dark:focus-visible:ring-lime-voltage"
			>
				<img
					src={currentMascotSrc}
					alt="Maskot Dukungan Pengembang"
					width="64"
					height="64"
					class="pointer-events-none h-14 w-14 object-contain drop-shadow-md select-none sm:h-16 sm:w-16"
				/>
			</button>
		</div>
	</aside>
{/if}

<!-- Accessible Donation Modal -->
{#if isModalOpen}
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4" role="presentation">
		<!-- Backdrop Overlay -->
		<button
			type="button"
			transition:fade={{ duration: 180 }}
			onclick={closeModal}
			class="fixed inset-0 h-full w-full cursor-default border-none bg-obsidian/60 backdrop-blur-xs"
			aria-label="Tutup jendela donasi"
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
				aria-label="Tutup jendela modal donasi"
				class="absolute top-4 right-4 inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-slate transition-colors hover:bg-fog hover:text-charcoal focus-visible:ring-2 focus-visible:ring-forest-ink focus-visible:outline-none dark:text-pebble dark:hover:bg-dark-card dark:hover:text-white dark:focus-visible:ring-lime-voltage"
			>
				<HugeiconsIcon icon={Cancel01Icon} size={18} />
			</button>

			<!-- Header Badge -->
			<div
				class="mb-2 inline-flex items-center gap-1.5 rounded-full bg-linen-mist/80 px-3 py-1 text-xs font-bold text-forest-ink dark:bg-dark-card dark:text-lime-voltage"
			>
				<HugeiconsIcon icon={HeartIcon} size={13} class="text-alarm-red dark:text-lime-voltage" />
				<span>Dukungan Sukarela</span>
			</div>

			<!-- Title & Description -->
			<h2
				id="donation-modal-title"
				class="font-display text-lg font-bold text-obsidian sm:text-xl dark:text-white"
			>
				Traktir Kopi Developer ☕
			</h2>
			<p
				id="donation-modal-description"
				class="mt-1 text-xs leading-relaxed text-slate sm:text-[13px] dark:text-pebble"
			>
				Takerin gratis tanpa iklan. Donasi seikhlasnya sangat berarti untuk biaya operasional & kopi
				developer!
			</p>

			<!-- QRIS High-Contrast Rounded Container -->
			<div
				class="mt-4 flex w-full flex-col items-center rounded-2xl border border-fog/80 bg-white p-3.5 shadow-xs dark:border-dark-border"
			>
				<img
					src={qrisSrc}
					alt="QRIS GoPay Universal Takerin"
					width="256"
					height="256"
					class="mx-auto h-auto max-h-64 w-full max-w-[240px] rounded-[3rem] object-contain sm:max-w-[260px]"
				/>
				<p class="mt-2 text-[11px] font-medium text-slate">
					Bisa di-scan dari BCA, GoPay, OVO, Dana, ShopeePay, & m-Banking apa saja.
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
							<span>{platform.label}</span>
						</a>
					{/each}
				</div>
			{/if}
		</div>
	</div>
{/if}
