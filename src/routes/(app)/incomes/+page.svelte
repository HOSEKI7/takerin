<script lang="ts">
	import type { PageProps } from './$types.js';
	import { untrack } from 'svelte';
	import { enhance } from '$app/forms';
	import { t } from '#lib/i18n/index.js';
	import { formatRupiah, calculateTotalIncome } from '#lib/validation/onboarding.js';
	import Button from '#lib/components/Button.svelte';
	import Card from '#lib/components/Card.svelte';
	import Badge from '#lib/components/Badge.svelte';
	import Input from '#lib/components/Input.svelte';
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import {
		Coins01Icon,
		PlusSignIcon,
		Delete02Icon,
		LockKeyIcon,
		Alert02Icon,
		CheckmarkCircle02Icon,
		InformationCircleIcon
	} from '@hugeicons/core-free-icons';

	interface SourceRow {
		id: string;
		name: string;
		amount: number | string;
	}

	interface FieldErrors {
		name?: string;
		amount?: string;
	}

	let { data, form }: PageProps = $props();

	function generateSourceId(): string {
		return 'src-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7);
	}

	function initializeSources(raw: Array<{ id?: string; name: string; amount: number }>): SourceRow[] {
		if (raw && raw.length > 0) {
			return raw.map((s) => ({
				id: s.id || generateSourceId(),
				name: s.name,
				amount: s.amount
			}));
		}
		return [{ id: generateSourceId(), name: '', amount: '' }];
	}

	// Interactive form state for editable mode
	let sources = $state<SourceRow[]>(untrack(() => initializeSources(data.incomeSources)));
	let isSaving = $state(false);
	let saveSuccess = $state(false);
	let localGeneralError = $state<string | null>(null);
	let rowErrors = $state<Record<string, FieldErrors>>({});

	// Reactive calculation of total monthly income
	const totalIncome = $derived(calculateTotalIncome(sources));
	const formattedTotal = $derived(formatRupiah(totalIncome));

	// Validation helpers
	const hasEmptyNames = $derived(sources.some((s) => !s.name || s.name.trim().length === 0));
	const hasInvalidAmounts = $derived(
		sources.some((s) => {
			const n = Number(s.amount);
			return isNaN(n) || n <= 0;
		})
	);
	const canSave = $derived(
		sources.length > 0 && !hasEmptyNames && !hasInvalidAmounts && !isSaving && !data.isLocked
	);

	const normalizedSources = $derived(
		sources.map((s) => ({
			name: s.name.trim(),
			amount: Math.round(Number(s.amount) || 0)
		}))
	);

	function handleAddSource() {
		sources = [...sources, { id: generateSourceId(), name: '', amount: '' }];
		saveSuccess = false;
		localGeneralError = null;
	}

	function handleRemoveSource(id: string) {
		if (sources.length <= 1) return;
		sources = sources.filter((s) => s.id !== id);
		const newErrors = { ...rowErrors };
		delete newErrors[id];
		rowErrors = newErrors;
		saveSuccess = false;
		localGeneralError = null;
	}

	function clearFieldError(id: string, field: 'name' | 'amount') {
		if (rowErrors[id]?.[field]) {
			const current = { ...rowErrors[id] };
			delete current[field];
			rowErrors = { ...rowErrors, [id]: current };
		}
		if (localGeneralError) {
			localGeneralError = null;
		}
		saveSuccess = false;
	}

	function validateAll(): boolean {
		const errors: Record<string, FieldErrors> = {};
		let hasError = false;

		if (sources.length === 0) {
			localGeneralError = t('incomes.minOneSource');
			return false;
		}

		for (const s of sources) {
			const rowErr: FieldErrors = {};
			if (!s.name || s.name.trim().length === 0) {
				rowErr.name = t('incomes.errorNameRequired');
				hasError = true;
			} else if (s.name.trim().length > 100) {
				rowErr.name = t('incomes.errorNameTooLong');
				hasError = true;
			}
			const amt = Number(s.amount);
			if (isNaN(amt) || s.amount === '') {
				rowErr.amount = t('incomes.errorAmountInvalid');
				hasError = true;
			} else if (amt <= 0) {
				rowErr.amount = t('incomes.errorAmountPositive');
				hasError = true;
			}
			if (rowErr.name || rowErr.amount) {
				errors[s.id] = rowErr;
			}
		}

		rowErrors = errors;
		return !hasError;
	}
</script>

<div class="mx-auto w-full max-w-4xl space-y-6 px-4 py-6 sm:px-6 md:py-8 font-sans">
	<!-- Page Header -->
	<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
		<div class="space-y-1">
			<div class="flex items-center gap-2.5">
				<div class="flex h-10 w-10 items-center justify-center rounded-xl bg-lime-voltage/20 text-forest-ink dark:text-lime-voltage">
					<HugeiconsIcon icon={Coins01Icon} class="h-6 w-6" />
				</div>
				<h1 class="font-heading text-2xl font-bold tracking-tight text-obsidian sm:text-3xl dark:text-paper">
					{t('incomes.title')}
				</h1>
			</div>
			<p class="text-sm text-slate dark:text-pebble">
				{t('incomes.subtitle')}
			</p>
		</div>

		<!-- Status Badge -->
		<div>
			{#if data.isLocked}
				<Badge variant="neutral" class="px-3.5 py-1.5 text-xs font-semibold">
					<HugeiconsIcon icon={LockKeyIcon} class="h-3.5 w-3.5 text-alarm-red dark:text-red-400" />
					{t('incomes.lockBadge')}
				</Badge>
			{:else}
				<Badge variant="lime" class="px-3.5 py-1.5 text-xs font-semibold">
					<HugeiconsIcon icon={Coins01Icon} class="h-3.5 w-3.5 text-forest-ink" />
					{t('incomes.activeBadge')}
				</Badge>
			{/if}
		</div>
	</div>

	<!-- Locked Banner (When H-1 cutoff has passed or period completed) -->
	{#if data.isLocked}
		<Card variant="muted" class="border-alarm-red/30 bg-alarm-red/5 p-4 sm:p-5 dark:border-alarm-red/40 dark:bg-alarm-red/10">
			<div class="flex items-start gap-3.5">
				<div class="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-alarm-red/10 text-alarm-red dark:bg-alarm-red/20">
					<HugeiconsIcon icon={Alert02Icon} class="h-5 w-5" />
				</div>
				<div class="space-y-1">
					<h3 class="font-heading text-base font-semibold text-obsidian dark:text-paper">
						{t('incomes.bannerLockedTitle')}
					</h3>
					<p class="text-xs sm:text-sm leading-relaxed text-charcoal dark:text-pebble">
						{#if data.lockReason === 'h_minus_1_passed'}
							{t('incomes.bannerLockedH1', { endDate: data.activePeriod?.endDate ?? '' })}
						{:else if data.lockReason === 'period_completed'}
							{t('incomes.bannerLockedCompleted')}
						{:else}
							{t('incomes.bannerLockedNoActive')}
						{/if}
					</p>
				</div>
			</div>
		</Card>
	{:else if data.activePeriod?.endDate}
		<!-- H-1 Cutoff Notice for Active Period -->
		<div class="flex items-center gap-2.5 rounded-xl border border-fog bg-linen-mist/30 px-4 py-3 text-xs sm:text-sm text-slate dark:border-dark-border dark:bg-dark-card/50 dark:text-pebble">
			<HugeiconsIcon icon={InformationCircleIcon} class="h-4 w-4 shrink-0 text-forest-ink dark:text-lime-voltage" />
			<span>
				{t('incomes.hMinus1Notice', { endDate: data.activePeriod.endDate })}
			</span>
		</div>
	{/if}

	<!-- Inline Server or Local Alerts -->
	{#if saveSuccess || form?.success}
		<div
			role="status"
			class="flex items-center gap-2.5 rounded-xl border border-lime-voltage/40 bg-linen-mist/60 px-4 py-3 text-sm font-medium text-forest-ink dark:border-lime-voltage/30 dark:bg-forest-ink/40 dark:text-lime-voltage"
		>
			<HugeiconsIcon icon={CheckmarkCircle02Icon} class="h-5 w-5 shrink-0" />
			<span>{t('incomes.successSaved')}</span>
		</div>
	{/if}

	{#if localGeneralError || form?.error}
		<div
			role="alert"
			class="flex items-center gap-2.5 rounded-xl border border-alarm-red/40 bg-alarm-red/10 px-4 py-3 text-sm font-medium text-alarm-red dark:border-alarm-red/50 dark:bg-alarm-red/20"
		>
			<HugeiconsIcon icon={Alert02Icon} class="h-5 w-5 shrink-0" />
			<span>{localGeneralError || form?.error}</span>
		</div>
	{/if}

	<!-- READ-ONLY MODE (When Locked) -->
	{#if data.isLocked}
		<div class="space-y-4">
			<Card variant="default" class="p-6">
				<div class="mb-4 flex items-center justify-between border-b border-fog pb-4 dark:border-dark-border">
					<div>
						<h2 class="font-heading text-lg font-bold text-obsidian dark:text-paper">
							{t('incomes.readOnlyCardTitle')}
						</h2>
						<p class="text-xs text-slate dark:text-pebble">
							{t('incomes.readOnlyDescription')}
						</p>
					</div>
					<Badge variant="neutral" class="text-xs">
						{t('incomes.totalSourcesCount', { count: data.incomeSources.length })}
					</Badge>
				</div>

				{#if data.incomeSources.length === 0}
					<p class="py-8 text-center text-sm text-slate dark:text-pebble">
						{t('incomes.emptySources')}
					</p>
				{:else}
					<ul class="divide-y divide-fog/60 dark:divide-dark-border/60">
						{#each data.incomeSources as source, index (source.id ?? index)}
							<li class="flex items-center justify-between py-3.5 first:pt-0 last:pb-0">
								<div class="flex items-center gap-3">
									<div class="flex h-8 w-8 items-center justify-center rounded-lg bg-fog text-slate dark:bg-dark-surface dark:text-pebble">
										<HugeiconsIcon icon={Coins01Icon} class="h-4 w-4" />
									</div>
									<div>
										<p class="font-medium text-obsidian dark:text-paper">
											{source.name}
										</p>
										<p class="text-xs text-slate dark:text-pebble">
											{t('incomes.sourceItem', { index: index + 1 })}
										</p>
									</div>
								</div>
								<div class="text-right">
									<span class="font-heading text-base font-bold text-forest-ink dark:text-lime-voltage">
										{formatRupiah(source.amount)}
									</span>
								</div>
							</li>
						{/each}
					</ul>
				{/if}
			</Card>

			<!-- Total Summary Card -->
			<Card variant="forest" class="p-6">
				<div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
					<div>
						<span class="text-xs font-medium uppercase tracking-wider text-lime-voltage/90">
							{t('incomes.totalMonthlyIncome')}
						</span>
						<p class="font-heading text-3xl font-extrabold text-paper sm:text-4xl">
							{formattedTotal}
						</p>
					</div>
					<div class="text-xs text-linen-mist/80 sm:text-right">
						<span>{t('incomes.totalSourcesCount', { count: data.incomeSources.length })}</span>
					</div>
				</div>
			</Card>
		</div>

	<!-- EDITABLE MODE (Before H-1 Cutoff) -->
	{:else}
		<form
			method="POST"
			action="?/saveIncomes"
			use:enhance={({ cancel }) => {
				if (!validateAll()) {
					cancel();
					return;
				}
				isSaving = true;
				saveSuccess = false;
				localGeneralError = null;

				return async ({ result, update }) => {
					isSaving = false;
					if (result.type === 'success') {
						saveSuccess = true;
					}
					await update();
				};
			}}
			class="space-y-6"
		>
			<input type="hidden" name="sources" value={JSON.stringify(normalizedSources)} />

			<!-- Sources Form List -->
			<Card variant="default" class="p-5 sm:p-6 space-y-4">
				<div class="flex items-center justify-between border-b border-fog pb-4 dark:border-dark-border">
					<div>
						<h2 class="font-heading text-lg font-bold text-obsidian dark:text-paper">
							{t('incomes.sourcesSectionTitle')}
						</h2>
						<p class="text-xs text-slate dark:text-pebble">
							{t('incomes.totalSourcesCount', { count: sources.length })}
						</p>
					</div>

					<Button
						type="button"
						variant="secondary"
						size="sm"
						onclick={handleAddSource}
						class="flex items-center gap-1.5"
					>
						<HugeiconsIcon icon={PlusSignIcon} class="h-4 w-4" />
						<span>{t('incomes.addSource')}</span>
					</Button>
				</div>

				<div class="space-y-4 pt-2">
					{#each sources as source, index (source.id)}
						<div class="group relative rounded-xl border border-fog/80 bg-fog/30 p-4 transition-colors hover:border-slate/40 dark:border-dark-border/80 dark:bg-dark-surface/40 dark:hover:border-pebble/40">
							<div class="mb-3 flex items-center justify-between">
								<span class="text-xs font-semibold uppercase tracking-wider text-slate dark:text-pebble">
									{t('incomes.sourceItem', { index: index + 1 })}
								</span>

								{#if sources.length > 1}
									<button
										type="button"
										onclick={() => handleRemoveSource(source.id)}
										title={t('incomes.removeSource')}
										aria-label={t('incomes.removeSourceAria', { name: source.name || (index + 1).toString() })}
										class="rounded-lg p-1.5 text-slate transition-colors hover:bg-alarm-red/10 hover:text-alarm-red dark:text-pebble dark:hover:bg-alarm-red/20"
									>
										<HugeiconsIcon icon={Delete02Icon} class="h-4 w-4" />
									</button>
								{/if}
							</div>

							<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
								<Input
									id={`source-name-${source.id}`}
									label={t('incomes.nameLabel')}
									placeholder={t('incomes.namePlaceholder')}
									bind:value={source.name}
									error={rowErrors[source.id]?.name}
									oninput={() => clearFieldError(source.id, 'name')}
									maxlength={100}
								/>

								<Input
									id={`source-amount-${source.id}`}
									type="number"
									min="1"
									label={t('incomes.amountLabel')}
									placeholder={t('incomes.amountPlaceholder')}
									bind:value={source.amount}
									error={rowErrors[source.id]?.amount}
									oninput={() => clearFieldError(source.id, 'amount')}
								/>
							</div>
						</div>
					{/each}
				</div>

				<div class="pt-2">
					<Button
						type="button"
						variant="secondary"
						size="sm"
						onclick={handleAddSource}
						class="w-full flex items-center justify-center gap-1.5 py-2.5"
					>
						<HugeiconsIcon icon={PlusSignIcon} class="h-4 w-4" />
						<span>{t('incomes.addSource')}</span>
					</Button>
				</div>
			</Card>

			<!-- Reactive Summary & Submit Action Card -->
			<Card variant="forest" class="p-6">
				<div class="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
					<div class="space-y-1">
						<span class="text-xs font-medium uppercase tracking-wider text-lime-voltage/90">
							{t('incomes.totalMonthlyIncome')}
						</span>
						<p class="font-heading text-3xl font-extrabold text-paper sm:text-4xl">
							{formattedTotal}
						</p>
						<p class="text-xs text-linen-mist/70">
							{t('incomes.totalSourcesCount', { count: sources.length })}
						</p>
					</div>

					<div>
						<Button
							type="submit"
							variant="primary"
							size="lg"
							disabled={isSaving || !canSave}
							class="w-full sm:w-auto px-8"
						>
							{#if isSaving}
								<span class="inline-block h-4 w-4 animate-spin rounded-full border-2 border-forest-ink border-t-transparent"></span>
								<span>{t('incomes.saving')}</span>
							{:else}
								<span>{t('incomes.saveChanges')}</span>
							{/if}
						</Button>
					</div>
				</div>
			</Card>
		</form>
	{/if}
</div>
