<script lang="ts">
	import type { PageProps } from './$types.js';
	import Button from '#lib/components/Button.svelte';
	import Card from '#lib/components/Card.svelte';
	import { resolve } from '$app/paths';
	import { formatRupiah, formatDate } from '#lib/validation/onboarding.js';
	import { t, getLocale } from '#lib/i18n/index.js';
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import { Calendar01Icon, ArrowRight02Icon, Invoice01Icon } from '@hugeicons/core-free-icons';

	let { data }: PageProps = $props();
</script>

<main class="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
	<!-- Page Title -->
	<div class="mb-6">
		<h1 class="text-2xl font-extrabold text-obsidian sm:text-3xl dark:text-paper">
			{t('history.title')}
		</h1>
		<p class="mt-1 text-sm text-slate dark:text-pebble">
			{t('history.subtitle')}
		</p>
	</div>

	{#if data.periods.length === 0}
		<!-- Empty State -->
		<Card class="flex flex-col items-center justify-center p-8 text-center sm:p-12">
			<div
				class="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-fog text-slate dark:bg-spruce/30 dark:text-linen-mist"
			>
				<HugeiconsIcon icon={Invoice01Icon} class="h-7 w-7" />
			</div>
			<h2 class="text-lg font-bold text-obsidian dark:text-paper">{t('history.noHistory')}</h2>
			<p class="mt-1.5 max-w-md text-sm text-slate dark:text-pebble">
				{t('history.noHistoryDesc')}
			</p>
			<div class="mt-6">
				<a href={resolve('/(app)/dashboard')}>
					<Button variant="primary" size="sm">{t('common.back')}</Button>
				</a>
			</div>
		</Card>
	{:else}
		<div class="space-y-4">
			{#each data.periods as period (period.id)}
				<a
					href={resolve('/(app)/history/[periodId]', { periodId: period.id })}
					class="block transition hover:translate-y-[-1px]"
				>
					<Card class="p-5 transition-shadow hover:shadow-md">
						<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
							<div>
								<div class="flex flex-wrap items-center gap-2">
									<span class="flex items-center gap-1.5 font-bold text-obsidian dark:text-paper">
										<HugeiconsIcon
											icon={Calendar01Icon}
											class="h-4 w-4 text-forest-ink dark:text-lime-voltage"
										/>
										{formatDate(period.startDate, getLocale())} – {formatDate(
											period.endDate,
											getLocale()
										)}
									</span>
									<span
										class="rounded-full bg-fog px-2.5 py-0.5 text-[11px] font-semibold text-slate dark:bg-spruce/40 dark:text-linen-mist"
									>
										{t('history.periodCompleted')}
									</span>
								</div>

								<!-- Financial Metrics Grid -->
								<div class="mt-3.5 grid grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-4">
									<div>
										<span class="text-[11px] font-medium text-slate dark:text-pebble">
											{t('dashboard.totalIncome')}
										</span>
										<p class="text-sm font-bold text-obsidian dark:text-paper">
											{formatRupiah(period.totalIncome)}
										</p>
									</div>
									<div>
										<span class="text-[11px] font-medium text-slate dark:text-pebble">
											{t('dashboard.totalSpent')}
										</span>
										<p class="text-sm font-bold text-obsidian dark:text-paper">
											{formatRupiah(period.totalSpent)}
											<span class="text-xs font-normal text-slate dark:text-pebble">
												({period.spentPercentage}%)
											</span>
										</p>
									</div>
									<div>
										<span class="text-[11px] font-medium text-slate dark:text-pebble">
											{t('dashboard.remainingBudget')}
										</span>
										<p
											class={`text-sm font-bold ${
												period.remaining >= 0
													? 'text-forest-ink dark:text-lime-voltage'
													: 'text-alarm-red'
											}`}
										>
											{formatRupiah(period.remaining)}
										</p>
									</div>
								</div>
							</div>

							<!-- AI Summary badge or action link -->
							<div class="flex items-center gap-2 self-end sm:self-center">
								<span
									class="flex items-center gap-1 text-xs font-bold text-forest-ink transition group-hover:underline dark:text-lime-voltage"
								>
									<span>{t('history.openDetail')}</span>
									<HugeiconsIcon icon={ArrowRight02Icon} class="h-4 w-4" />
								</span>
							</div>
						</div>
					</Card>
				</a>
			{/each}
		</div>
	{/if}
</main>
