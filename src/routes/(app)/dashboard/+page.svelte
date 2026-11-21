<script lang="ts">
	import type { PageProps } from './$types.js';
	import Button from '#lib/components/Button.svelte';
	import Card from '#lib/components/Card.svelte';
	import ProgressBar from '#lib/components/ProgressBar.svelte';
	import { formatRupiah, formatDate } from '#lib/validation/onboarding.js';
	import { t, getLocale } from '#lib/i18n/index.js';
	import { resolve } from '$app/paths';
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import {
		Calendar01Icon,
		PiggyBankIcon,
		Wallet01Icon,
		Alert02Icon,
		Invoice01Icon,
		Coins01Icon
	} from '@hugeicons/core-free-icons';

	let { data }: PageProps = $props();

	// In-place category expansion toggle (default: top 4)
	let showAllCategories = $state(false);

	const sortedCategories = $derived(
		[...(data.categories ?? [])].sort(
			(a, b) => (b.allocation ?? 0) - (a.allocation ?? 0) || (b.spent ?? 0) - (a.spent ?? 0)
		)
	);

	const visibleCategories = $derived(
		showAllCategories ? sortedCategories : sortedCategories.slice(0, 4)
	);
</script>

<main class="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
	<!-- Welcome Header -->
	<div class="mb-6 flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
		<div>
			<h1 class="text-2xl font-extrabold text-obsidian sm:text-3xl dark:text-paper">
				{t('dashboard.welcome', { name: data.user?.name ?? t('common.user') })}
			</h1>
			<p class="mt-1 text-sm text-slate dark:text-pebble">
				{t('dashboard.overviewSubtitle')}
			</p>
		</div>

		{#if data.period}
			<div class="flex flex-wrap items-center gap-2">
				<div
					class="flex items-center gap-2 rounded-xl border border-fog bg-fog/40 px-3.5 py-1.5 text-xs font-medium text-forest-ink dark:border-dark-border dark:bg-dark-card dark:text-linen-mist"
				>
					<HugeiconsIcon
						icon={Calendar01Icon}
						class="h-4 w-4 text-forest-ink dark:text-lime-voltage"
					/>
					<span>
						{formatDate(data.period.startDate, getLocale())} – {formatDate(
							data.period.endDate,
							getLocale()
						)}
					</span>
				</div>
				<a href={resolve('/(app)/expenses/new')}>
					<Button variant="primary" size="sm" class="font-bold shadow-sm">
						{t('dashboard.addExpenseButton')}
					</Button>
				</a>
			</div>
		{/if}
	</div>

	<!-- Warning Banner when total spent > 80% -->
	{#if data.summary.isWarning80}
		<div
			role="alert"
			data-testid="banner-warning-80"
			class="mb-6 flex items-start gap-3 rounded-xl border border-alarm-red/40 bg-alarm-red/10 p-4 text-alarm-red dark:border-alarm-red/50 dark:bg-alarm-red/20"
		>
			<HugeiconsIcon icon={Alert02Icon} class="mt-0.5 h-5 w-5 shrink-0 text-alarm-red" />
			<div class="text-sm">
				<p class="font-bold">{t('dashboard.warning80Title')}</p>
				<p class="mt-0.5 text-xs text-alarm-red/90">
					{t('dashboard.warning80Desc', {
						percent: data.summary.spentPercentage,
						spent: formatRupiah(data.summary.totalSpent),
						total: formatRupiah(data.summary.totalIncome)
					})}
				</p>
			</div>
		</div>
	{/if}

	{#if !data.period}
		<!-- Empty state when no active period is found -->
		<Card variant="tinted" padding="lg" class="text-center">
			<div
				class="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-linen-mist dark:bg-spruce/60"
			>
				<HugeiconsIcon icon={Wallet01Icon} class="h-6 w-6 text-forest-ink dark:text-lime-voltage" />
			</div>
			<h2 class="mt-4 text-lg font-bold text-forest-ink dark:text-linen-mist">
				{t('dashboard.emptyPeriodTitle')}
			</h2>
			<p class="mx-auto mt-2 max-w-md text-sm text-charcoal dark:text-pebble">
				{t('dashboard.emptyPeriodDesc')}
			</p>
			<div class="mt-5">
				<a href={resolve('/onboarding')}>
					<Button variant="primary" size="md">{t('dashboard.startSetup')}</Button>
				</a>
			</div>
		</Card>
	{:else}
		<!-- HERO BALANCE CARD -->
		<section aria-label={t('dashboard.sectionPeriodSummary')} class="mb-8">
			<Card variant="default" padding="lg" class="shadow-sm">
				<div
					class="flex items-center justify-between border-b border-fog pb-3.5 dark:border-dark-border"
				>
					<div>
						<span
							class="text-xs font-semibold tracking-wider text-slate uppercase dark:text-pebble"
						>
							{t('dashboard.periodTitle')}
						</span>
						<h2 class="text-base font-bold text-obsidian sm:text-lg dark:text-paper">
							{t('dashboard.budgetSummary')}
						</h2>
					</div>
					<div class="flex items-center gap-1.5 text-xs font-semibold text-slate dark:text-pebble">
						<span class="inline-block h-2 w-2 rounded-full bg-lime-voltage"></span>
						<span>{t('dashboard.payDayPrefix', { day: data.period.payDay })}</span>
					</div>
				</div>

				<!-- Hero Balance & Usage Progress -->
				<div class="mt-4">
					<span class="text-xs font-medium text-slate dark:text-pebble">
						{t('dashboard.remainingBudget')}
					</span>
					<div class="mt-1 flex flex-wrap items-baseline justify-between gap-2">
						<p
							data-testid="hero-remaining-balance"
							class="text-3xl font-black tracking-tight sm:text-4xl {data.summary.remaining < 0
								? 'text-alarm-red'
								: 'text-forest-ink dark:text-lime-voltage'}"
						>
							{formatRupiah(data.summary.remaining)}
						</p>
						<span
							class="text-xs font-bold {data.summary.isWarning80
								? 'text-alarm-red'
								: 'text-slate dark:text-pebble'}"
						>
							{data.summary.spentPercentage}% {t('dashboard.usageStatus')}
						</span>
					</div>

					<div class="mt-3">
						<ProgressBar
							value={data.summary.totalSpent}
							max={data.summary.totalIncome || 1}
							variant={data.summary.isWarning80 ? 'danger' : 'lime'}
						/>
					</div>

					<!-- Income & Spent Row Pills -->
					<div
						class="mt-4 grid grid-cols-2 gap-3 border-t border-fog/60 pt-3 dark:border-dark-border/60"
					>
						<div
							class="rounded-xl border border-fog/80 bg-fog/30 p-3 dark:border-dark-border/60 dark:bg-dark-surface/50"
						>
							<span class="text-xs font-medium text-slate dark:text-pebble"
								>{t('dashboard.totalIncome')}</span
							>
							<p
								class="mt-1 font-mono text-sm font-extrabold text-forest-ink sm:text-base dark:text-paper"
							>
								{formatRupiah(data.summary.totalIncome)}
							</p>
						</div>

						<div
							class="rounded-xl border border-fog/80 bg-fog/30 p-3 dark:border-dark-border/60 dark:bg-dark-surface/50"
						>
							<span class="text-xs font-medium text-slate dark:text-pebble"
								>{t('dashboard.totalSpent')}</span
							>
							<p
								class="mt-1 font-mono text-sm font-extrabold text-obsidian sm:text-base dark:text-paper"
							>
								{formatRupiah(data.summary.totalSpent)}
							</p>
						</div>
					</div>
				</div>
			</Card>
		</section>

		<!-- RESPONSIVE SIDE-BY-SIDE ON DESKTOP, SCROLLABLE ON MOBILE -->
		<div class="grid grid-cols-1 gap-8 lg:grid-cols-12">
			<!-- LEFT / MAIN COLUMN: CATEGORY BREAKDOWN -->
			<section aria-label={t('dashboard.sectionCategoryAllocation')} class="lg:col-span-7">
				<div class="mb-4 flex items-center justify-between">
					<div>
						<h2 class="text-lg font-extrabold text-obsidian sm:text-xl dark:text-paper">
							{t('dashboard.categoryBreakdown')}
						</h2>
						<p class="text-xs text-slate dark:text-pebble">
							{t('dashboard.categoryHelp')}
						</p>
					</div>
					<div class="flex items-center gap-2">
						<a href={resolve('/(app)/categories')}>
							<Button variant="secondary" size="sm" class="text-xs font-semibold">
								{t('dashboard.manageCategories')}
							</Button>
						</a>
						<span
							class="rounded-full bg-fog px-2.5 py-0.5 text-xs font-semibold text-slate dark:bg-dark-border dark:text-linen-mist"
						>
							{t('dashboard.categoriesCount', { count: data.categories.length })}
						</span>
					</div>
				</div>

				{#if data.categories.length === 0}
					<Card variant="default" padding="md" class="text-center">
						<p class="text-sm text-slate dark:text-pebble">
							{t('dashboard.noCategories')}
						</p>
					</Card>
				{:else}
					<div class="space-y-3">
						{#each visibleCategories as cat (cat.id)}
							<div
								class="rounded-xl border p-3.5 transition-colors sm:p-4 {cat.isSavings
									? 'border-spruce/30 bg-linen-mist/25 dark:border-lime-voltage/30 dark:bg-spruce/15'
									: 'border-fog bg-paper dark:border-dark-border dark:bg-dark-card'}"
							>
								<!-- Category Header -->
								<div class="flex items-start justify-between gap-3">
									<div class="flex items-center gap-2.5">
										{#if cat.isSavings}
											<div
												class="flex h-8 w-8 items-center justify-center rounded-lg bg-spruce/10 text-spruce dark:bg-lime-voltage/20 dark:text-lime-voltage"
											>
												<HugeiconsIcon icon={PiggyBankIcon} class="h-4.5 w-4.5" />
											</div>
										{:else}
											<div
												class="flex h-8 w-8 items-center justify-center rounded-lg bg-fog text-forest-ink dark:bg-dark-border dark:text-linen-mist"
											>
												<HugeiconsIcon icon={Wallet01Icon} class="h-4.5 w-4.5" />
											</div>
										{/if}
										<div>
											<div class="flex items-center gap-2">
												<h3 class="font-bold text-obsidian dark:text-paper">
													{cat.name}
												</h3>
												{#if cat.isSavings}
													<span
														class="rounded-full bg-spruce/15 px-2 py-0.5 text-xs font-bold tracking-wide text-spruce dark:bg-lime-voltage/25 dark:text-lime-voltage"
													>
														{t('categories.savingsBadge')}
													</span>
												{/if}
												{#if cat.status === 'frozen'}
													<span
														data-testid="badge-frozen"
														class="rounded-full bg-fog px-2 py-0.5 text-xs font-bold tracking-wide text-slate dark:bg-dark-border dark:text-pebble"
													>
														{t('common.frozen')}
													</span>
												{/if}
											</div>
											<span class="text-xs text-slate dark:text-pebble">
												{t('dashboard.allocationLabel', {
													amount: formatRupiah(cat.allocation),
													percent: cat.percentage
												})}
											</span>
										</div>
									</div>

									<!-- Balance / Spent display -->
									<div class="text-right">
										{#if cat.isSavings}
											<span class="text-xs text-slate dark:text-pebble"
												>{t('dashboard.collected')}</span
											>
											<p
												class="font-mono text-sm font-black text-spruce sm:text-base dark:text-lime-voltage"
											>
												{formatRupiah(cat.spent)}
											</p>
										{:else}
											<span class="text-xs text-slate dark:text-pebble"
												>{t('dashboard.balanceRemaining')}</span
											>
											<p
												class="font-mono text-sm font-black sm:text-base {cat.balance < 0
													? 'text-alarm-red'
													: 'text-forest-ink dark:text-linen-mist'}"
											>
												{formatRupiah(cat.balance)}
											</p>
										{/if}
									</div>
								</div>

								<!-- Progress Bar per kategori -->
								<div class="mt-3">
									{#if cat.isSavings}
										<!-- Visual treatment berbeda: progress = positif (terkumpul menuju target alokasi) -->
										<ProgressBar value={cat.spent} max={cat.allocation || 1} variant="savings" />
										<div
											class="mt-1.5 flex items-center justify-between text-xs text-slate dark:text-pebble"
										>
											<span
												>{t('dashboard.balanceLabel', {
													amount: formatRupiah(cat.balance)
												})}</span
											>
											<span class="font-semibold text-spruce dark:text-lime-voltage">
												{t('dashboard.targetAchieved', { percent: cat.spentPercentage })}
											</span>
										</div>
									{:else}
										<!-- Progress bar menampilkan saldo: belum ada expense -> saldo penuh (100% full) -->
										<ProgressBar
											value={cat.balance}
											max={cat.allocation || 1}
											variant={cat.remainingPercentage <= 20 ? 'danger' : 'lime'}
										/>
										<div
											class="mt-1.5 flex items-center justify-between text-xs text-slate dark:text-pebble"
										>
											<span>{t('dashboard.spentLabel', { amount: formatRupiah(cat.spent) })}</span>
											<span
												class="font-semibold {cat.remainingPercentage <= 20
													? 'font-bold text-alarm-red'
													: 'text-slate dark:text-linen-mist'}"
											>
												{t('dashboard.balanceRemainingPercent', {
													percent: cat.remainingPercentage
												})}
											</span>
										</div>
									{/if}
								</div>
							</div>
						{/each}

						<!-- In-Place Toggle Button for >4 Categories -->
						{#if data.categories.length > 4}
							<div class="mt-3 text-center">
								<Button
									type="button"
									variant="secondary"
									size="sm"
									onclick={() => (showAllCategories = !showAllCategories)}
									class="w-full text-xs font-semibold sm:w-auto"
								>
									{showAllCategories
										? t('dashboard.showLessCategories')
										: t('dashboard.showAllCategories', { count: data.categories.length })}
								</Button>
							</div>
						{/if}
					</div>
				{/if}
			</section>

			<!-- RIGHT / SIDE COLUMN: RECENT EXPENSES & QUICK ACTIONS -->
			<section aria-label={t('dashboard.sectionRecentExpenses')} class="space-y-6 lg:col-span-5">
				<Card variant="default" padding="lg" class="shadow-sm">
					<div class="mb-4 flex items-center justify-between">
						<div>
							<h2 class="text-lg font-extrabold text-obsidian dark:text-paper">
								{t('dashboard.recentExpenses')}
							</h2>
							<p class="text-xs text-slate dark:text-pebble">
								{t('dashboard.recentExpensesDesc')}
							</p>
						</div>
						<div class="flex items-center gap-2">
							<a
								href={resolve('/(app)/expenses')}
								class="text-xs font-bold text-forest-ink hover:underline dark:text-lime-voltage"
							>
								{t('dashboard.viewAll')}
							</a>
							<HugeiconsIcon icon={Invoice01Icon} class="h-5 w-5 text-slate dark:text-pebble" />
						</div>
					</div>

					{#if data.recentExpenses.length === 0}
						<!-- Empty state: no expenses recorded yet -->
						<div
							class="rounded-xl border border-dashed border-fog bg-fog/20 p-6 text-center dark:border-dark-border dark:bg-dark-surface/40"
						>
							<div
								class="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-linen-mist/80 text-forest-ink dark:bg-spruce/40 dark:text-lime-voltage"
							>
								<HugeiconsIcon icon={Coins01Icon} class="h-5 w-5" />
							</div>
							<h3 class="mt-3 text-sm font-bold text-obsidian dark:text-paper">
								{t('dashboard.noExpenses')}
							</h3>
							<p class="mt-1 text-xs text-slate dark:text-pebble">
								{t('dashboard.noExpensesHelp')}
							</p>
							<div class="mt-4">
								<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
								<a href="/expenses/new">
									<Button variant="primary" size="sm">{t('expenses.newExpenseButton')}</Button>
								</a>
							</div>
						</div>
					{:else}
						<div class="divide-y divide-fog dark:divide-dark-border">
							{#each data.recentExpenses as expense (expense.id)}
								<div class="flex items-center justify-between py-3">
									<div>
										<p class="text-sm font-semibold text-obsidian dark:text-paper">
											{expense.name}
										</p>
										<div class="flex items-center gap-2 text-xs text-slate dark:text-pebble">
											<span>{expense.categoryName}</span>
											<span>•</span>
											<span>{formatDate(expense.date, getLocale())}</span>
										</div>
									</div>
									<p class="text-sm font-bold text-forest-ink dark:text-lime-voltage">
										{formatRupiah(expense.amount)}
									</p>
								</div>
							{/each}
						</div>
						<div class="mt-4 border-t border-fog pt-3 text-center dark:border-dark-border">
							<a
								href={resolve('/(app)/expenses')}
								class="text-xs font-bold text-forest-ink hover:underline dark:text-lime-voltage"
							>
								{t('dashboard.openAllExpenses')}
							</a>
						</div>
					{/if}
				</Card>

				<!-- Periode Detail Card -->
				<Card variant="tinted" padding="md">
					<h3 class="text-sm font-bold text-forest-ink dark:text-linen-mist">
						{t('dashboard.aboutPeriod')}
					</h3>
					<p class="mt-1.5 text-xs leading-relaxed text-charcoal dark:text-linen-mist/80">
						{t('dashboard.aboutPeriodDesc', {
							startDate: formatDate(data.period.startDate, getLocale()),
							endDate: formatDate(data.period.endDate, getLocale())
						})}
					</p>
				</Card>
			</section>
		</div>
	{/if}
</main>
