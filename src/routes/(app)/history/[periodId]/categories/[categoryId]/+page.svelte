<script lang="ts">
	import type { PageProps } from './$types.js';
	import Card from '#lib/components/Card.svelte';
	import ProgressBar from '#lib/components/ProgressBar.svelte';
	import { resolve } from '$app/paths';
	import { formatRupiah, formatDate } from '#lib/validation/onboarding.js';
	import { t, getLocale } from '#lib/i18n/index.js';
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import {
		ArrowLeft01Icon,
		PiggyBankIcon,
		Coins01Icon,
		Calendar01Icon,
		Clock01Icon,
		Invoice01Icon
	} from '@hugeicons/core-free-icons';

	let { data }: PageProps = $props();
</script>

<main class="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
	<!-- Back Button & Header -->
	<div class="mb-6">
		<a
			href={resolve('/(app)/history/[periodId]', { periodId: data.period.id })}
			class="inline-flex items-center gap-2 text-sm font-semibold text-slate transition-colors hover:text-forest-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-ink dark:text-pebble dark:hover:text-lime-voltage dark:focus-visible:ring-lime-voltage"
		>
			<HugeiconsIcon icon={ArrowLeft01Icon} class="h-4 w-4" />
			<span>{t('history.backToPeriodDetail')}</span>
		</a>

		<div class="mt-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
			<div>
				<div class="flex flex-wrap items-center gap-2">
					<h1 class="text-2xl font-extrabold text-obsidian sm:text-3xl dark:text-paper">
						{data.category.name}
					</h1>
					{#if data.category.isSavings}
						<span
							class="flex items-center gap-1 rounded-full bg-lime-voltage/20 px-2.5 py-0.5 text-xs font-bold text-forest-ink dark:bg-spruce/60 dark:text-lime-voltage"
						>
							<HugeiconsIcon icon={PiggyBankIcon} class="h-3.5 w-3.5" />
							{t('categories.savingsBadge')}
						</span>
					{/if}
					{#if data.category.status === 'frozen'}
						<span
							class="rounded-full bg-fog px-2.5 py-0.5 text-xs font-bold text-slate dark:bg-dark-surface dark:text-pebble"
						>
							{t('common.frozen')}
						</span>
					{/if}
				</div>
				<p class="mt-1 text-sm text-slate dark:text-pebble">
					{t('history.categoryDetailSubtitle')}
				</p>
				<p class="mt-0.5 text-xs text-slate/80 dark:text-pebble/80">
					{formatDate(data.period.startDate, getLocale())} – {formatDate(
						data.period.endDate,
						getLocale()
					)}
				</p>
			</div>
		</div>
	</div>

	<!-- Category Summary Card -->
	<div class="mb-8">
		<Card class="p-5 sm:p-6">
			<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div class="flex items-center gap-3.5">
					<div
						class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl {data.category.isSavings
							? 'bg-spruce/15 text-spruce dark:bg-spruce/40 dark:text-lime-voltage'
							: 'bg-linen-mist/80 text-forest-ink dark:bg-dark-surface dark:text-lime-voltage'}"
					>
						{#if data.category.isSavings}
							<HugeiconsIcon icon={PiggyBankIcon} class="h-6 w-6" />
						{:else}
							<HugeiconsIcon icon={Coins01Icon} class="h-6 w-6" />
						{/if}
					</div>
					<div>
						<p class="text-xs font-semibold text-slate dark:text-pebble">
							{t('dashboard.allocationLabel', {
								amount: formatRupiah(data.category.allocation),
								percent: data.category.percentage
							})}
						</p>
						<p class="text-xl font-extrabold text-obsidian sm:text-2xl dark:text-paper">
							{formatRupiah(data.category.allocation)}
						</p>
					</div>
				</div>

				<div class="flex items-center gap-6 border-t border-fog pt-3 sm:border-0 sm:pt-0">
					<div>
						<p class="text-xs font-semibold text-slate dark:text-pebble">
							{t('dashboard.totalSpent')}
						</p>
						<p class="text-base font-bold text-obsidian dark:text-paper">
							{formatRupiah(data.category.spent)}
							<span class="text-xs font-semibold text-slate dark:text-pebble">
								({data.category.spentPercentage}%)
							</span>
						</p>
					</div>
					<div class="text-right">
						<p class="text-xs font-semibold text-slate dark:text-pebble">
							{t('dashboard.balanceRemaining')}
						</p>
						<p
							class={`text-base font-bold ${
								data.category.balance >= 0
									? 'text-forest-ink dark:text-lime-voltage'
									: 'text-alarm-red'
							}`}
						>
							{formatRupiah(data.category.balance)}
						</p>
					</div>
				</div>
			</div>

			<div class="mt-5">
				<div class="mb-1.5 flex justify-between text-xs font-semibold">
					<span class="text-slate dark:text-pebble">
						{t('dashboard.spentLabel', { amount: formatRupiah(data.category.spent) })}
					</span>
					<span
						class={data.category.spentPercentage > 100
							? 'font-bold text-alarm-red'
							: 'text-slate dark:text-pebble'}
					>
						{data.category.spentPercentage}%
					</span>
				</div>
				<ProgressBar
					value={Math.min(100, data.category.spentPercentage)}
					color={data.category.spentPercentage > 100
						? 'alarm'
						: data.category.isSavings
							? 'spruce'
							: 'forest'}
				/>
			</div>
		</Card>
	</div>

	<!-- Expenses Section -->
	<div>
		<div class="mb-4 flex flex-col justify-between gap-1 sm:flex-row sm:items-center">
			<div>
				<h2 class="text-lg font-bold text-obsidian sm:text-xl dark:text-paper">
					{t('history.categoryExpensesSectionTitle')}
				</h2>
				<p class="text-xs text-slate dark:text-pebble">
					{t('history.categoryExpensesSectionSubtitle')}
				</p>
			</div>
			{#if data.totalCount !== undefined && data.totalCount > 0}
				<div class="self-start sm:self-auto">
					<span
						class="rounded-full bg-fog px-3 py-1 text-xs font-semibold text-charcoal dark:bg-dark-surface dark:text-linen-mist"
					>
						{t('history.totalExpensesCount', { count: data.totalCount })}
					</span>
				</div>
			{/if}
		</div>

		{#if !data.expenses || data.expenses.length === 0}
			<!-- Empty State -->
			<Card variant="tinted" padding="lg" class="text-center">
				<div
					class="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-linen-mist dark:bg-spruce/60"
				>
					<HugeiconsIcon
						icon={Invoice01Icon}
						class="h-6 w-6 text-forest-ink dark:text-lime-voltage"
					/>
				</div>
				<h3 class="mt-4 text-base font-bold text-forest-ink sm:text-lg dark:text-linen-mist">
					{t('history.noCategoryExpensesTitle')}
				</h3>
				<p class="mx-auto mt-2 max-w-md text-xs text-charcoal sm:text-sm dark:text-pebble">
					{t('history.noCategoryExpensesDesc')}
				</p>
			</Card>
		{:else}
			<div class="space-y-3">
				{#each data.expenses as exp (exp.id)}
					<div
						class="flex flex-col justify-between gap-3 rounded-xl border border-fog bg-paper p-4 transition-colors sm:flex-row sm:items-center dark:border-dark-border dark:bg-dark-card"
					>
						<!-- Left: Details -->
						<div class="flex items-start gap-3.5">
							<div
								class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl {exp.isSavings
									? 'bg-spruce/15 text-spruce dark:bg-spruce/40 dark:text-lime-voltage'
									: 'bg-linen-mist/80 text-forest-ink dark:bg-dark-surface dark:text-lime-voltage'}"
							>
								{#if exp.isSavings}
									<HugeiconsIcon icon={PiggyBankIcon} class="h-5 w-5" />
								{:else}
									<HugeiconsIcon icon={Coins01Icon} class="h-5 w-5" />
								{/if}
							</div>

							<div>
								<div class="flex flex-wrap items-center gap-2">
									<h3 class="text-base font-bold text-obsidian dark:text-paper">
										{exp.name}
									</h3>
									<span
										class="rounded-full bg-fog px-2.5 py-0.5 text-[11px] font-semibold text-charcoal dark:bg-dark-surface dark:text-linen-mist"
									>
										{exp.categoryName}
									</span>
									{#if exp.isSavings}
										<span
											class="rounded-full bg-spruce/10 px-2 py-0.5 text-[10px] font-bold text-spruce dark:bg-spruce/30 dark:text-lime-voltage"
										>
											{t('categories.savingsBadge')}
										</span>
									{/if}
								</div>

								<div
									class="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate dark:text-pebble"
								>
									<span class="flex items-center gap-1">
										<HugeiconsIcon icon={Calendar01Icon} class="h-3.5 w-3.5" />
										<span>{formatDate(exp.date, getLocale())}</span>
									</span>
									{#if exp.time}
										<span>•</span>
										<span class="flex items-center gap-1">
											<HugeiconsIcon icon={Clock01Icon} class="h-3.5 w-3.5" />
											<span>{exp.time}</span>
										</span>
									{/if}
									{#if exp.notes}
										<span>•</span>
										<span class="text-charcoal/80 italic dark:text-linen-mist/80">"{exp.notes}"</span>
									{/if}
								</div>
							</div>
						</div>

						<!-- Right: Amount (View-only, strictly no Edit or Delete buttons) -->
						<div
							class="flex items-center justify-between gap-4 border-t border-fog pt-3 sm:border-0 sm:pt-0"
						>
							<p
								class="text-lg font-black tracking-tight text-forest-ink sm:text-xl dark:text-lime-voltage"
							>
								{formatRupiah(exp.amount)}
							</p>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</div>
</main>
