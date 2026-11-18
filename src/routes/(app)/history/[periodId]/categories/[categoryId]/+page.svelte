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
		Coins01Icon
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
</main>
