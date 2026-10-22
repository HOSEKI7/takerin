<script lang="ts">
	import type { PageProps } from './$types.js';
	import Button from '#lib/components/Button.svelte';
	import Card from '#lib/components/Card.svelte';
	import Input from '#lib/components/Input.svelte';
	import ThemeToggle from '#lib/components/ThemeToggle.svelte';
	import BrandLogo from '#lib/components/BrandLogo.svelte';
	import NumpadCalculator from '#lib/components/NumpadCalculator.svelte';
	import CategoryPicker from '#lib/components/CategoryPicker.svelte';
	import { resolve } from '$app/paths';
	import { formatDateIndonesian, formatRupiah } from '#lib/validation/onboarding.js';
	import { isOverBudget } from '#lib/validation/expense.js';
	import { t } from '#lib/i18n/index.js';
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import { ArrowLeft02Icon, Alert02Icon } from '@hugeicons/core-free-icons';

	let { data, form }: PageProps = $props();

	// Calculator & Amount state
	// svelte-ignore state_referenced_locally
	let expression = $state(data.expense.amount.toString());
	// svelte-ignore state_referenced_locally
	let amount = $state(data.expense.amount);

	// Category selection state
	// svelte-ignore state_referenced_locally
	let selectedCategoryId = $state(data.expense.categoryId);

	// Form fields
	// svelte-ignore state_referenced_locally
	let name = $state(data.expense.name);
	// svelte-ignore state_referenced_locally
	let date = $state(data.expense.date);
	// svelte-ignore state_referenced_locally
	let time = $state(data.expense.time ?? '');
	// svelte-ignore state_referenced_locally
	let notes = $state(data.expense.notes ?? '');

	// Available balance for the selected category considering previous expense amount
	const selectedCategoryBalance = $derived.by(() => {
		const cat = data.categoriesWithBalance?.find((c) => c.id === selectedCategoryId);
		if (!cat) return 0;
		if (selectedCategoryId === data.expense.categoryId) {
			return cat.balance + data.expense.amount;
		}
		return cat.balance;
	});

	// Over-budget calculation
	const isExceedingBudget = $derived(
		selectedCategoryId !== '' && amount > 0 && isOverBudget(amount, selectedCategoryBalance)
	);

	// Validation check
	const canSubmit = $derived(amount > 0 && name.trim().length > 0 && selectedCategoryId !== '');
</script>

<div
	class="min-h-screen bg-paper font-sans text-charcoal transition-colors dark:bg-dark-surface dark:text-linen-mist"
>
	<!-- App Header -->
	<header
		class="sticky top-0 z-20 border-b border-fog bg-paper/90 px-4 py-3.5 backdrop-blur sm:px-6 dark:border-dark-border dark:bg-dark-card/90"
	>
		<div class="mx-auto flex max-w-4xl items-center justify-between">
			<div class="flex items-center gap-3">
				<a
					href={resolve('/expenses')}
					class="flex h-9 w-9 items-center justify-center rounded-xl border border-fog bg-paper text-slate transition hover:bg-fog hover:text-obsidian dark:border-dark-border dark:bg-dark-surface dark:text-pebble dark:hover:text-paper"
					aria-label={t('common.back')}
				>
					<HugeiconsIcon icon={ArrowLeft02Icon} class="h-4 w-4" />
				</a>
				<BrandLogo href="/dashboard" size="sm" />
			</div>
			<div class="flex items-center gap-2">
				<ThemeToggle />
				<a href={resolve('/expenses')}>
					<Button variant="secondary" size="sm">{t('common.cancel')}</Button>
				</a>
			</div>
		</div>
	</header>

	<main class="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-8">
		<div class="mb-6 flex flex-col justify-between gap-1 sm:flex-row sm:items-baseline">
			<div>
				<h1 class="text-2xl font-bold text-obsidian sm:text-3xl dark:text-paper">
					{t('expenses.editTitle')}
				</h1>
				<p class="mt-1 text-xs text-slate sm:text-sm dark:text-pebble">
					{t('expenses.editSubtitle')}
				</p>
			</div>
			{#if data.period}
				<div class="text-xs text-slate dark:text-pebble">
					Periode: <span class="font-medium"
						>{formatDateIndonesian(data.period.startDate)} – {formatDateIndonesian(
							data.period.endDate
						)}</span
					>
				</div>
			{/if}
		</div>

		{#if form?.error}
			<div
				role="alert"
				class="mb-6 flex items-center gap-2.5 rounded-xl border border-alarm-red/40 bg-alarm-red/10 p-4 text-sm font-medium text-alarm-red dark:border-alarm-red/50 dark:bg-alarm-red/20"
			>
				<HugeiconsIcon icon={Alert02Icon} class="h-5 w-5 shrink-0" />
				<span>{form.error}</span>
			</div>
		{/if}

		<form method="POST" class="grid grid-cols-1 gap-6 lg:grid-cols-12">
			<input type="hidden" name="amount" value={amount} />
			<input type="hidden" name="categoryId" value={selectedCategoryId} />

			<!-- LEFT COLUMN: AMOUNT-FIRST NUMPAD (Cols 1-6) -->
			<div class="lg:col-span-6">
				<NumpadCalculator bind:expression bind:amount />
			</div>

			<!-- RIGHT COLUMN: CATEGORY SELECTION & DETAILS (Cols 7-12) -->
			<div class="space-y-5 lg:col-span-6">
				<Card variant="default" padding="md" class="space-y-4">
					<!-- Category Grid Picker -->
					<CategoryPicker
						categories={data.categories.map((c) => {
							const matched = data.categoriesWithBalance?.find((b) => b.id === c.id);
							return {
								...c,
								balance: matched?.balance
							};
						})}
						bind:selectedId={selectedCategoryId}
					/>

					<!-- Over-budget Warning In-App -->
					{#if isExceedingBudget}
						<div
							role="alert"
							class="flex items-start gap-2.5 rounded-xl border border-alarm-red/40 bg-alarm-red/10 p-3.5 text-xs text-alarm-red dark:border-alarm-red/50 dark:bg-alarm-red/20"
						>
							<HugeiconsIcon icon={Alert02Icon} class="mt-0.5 h-4 w-4 shrink-0 text-alarm-red" />
							<div>
								<p class="font-bold">Peringatan: Melebihi Saldo Kategori</p>
								<p class="mt-0.5 text-alarm-red/90">
									Nominal {formatRupiah(amount)} melebihi sisa saldo kategori ({formatRupiah(
										selectedCategoryBalance
									)}). Pengeluaran tetap dapat disimpan, namun saldo kategori ini akan bernilai
									minus (over-budget).
								</p>
							</div>
						</div>
					{/if}

					<!-- Nama Pengeluaran (Wajib) -->
					<div class="pt-2">
						<Input
							id="edit-expense-name"
							name="name"
							label={t('expenses.form.nameLabel')}
							placeholder={t('expenses.form.namePlaceholder')}
							bind:value={name}
							required
						/>
					</div>

					<!-- Tanggal -->
					<div>
						<label
							for="edit-expense-date"
							class="block text-xs font-semibold text-charcoal dark:text-linen-mist"
						>
							{t('expenses.form.dateLabel')}
						</label>
						<input
							id="edit-expense-date"
							name="date"
							type="date"
							bind:value={date}
							required
							class="mt-1 w-full rounded-lg border border-fog bg-paper px-3.5 py-2.5 text-sm text-obsidian transition focus:border-forest-ink focus:ring-1 focus:ring-forest-ink focus:outline-none dark:border-dark-border dark:bg-dark-surface dark:text-paper dark:focus:border-lime-voltage"
						/>
					</div>

					<!-- Catatan & Jam -->
					<div
						class="space-y-3 rounded-xl border border-fog/80 bg-fog/20 p-3.5 dark:border-dark-border/60 dark:bg-dark-surface/40"
					>
						<div>
							<label
								for="edit-expense-notes"
								class="block text-xs font-semibold text-charcoal dark:text-linen-mist"
							>
								{t('expenses.form.notesLabel')}
							</label>
							<textarea
								id="edit-expense-notes"
								name="notes"
								rows="2"
								bind:value={notes}
								placeholder="{t('expenses.form.notesPlaceholder')}"
								class="mt-1 w-full rounded-lg border border-fog bg-paper px-3.5 py-2 text-sm text-obsidian transition focus:border-forest-ink focus:ring-1 focus:ring-forest-ink focus:outline-none dark:border-dark-border dark:bg-dark-surface dark:text-paper dark:focus:border-lime-voltage"
							></textarea>
						</div>

						<div>
							<label
								for="edit-expense-time"
								class="block text-xs font-semibold text-charcoal dark:text-linen-mist"
							>
								{t('expenses.form.timeLabel')}
							</label>
							<input
								id="edit-expense-time"
								name="time"
								type="time"
								bind:value={time}
								placeholder="HH:MM"
								class="mt-1 w-full rounded-lg border border-fog bg-paper px-3.5 py-2 text-sm text-obsidian transition focus:border-forest-ink focus:ring-1 focus:ring-forest-ink focus:outline-none dark:border-dark-border dark:bg-dark-surface dark:text-paper dark:focus:border-lime-voltage"
							/>
						</div>
					</div>

					<!-- Actions Button (Primary CTA paired with secondary text link per DESIGN.md) -->
					<div class="flex items-center justify-end gap-5 pt-3">
						<a
							href={resolve('/expenses')}
							class="text-sm font-semibold text-charcoal underline underline-offset-4 hover:opacity-80 dark:text-linen-mist"
						>
							{t('common.cancel')}
						</a>
						<Button
							type="submit"
							variant="primary"
							size="md"
							class="font-bold"
							disabled={!canSubmit}
						>
							{t('expenses.form.submitEdit')}
						</Button>
					</div>
				</Card>
			</div>
		</form>
	</main>
</div>
