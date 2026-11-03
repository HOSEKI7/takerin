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
	import { t } from '#lib/i18n/index.js';
	import { formatRupiah, calculateTotalIncome } from '#lib/validation/onboarding.js';

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

	type SourceState = Required<Pick<IncomeSourceItem, 'id' | 'name' | 'amount'>>;

	interface FieldErrors {
		name?: string;
		amount?: string;
	}

	function generateSourceId(): string {
		return 'src-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7);
	}

	function initializeSources(sourcesList: IncomeSourceItem[]): SourceState[] {
		if (sourcesList && sourcesList.length > 0) {
			return sourcesList.map((s) => ({
				id: s.id || generateSourceId(),
				name: s.name,
				amount: s.amount
			}));
		}
		return [{ id: generateSourceId(), name: '', amount: '' }];
	}

	function normalizeSources(items: SourceState[]): Array<{ name: string; amount: number }> {
		return items.map((s) => ({
			name: s.name.trim(),
			amount: Math.round(Number(s.amount) || 0)
		}));
	}

	let sources = $state<SourceState[]>(untrack(() => initializeSources(initialSources)));
	let rowErrors = $state<Record<string, FieldErrors>>({});
	let formError = $state<string | null>(null);
	let internalSubmitting = $state(false);
	let modalContainer = $state<HTMLElement | null>(null);

	// Synchronize on modal opening transition (false -> true) only, preserving active user typing
	let wasOpen = false;
	$effect(() => {
		if (isOpen && !wasOpen) {
			sources = untrack(() => initializeSources(initialSources));
			rowErrors = {};
			formError = null;
		}
		wasOpen = isOpen;
	});

	const isBusy = $derived(externalSubmitting || internalSubmitting);

	const totalIncome = $derived(calculateTotalIncome(sources));

	const serializedSources = $derived(JSON.stringify(normalizeSources(sources)));

	function clearFieldError(id: string, field: 'name' | 'amount') {
		if (rowErrors[id]?.[field]) {
			delete rowErrors[id][field];
		}
		if (formError) {
			formError = null;
		}
	}

	function validateAll(): boolean {
		const errors: Record<string, FieldErrors> = {};
		let hasError = false;

		if (sources.length === 0) {
			formError = t('incomeConfirmation.minOneSource');
			return false;
		}

		for (const source of sources) {
			const sourceErrors: FieldErrors = {};
			const trimmed = source.name ? source.name.trim() : '';

			if (!trimmed) {
				sourceErrors.name = t('incomeConfirmation.errorNameRequired');
				hasError = true;
			}

			if (source.amount === '' || source.amount === null || source.amount === undefined) {
				sourceErrors.amount = t('incomeConfirmation.errorAmountInvalid');
				hasError = true;
			} else {
				const num = Number(source.amount);
				if (Number.isNaN(num)) {
					sourceErrors.amount = t('incomeConfirmation.errorAmountInvalid');
					hasError = true;
				} else if (num <= 0) {
					sourceErrors.amount = t('incomeConfirmation.errorAmountPositive');
					hasError = true;
				}
			}

			if (sourceErrors.name || sourceErrors.amount) {
				errors[source.id] = sourceErrors;
			}
		}

		rowErrors = errors;
		return !hasError;
	}

	function handleAddSource() {
		formError = null;
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
			formError = t('incomeConfirmation.minOneSource');
			return;
		}
		formError = null;
		const removedId = sources[index].id;
		delete rowErrors[removedId];
		sources = sources.filter((_, i) => i !== index);

		// Prevent focus leak when deleted button is unmounted from DOM
		requestAnimationFrame(() => {
			const remainingInteractive = modalContainer?.querySelectorAll<HTMLElement>(
				'button:not([disabled]), input:not([disabled])'
			);
			if (remainingInteractive && remainingInteractive.length > 0) {
				const targetIndex = Math.min(index, remainingInteractive.length - 1);
				remainingInteractive[targetIndex]?.focus();
			}
		});
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
			<!-- Header Celebration Block (Flat design, no gradient, no drop shadow) -->
			<div
				class="border-b border-fog/80 bg-linen-mist/30 p-5 text-center sm:p-6 dark:border-dark-border/80 dark:bg-dark-card/50"
			>
				<!-- Badge -->
				<div
					class="mb-3 inline-flex items-center gap-1.5 rounded-full bg-linen-mist px-3 py-1 text-xs font-bold text-forest-ink dark:bg-spruce/60 dark:text-lime-voltage"
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
					class="font-display text-2xl font-black tracking-tight text-obsidian sm:text-3xl dark:text-paper"
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
					formError = null;

					// Execute field-level inline validation
					const isValid = validateAll();
					if (!isValid) {
						cancel();
						return;
					}

					if (onConfirm) {
						onConfirm(normalizeSources(sources));
						cancel();
						return;
					}

					internalSubmitting = true;

					return async ({ update }) => {
						internalSubmitting = false;
						await update({ reset: false });
					};
				}}
				class="flex flex-1 flex-col overflow-hidden"
			>
				<input type="hidden" name="incomeSources" value={serializedSources} />

				<!-- Scrollable Sources List -->
				<div class="flex-1 space-y-3.5 overflow-y-auto p-5 sm:p-6">
					{#if formError}
						<div
							role="alert"
							class="rounded-xl border border-alarm-red/20 bg-alarm-red/10 p-3.5 text-xs font-semibold text-alarm-red dark:bg-alarm-red/15 dark:text-alarm-red"
						>
							{formError}
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
							{@const errors = rowErrors[source.id]}
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
										class="inline-flex h-7 w-7 items-center justify-center rounded-full text-slate transition hover:bg-alarm-red/10 hover:text-alarm-red focus-visible:ring-2 focus-visible:ring-forest-ink focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-30 dark:text-pebble dark:hover:bg-alarm-red/20 dark:hover:text-alarm-red dark:focus-visible:ring-lime-voltage"
									>
										<HugeiconsIcon icon={Delete02Icon} size={15} />
									</button>
								</div>

								<div class="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
									<!-- Name Input with Inline Validation -->
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
											oninput={() => clearFieldError(source.id, 'name')}
											disabled={isBusy}
											placeholder={t('incomeConfirmation.namePlaceholder')}
											aria-invalid={errors?.name ? 'true' : undefined}
											aria-describedby={errors?.name ? `source-name-error-${source.id}` : undefined}
											class="w-full rounded-[10px] border px-3 py-2 text-sm text-obsidian transition placeholder:text-pebble focus:ring-1 focus:outline-none disabled:opacity-50 dark:bg-dark-surface dark:text-paper dark:placeholder:text-pebble/60 {errors?.name
												? 'border-alarm-red focus:border-alarm-red focus:ring-alarm-red'
												: 'border-pebble focus:border-forest-ink focus:ring-forest-ink dark:border-dark-border dark:focus:border-lime-voltage dark:focus:ring-lime-voltage'}"
										/>
										{#if errors?.name}
											<p
												id="source-name-error-{source.id}"
												class="text-[11px] font-semibold text-alarm-red dark:text-alarm-red"
											>
												{errors.name}
											</p>
										{/if}
									</div>

									<!-- Amount Input with Inline Validation -->
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
											oninput={() => clearFieldError(source.id, 'amount')}
											disabled={isBusy}
											placeholder={t('incomeConfirmation.amountPlaceholder')}
											aria-invalid={errors?.amount ? 'true' : undefined}
											aria-describedby={errors?.amount
												? `source-amount-error-${source.id}`
												: undefined}
											class="w-full rounded-[10px] border px-3 py-2 text-sm text-obsidian tabular-nums transition placeholder:text-pebble focus:ring-1 focus:outline-none disabled:opacity-50 dark:bg-dark-surface dark:text-paper dark:placeholder:text-pebble/60 {errors?.amount
												? 'border-alarm-red focus:border-alarm-red focus:ring-alarm-red'
												: 'border-pebble focus:border-forest-ink focus:ring-forest-ink dark:border-dark-border dark:focus:border-lime-voltage dark:focus:ring-lime-voltage'}"
										/>
										{#if errors?.amount}
											<p
												id="source-amount-error-{source.id}"
												class="text-[11px] font-semibold text-alarm-red dark:text-alarm-red"
											>
												{errors.amount}
											</p>
										{/if}
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

				<!-- Footer Action Block (Flat pill button, no shadow) -->
				<div
					class="border-t border-fog bg-paper p-4 sm:p-5 dark:border-dark-border dark:bg-dark-surface"
				>
					<button
						type="submit"
						disabled={isBusy}
						class="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-lime-voltage px-6 py-3 text-sm font-bold text-forest-ink transition hover:brightness-95 focus-visible:ring-2 focus-visible:ring-forest-ink focus-visible:outline-none active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 sm:text-base dark:focus-visible:ring-lime-voltage"
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
