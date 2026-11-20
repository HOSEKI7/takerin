<script lang="ts">
	import type { PageProps } from './$types.js';
	import Button from '#lib/components/Button.svelte';
	import Card from '#lib/components/Card.svelte';
	import { resolve } from '$app/paths';
	import { formatRupiah, formatDate } from '#lib/validation/onboarding.js';
	import { t, getLocale } from '#lib/i18n/index.js';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { enhance } from '$app/forms';
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import {
		PlusSignIcon,
		Delete02Icon,
		Coins01Icon,
		PiggyBankIcon,
		ArrowLeft01Icon,
		ArrowRight01Icon
	} from '@hugeicons/core-free-icons';

	let { data }: PageProps = $props();

	let deleteCandidateId = $state<string | null>(null);
	let isDeleting = $state(false);
	let deleteError = $state<string | null>(null);

	function goToPage(targetPage: number) {
		if (targetPage < 1 || targetPage > data.totalPages || targetPage === data.page) return;
		const url = new URL(page.url.href);
		if (targetPage === 1) {
			url.searchParams.delete('page');
		} else {
			url.searchParams.set('page', String(targetPage));
		}
		// eslint-disable-next-line svelte/no-navigation-without-resolve
		goto(url.toString());
	}

	function handleCategoryFilter(categoryId: string) {
		const url = new URL(page.url.href);
		if (categoryId) {
			url.searchParams.set('category', categoryId);
		} else {
			url.searchParams.delete('category');
		}
		// Reset pagination back to page 1
		url.searchParams.delete('page');
		// eslint-disable-next-line svelte/no-navigation-without-resolve
		goto(url.toString());
	}
</script>

<main class="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
	<!-- Page Header & Period Summary -->
	<div class="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-end">
		<div>
			<h1 class="text-2xl font-black text-obsidian sm:text-3xl dark:text-paper">
				{t('expenses.title')}
			</h1>
			<p class="mt-1 text-xs text-slate sm:text-sm dark:text-pebble">
				{t('expenses.subtitle')}
			</p>
		</div>

		<div class="flex flex-wrap items-center gap-3">
			{#if data.period && data.summary}
				<div class="flex flex-wrap items-center gap-3 text-xs">
					<div
						class="rounded-xl border border-fog bg-fog/40 px-3.5 py-2 dark:border-dark-border dark:bg-dark-card"
					>
						<span class="text-slate dark:text-pebble">{t('dashboard.totalSpent')}: </span>
						<span class="font-extrabold text-obsidian dark:text-paper"
							>{formatRupiah(data.summary.totalSpent)}</span
						>
					</div>
					<div
						class="rounded-xl border border-fog bg-fog/40 px-3.5 py-2 dark:border-dark-border dark:bg-dark-card"
					>
						<span class="text-slate dark:text-pebble">{t('dashboard.remainingBudget')}: </span>
						<span
							class="font-extrabold {data.summary.remaining < 0
								? 'text-alarm-red'
								: 'text-forest-ink dark:text-lime-voltage'}"
						>
							{formatRupiah(data.summary.remaining)}
						</span>
					</div>
				</div>
			{/if}
			<a href={resolve('/(app)/expenses/new')}>
				<Button variant="primary" size="sm" class="flex items-center gap-1.5 font-bold shadow-sm">
					<HugeiconsIcon icon={PlusSignIcon} class="h-4 w-4" />
					<span>{t('expenses.newExpenseButton')}</span>
				</Button>
			</a>
		</div>
	</div>

	<!-- CATEGORY FILTER BAR -->
	<div
		class="mb-6 flex scrollbar-none items-center gap-2 overflow-x-auto pb-2"
		role="tablist"
		aria-label={t('expenses.filterByCategory')}
	>
		<button
			type="button"
			role="tab"
			aria-selected={!data.selectedCategory}
			class="inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-bold transition {data.selectedCategory ===
			''
				? 'bg-forest-ink text-paper dark:bg-lime-voltage dark:text-forest-ink'
				: 'border border-fog bg-paper text-charcoal hover:bg-fog dark:border-dark-border dark:bg-dark-card dark:text-linen-mist'}"
			onclick={() => handleCategoryFilter('')}
		>
			<span>{t('common.all')}</span>
			<span class="py-0.2 rounded-full bg-paper/20 px-1.5 text-[10px] dark:bg-dark-surface/40">
				{data.allExpensesCount ?? data.totalCount}
			</span>
		</button>

		{#each data.categories as cat (cat.id)}
			{@const isSelected = data.selectedCategory === cat.id}
			<button
				type="button"
				role="tab"
				aria-selected={isSelected}
				class="inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-bold transition {isSelected
					? 'bg-forest-ink text-paper dark:bg-lime-voltage dark:text-forest-ink'
					: 'border border-fog bg-paper text-charcoal hover:bg-fog dark:border-dark-border dark:bg-dark-card dark:text-linen-mist'}"
				onclick={() => handleCategoryFilter(cat.id)}
			>
				<span>{cat.name}</span>
				{#if cat.isSavings}
					<span class="text-[10px] text-spruce dark:text-lime-voltage">★</span>
				{/if}
			</button>
		{/each}
	</div>

	<!-- EXPENSES LIST -->
	{#if data.expenses.length === 0}
		<!-- Empty State -->
		<Card variant="tinted" padding="lg" class="text-center">
			<div
				class="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-linen-mist dark:bg-spruce/60"
			>
				<HugeiconsIcon icon={Coins01Icon} class="h-6 w-6 text-forest-ink dark:text-lime-voltage" />
			</div>
			<h2 class="mt-4 text-lg font-bold text-forest-ink dark:text-linen-mist">
				{t('expenses.noExpenses')}
			</h2>
			<p class="mx-auto mt-2 max-w-md text-xs text-charcoal sm:text-sm dark:text-pebble">
				{data.selectedCategory ? t('expenses.noExpenses') : t('dashboard.noExpensesHelp')}
			</p>
			<div class="mt-5">
				<a href={resolve('/(app)/expenses/new')}>
					<Button variant="primary" size="md">{t('expenses.newExpenseButton')}</Button>
				</a>
			</div>
		</Card>
	{:else}
		<!-- Compact 2-Line List Rows (~56–64px) -->
		<div class="space-y-2">
			{#each data.expenses as exp (exp.id)}
				<div
					class="group relative flex flex-col justify-between rounded-xl border border-fog bg-paper p-3 transition hover:border-forest-ink/40 hover:bg-fog/20 sm:px-4 sm:py-2.5 dark:border-dark-border dark:bg-dark-card dark:hover:border-lime-voltage/40 dark:hover:bg-dark-surface/40"
				>
					<!-- Stretched clickable area to edit expense -->
					<a
						href={resolve('/(app)/expenses/[id]/edit', { id: exp.id })}
						class="absolute inset-0 z-0 rounded-xl focus-visible:ring-2 focus-visible:ring-forest-ink focus-visible:outline-none dark:focus-visible:ring-lime-voltage"
						aria-label="{t('common.edit')} {exp.name}"
					></a>

					<!-- Baris Atas: Nama Pengeluaran di kiri, Nominal Rupiah tebal di kanan -->
					<div class="pointer-events-none z-10 flex items-center justify-between gap-3">
						<div class="flex min-w-0 items-center gap-2">
							<div
								class="flex h-5 w-5 shrink-0 items-center justify-center rounded-md {exp.isSavings
									? 'bg-spruce/15 text-spruce dark:bg-spruce/40 dark:text-lime-voltage'
									: 'bg-linen-mist text-forest-ink dark:bg-dark-surface dark:text-lime-voltage'}"
							>
								{#if exp.isSavings}
									<HugeiconsIcon icon={PiggyBankIcon} size={13} />
								{:else}
									<HugeiconsIcon icon={Coins01Icon} size={13} />
								{/if}
							</div>
							<h2 class="truncate text-sm font-bold text-obsidian sm:text-base dark:text-paper">
								{exp.name}
							</h2>
							{#if exp.isSavings}
								<span
									class="py-0.2 shrink-0 rounded-full bg-spruce/10 px-1.5 text-[10px] font-bold text-spruce dark:bg-spruce/30 dark:text-lime-voltage"
								>
									{t('categories.savingsBadge')}
								</span>
							{/if}
						</div>
						<p
							class="shrink-0 text-sm font-black tracking-tight text-forest-ink sm:text-base dark:text-lime-voltage"
						>
							{formatRupiah(exp.amount)}
						</p>
					</div>

					<!-- Baris Bawah: Badge kategori & tanggal/jam di kiri, Tombol hapus cepat di kanan -->
					<div class="pointer-events-none z-10 mt-1 flex items-center justify-between gap-2">
						<div class="flex min-w-0 items-center gap-1.5 text-xs text-slate dark:text-pebble">
							<span
								class="shrink-0 rounded-md bg-fog px-2 py-0.5 text-[10px] font-semibold text-charcoal dark:bg-dark-surface dark:text-linen-mist"
							>
								{exp.categoryName}
							</span>
							<span>•</span>
							<span class="truncate">{formatDate(exp.date, getLocale())}</span>
							{#if exp.time}
								<span>{exp.time}</span>
							{/if}
							{#if exp.notes}
								<span class="hidden truncate italic sm:inline">"{exp.notes}"</span>
							{/if}
						</div>

						<!-- Quick Delete Button (Interactive) -->
						<button
							type="button"
							class="pointer-events-auto relative z-20 flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg text-slate transition hover:bg-alarm-red/10 hover:text-alarm-red focus-visible:ring-2 focus-visible:ring-alarm-red focus-visible:outline-none dark:text-pebble dark:hover:bg-alarm-red/20 dark:hover:text-alarm-red"
							aria-label="{t('common.delete')} {exp.name}"
							onclick={(e) => {
								e.stopPropagation();
								deleteCandidateId = exp.id;
								deleteError = null;
							}}
						>
							<HugeiconsIcon icon={Delete02Icon} size={15} />
						</button>
					</div>
				</div>
			{/each}
		</div>

		<!-- Bounded Pagination Bar -->
		{#if data.totalPages > 1}
			<nav
				class="mt-6 flex items-center justify-between border-t border-fog/80 pt-4 dark:border-dark-border"
				aria-label={t('expenses.title')}
			>
				<!-- Tombol Sebelumnya -->
				<Button
					type="button"
					variant="secondary"
					size="sm"
					disabled={data.page <= 1}
					onclick={() => goToPage(data.page - 1)}
					class="flex items-center gap-1.5 text-xs font-semibold"
					aria-label={t('expenses.pagination.previous')}
				>
					<HugeiconsIcon icon={ArrowLeft01Icon} size={15} />
					<span>{t('expenses.pagination.previous')}</span>
				</Button>

				<!-- Status Halaman -->
				<span class="text-xs font-medium text-slate dark:text-pebble">
					{t('expenses.pagination.pageOf', { current: data.page, total: data.totalPages })}
				</span>

				<!-- Tombol Berikutnya -->
				<Button
					type="button"
					variant="secondary"
					size="sm"
					disabled={data.page >= data.totalPages}
					onclick={() => goToPage(data.page + 1)}
					class="flex items-center gap-1.5 text-xs font-semibold"
					aria-label={t('expenses.pagination.next')}
				>
					<span>{t('expenses.pagination.next')}</span>
					<HugeiconsIcon icon={ArrowRight01Icon} size={15} />
				</Button>
			</nav>
		{/if}
	{/if}
</main>

<!-- DELETE CONFIRMATION MODAL -->
{#if deleteCandidateId}
	{@const targetExp = data.expenses.find((e) => e.id === deleteCandidateId)}
	<div
		role="dialog"
		aria-modal="true"
		aria-labelledby="modal-delete-title"
		class="fixed inset-0 z-50 flex items-center justify-center bg-obsidian/60 p-4"
	>
		<div
			class="w-full max-w-md rounded-2xl border border-fog bg-paper p-6 shadow-lg dark:border-dark-border dark:bg-dark-card"
		>
			<div class="flex items-center gap-3 text-alarm-red">
				<div class="flex h-10 w-10 items-center justify-center rounded-full bg-alarm-red/10">
					<HugeiconsIcon icon={Delete02Icon} class="h-5 w-5" />
				</div>
				<h3 id="modal-delete-title" class="text-lg font-bold text-obsidian dark:text-paper">
					{t('expenses.deleteConfirmTitle')}
				</h3>
			</div>

			<p class="mt-3 text-xs text-charcoal sm:text-sm dark:text-pebble">
				{t('expenses.deleteConfirmDesc')}
				<strong class="text-obsidian dark:text-paper">"{targetExp?.name}"</strong> ({targetExp
					? formatRupiah(targetExp.amount)
					: ''})
			</p>

			{#if deleteError}
				<div
					role="alert"
					class="mt-3 rounded-lg border border-alarm-red/40 bg-alarm-red/10 p-2.5 text-xs text-alarm-red dark:border-alarm-red/50 dark:bg-alarm-red/20"
				>
					{deleteError}
				</div>
			{/if}

			<form
				method="POST"
				action="?/delete"
				use:enhance={() => {
					isDeleting = true;
					deleteError = null;
					return async ({ result, update }) => {
						isDeleting = false;
						if (result.type === 'success') {
							deleteCandidateId = null;
							await update();
						} else if (result.type === 'failure') {
							deleteError = (result.data?.error as string) ?? t('expenses.deleteFailed');
						} else {
							await update();
						}
					};
				}}
				class="mt-6 flex items-center justify-end gap-3"
			>
				<input type="hidden" name="id" value={deleteCandidateId} />

				<Button
					type="button"
					variant="secondary"
					size="sm"
					disabled={isDeleting}
					onclick={() => {
						deleteCandidateId = null;
						deleteError = null;
					}}
				>
					{t('common.cancel')}
				</Button>

				<button
					type="submit"
					disabled={isDeleting}
					class="inline-flex cursor-pointer items-center justify-center rounded-full bg-alarm-red px-4 py-1.5 text-xs font-semibold text-paper transition hover:brightness-95 active:brightness-90 disabled:opacity-50"
				>
					{isDeleting ? t('common.deleting') : t('common.delete')}
				</button>
			</form>
		</div>
	</div>
{/if}
