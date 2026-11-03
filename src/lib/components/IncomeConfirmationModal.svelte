<script lang="ts">
	import { untrack } from 'svelte';
	import { fade, scale } from 'svelte/transition';
	import { enhance } from '$app/forms';
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import {
		Add01Icon,
		Delete02Icon,
		CheckmarkCircle02Icon,
		Coins01Icon
	} from '@hugeicons/core-free-icons';
	import { t, getLocale } from '#lib/i18n/index.js';
	import {
		formatRupiah,
		calculateTotalIncome,
		validateIncomeSources
	} from '#lib/validation/onboarding.js';

	export interface IncomeSourceItem {
		id?: string;
		name: string;
		amount: number | string;
	}

	interface Props {
		isOpen?: boolean;
		initialSources?: IncomeSourceItem[];
		actionUrl?: string;
		isSubmitting?: boolean;
		onConfirm?: (sources: Array<{ name: string; amount: number }>) => void | Promise<void>;
	}

	let {
		isOpen = false,
		initialSources = [],
		actionUrl = '?/confirmIncome',
		isSubmitting: externalSubmitting = false,
		onConfirm
	}: Props = $props();

	interface SourceState {
		id: string;
		name: string;
		amount: number | string;
	}

	function generateSourceId(): string {
		return 'src-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7);
	}

	function initializeSources(sources: IncomeSourceItem[]): SourceState[] {
		if (sources && sources.length > 0) {
			return sources.map((s) => ({
				id: s.id || generateSourceId(),
				name: s.name,
				amount: s.amount
			}));
		}
		return [{ id: generateSourceId(), name: '', amount: '' }];
	}

	let sources = $state<SourceState[]>(untrack(() => initializeSources(initialSources)));
	let validationError = $state<string | null>(null);
	let internalSubmitting = $state(false);
	let modalContainer = $state<HTMLElement | null>(null);

	// Sync when initialSources changes and modal opens
	$effect(() => {
		if (isOpen) {
			sources = initializeSources(initialSources);
			validationError = null;
		}
	});

	const isBusy = $derived(externalSubmitting || internalSubmitting);

	const totalIncome = $derived(calculateTotalIncome(sources));

	const serializedSources = $derived(
		JSON.stringify(
			sources.map((s) => ({
				name: s.name.trim(),
				amount: Math.round(Number(s.amount) || 0)
			}))
		)
	);

	function handleAddSource() {
		validationError = null;
		sources = [
			...sources,
			{
				id: generateSourceId(),
				name: '',
				amount: ''
			}
		];
	}

	function handleRemoveSource(index: number) {
		if (sources.length <= 1) {
			validationError = t('incomeConfirmation.minOneSource');
			return;
		}
		validationError = null;
		sources = sources.filter((_, i) => i !== index);
	}

	function handleKeydown(e: KeyboardEvent) {
		if (!isOpen) return;

		// Non-dismissible: block Escape key
		if (e.key === 'Escape') {
			e.preventDefault();
			e.stopPropagation();
			return;
		}

		// Focus trap
		if (e.key === 'Tab' && modalContainer) {
			const focusable = modalContainer.querySelectorAll<HTMLElement>(
				'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
			);
			if (focusable.length === 0) return;

			const first = focusable[0];
			const last = focusable[focusable.length - 1];

			if (e.shiftKey && document.activeElement === first) {
				e.preventDefault();
				last.focus();
			} else if (!e.shiftKey && document.activeElement === last) {
				e.preventDefault();
				first.focus();
			}
		}
	}

	// Focus management and body scroll locking
	$effect(() => {
		if (typeof document !== 'undefined' && isOpen) {
			const originalOverflow = document.body.style.overflow;
			document.body.style.overflow = 'hidden';

			// Focus first interactive element or dialog container
			requestAnimationFrame(() => {
				const firstInput = modalContainer?.querySelector<HTMLElement>(
					'input:not([disabled]), button:not([disabled])'
				);
				firstInput?.focus();
			});

			return () => {
				document.body.style.overflow = originalOverflow;
			};
		}
	});
</script>

<svelte:window onkeydown={handleKeydown} />

{#if isOpen}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
		role="presentation"
		data-testid="income-confirmation-gate"
	>
		<!-- Non-dismissible Backdrop Overlay -->
		<div
			data-testid="income-confirmation-backdrop"
			transition:fade={{ duration: 200 }}
			class="fixed inset-0 h-full w-full bg-obsidian/75 backdrop-blur-sm"
			aria-hidden="true"
		></div>

		<!-- Accessible Alert Dialog Container -->
		<div
			bind:this={modalContainer}
			role="alertdialog"
			aria-modal="true"
			aria-labelledby="income-confirmation-title"
			aria-describedby="income-confirmation-desc"
			transition:scale={{ start: 0.95, duration: 200 }}
			class="relative z-10 flex max-h-[92vh] w-full max-w-xl flex-col overflow-hidden rounded-3xl border border-fog bg-paper shadow-2xl transition-all sm:rounded-[28px] dark:border-dark-border dark:bg-dark-surface"
		>
			<!-- Header Celebration Block -->
			<div
				class="border-b border-fog/80 bg-linear-to-b from-linen-mist/50 to-transparent p-5 text-center sm:p-6 dark:border-dark-border/80 dark:from-dark-card/60"
			>
				<!-- Badge -->
				<div
					class="mb-3 inline-flex items-center gap-1.5 rounded-full bg-linen-mist px-3 py-1 text-xs font-bold text-forest-ink shadow-xs dark:bg-spruce/60 dark:text-lime-voltage"
				>
					<HugeiconsIcon
						icon={Coins01Icon}
						size={14}
						class="text-forest-ink dark:text-lime-voltage"
					/>
					<span>{t('incomeConfirmation.badge')}</span>
				</div>

				<!-- Title & Description -->
				<h2
					id="income-confirmation-title"
					class="font-display text-2xl font-black tracking-tight text-obsidian sm:text-3xl dark:text-white"
				>
					{t('incomeConfirmation.title')}
				</h2>
				<p
					id="income-confirmation-desc"
					class="mx-auto mt-2 max-w-md text-xs leading-relaxed text-slate sm:text-sm dark:text-pebble"
				>
					{t('incomeConfirmation.subtitle')}
				</p>
			</div>

			<!-- Dynamic Multi-Source Form -->
			<form
				method="POST"
				action={actionUrl}
				use:enhance={({ cancel }) => {
					validationError = null;

					// Validate income sources
					const error = validateIncomeSources(sources, getLocale());
					if (error) {
						validationError = error;
						cancel();
						return;
					}

					internalSubmitting = true;

					if (onConfirm) {
						const mapped = sources.map((s) => ({
							name: s.name.trim(),
							amount: Math.round(Number(s.amount) || 0)
						}));
						onConfirm(mapped);
					}

					return async ({ update }) => {
						internalSubmitting = false;
						await update();
					};
				}}
				class="flex flex-1 flex-col overflow-hidden"
			>
				<input type="hidden" name="incomeSources" value={serializedSources} />

				<!-- Scrollable Sources List -->
				<div class="flex-1 space-y-3.5 overflow-y-auto p-5 sm:p-6">
					{#if validationError}
						<div
							role="alert"
							class="rounded-xl border border-alarm-red/20 bg-alarm-red/10 p-3.5 text-xs font-semibold text-alarm-red dark:bg-alarm-red/15 dark:text-red-300"
						>
							{validationError}
						</div>
					{/if}

					<div class="flex items-center justify-between">
						<span class="text-xs font-bold tracking-wider text-slate uppercase dark:text-pebble">
							{t('incomeConfirmation.sourcesHeading')}
						</span>
						<span class="text-xs font-medium text-slate dark:text-pebble">
							{t('incomeConfirmation.totalSourcesCount', { count: sources.length })}
						</span>
					</div>

					<div class="space-y-3">
						{#each sources as source, index (source.id)}
							<div
								class="relative rounded-[10px] border border-fog bg-fog/30 p-3.5 transition-colors sm:p-4 dark:border-dark-border dark:bg-dark-card/40"
							>
								<div class="mb-2.5 flex items-center justify-between">
									<span
										class="text-[11px] font-bold tracking-wider text-forest-ink uppercase dark:text-lime-voltage"
									>
										{t('incomeConfirmation.sourceItem', { index: index + 1 })}
									</span>

									<!-- Remove Source Button (Disabled when only 1 source remains) -->
									<button
										type="button"
										onclick={() => handleRemoveSource(index)}
										disabled={sources.length <= 1 || isBusy}
										aria-label={t('incomeConfirmation.removeSourceAria', {
											name: source.name || t('incomeConfirmation.nameLabel')
										})}
										class="inline-flex h-7 w-7 items-center justify-center rounded-full text-slate transition hover:bg-alarm-red/10 hover:text-alarm-red focus-visible:ring-2 focus-visible:ring-forest-ink focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-30 dark:text-pebble dark:hover:bg-alarm-red/20 dark:hover:text-red-400 dark:focus-visible:ring-lime-voltage"
									>
										<HugeiconsIcon icon={Delete02Icon} size={15} />
									</button>
								</div>

								<div class="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
									<!-- Name Input -->
									<div class="flex flex-col gap-1">
										<label
											for="source-name-{source.id}"
											class="text-xs font-medium text-charcoal dark:text-linen-mist"
										>
											{t('incomeConfirmation.nameLabel')}
										</label>
										<input
											id="source-name-{source.id}"
											type="text"
											bind:value={source.name}
											disabled={isBusy}
											placeholder={t('incomeConfirmation.namePlaceholder')}
											class="w-full rounded-lg border border-pebble bg-paper px-3 py-2 text-sm text-obsidian transition placeholder:text-pebble focus:border-forest-ink focus:ring-1 focus:ring-forest-ink focus:outline-none disabled:opacity-50 dark:border-dark-border dark:bg-dark-surface dark:text-paper dark:placeholder:text-pebble/60 dark:focus:border-lime-voltage dark:focus:ring-lime-voltage"
										/>
									</div>

									<!-- Amount Input -->
									<div class="flex flex-col gap-1">
										<label
											for="source-amount-{source.id}"
											class="text-xs font-medium text-charcoal dark:text-linen-mist"
										>
											{t('incomeConfirmation.amountLabel')}
										</label>
										<input
											id="source-amount-{source.id}"
											type="number"
											min="1"
											step="1"
											bind:value={source.amount}
											disabled={isBusy}
											placeholder={t('incomeConfirmation.amountPlaceholder')}
											class="w-full rounded-lg border border-pebble bg-paper px-3 py-2 text-sm text-obsidian tabular-nums transition placeholder:text-pebble focus:border-forest-ink focus:ring-1 focus:ring-forest-ink focus:outline-none disabled:opacity-50 dark:border-dark-border dark:bg-dark-surface dark:text-paper dark:placeholder:text-pebble/60 dark:focus:border-lime-voltage dark:focus:ring-lime-voltage"
										/>
									</div>
								</div>
							</div>
						{/each}
					</div>

					<!-- Add Source Button -->
					<button
						type="button"
						onclick={handleAddSource}
						disabled={isBusy}
						class="inline-flex w-full items-center justify-center gap-1.5 rounded-full border border-dashed border-pebble bg-transparent py-2.5 text-xs font-bold text-forest-ink transition hover:border-forest-ink hover:bg-linen-mist/30 focus-visible:ring-2 focus-visible:ring-forest-ink focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 dark:border-dark-border dark:text-lime-voltage dark:hover:border-lime-voltage dark:hover:bg-dark-card/50 dark:focus-visible:ring-lime-voltage"
					>
						<HugeiconsIcon icon={Add01Icon} size={15} />
						<span>{t('incomeConfirmation.addSource')}</span>
					</button>

					<!-- Total Calculation Preview Card -->
					<div
						class="mt-2 flex items-center justify-between rounded-2xl border border-forest-ink/10 bg-linen-mist/40 p-4 dark:border-spruce dark:bg-dark-card/70"
					>
						<div class="flex flex-col">
							<span
								class="text-xs font-bold tracking-wide text-forest-ink uppercase dark:text-lime-voltage"
							>
								{t('incomeConfirmation.totalLabel')}
							</span>
							<span class="text-xs text-slate dark:text-pebble">
								{t('incomeConfirmation.totalSourcesCount', { count: sources.length })}
							</span>
						</div>
						<span
							data-testid="income-confirmation-total"
							class="font-display text-xl font-black text-forest-ink tabular-nums sm:text-2xl dark:text-lime-voltage"
						>
							{formatRupiah(totalIncome)}
						</span>
					</div>
				</div>

				<!-- Footer Action Block -->
				<div
					class="border-t border-fog bg-paper p-4 sm:p-5 dark:border-dark-border dark:bg-dark-surface"
				>
					<button
						type="submit"
						disabled={isBusy}
						class="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-lime-voltage px-6 py-3 text-sm font-bold text-forest-ink shadow-md transition hover:brightness-95 focus-visible:ring-2 focus-visible:ring-forest-ink focus-visible:outline-none active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 sm:text-base dark:shadow-none dark:focus-visible:ring-lime-voltage"
					>
						{#if isBusy}
							<span
								class="inline-block h-4 w-4 animate-spin rounded-full border-2 border-forest-ink border-t-transparent"
							></span>
							<span>{t('incomeConfirmation.submitting')}</span>
						{:else}
							<HugeiconsIcon icon={CheckmarkCircle02Icon} size={18} />
							<span>{t('incomeConfirmation.submit')}</span>
						{/if}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}
