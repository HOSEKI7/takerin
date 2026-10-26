<script lang="ts">
	import { t } from '#lib/i18n/index.js';
	import Button from './Button.svelte';
	import Card from './Card.svelte';
	import ProgressBar from './ProgressBar.svelte';
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import {
		ArrowRight02Icon,
		ArrowLeft02Icon,
		DashboardSquare01Icon,
		Add01Icon,
		Clock01Icon,
		SparklesIcon,
		Rocket01Icon,
		CheckmarkCircle02Icon,
		Wallet01Icon,
		PiggyBankIcon
	} from '@hugeicons/core-free-icons';

	interface Props {
		onfinish?: () => void;
		onskip?: () => void;
		class?: string;
	}

	let { onfinish, onskip, class: className = '' }: Props = $props();

	let currentSlide = $state(0);
	const TOTAL_SLIDES = 4;
	const slideIndices = [0, 1, 2, 3];

	function nextSlide() {
		if (currentSlide < TOTAL_SLIDES - 1) {
			currentSlide += 1;
		} else {
			onfinish?.();
		}
	}

	function prevSlide() {
		if (currentSlide > 0) {
			currentSlide -= 1;
		}
	}

	function goToSlide(index: number) {
		if (index >= 0 && index < TOTAL_SLIDES) {
			currentSlide = index;
		}
	}

	function handleKeyDown(event: KeyboardEvent) {
		const target = event.target as HTMLElement | null;
		if (
			target &&
			(target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
		) {
			return;
		}

		if (event.key === 'ArrowRight') {
			nextSlide();
		} else if (event.key === 'ArrowLeft') {
			prevSlide();
		}
	}
</script>

<svelte:window onkeydown={handleKeyDown} />

<div
	role="region"
	aria-roledescription="carousel"
	aria-label={t('onboarding.tutorial.carouselAria')}
	class={className}
>
	<Card
		variant="default"
		padding="none"
		class="relative overflow-hidden border border-fog shadow-xl dark:border-dark-border"
	>
		<!-- Top Navigation Header: Badge, Indicators, and Skip button -->
		<div
			class="flex items-center justify-between border-b border-fog/80 px-6 py-4 dark:border-dark-border/80"
		>
			<div class="flex items-center gap-2">
				<span
					class="inline-flex items-center gap-1.5 rounded-full bg-linen-mist/80 px-3 py-1 text-xs font-bold text-forest-ink dark:bg-spruce/60 dark:text-lime-voltage"
				>
					<span class="h-1.5 w-1.5 rounded-full bg-forest-ink dark:bg-lime-voltage"></span>
					{t('onboarding.tutorial.badge')}
				</span>
				<span class="text-xs font-semibold text-slate dark:text-pebble">
					{currentSlide + 1} / {TOTAL_SLIDES}
				</span>
			</div>

			<button
				type="button"
				onclick={() => onskip?.()}
				class="rounded-sm px-2 py-1 text-xs font-bold text-slate transition hover:text-forest-ink hover:underline focus:outline-hidden focus-visible:ring-2 focus-visible:ring-forest-ink dark:text-pebble dark:hover:text-lime-voltage dark:focus-visible:ring-lime-voltage"
			>
				{t('onboarding.tutorial.skip')}
			</button>
		</div>

		<!-- Slides Container -->
		<div
			class="p-6 sm:p-8"
			role="group"
			aria-roledescription="slide"
			aria-label={t('onboarding.tutorial.slideAria', { current: currentSlide + 1, total: TOTAL_SLIDES })}
		>
			{#if currentSlide === 0}
				<!-- Slide 1: Dashboard & Sisa Jatah -->
				<div
					class="animate-fadeIn flex flex-col items-center text-center"
					data-testid="tutorial-slide-0"
				>
					<!-- Visual Illustration -->
					<div
						class="mb-6 w-full max-w-md rounded-2xl border border-fog bg-fog/30 p-5 dark:border-dark-border dark:bg-dark-surface/60"
					>
						<div
							class="flex items-center justify-between border-b border-fog pb-3 dark:border-dark-border"
						>
							<div class="flex items-center gap-2">
								<div
									class="flex h-8 w-8 items-center justify-center rounded-lg bg-forest-ink text-lime-voltage"
								>
									<HugeiconsIcon icon={DashboardSquare01Icon} size={18} />
								</div>
								<span class="text-xs font-bold text-obsidian dark:text-paper"
									>{t('onboarding.tutorial.mockup.budgetDashboard')}</span
								>
							</div>
							<span
								class="rounded-full bg-lime-voltage/20 px-2 py-0.5 text-[11px] font-bold text-forest-ink dark:text-lime-voltage"
							>
								{t('onboarding.tutorial.mockup.remaining72')}
							</span>
						</div>

						<div class="mt-4 space-y-3 text-left">
							<div
								class="rounded-xl border border-fog/80 bg-paper p-3 shadow-xs dark:border-dark-border dark:bg-dark-card"
							>
								<div class="flex items-center justify-between text-xs font-bold">
									<span class="flex items-center gap-1.5 text-obsidian dark:text-paper">
										<HugeiconsIcon
											icon={Wallet01Icon}
											size={14}
											class="text-forest-ink dark:text-lime-voltage"
										/>
										{t('onboarding.tutorial.mockup.needs50')}
									</span>
									<span class="font-black text-forest-ink dark:text-lime-voltage">Rp 2.450.000</span
									>
								</div>
								<ProgressBar value={49} max={100} variant="lime" class="mt-2" />
								<div class="mt-1 flex justify-between text-[10px] text-slate dark:text-pebble">
									<span>{t('onboarding.tutorial.mockup.used2550')}</span>
									<span>{t('onboarding.tutorial.mockup.alloc5000')}</span>
								</div>
							</div>

							<div
								class="rounded-xl border border-fog/80 bg-paper p-3 shadow-xs dark:border-dark-border dark:bg-dark-card"
							>
								<div class="flex items-center justify-between text-xs font-bold">
									<span class="flex items-center gap-1.5 text-obsidian dark:text-paper">
										<HugeiconsIcon
											icon={PiggyBankIcon}
											size={14}
											class="text-spruce dark:text-lime-voltage"
										/>
										{t('onboarding.tutorial.mockup.savings20')}
									</span>
									<span class="font-black text-forest-ink dark:text-lime-voltage">Rp 2.000.000</span
									>
								</div>
								<ProgressBar value={100} max={100} variant="lime" class="mt-2" />
							</div>
						</div>
					</div>

					<h2 class="text-xl font-black text-obsidian sm:text-2xl dark:text-paper">
						{t('onboarding.tutorial.slide1Title')}
					</h2>
					<p class="mt-2.5 max-w-lg text-sm leading-relaxed text-charcoal dark:text-linen-mist/90">
						{t('onboarding.tutorial.slide1Desc')}
					</p>
				</div>
			{:else if currentSlide === 1}
				<!-- Slide 2: Catat Cepat Cuma 5 Detik -->
				<div
					class="animate-fadeIn flex flex-col items-center text-center"
					data-testid="tutorial-slide-1"
				>
					<!-- Visual Illustration -->
					<div
						class="mb-6 w-full max-w-md rounded-2xl border border-fog bg-fog/30 p-5 dark:border-dark-border dark:bg-dark-surface/60"
					>
						<div
							class="flex items-center justify-between border-b border-fog pb-3 dark:border-dark-border"
						>
							<div class="flex items-center gap-2">
								<span
									class="flex h-8 w-8 items-center justify-center rounded-lg bg-lime-voltage font-bold text-forest-ink"
								>
									<HugeiconsIcon icon={Add01Icon} size={20} />
								</span>
								<span class="text-xs font-bold text-obsidian dark:text-paper"
									>{t('onboarding.tutorial.mockup.quickExpense')}</span
								>
							</div>
							<span
								class="inline-flex items-center gap-1 rounded-full bg-forest-ink px-2 py-0.5 text-[11px] font-bold text-lime-voltage"
							>
								<HugeiconsIcon icon={Clock01Icon} size={12} />
								{t('onboarding.tutorial.mockup.fiveSeconds')}
							</span>
						</div>

						<div
							class="mt-4 rounded-xl border border-lime-voltage/40 bg-paper p-4 text-left shadow-xs dark:border-dark-border dark:bg-dark-card"
						>
							<div
								class="text-[11px] font-bold tracking-wider text-slate uppercase dark:text-pebble"
							>
								{t('onboarding.tutorial.mockup.firstAmount')}
							</div>
							<div class="mt-1 text-2xl font-black text-forest-ink dark:text-lime-voltage">
								Rp 35.000
							</div>
							<div class="mt-3 flex flex-wrap gap-1.5">
								<span
									class="rounded-md bg-linen-mist/80 px-2.5 py-1 text-xs font-semibold text-forest-ink dark:bg-spruce/60 dark:text-linen-mist"
								>
									{t('onboarding.tutorial.mockup.needsTag')}
								</span>
								<span
									class="rounded-md bg-fog px-2.5 py-1 text-xs font-medium text-charcoal dark:bg-dark-surface dark:text-linen-mist"
								>
									{t('onboarding.tutorial.mockup.lunchTag')}
								</span>
							</div>
						</div>
					</div>

					<h2 class="text-xl font-black text-obsidian sm:text-2xl dark:text-paper">
						{t('onboarding.tutorial.slide2Title')}
					</h2>
					<p class="mt-2.5 max-w-lg text-sm leading-relaxed text-charcoal dark:text-linen-mist/90">
						{t('onboarding.tutorial.slide2Desc')}
					</p>
				</div>
			{:else if currentSlide === 2}
				<!-- Slide 3: Tips AI & Riwayat Bulanan -->
				<div
					class="animate-fadeIn flex flex-col items-center text-center"
					data-testid="tutorial-slide-2"
				>
					<!-- Visual Illustration -->
					<div
						class="mb-6 w-full max-w-md rounded-2xl border border-fog bg-fog/30 p-5 dark:border-dark-border dark:bg-dark-surface/60"
					>
						<div
							class="flex items-center justify-between border-b border-fog pb-3 dark:border-dark-border"
						>
							<div class="flex items-center gap-2">
								<div
									class="flex h-8 w-8 items-center justify-center rounded-lg bg-forest-ink text-lime-voltage"
								>
									<HugeiconsIcon icon={SparklesIcon} size={18} />
								</div>
								<span class="text-xs font-bold text-obsidian dark:text-paper"
									>{t('onboarding.tutorial.mockup.aiSummaryTitle')}</span
								>
							</div>
							<span
								class="rounded-full bg-forest-ink/10 px-2 py-0.5 text-[11px] font-bold text-forest-ink dark:bg-lime-voltage/20 dark:text-lime-voltage"
							>
								{t('onboarding.tutorial.mockup.endOfMonth')}
							</span>
						</div>

						<div
							class="mt-4 rounded-xl border border-forest-ink/20 bg-linen-mist/50 p-4 text-left dark:border-dark-border dark:bg-spruce/30"
						>
							<div
								class="flex items-center gap-1.5 text-xs font-bold text-forest-ink dark:text-lime-voltage"
							>
								<HugeiconsIcon icon={SparklesIcon} size={14} />
								{t('onboarding.tutorial.mockup.autoAnalysis')}
							</div>
							<p class="mt-2 text-xs leading-relaxed text-charcoal dark:text-linen-mist">
								{t('onboarding.tutorial.mockup.aiQuote')}
							</p>
						</div>
					</div>

					<h2 class="text-xl font-black text-obsidian sm:text-2xl dark:text-paper">
						{t('onboarding.tutorial.slide3Title')}
					</h2>
					<p class="mt-2.5 max-w-lg text-sm leading-relaxed text-charcoal dark:text-linen-mist/90">
						{t('onboarding.tutorial.slide3Desc')}
					</p>
				</div>
			{:else if currentSlide === 3}
				<!-- Slide 4: Selamat Datang & Mulai -->
				<div
					class="animate-fadeIn flex flex-col items-center text-center"
					data-testid="tutorial-slide-3"
				>
					<!-- Visual Illustration -->
					<div class="mb-6 flex flex-col items-center justify-center">
						<div
							class="relative flex h-24 w-24 items-center justify-center rounded-3xl bg-forest-ink text-lime-voltage shadow-lg ring-8 ring-lime-voltage/30"
						>
							<HugeiconsIcon icon={Rocket01Icon} size={48} />
						</div>

						<div class="mt-6 flex flex-wrap justify-center gap-2">
							<span
								class="inline-flex items-center gap-1 rounded-full bg-linen-mist px-3 py-1 text-xs font-bold text-forest-ink dark:bg-spruce/60 dark:text-lime-voltage"
							>
								<HugeiconsIcon icon={CheckmarkCircle02Icon} size={14} />
								{t('onboarding.tutorial.mockup.payDaySet')}
							</span>
							<span
								class="inline-flex items-center gap-1 rounded-full bg-linen-mist px-3 py-1 text-xs font-bold text-forest-ink dark:bg-spruce/60 dark:text-lime-voltage"
							>
								<HugeiconsIcon icon={CheckmarkCircle02Icon} size={14} />
								{t('onboarding.tutorial.mockup.incomeAdded')}
							</span>
							<span
								class="inline-flex items-center gap-1 rounded-full bg-linen-mist px-3 py-1 text-xs font-bold text-forest-ink dark:bg-spruce/60 dark:text-lime-voltage"
							>
								<HugeiconsIcon icon={CheckmarkCircle02Icon} size={14} />
								{t('onboarding.tutorial.mockup.categories100')}
							</span>
						</div>
					</div>

					<h2 class="text-xl font-black text-obsidian sm:text-2xl dark:text-paper">
						{t('onboarding.tutorial.slide4Title')}
					</h2>
					<p class="mt-2.5 max-w-lg text-sm leading-relaxed text-charcoal dark:text-linen-mist/90">
						{t('onboarding.tutorial.slide4Desc')}
					</p>
				</div>
			{/if}
		</div>

		<!-- Bottom Navigation Bar: Dots & Action Buttons -->
		<div
			class="flex flex-col gap-4 border-t border-fog bg-fog/20 px-6 py-5 sm:flex-row sm:items-center sm:justify-between dark:border-dark-border dark:bg-dark-surface/40"
		>
			<!-- Carousel Stepper Dots -->
			<div class="flex items-center justify-center gap-1" aria-label={t('onboarding.tutorial.indicatorAria')}>
				{#each slideIndices as idx (idx)}
					<button
						type="button"
						aria-current={currentSlide === idx ? 'step' : undefined}
						aria-label={t('onboarding.tutorial.goToSlide', { slide: idx + 1 })}
						onclick={() => goToSlide(idx)}
						class="flex h-7 w-7 items-center justify-center rounded-full transition-all focus:outline-hidden focus-visible:ring-2 focus-visible:ring-forest-ink dark:focus-visible:ring-lime-voltage"
					>
						<span
							class="h-2.5 rounded-full transition-all {currentSlide === idx
								? 'w-7 bg-forest-ink dark:bg-lime-voltage'
								: 'w-2.5 bg-pebble/40 hover:bg-slate dark:bg-pebble/60'}"
						></span>
					</button>
				{/each}
			</div>

			<!-- Control Buttons -->
			<div class="flex items-center gap-3">
				{#if currentSlide > 0}
					<Button
						type="button"
						variant="secondary"
						size="md"
						onclick={prevSlide}
						class="flex-1 sm:flex-none"
					>
						<HugeiconsIcon icon={ArrowLeft02Icon} size={18} />
						<span>{t('onboarding.tutorial.prev')}</span>
					</Button>
				{/if}

				{#if currentSlide < TOTAL_SLIDES - 1}
					<Button
						type="button"
						variant="primary"
						size="md"
						onclick={nextSlide}
						class="flex-1 sm:flex-none"
					>
						<span>{t('onboarding.tutorial.next')}</span>
						<HugeiconsIcon icon={ArrowRight02Icon} size={18} />
					</Button>
				{:else}
					<Button
						type="button"
						variant="primary"
						size="md"
						onclick={() => onfinish?.()}
						class="flex-1 sm:flex-none"
					>
						<span>{t('onboarding.tutorial.finish')}</span>
					</Button>
				{/if}
			</div>
		</div>
	</Card>
</div>
