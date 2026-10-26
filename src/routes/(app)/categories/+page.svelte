<script lang="ts">
	import type { PageProps } from './$types.js';
	import Button from '#lib/components/Button.svelte';
	import Card from '#lib/components/Card.svelte';
	import ProgressBar from '#lib/components/ProgressBar.svelte';
	import { untrack } from 'svelte';
	import type { CategoryManagementItem } from '#lib/server/db/category.js';
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import { formatRupiah, formatDate } from '#lib/validation/onboarding.js';
	import { redistributePercentage } from '#lib/validation/category.js';
	import { t, getLocale } from '#lib/i18n/index.js';
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import {
		PlusSignIcon,
		Delete02Icon,
		PiggyBankIcon,
		Wallet01Icon,
		Alert02Icon,
		CheckmarkCircle02Icon
	} from '@hugeicons/core-free-icons';

	interface CategoryFormState {
		id?: string;
		name: string;
		percentage: number;
		isSavings: boolean;
		spent?: number;
		balance?: number;
	}

	let { data, form }: PageProps = $props();

	// Active categories in local state for editing
	let categories = $state<CategoryFormState[]>(
		untrack(() =>
			data.activeCategories.map((c) => ({
				id: c.id,
				name: c.name,
				percentage: Number(c.percentage),
				isSavings: Boolean(c.isSavings),
				spent: c.spent,
				balance: c.balance
			}))
		)
	);

	// Categories marked to be frozen during this session
	let freezeCategoryIds = $state<string[]>([]);
	let frozenCategories = $state<CategoryManagementItem[]>(
		untrack(() => data.frozenCategories ?? [])
	);

	let isSaving = $state(false);

	// Total percentage computed reactive state
	const totalPercentage = $derived(
		Math.round(
			categories.reduce(
				(acc, cat) => acc + (Number.isFinite(cat.percentage) ? cat.percentage : 0),
				0
			) * 100
		) / 100
	);

	const isExactly100 = $derived(Math.abs(totalPercentage - 100) < 0.001);
	const differenceFrom100 = $derived(Math.round((100 - totalPercentage) * 100) / 100);

	const hasEmptyNames = $derived(categories.some((c) => c.name.trim().length === 0));
	const hasInvalidPercentages = $derived(categories.some((c) => c.percentage <= 0));
	const canSave = $derived(
		isExactly100 && !hasEmptyNames && !hasInvalidPercentages && categories.length > 0 && !isSaving
	);

	// --- ADD CATEGORY MODAL STATE ---
	let showAddModal = $state(false);
	let newCatName = $state('');
	let newCatPercentage = $state<number>(10);
	let newCatIsSavings = $state(false);
	let addErrorMessage = $state('');
	let addReductionMode = $state<'auto' | 'manual'>('auto');
	let manualReductions = $state<Record<string, number>>({});

	function openAddModal() {
		newCatName = '';
		newCatIsSavings = false;
		addErrorMessage = '';
		addReductionMode = 'auto';

		// Suggest an initial percentage: if total < 100%, suggest the gap; otherwise 10%
		if (differenceFrom100 > 0) {
			newCatPercentage = differenceFrom100;
		} else {
			newCatPercentage = 10;
		}

		// Initialize manual reductions evenly
		const allocMap: Record<string, number> = {};
		const share =
			categories.length > 0 ? Math.round((newCatPercentage / categories.length) * 100) / 100 : 0;
		categories.forEach((c) => {
			const key = c.id || c.name;
			allocMap[key] = share;
		});
		manualReductions = allocMap;

		showAddModal = true;
	}

	function confirmAddCategory() {
		addErrorMessage = '';
		const trimmedName = newCatName.trim();
		if (!trimmedName) {
			addErrorMessage = t('categories.addErrorNameRequired');
			return;
		}
		if (newCatPercentage <= 0 || newCatPercentage >= 100) {
			addErrorMessage = t('categories.addErrorPercentRange');
			return;
		}

		if (categories.length > 0) {
			if (addReductionMode === 'auto') {
				// Proportional downscale of existing categories
				const currentSum = categories.reduce((acc, c) => acc + c.percentage, 0);
				const targetRemainingSum = 100 - newCatPercentage;

				if (targetRemainingSum <= 0) {
					addErrorMessage = t('categories.addErrorPercentTooLarge');
					return;
				}

				let accumulated = 0;
				categories = categories.map((c, idx) => {
					if (idx === categories.length - 1) {
						const finalPct = Math.round((targetRemainingSum - accumulated) * 100) / 100;
						return { ...c, percentage: Math.max(1, finalPct) };
					}
					const proportion = currentSum > 0 ? c.percentage / currentSum : 1 / categories.length;
					const newPct = Math.max(1, Math.round(targetRemainingSum * proportion * 100) / 100);
					accumulated += newPct;
					return { ...c, percentage: newPct };
				});
			} else {
				// Manual reduction check
				const totalReduced = Object.values(manualReductions).reduce(
					(acc, val) => acc + Number(val || 0),
					0
				);
				if (Math.abs(totalReduced - newCatPercentage) > 0.001) {
					addErrorMessage = t('categories.addErrorReductionMismatch', {
						reduced: totalReduced,
						newPercent: newCatPercentage
					});
					return;
				}

				for (const c of categories) {
					const key = c.id || c.name;
					const deduction = Number(manualReductions[key] || 0);
					if (c.percentage - deduction <= 0) {
						addErrorMessage = t('categories.addErrorCategoryExceeded', { name: c.name });
						return;
					}
				}

				categories = categories.map((c) => {
					const key = c.id || c.name;
					const deduction = Number(manualReductions[key] || 0);
					return {
						...c,
						percentage: Math.round((c.percentage - deduction) * 100) / 100
					};
				});
			}
		}

		categories.push({
			id: 'new-' + crypto.randomUUID(),
			name: trimmedName,
			percentage: newCatPercentage,
			isSavings: newCatIsSavings,
			spent: 0,
			balance: Math.round((data.period?.totalIncome ?? 0) * (newCatPercentage / 100))
		});

		showAddModal = false;
	}

	// --- FREEZE CATEGORY MODAL STATE ---
	let showFreezeModal = $state(false);
	let candidateToFreeze = $state<CategoryFormState | null>(null);
	let freezeRedistributeMode = $state<'auto' | 'manual'>('auto');
	let manualAllocations = $state<Record<string, number>>({});
	let freezeErrorMessage = $state('');

	function openFreezeModal(cat: CategoryFormState) {
		if (categories.length <= 1) {
			alert(t('categories.minOneActiveCategory'));
			return;
		}
		candidateToFreeze = cat;
		freezeRedistributeMode = 'auto';
		freezeErrorMessage = '';

		// Initialize manual allocations equally
		const remaining = categories.filter((c) => (c.id || c.name) !== (cat.id || cat.name));
		const initialShare =
			remaining.length > 0 ? Math.round((cat.percentage / remaining.length) * 100) / 100 : 0;
		const allocMap: Record<string, number> = {};
		remaining.forEach((r) => {
			const key = r.id || r.name;
			allocMap[key] = initialShare;
		});
		manualAllocations = allocMap;
		showFreezeModal = true;
	}

	function confirmFreezeCategory() {
		if (!candidateToFreeze) return;
		freezeErrorMessage = '';

		const target = candidateToFreeze;
		const remaining = categories.filter((c) => (c.id || c.name) !== (target.id || target.name));

		if (freezeRedistributeMode === 'auto') {
			// Proportional redistribution using tested helper
			const redistributed = redistributePercentage(remaining, target.percentage);
			categories = redistributed;
		} else {
			// Manual redistribution with exact sum validation
			const totalAdded = Object.values(manualAllocations).reduce(
				(acc, val) => acc + Number(val || 0),
				0
			);
			if (Math.abs(totalAdded - target.percentage) > 0.001) {
				freezeErrorMessage = t('categories.freezeErrorRedistributionMismatch', {
					added: totalAdded,
					targetPercent: target.percentage
				});
				return;
			}

			categories = remaining.map((r) => {
				const key = r.id || r.name;
				const added = Number(manualAllocations[key] || 0);
				return {
					...r,
					percentage: Math.round((r.percentage + added) * 100) / 100
				};
			});
		}

		// If existing in database, mark for freeze in action and preserve allocation
		if (target.id && !target.id.startsWith('new-')) {
			freezeCategoryIds.push(target.id);
			const frozenAllocation = Math.round(
				(data.period?.totalIncome ?? 0) * (target.percentage / 100)
			);
			const frozenSpent = target.spent ?? 0;
			frozenCategories.push({
				id: target.id,
				name: target.name,
				percentage: target.percentage,
				allocation: frozenAllocation,
				spent: frozenSpent,
				balance: frozenAllocation - frozenSpent,
				isSavings: target.isSavings,
				status: 'frozen'
			});
		}

		candidateToFreeze = null;
		showFreezeModal = false;
	}
</script>

<main class="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
	<!-- Title & Period Overview -->
	<div class="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
		<div>
			<h1 class="text-2xl font-extrabold text-obsidian sm:text-3xl dark:text-paper">
				{t('categories.title')}
			</h1>
			<p class="mt-1 text-xs text-slate sm:text-sm dark:text-pebble">
				{t('categories.subtitle')}
			</p>
		</div>

		{#if data.period}
			<div class="flex items-center gap-2 text-xs text-slate dark:text-pebble">
				<div
					class="rounded-xl border border-fog bg-fog/40 px-3.5 py-1.5 dark:border-dark-border dark:bg-dark-card"
				>
					<span>{t('common.period')}: </span>
					<span class="font-bold text-obsidian dark:text-paper">
						{formatDate(data.period.startDate, getLocale())} – {formatDate(
							data.period.endDate,
							getLocale()
						)}
					</span>
				</div>
			</div>
		{/if}
	</div>

	<!-- Feedback Alerts -->
	{#if form?.success}
		<div
			role="status"
			class="mb-6 flex items-center gap-2.5 rounded-xl border border-lime-voltage/40 bg-linen-mist p-4 text-sm font-semibold text-forest-ink dark:bg-spruce/40 dark:text-linen-mist"
		>
			<HugeiconsIcon
				icon={CheckmarkCircle02Icon}
				class="h-5 w-5 text-forest-ink dark:text-lime-voltage"
			/>
			<span>{form.message || t('categories.updateSuccess')}</span>
		</div>
	{/if}

	{#if form?.error}
		<div
			role="alert"
			class="mb-6 flex items-center gap-2.5 rounded-xl border border-alarm-red/40 bg-alarm-red/10 p-4 text-sm font-medium text-alarm-red dark:border-alarm-red/50 dark:bg-alarm-red/20"
		>
			<HugeiconsIcon icon={Alert02Icon} class="h-5 w-5 shrink-0" />
			<span>{form.error}</span>
		</div>
	{/if}

	<!-- ALLOCATION SUMMARY BAR (Enforces 100% total) -->
	<div class="mb-6">
		<Card variant="default" padding="md" class="shadow-sm">
			<div class="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
				<div>
					<div class="flex items-center gap-2">
						<span
							class="text-xs font-semibold tracking-wider text-slate uppercase dark:text-pebble"
						>
							{t('categories.totalAllocated')}
						</span>
						{#if isExactly100}
							<span
								class="rounded-full bg-linen-mist px-2.5 py-0.5 text-xs font-bold text-forest-ink dark:bg-spruce/60 dark:text-lime-voltage"
							>
								{t('categories.exactly100')}
							</span>
						{:else}
							<span
								class="rounded-full bg-alarm-red/10 px-2.5 py-0.5 text-xs font-bold text-alarm-red dark:bg-alarm-red/20"
							>
								{totalPercentage > 100
									? t('categories.overPercent', { percent: Math.abs(differenceFrom100) })
									: t('categories.underPercent', { percent: differenceFrom100 })}
							</span>
						{/if}
					</div>
					<p class="mt-1 text-2xl font-black text-obsidian sm:text-3xl dark:text-paper">
						{totalPercentage}%
					</p>
				</div>

				<div class="flex flex-wrap items-center gap-2.5">
					<Button
						type="button"
						variant="primary"
						size="sm"
						onclick={openAddModal}
						class="flex items-center gap-1.5 font-bold shadow-sm"
					>
						<HugeiconsIcon icon={PlusSignIcon} class="h-4 w-4" />
						<span>{t('categories.addCategoryButton')}</span>
					</Button>
				</div>
			</div>

			<!-- Progress Indicator -->
			<div class="mt-3.5">
				<ProgressBar
					value={Math.min(100, totalPercentage)}
					max={100}
					variant={isExactly100 ? 'lime' : 'danger'}
				/>
			</div>
		</Card>
	</div>

	<!-- CATEGORY FORM -->
	<form
		method="POST"
		use:enhance={() => {
			isSaving = true;
			return async ({ update }) => {
				isSaving = false;
				await update();
			};
		}}
		class="space-y-6"
	>
		<input type="hidden" name="periodId" value={data.period?.id ?? ''} />
		<input
			type="hidden"
			name="categories"
			value={JSON.stringify(
				categories.map((c) => ({
					id: c.id,
					name: c.name,
					percentage: c.percentage,
					isSavings: c.isSavings
				}))
			)}
		/>
		<input type="hidden" name="freezeCategoryIds" value={JSON.stringify(freezeCategoryIds)} />
		<input
			type="hidden"
			name="frozenCategoryRenames"
			value={JSON.stringify(frozenCategories.map((f) => ({ id: f.id, name: f.name })))}
		/>

		<!-- ACTIVE CATEGORIES LIST -->
		<section
			aria-label={t('categories.activeCategories', { count: categories.length })}
			class="space-y-4"
		>
			<div class="flex items-center justify-between">
				<h2 class="text-base font-extrabold text-obsidian sm:text-lg dark:text-paper">
					{t('categories.activeCategories', { count: categories.length })}
				</h2>
				<span class="text-xs text-slate dark:text-pebble">
					{t('categories.monthlyIncome', { amount: formatRupiah(data.period?.totalIncome ?? 0) })}
				</span>
			</div>

			<div class="space-y-3">
				{#each categories as cat, idx (cat.id || idx)}
					{@const currentAllocation = Math.round(
						(data.period?.totalIncome ?? 0) * (cat.percentage / 100)
					)}
					{@const currentBalance = currentAllocation - (cat.spent ?? 0)}
					<div
						class="rounded-xl border p-4 transition-colors {cat.isSavings
							? 'border-spruce/30 bg-linen-mist/20 dark:border-lime-voltage/30 dark:bg-spruce/10'
							: 'border-fog bg-paper dark:border-dark-border dark:bg-dark-card'}"
					>
						<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
							<!-- Left: Name & Savings Toggle -->
							<div class="flex-1 space-y-2">
								<div class="flex items-center gap-2">
									<div
										class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg {cat.isSavings
											? 'bg-spruce/15 text-spruce dark:bg-lime-voltage/20 dark:text-lime-voltage'
											: 'bg-fog text-forest-ink dark:bg-dark-surface dark:text-linen-mist'}"
									>
										{#if cat.isSavings}
											<HugeiconsIcon icon={PiggyBankIcon} class="h-4.5 w-4.5" />
										{:else}
											<HugeiconsIcon icon={Wallet01Icon} class="h-4.5 w-4.5" />
										{/if}
									</div>

									<input
										type="text"
										bind:value={cat.name}
										placeholder={t('categories.namePlaceholder')}
										aria-label={t('categories.nameLabel')}
										required
										class="w-full rounded-lg border border-fog bg-paper px-3 py-1.5 text-sm font-bold text-obsidian transition focus:border-forest-ink focus:ring-1 focus:ring-forest-ink focus:outline-none dark:border-dark-border dark:bg-dark-surface dark:text-paper dark:focus:border-lime-voltage"
									/>
								</div>

								<!-- Toggle Tabungan Switch -->
								<div class="flex items-center gap-2 pt-0.5 pl-10">
									<label
										class="inline-flex cursor-pointer items-center gap-2 text-xs font-semibold text-charcoal dark:text-linen-mist"
									>
										<input
											type="checkbox"
											bind:checked={cat.isSavings}
											class="h-4 w-4 rounded border-fog text-forest-ink focus:ring-forest-ink dark:border-dark-border dark:text-lime-voltage"
										/>
										<span>{t('categories.isSavingsLabel')}</span>
									</label>
								</div>
							</div>

							<!-- Right: Percentage Slider & Input, Nominal Allocation, Live Category Balance, and Freeze Button -->
							<div
								class="flex flex-wrap items-center justify-between gap-4 border-t border-fog pt-3 sm:border-0 sm:pt-0"
							>
								<div class="flex items-center gap-3">
									<div class="flex w-28 flex-col gap-1 sm:w-36">
										<div
											class="flex items-center justify-between text-[10px] font-semibold text-slate dark:text-pebble"
										>
											<label for={`pct-${cat.id || idx}`}>{t('categories.percentageLabel')}</label>
											<div class="relative w-14">
												<input
													id={`pct-${cat.id || idx}`}
													type="number"
													min="1"
													max="100"
													step="0.5"
													bind:value={cat.percentage}
													required
													class="w-full rounded-lg border border-fog bg-paper px-1.5 py-0.5 text-right font-mono text-xs font-bold text-obsidian transition focus:border-forest-ink focus:outline-none dark:border-dark-border dark:bg-dark-surface dark:text-paper"
												/>
												<span
													class="pointer-events-none absolute top-1 right-1 text-[10px] text-slate dark:text-pebble"
													>%</span
												>
											</div>
										</div>
										<input
											type="range"
											min="1"
											max="100"
											step="0.5"
											bind:value={cat.percentage}
											aria-label={t('categories.sliderAria', { name: cat.name })}
											class="h-1.5 w-full cursor-pointer accent-forest-ink dark:accent-lime-voltage"
										/>
									</div>

									<div class="space-y-0.5 text-right text-xs">
										<div>
											<span class="text-[10px] text-slate dark:text-pebble"
												>{t('categories.allocationLabel')}:
											</span>
											<span class="font-mono font-bold text-obsidian dark:text-paper">
												{formatRupiah(currentAllocation)}
											</span>
										</div>
										<div>
											<span class="text-[10px] text-slate dark:text-pebble"
												>{t('categories.balanceLabel')}:
											</span>
											<span
												class="font-mono font-bold {currentBalance < 0
													? 'text-alarm-red'
													: 'text-forest-ink dark:text-lime-voltage'}"
											>
												{formatRupiah(currentBalance)}
											</span>
										</div>
										{#if cat.spent !== undefined && cat.spent > 0}
											<div class="text-[10px] text-slate/80 dark:text-pebble/80">
												{t('categories.spentLabel', { amount: formatRupiah(cat.spent) })}
											</div>
										{/if}
									</div>
								</div>

								<button
									type="button"
									aria-label={t('categories.freezeAria', { name: cat.name })}
									onclick={() => openFreezeModal(cat)}
									disabled={categories.length <= 1}
									class="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-alarm-red/30 bg-alarm-red/10 text-alarm-red transition hover:bg-alarm-red/20 disabled:cursor-not-allowed disabled:opacity-40"
								>
									<HugeiconsIcon icon={Delete02Icon} class="h-4 w-4" />
								</button>
							</div>
						</div>
					</div>
				{/each}
			</div>
		</section>

		<!-- FROZEN CATEGORIES SECTION -->
		{#if frozenCategories.length > 0}
			<section
				aria-label={t('categories.frozenBadge')}
				class="mt-8 border-t border-fog pt-6 dark:border-dark-border"
			>
				<div class="mb-3 flex items-center justify-between">
					<div>
						<h3 class="text-sm font-bold text-slate dark:text-pebble">
							{t('categories.frozenSectionTitle', { count: frozenCategories.length })}
						</h3>
						<p class="text-xs text-slate/80 dark:text-pebble/80">
							{t('categories.frozenSectionDesc')}
						</p>
					</div>
				</div>

				<div class="space-y-2.5">
					{#each frozenCategories as fCat (fCat.id)}
						<div
							class="flex items-center justify-between rounded-xl border border-fog/80 bg-fog/30 px-4 py-3 opacity-90 dark:border-dark-border/60 dark:bg-dark-surface/40"
						>
							<div class="flex items-center gap-2.5">
								<span
									data-testid="badge-frozen"
									class="rounded-full bg-fog px-2 py-0.5 text-[10px] font-bold text-slate dark:bg-dark-border dark:text-pebble"
								>
									{t('categories.frozenBadge')}
								</span>
								<input
									type="text"
									bind:value={fCat.name}
									aria-label={fCat.name}
									class="rounded-lg border border-fog/80 bg-paper px-2.5 py-1 text-sm font-bold text-obsidian transition focus:border-forest-ink focus:outline-none dark:border-dark-border dark:bg-dark-surface dark:text-paper"
								/>
							</div>

							<div class="text-right text-xs">
								<span class="text-slate dark:text-pebble">{t('categories.balanceLabel')}: </span>
								<span
									class="font-mono font-bold {fCat.balance < 0
										? 'text-alarm-red'
										: 'text-forest-ink dark:text-linen-mist'}"
								>
									{formatRupiah(fCat.balance)}
								</span>
								{#if fCat.spent > 0}
									<span class="ml-2 text-[11px] text-slate dark:text-pebble">
										({t('categories.spentLabel', { amount: formatRupiah(fCat.spent) })})
									</span>
								{/if}
							</div>
						</div>
					{/each}
				</div>
			</section>
		{/if}

		<!-- SUBMIT / SAVE ACTIONS -->
		<div
			class="sticky bottom-4 z-10 flex flex-col items-center justify-between gap-3 rounded-2xl border border-fog bg-paper/95 p-4 shadow-lg backdrop-blur sm:flex-row dark:border-dark-border dark:bg-dark-card/95"
		>
			<div>
				{#if !isExactly100}
					<p class="text-xs font-semibold text-alarm-red">
						{t('categories.validationExact100', { total: totalPercentage })}
					</p>
				{:else if hasEmptyNames}
					<p class="text-xs font-semibold text-alarm-red">
						{t('categories.validationEmptyNames')}
					</p>
				{:else}
					<p class="text-xs font-semibold text-forest-ink dark:text-lime-voltage">
						{t('categories.validationReady')}
					</p>
				{/if}
			</div>

			<div class="flex items-center gap-3">
				<a href={resolve('/(app)/dashboard')}>
					<Button type="button" variant="secondary" size="md">{t('common.cancel')}</Button>
				</a>
				<Button
					type="submit"
					variant="primary"
					size="md"
					disabled={!canSave}
					class="font-bold shadow-md"
				>
					{isSaving ? t('common.saving') : t('common.save')}
				</Button>
			</div>
		</div>
	</form>
</main>

<!-- ADD CATEGORY MODAL -->
{#if showAddModal}
	<div
		role="dialog"
		aria-modal="true"
		aria-labelledby="modal-add-title"
		class="fixed inset-0 z-50 flex items-center justify-center bg-obsidian/60 p-4"
	>
		<div
			class="w-full max-w-md rounded-2xl border border-fog bg-paper p-6 shadow-xl dark:border-dark-border dark:bg-dark-card"
		>
			<h3 id="modal-add-title" class="text-lg font-bold text-obsidian dark:text-paper">
				{t('categories.addModalTitle')}
			</h3>
			<p class="mt-1 text-xs text-slate dark:text-pebble">
				{t('categories.addModalDesc')}
			</p>

			{#if addErrorMessage}
				<div
					role="alert"
					class="mt-3 rounded-lg border border-alarm-red/40 bg-alarm-red/10 p-2.5 text-xs text-alarm-red"
				>
					{addErrorMessage}
				</div>
			{/if}

			<div class="mt-4 space-y-3.5">
				<div>
					<label
						for="new-cat-name"
						class="block text-xs font-semibold text-charcoal dark:text-linen-mist"
					>
						{t('categories.categoryNameRequired')}
					</label>
					<input
						id="new-cat-name"
						type="text"
						bind:value={newCatName}
						placeholder={t('categories.namePlaceholder')}
						class="mt-1 w-full rounded-lg border border-fog bg-paper px-3 py-2 text-sm text-obsidian focus:border-forest-ink focus:outline-none dark:border-dark-border dark:bg-dark-surface dark:text-paper"
					/>
				</div>

				<div>
					<label
						for="new-cat-pct"
						class="block text-xs font-semibold text-charcoal dark:text-linen-mist"
					>
						{t('categories.percentageAllocRequired')}
					</label>
					<div class="relative mt-1">
						<input
							id="new-cat-pct"
							type="number"
							min="1"
							max="99"
							bind:value={newCatPercentage}
							class="w-full rounded-lg border border-fog bg-paper px-3 py-2 text-sm font-bold text-obsidian focus:border-forest-ink focus:outline-none dark:border-dark-border dark:bg-dark-surface dark:text-paper"
						/>
						<span
							class="pointer-events-none absolute top-2 right-3 text-xs text-slate dark:text-pebble"
							>%</span
						>
					</div>
					<span class="mt-1 block text-[11px] text-slate dark:text-pebble">
						{t('categories.estimatedAlloc', {
							amount: formatRupiah(
								Math.round((data.period?.totalIncome ?? 0) * (newCatPercentage / 100))
							)
						})}
					</span>
				</div>

				<div class="pt-1">
					<label
						class="inline-flex cursor-pointer items-center gap-2 text-xs font-semibold text-charcoal dark:text-linen-mist"
					>
						<input
							type="checkbox"
							bind:checked={newCatIsSavings}
							class="h-4 w-4 rounded border-fog text-forest-ink focus:ring-forest-ink dark:border-dark-border dark:text-lime-voltage"
						/>
						<span>{t('categories.isSavingsLabel')}</span>
					</label>
				</div>

				<!-- Redistribution Mode for New Category -->
				{#if categories.length > 0}
					<div class="border-t border-fog pt-3 dark:border-dark-border">
						<span class="block text-xs font-bold text-obsidian dark:text-paper">
							{t('categories.reductionMethod')}
						</span>
						<div class="mt-2 flex items-center gap-4 text-xs font-semibold">
							<label class="flex cursor-pointer items-center gap-1.5">
								<input
									type="radio"
									name="addRedistributeMode"
									value="auto"
									bind:group={addReductionMode}
									class="text-forest-ink focus:ring-forest-ink"
								/>
								<span>{t('categories.reductionAuto')}</span>
							</label>
							<label class="flex cursor-pointer items-center gap-1.5">
								<input
									type="radio"
									name="addRedistributeMode"
									value="manual"
									bind:group={addReductionMode}
									class="text-forest-ink focus:ring-forest-ink"
								/>
								<span>{t('categories.reductionManual')}</span>
							</label>
						</div>

						{#if addReductionMode === 'manual'}
							<div
								class="mt-2.5 max-h-40 space-y-2 overflow-y-auto rounded-xl border border-fog bg-fog/20 p-3 dark:border-dark-border dark:bg-dark-surface/40"
							>
								{#each categories as c (c.id || c.name)}
									{@const key = c.id || c.name}
									<div class="flex items-center justify-between gap-3 text-xs">
										<span class="font-medium text-obsidian dark:text-paper">
											{c.name} ({c.percentage}%)
										</span>
										<div class="flex items-center gap-2">
											<input
												type="range"
												min="0"
												max={c.percentage - 0.5}
												step="0.5"
												bind:value={manualReductions[key]}
												aria-label={c.name}
												class="h-1.5 w-20 cursor-pointer accent-forest-ink dark:accent-lime-voltage"
											/>
											<div class="flex items-center gap-1">
												<span class="text-alarm-red">-</span>
												<input
													type="number"
													min="0"
													max={c.percentage - 0.5}
													step="0.5"
													bind:value={manualReductions[key]}
													class="w-16 rounded-lg border border-fog bg-paper px-2 py-1 text-right font-mono text-xs dark:border-dark-border dark:bg-dark-card"
												/>
												<span class="text-slate dark:text-pebble">%</span>
											</div>
										</div>
									</div>
								{/each}
							</div>
						{/if}
					</div>
				{/if}
			</div>

			<div class="mt-6 flex items-center justify-end gap-2.5">
				<Button type="button" variant="secondary" size="sm" onclick={() => (showAddModal = false)}>
					{t('common.cancel')}
				</Button>
				<Button type="button" variant="primary" size="sm" onclick={confirmAddCategory}>
					{t('categories.confirmAdd')}
				</Button>
			</div>
		</div>
	</div>
{/if}

<!-- FREEZE CATEGORY MODAL -->
{#if showFreezeModal && candidateToFreeze}
	<div
		role="dialog"
		aria-modal="true"
		aria-labelledby="modal-freeze-title"
		class="fixed inset-0 z-50 flex items-center justify-center bg-obsidian/60 p-4"
	>
		<div
			class="w-full max-w-md rounded-2xl border border-fog bg-paper p-6 shadow-xl dark:border-dark-border dark:bg-dark-card"
		>
			<div class="flex items-center gap-2.5 text-alarm-red">
				<HugeiconsIcon icon={Delete02Icon} class="h-5 w-5" />
				<h3 id="modal-freeze-title" class="text-lg font-bold text-obsidian dark:text-paper">
					{t('categories.freezeModalTitle')}
				</h3>
			</div>

			<p class="mt-2 text-xs leading-relaxed text-charcoal dark:text-pebble">
				{t('categories.freezeModalDesc', {
					name: candidateToFreeze.name,
					percentage: candidateToFreeze.percentage
				})}
			</p>

			{#if freezeErrorMessage}
				<div
					role="alert"
					class="mt-3 rounded-lg border border-alarm-red/40 bg-alarm-red/10 p-2.5 text-xs text-alarm-red"
				>
					{freezeErrorMessage}
				</div>
			{/if}

			<div class="mt-4 space-y-3">
				<div class="flex items-center gap-4 text-xs font-semibold">
					<label class="flex cursor-pointer items-center gap-1.5">
						<input
							type="radio"
							name="redistributeMode"
							value="auto"
							bind:group={freezeRedistributeMode}
							class="text-forest-ink focus:ring-forest-ink"
						/>
						<span>{t('categories.redistributeAuto')}</span>
					</label>
					<label class="flex cursor-pointer items-center gap-1.5">
						<input
							type="radio"
							name="redistributeMode"
							value="manual"
							bind:group={freezeRedistributeMode}
							class="text-forest-ink focus:ring-forest-ink"
						/>
						<span>{t('categories.redistributeManual')}</span>
					</label>
				</div>

				{#if freezeRedistributeMode === 'manual'}
					<div
						class="max-h-48 space-y-2 overflow-y-auto rounded-xl border border-fog bg-fog/20 p-3 dark:border-dark-border dark:bg-dark-surface/40"
					>
						{#each categories.filter((c) => (c.id || c.name) !== (candidateToFreeze?.id || candidateToFreeze?.name)) as remCat (remCat.id || remCat.name)}
							{@const key = remCat.id || remCat.name}
							<div class="flex items-center justify-between gap-3 text-xs">
								<span class="font-medium text-obsidian dark:text-paper">{remCat.name}</span>
								<div class="flex items-center gap-2">
									<input
										type="range"
										min="0"
										max="100"
										step="0.5"
										bind:value={manualAllocations[key]}
										aria-label={remCat.name}
										class="h-1.5 w-20 cursor-pointer accent-forest-ink dark:accent-lime-voltage"
									/>
									<div class="flex items-center gap-1">
										<span class="text-slate dark:text-pebble">+</span>
										<input
											type="number"
											min="0"
											max="100"
											step="0.5"
											bind:value={manualAllocations[key]}
											class="w-16 rounded-lg border border-fog bg-paper px-2 py-1 text-right font-mono text-xs dark:border-dark-border dark:bg-dark-card"
										/>
										<span class="text-slate dark:text-pebble">%</span>
									</div>
								</div>
							</div>
						{/each}
					</div>
				{/if}
			</div>

			<div class="mt-6 flex items-center justify-end gap-2.5">
				<Button
					type="button"
					variant="secondary"
					size="sm"
					onclick={() => (showFreezeModal = false)}
				>
					{t('common.cancel')}
				</Button>
				<Button type="button" variant="primary" size="sm" onclick={confirmFreezeCategory}>
					{t('categories.confirmFreeze')}
				</Button>
			</div>
		</div>
	</div>
{/if}
