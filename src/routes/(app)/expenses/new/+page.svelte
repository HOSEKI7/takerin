<script lang="ts">
	import type { PageProps } from './$types.js';
	import Button from '#lib/components/Button.svelte';
	import Card from '#lib/components/Card.svelte';
	import Input from '#lib/components/Input.svelte';
	import NumpadCalculator from '#lib/components/NumpadCalculator.svelte';
	import CategoryPicker from '#lib/components/CategoryPicker.svelte';
	import { resolve } from '$app/paths';
	import { formatRupiah, formatDateIndonesian, formatDateISO } from '#lib/validation/onboarding.js';
	import { isOverBudget } from '#lib/validation/expense.js';
	import { t } from '#lib/i18n/index.js';
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import { ArrowLeft02Icon, Alert02Icon } from '@hugeicons/core-free-icons';

	let { data, form }: PageProps = $props();

	// Calculator & Amount state
	let expression = $state('');
	let amount = $state(0);

	// Category selection state
	let selectedCategoryId = $state('');

	// Today's date string YYYY-MM-DD using local timezone (WIB)
	const todayDateString = formatDateISO(new Date());

	// Form fields
	let name = $state('');
	let date = $state(todayDateString);
	let time = $state('');
	let notes = $state('');

	// Show more optional fields toggle
	let showMoreDetails = $state(false);

	// Find the selected category with balance
	const categoryBalance = $derived(
		data.allCategoriesWithBalance?.find((c) => c.id === selectedCategoryId)?.balance ?? 0
	);

	// Over budget calculation
	const isExceedingBudget = $derived(
		selectedCategoryId !== '' && amount > 0 && isOverBudget(amount, categoryBalance)
	);

	// Validation check
	const canSubmit = $derived(amount > 0 && name.trim().length > 0 && selectedCategoryId !== '');
</script>

<main class="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-8">
	<div class="mb-6 flex flex-col justify-between gap-1 sm:flex-row sm:items-baseline">
		<div class="flex items-center gap-3">
			<a
				href={resolve('/(app)/expenses')}
				class="flex h-9 w-9 items-center justify-center rounded-xl border border-fog bg-paper text-slate transition hover:bg-fog hover:text-obsidian dark:border-dark-border dark:bg-dark-surface dark:text-pebble dark:hover:text-paper"
				aria-label={t('common.back')}
			>
				<HugeiconsIcon icon={ArrowLeft02Icon} class="h-4 w-4" />
			</a>
			<div>
				<h1 class="text-2xl font-bold text-obsidian sm:text-3xl dark:text-paper">
					{t('expenses.newTitle')}
				</h1>
				<p class="mt-1 text-xs text-slate sm:text-sm dark:text-pebble">
					{t('expenses.newSubtitle')}
				</p>
			</div>
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
		<!-- Hidden form values submitted via POST -->
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
						const matched = data.allCategoriesWithBalance?.find((b) => b.id === c.id);
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
									categoryBalance
								)}). Pengeluaran tetap dapat disimpan, namun saldo kategori ini akan bernilai minus
								(over-budget).
							</p>
						</div>
					</div>
				{/if}

				<!-- Nama Pengeluaran (Wajib) -->
				<div class="pt-2">
					<Input
						id="expense-name"
						name="name"
						label={t('expenses.form.nameLabel')}
						placeholder={t('expenses.form.namePlaceholder')}
						bind:value={name}
						required
					/>
				</div>

				<!-- Tanggal (Auto-fill hari ini, bisa diubah) -->
				<div>
					<label
						for="expense-date"
						class="block text-xs font-semibold text-charcoal dark:text-linen-mist"
					>
						{t('expenses.form.dateLabel')}
					</label>
					<div class="relative mt-1">
						<input
							id="expense-date"
							name="date"
							type="date"
							bind:value={date}
							required
							class="w-full rounded-lg border border-fog bg-paper px-3.5 py-2.5 text-sm text-obsidian transition focus:border-forest-ink focus:ring-1 focus:ring-forest-ink focus:outline-none dark:border-dark-border dark:bg-dark-surface dark:text-paper dark:focus:border-lime-voltage"
						/>
					</div>
				</div>

				<!-- Optional Fields Toggle -->
				<div class="pt-1">
					<button
						type="button"
						class="text-xs font-semibold text-forest-ink underline underline-offset-4 hover:opacity-80 dark:text-lime-voltage"
						onclick={() => (showMoreDetails = !showMoreDetails)}
					>
						{showMoreDetails ? '− ' + t('common.close') : '+ ' + t('expenses.form.notesLabel')}
					</button>
				</div>

				<div
					class={showMoreDetails
						? 'space-y-3 rounded-xl border border-fog/80 bg-fog/20 p-3.5 dark:border-dark-border/60 dark:bg-dark-surface/40'
						: 'hidden'}
				>
					<!-- Catatan (Opsional) -->
					<div>
						<label
							for="expense-notes"
							class="block text-xs font-semibold text-charcoal dark:text-linen-mist"
						>
							{t('expenses.form.notesLabel')}
						</label>
						<textarea
							id="expense-notes"
							name="notes"
							rows="2"
							bind:value={notes}
							placeholder={t('expenses.form.notesPlaceholder')}
							class="mt-1 w-full rounded-lg border border-fog bg-paper px-3.5 py-2 text-sm text-obsidian transition focus:border-forest-ink focus:ring-1 focus:ring-forest-ink focus:outline-none dark:border-dark-border dark:bg-dark-surface dark:text-paper dark:focus:border-lime-voltage"
						></textarea>
					</div>

					<!-- Jam (Opsional, tidak auto-fill) -->
					<div>
						<label
							for="expense-time"
							class="block text-xs font-semibold text-charcoal dark:text-linen-mist"
						>
							{t('expenses.form.timeLabel')}
						</label>
						<input
							id="expense-time"
							name="time"
							type="time"
							bind:value={time}
							placeholder="HH:MM"
							class="mt-1 w-full rounded-lg border border-fog bg-paper px-3.5 py-2 text-sm text-obsidian transition focus:border-forest-ink focus:ring-1 focus:ring-forest-ink focus:outline-none dark:border-dark-border dark:bg-dark-surface dark:text-paper dark:focus:border-lime-voltage"
						/>
					</div>
				</div>

				<!-- Submit Button -->
				<div class="pt-3">
					<Button
						type="submit"
						variant="primary"
						size="lg"
						class="w-full font-bold"
						disabled={!canSubmit}
					>
						{t('expenses.form.submitNew')}
					</Button>
					{#if !canSubmit}
						<p class="mt-2 text-center text-[11px] text-slate dark:text-pebble">
							{#if amount <= 0}
								{t('expenses.form.amountRequired')}
							{:else if !selectedCategoryId}
								{t('expenses.form.categoryRequired')}
							{:else if name.trim().length === 0}
								{t('expenses.form.nameRequired')}
							{/if}
						</p>
					{/if}
				</div>
			</Card>
		</div>
	</form>
</main>
