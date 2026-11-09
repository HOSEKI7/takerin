<script lang="ts">
	import { untrack } from 'svelte';
	import { fade, scale } from 'svelte/transition';
	import { enhance } from '$app/forms';
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import {
		Cancel01Icon,
		StarIcon,
		Bug01Icon,
		Idea01Icon,
		Comment01Icon,
		CheckmarkCircle02Icon
	} from '@hugeicons/core-free-icons';
	import { t } from '#lib/i18n/index.js';

	interface Props {
		isOpen?: boolean;
		initialType?: 'review' | 'feedback';
		actionUrl?: string;
		currentRoute?: string;
		deviceInfo?: string;
		onClose?: () => void;
		onSuccess?: (data?: unknown) => void;
	}

	let {
		isOpen = $bindable(false),
		initialType = 'review',
		actionUrl = '/settings?/submitFeedback',
		currentRoute: propCurrentRoute,
		deviceInfo: propDeviceInfo,
		onClose,
		onSuccess
	}: Props = $props();

	let activeTab = $state<'review' | 'feedback'>(untrack(() => initialType));
	let rating = $state<number>(0);
	let hoveredRating = $state<number>(0);
	let category = $state<'bug' | 'feature' | 'general'>('bug');
	let content = $state<string>('');
	let isSubmitting = $state<boolean>(false);
	let formError = $state<string | null>(null);
	let isSuccess = $state<boolean>(false);
	let successTitle = $state<string>('');
	let successMessage = $state<string>('');

	let detectedCurrentRoute = $state<string>('');
	let detectedDeviceInfo = $state<string>('');

	// Active route and device info computation (SSR safe)
	let resolvedCurrentRoute = $derived(propCurrentRoute || detectedCurrentRoute || '/settings');
	let resolvedDeviceInfo = $derived(propDeviceInfo || detectedDeviceInfo || '');

	function closeModal() {
		isOpen = false;
		onClose?.();
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape' && isOpen) {
			closeModal();
		}
	}

	// Lock body scroll when modal is open and capture client context
	let wasOpen = false;
	$effect(() => {
		if (typeof document !== 'undefined') {
			if (isOpen) {
				const originalOverflow = document.body.style.overflow;
				document.body.style.overflow = 'hidden';

				if (!wasOpen) {
					activeTab = initialType;
					rating = 0;
					hoveredRating = 0;
					category = 'bug';
					content = '';
					formError = null;
					isSuccess = false;

					if (typeof window !== 'undefined') {
						if (!propDeviceInfo) {
							detectedDeviceInfo = JSON.stringify({
								browser: navigator.userAgent,
								screen: `${window.innerWidth}x${window.innerHeight}`
							});
						}
						if (!propCurrentRoute) {
							detectedCurrentRoute = window.location.pathname;
						}
					}
				}
				wasOpen = true;

				return () => {
					document.body.style.overflow = originalOverflow;
				};
			} else {
				wasOpen = false;
			}
		}
	});

	function getRatingLabel(score: number): string {
		switch (score) {
			case 1:
				return t('feedback.star1');
			case 2:
				return t('feedback.star2');
			case 3:
				return t('feedback.star3');
			case 4:
				return t('feedback.star4');
			case 5:
				return t('feedback.star5');
			default:
				return '';
		}
	}

	function handleRatingKeyDown(e: KeyboardEvent, currentStar: number) {
		if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
			e.preventDefault();
			rating = Math.min(5, (rating || currentStar) + 1);
		} else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
			e.preventDefault();
			rating = Math.max(1, (rating || currentStar) - 1);
		} else if (['1', '2', '3', '4', '5'].includes(e.key)) {
			e.preventDefault();
			rating = Number(e.key);
		}
	}

	function handleTabKeyDown(e: KeyboardEvent) {
		if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
			e.preventDefault();
			activeTab = activeTab === 'review' ? 'feedback' : 'review';
			formError = null;
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if isOpen}
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6" role="presentation">
		<!-- Backdrop Overlay -->
		<button
			type="button"
			transition:fade={{ duration: 180 }}
			onclick={closeModal}
			class="fixed inset-0 h-full w-full cursor-default border-none bg-obsidian/60 backdrop-blur-xs"
			aria-label={t('feedback.modalCloseAria')}
			tabindex="-1"
		></button>

		<!-- Modal Card Container -->
		<div
			role="dialog"
			aria-modal="true"
			aria-labelledby="feedback-modal-title"
			aria-describedby="feedback-modal-subtitle"
			transition:scale={{ start: 0.95, duration: 200 }}
			class="relative z-10 flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-3xl border border-fog bg-paper shadow-2xl transition-all dark:border-dark-border dark:bg-dark-surface"
		>
			<!-- Header -->
			<div
				class="flex items-start justify-between border-b border-fog/80 px-6 pt-6 pb-4 dark:border-dark-border"
			>
				<div>
					<h2
						id="feedback-modal-title"
						class="text-xl font-bold tracking-tight text-obsidian sm:text-2xl dark:text-white"
					>
						{t('feedback.title')}
					</h2>
					<p id="feedback-modal-subtitle" class="mt-1 text-sm text-slate dark:text-pebble">
						{t('feedback.subtitle')}
					</p>
				</div>
				<button
					type="button"
					onclick={closeModal}
					aria-label={t('feedback.modalCloseAria')}
					class="inline-flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full text-slate transition-colors hover:bg-fog hover:text-charcoal focus-visible:ring-2 focus-visible:ring-forest-ink focus-visible:outline-none dark:text-pebble dark:hover:bg-dark-card dark:hover:text-white dark:focus-visible:ring-lime-voltage"
				>
					<HugeiconsIcon icon={Cancel01Icon} size={20} />
				</button>
			</div>

			<!-- Success State -->
			{#if isSuccess}
				<div
					transition:fade={{ duration: 150 }}
					class="flex flex-col items-center justify-center px-6 py-12 text-center"
				>
					<div
						class="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-linen-mist text-forest-ink dark:bg-dark-card dark:text-lime-voltage"
					>
						<HugeiconsIcon icon={CheckmarkCircle02Icon} size={36} />
					</div>
					<h3 class="text-xl font-bold text-obsidian dark:text-white">
						{successTitle}
					</h3>
					<p class="mt-2 max-w-md text-sm text-slate dark:text-pebble">
						{successMessage}
					</p>
					<button
						type="button"
						onclick={closeModal}
						class="mt-6 inline-flex h-11 items-center justify-center rounded-full bg-forest-ink px-6 text-sm font-semibold text-paper transition-all hover:bg-spruce focus-visible:ring-2 focus-visible:ring-forest-ink focus-visible:outline-none dark:bg-lime-voltage dark:text-dark-canvas dark:hover:bg-lime-voltage/90 dark:focus-visible:ring-lime-voltage"
					>
						{t('feedback.closeButton')}
					</button>
				</div>
			{:else}
				<!-- Segmented Control Tab Switcher -->
				<div class="px-6 pt-5">
					<div
						role="tablist"
						tabindex="0"
						aria-label={t('feedback.title')}
						onkeydown={handleTabKeyDown}
						class="grid w-full grid-cols-2 rounded-2xl bg-fog/80 p-1.5 dark:bg-dark-card"
					>
						<button
							type="button"
							role="tab"
							id="tab-review"
							aria-controls="panel-review"
							aria-selected={activeTab === 'review'}
							onclick={() => {
								activeTab = 'review';
								formError = null;
							}}
							class="flex h-10 cursor-pointer items-center justify-center rounded-xl text-sm font-semibold transition-all focus-visible:ring-2 focus-visible:ring-forest-ink focus-visible:outline-none dark:focus-visible:ring-lime-voltage {activeTab ===
							'review'
								? 'bg-paper text-forest-ink shadow-sm dark:bg-dark-surface dark:text-lime-voltage'
								: 'text-slate hover:text-charcoal dark:text-pebble dark:hover:text-white'}"
						>
							<HugeiconsIcon icon={StarIcon} size={16} class="mr-1.5" />
							{t('feedback.tabReview')}
						</button>
						<button
							type="button"
							role="tab"
							id="tab-feedback"
							aria-controls="panel-feedback"
							aria-selected={activeTab === 'feedback'}
							onclick={() => {
								activeTab = 'feedback';
								formError = null;
							}}
							class="flex h-10 cursor-pointer items-center justify-center rounded-xl text-sm font-semibold transition-all focus-visible:ring-2 focus-visible:ring-forest-ink focus-visible:outline-none dark:focus-visible:ring-lime-voltage {activeTab ===
							'feedback'
								? 'bg-paper text-forest-ink shadow-sm dark:bg-dark-surface dark:text-lime-voltage'
								: 'text-slate hover:text-charcoal dark:text-pebble dark:hover:text-white'}"
						>
							<HugeiconsIcon icon={Comment01Icon} size={16} class="mr-1.5" />
							{t('feedback.tabFeedback')}
						</button>
					</div>
				</div>

				<!-- Form Container -->
				<form
					method="POST"
					action={actionUrl}
					use:enhance={({ cancel }) => {
						// Pre-submit validation
						if (activeTab === 'review' && (rating < 1 || rating > 5)) {
							formError = t('feedback.errorRatingRequired');
							cancel();
							return;
						}
						if (activeTab === 'feedback' && !category) {
							formError = t('feedback.errorCategoryRequired');
							cancel();
							return;
						}
						const trimmed = content.trim();
						if (!trimmed) {
							formError = t('feedback.errorContentRequired');
							cancel();
							return;
						}
						if (trimmed.length < 3) {
							formError = t('feedback.errorContentMin');
							cancel();
							return;
						}
						if (trimmed.length > 2000) {
							formError = t('feedback.errorContentMax');
							cancel();
							return;
						}

						formError = null;
						isSubmitting = true;

						return async ({ result }) => {
							isSubmitting = false;
							if (result.type === 'success') {
								isSuccess = true;
								successTitle =
									activeTab === 'review'
										? t('feedback.successReviewTitle')
										: t('feedback.successFeedbackTitle');
								successMessage =
									activeTab === 'review'
										? t('feedback.successReviewMessage')
										: t('feedback.successFeedbackMessage');
								onSuccess?.(result.data);
							} else if (result.type === 'failure') {
								const serverData = result.data as Record<string, unknown> | undefined;
								formError = (serverData?.feedbackError as string) || t('feedback.errorGeneric');
							} else {
								formError = t('feedback.errorGeneric');
							}
						};
					}}
					class="flex flex-1 flex-col overflow-y-auto px-6 py-5"
				>
					<!-- Hidden Context Inputs -->
					<input type="hidden" name="type" value={activeTab} />
					<input type="hidden" name="rating" value={rating || ''} />
					<input type="hidden" name="category" value={category || ''} />
					<input type="hidden" name="currentRoute" value={resolvedCurrentRoute} />
					<input type="hidden" name="deviceInfo" value={resolvedDeviceInfo} />

					<!-- Error Alert Banner -->
					{#if formError}
						<div
							role="alert"
							transition:fade={{ duration: 150 }}
							class="mb-4 rounded-2xl border border-alarm-red/20 bg-alarm-red/10 p-3.5 text-sm text-alarm-red dark:border-alarm-red/30 dark:bg-alarm-red/15"
						>
							{formError}
						</div>
					{/if}

					<!-- Tab Panel 1: Review -->
					{#if activeTab === 'review'}
						<div
							role="tabpanel"
							id="panel-review"
							aria-labelledby="tab-review"
							class="flex flex-col space-y-5"
						>
							<div>
								<span
									id="rating-group-label"
									class="dark:text-pebble-light block text-sm font-semibold text-charcoal"
								>
									{t('feedback.ratingLabel')}
									<span class="text-alarm-red">*</span>
								</span>
								<p class="mt-0.5 text-xs text-slate dark:text-pebble">
									{t('feedback.ratingDescription')}
								</p>

								<!-- Star Rating Selector -->
								<div
									role="radiogroup"
									aria-labelledby="rating-group-label"
									class="mt-3 flex items-center space-x-1.5"
								>
									{#each [1, 2, 3, 4, 5] as star (star)}
										{@const isHighlighted = hoveredRating ? star <= hoveredRating : star <= rating}
										<button
											type="button"
											role="radio"
											aria-checked={rating === star}
											aria-label={t('feedback.starRatingAria', {
												rating: star,
												label: getRatingLabel(star)
											})}
											onclick={() => {
												rating = star;
												formError = null;
											}}
											onmouseenter={() => (hoveredRating = star)}
											onmouseleave={() => (hoveredRating = 0)}
											onkeydown={(e) => handleRatingKeyDown(e, star)}
											class="group relative inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-xl p-1.5 transition-transform hover:scale-110 focus-visible:ring-2 focus-visible:ring-forest-ink focus-visible:outline-none dark:focus-visible:ring-lime-voltage"
										>
											<HugeiconsIcon
												icon={StarIcon}
												size={28}
												class="transition-colors {isHighlighted
													? 'fill-amber-400 text-amber-400 dark:fill-lime-voltage dark:text-lime-voltage'
													: 'text-fog dark:text-dark-border'}"
											/>
										</button>
									{/each}
								</div>

								<!-- Rating Text Badge -->
								<div class="mt-2 min-h-6">
									{#if hoveredRating > 0 || rating > 0}
										{@const currentScore = hoveredRating || rating}
										<span
											class="inline-flex items-center rounded-full bg-fog px-3 py-0.5 text-xs font-semibold text-forest-ink dark:bg-dark-card dark:text-lime-voltage"
										>
											{currentScore} / 5 — {getRatingLabel(currentScore)}
										</span>
									{/if}
								</div>
							</div>

							<!-- Review Textarea -->
							<div>
								<label
									for="review-content"
									class="dark:text-pebble-light block text-sm font-semibold text-charcoal"
								>
									{t('feedback.contentReviewLabel')}
									<span class="text-alarm-red">*</span>
								</label>
								<div class="relative mt-2">
									<textarea
										id="review-content"
										name="content"
										rows="4"
										maxlength="2000"
										bind:value={content}
										placeholder={t('feedback.contentReviewPlaceholder')}
										class="w-full rounded-2xl border border-fog bg-paper p-3.5 text-sm text-charcoal placeholder-pebble transition-colors focus:border-forest-ink focus:ring-2 focus:ring-forest-ink/20 focus:outline-none dark:border-dark-border dark:bg-dark-card/50 dark:text-white dark:placeholder-slate dark:focus:border-lime-voltage dark:focus:ring-lime-voltage/20"
									></textarea>
								</div>
								<div class="mt-1 flex justify-end">
									<span class="text-xs text-slate dark:text-pebble">
										{t('feedback.charCount', { count: content.length })}
									</span>
								</div>
							</div>
						</div>
					{:else}
						<!-- Tab Panel 2: Feedback -->
						<div
							role="tabpanel"
							id="panel-feedback"
							aria-labelledby="tab-feedback"
							class="flex flex-col space-y-5"
						>
							<div>
								<span
									id="category-group-label"
									class="dark:text-pebble-light block text-sm font-semibold text-charcoal"
								>
									{t('feedback.categoryLabel')}
									<span class="text-alarm-red">*</span>
								</span>

								<!-- Feedback Category Radio Chips -->
								<div
									role="radiogroup"
									aria-labelledby="category-group-label"
									class="mt-2.5 grid grid-cols-1 gap-2.5 sm:grid-cols-3"
								>
									<!-- Bug Category -->
									<button
										type="button"
										role="radio"
										aria-checked={category === 'bug'}
										onclick={() => {
											category = 'bug';
											formError = null;
										}}
										class="flex cursor-pointer flex-col items-start rounded-2xl border p-3 text-left transition-all focus-visible:ring-2 focus-visible:ring-forest-ink focus-visible:outline-none dark:focus-visible:ring-lime-voltage {category ===
										'bug'
											? 'border-forest-ink bg-linen-mist/50 dark:border-lime-voltage dark:bg-dark-card'
											: 'border-fog bg-paper hover:bg-fog/40 dark:border-dark-border dark:bg-dark-card/40 dark:hover:bg-dark-card'}"
									>
										<div
											class="mb-1.5 flex h-7 w-7 items-center justify-center rounded-lg {category ===
											'bug'
												? 'bg-forest-ink text-paper dark:bg-lime-voltage dark:text-dark-canvas'
												: 'bg-fog text-slate dark:bg-dark-border dark:text-pebble'}"
										>
											<HugeiconsIcon icon={Bug01Icon} size={15} />
										</div>
										<span
											class="text-xs font-bold {category === 'bug'
												? 'text-forest-ink dark:text-lime-voltage'
												: 'dark:text-pebble-light text-charcoal'}"
										>
											{t('feedback.categoryBug')}
										</span>
										<span class="mt-0.5 line-clamp-1 text-[11px] text-slate dark:text-pebble">
											{t('feedback.categoryBugDesc')}
										</span>
									</button>

									<!-- Feature Category -->
									<button
										type="button"
										role="radio"
										aria-checked={category === 'feature'}
										onclick={() => {
											category = 'feature';
											formError = null;
										}}
										class="flex cursor-pointer flex-col items-start rounded-2xl border p-3 text-left transition-all focus-visible:ring-2 focus-visible:ring-forest-ink focus-visible:outline-none dark:focus-visible:ring-lime-voltage {category ===
										'feature'
											? 'border-forest-ink bg-linen-mist/50 dark:border-lime-voltage dark:bg-dark-card'
											: 'border-fog bg-paper hover:bg-fog/40 dark:border-dark-border dark:bg-dark-card/40 dark:hover:bg-dark-card'}"
									>
										<div
											class="mb-1.5 flex h-7 w-7 items-center justify-center rounded-lg {category ===
											'feature'
												? 'bg-forest-ink text-paper dark:bg-lime-voltage dark:text-dark-canvas'
												: 'bg-fog text-slate dark:bg-dark-border dark:text-pebble'}"
										>
											<HugeiconsIcon icon={Idea01Icon} size={15} />
										</div>
										<span
											class="text-xs font-bold {category === 'feature'
												? 'text-forest-ink dark:text-lime-voltage'
												: 'dark:text-pebble-light text-charcoal'}"
										>
											{t('feedback.categoryFeature')}
										</span>
										<span class="mt-0.5 line-clamp-1 text-[11px] text-slate dark:text-pebble">
											{t('feedback.categoryFeatureDesc')}
										</span>
									</button>

									<!-- General Category -->
									<button
										type="button"
										role="radio"
										aria-checked={category === 'general'}
										onclick={() => {
											category = 'general';
											formError = null;
										}}
										class="flex cursor-pointer flex-col items-start rounded-2xl border p-3 text-left transition-all focus-visible:ring-2 focus-visible:ring-forest-ink focus-visible:outline-none dark:focus-visible:ring-lime-voltage {category ===
										'general'
											? 'border-forest-ink bg-linen-mist/50 dark:border-lime-voltage dark:bg-dark-card'
											: 'border-fog bg-paper hover:bg-fog/40 dark:border-dark-border dark:bg-dark-card/40 dark:hover:bg-dark-card'}"
									>
										<div
											class="mb-1.5 flex h-7 w-7 items-center justify-center rounded-lg {category ===
											'general'
												? 'bg-forest-ink text-paper dark:bg-lime-voltage dark:text-dark-canvas'
												: 'bg-fog text-slate dark:bg-dark-border dark:text-pebble'}"
										>
											<HugeiconsIcon icon={Comment01Icon} size={15} />
										</div>
										<span
											class="text-xs font-bold {category === 'general'
												? 'text-forest-ink dark:text-lime-voltage'
												: 'dark:text-pebble-light text-charcoal'}"
										>
											{t('feedback.categoryGeneral')}
										</span>
										<span class="mt-0.5 line-clamp-1 text-[11px] text-slate dark:text-pebble">
											{t('feedback.categoryGeneralDesc')}
										</span>
									</button>
								</div>
							</div>

							<!-- Feedback Textarea -->
							<div>
								<label
									for="feedback-content"
									class="dark:text-pebble-light block text-sm font-semibold text-charcoal"
								>
									{t('feedback.contentFeedbackLabel')}
									<span class="text-alarm-red">*</span>
								</label>
								<div class="relative mt-2">
									<textarea
										id="feedback-content"
										name="content"
										rows="4"
										maxlength="2000"
										bind:value={content}
										placeholder={t('feedback.contentFeedbackPlaceholder')}
										class="w-full rounded-2xl border border-fog bg-paper p-3.5 text-sm text-charcoal placeholder-pebble transition-colors focus:border-forest-ink focus:ring-2 focus:ring-forest-ink/20 focus:outline-none dark:border-dark-border dark:bg-dark-card/50 dark:text-white dark:placeholder-slate dark:focus:border-lime-voltage dark:focus:ring-lime-voltage/20"
									></textarea>
								</div>
								<div class="mt-1 flex justify-end">
									<span class="text-xs text-slate dark:text-pebble">
										{t('feedback.charCount', { count: content.length })}
									</span>
								</div>
							</div>
						</div>
					{/if}

					<!-- Submit Button -->
					<div class="mt-6 flex items-center justify-end space-x-3 pt-3">
						<button
							type="button"
							onclick={closeModal}
							class="dark:text-pebble-light inline-flex h-11 items-center justify-center rounded-full border border-fog bg-paper px-5 text-sm font-semibold text-charcoal transition-colors hover:bg-fog focus-visible:ring-2 focus-visible:ring-forest-ink focus-visible:outline-none dark:border-dark-border dark:bg-dark-card dark:hover:bg-dark-muted dark:focus-visible:ring-lime-voltage"
						>
							{t('feedback.closeButton')}
						</button>
						<button
							type="submit"
							disabled={isSubmitting}
							class="inline-flex h-11 items-center justify-center rounded-full bg-forest-ink px-6 text-sm font-semibold text-paper transition-all hover:bg-spruce focus-visible:ring-2 focus-visible:ring-forest-ink focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60 dark:bg-lime-voltage dark:text-dark-canvas dark:hover:bg-lime-voltage/90 dark:focus-visible:ring-lime-voltage"
						>
							{#if isSubmitting}
								{t('feedback.submitting')}
							{:else if activeTab === 'review'}
								{t('feedback.submitReview')}
							{:else}
								{t('feedback.submitFeedback')}
							{/if}
						</button>
					</div>
				</form>
			{/if}
		</div>
	</div>
{/if}
