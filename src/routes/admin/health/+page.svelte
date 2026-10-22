<script lang="ts">
	import type { PageProps } from './$types.js';
	import Card from '#lib/components/Card.svelte';
	import Badge from '#lib/components/Badge.svelte';
	import { t } from '#lib/i18n/index.js';
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import {
		CheckmarkCircle02Icon,
		Alert02Icon,
		Mail01Icon,
		ArrowUpRight01Icon,
		AiBrain01Icon,
		DatabaseIcon
	} from '@hugeicons/core-free-icons';

	let { data }: PageProps = $props();

	const health = $derived(data.health);

	const tableNameLabels: Record<string, string> = {
		user: 'user (Pengguna)',
		session: 'session (Sesi Login)',
		monthlyPeriod: 'monthly_period (Periode Bulan)',
		category: 'category (Kategori Budget)',
		expense: 'expense (Pengeluaran)',
		incomeSource: 'income_source (Sumber Pemasukan)',
		categoryTemplate: 'category_template (Template Kategori)',
		userSettings: 'user_settings (Pengaturan Pengguna)',
		healthCheck: 'health_check (Pemeriksaan Sistem)'
	};
</script>

<div class="space-y-8">
	<!-- Page Header -->
	<div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
		<div>
			<div class="flex items-center gap-2">
				<h1 class="text-2xl font-black tracking-tight text-obsidian sm:text-3xl dark:text-paper">
					{t('admin.health.title')}
				</h1>
				{#if health.databaseStatus === 'healthy'}
					<Badge variant="lime">
						<HugeiconsIcon icon={CheckmarkCircle02Icon} size={13} />
						<span>{t('admin.health.normal')}</span>
					</Badge>
				{:else}
					<Badge variant="danger">
						<HugeiconsIcon icon={Alert02Icon} size={13} />
						<span>{t('admin.health.degraded')}</span>
					</Badge>
				{/if}
			</div>
			<p class="mt-1 text-sm text-slate dark:text-pebble">
				{t('admin.health.subtitle')}
			</p>
		</div>
	</div>

	<!-- Health Summary Cards -->
	<div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
		<!-- D1 Database Rows -->
		<Card variant="default" class="p-5">
			<div class="flex items-center justify-between">
				<span class="text-xs font-bold tracking-wider text-slate uppercase dark:text-pebble">
					{t('admin.health.estimatedD1Rows')}
				</span>
				<div
					class="rounded-lg bg-linen-mist p-2 text-forest-ink dark:bg-spruce dark:text-lime-voltage"
				>
					<HugeiconsIcon icon={DatabaseIcon} size={20} />
				</div>
			</div>
			<div class="mt-3">
				<span class="text-3xl font-black text-obsidian dark:text-paper">
					{health.totalD1RowsEstimate.toLocaleString('id-ID')}
				</span>
				<p class="mt-1 text-xs text-slate dark:text-pebble">
					{t('admin.health.queryLatency', { latency: health.databaseLatencyMs })}
				</p>
			</div>
		</Card>

		<!-- AI Call Count -->
		<Card variant="default" class="p-5">
			<div class="flex items-center justify-between">
				<span class="text-xs font-bold tracking-wider text-slate uppercase dark:text-pebble">
					{t('admin.health.totalAiCalls')}
				</span>
				<div
					class="rounded-lg bg-linen-mist p-2 text-forest-ink dark:bg-spruce dark:text-lime-voltage"
				>
					<HugeiconsIcon icon={AiBrain01Icon} size={20} />
				</div>
			</div>
			<div class="mt-3">
				<span class="text-3xl font-black text-forest-ink dark:text-lime-voltage">
					{health.aiCallsCount.toLocaleString('id-ID')}
				</span>
				<p class="mt-1 text-xs text-slate dark:text-pebble">
					{t('admin.health.aiCallsDesc')}
				</p>
			</div>
		</Card>

		<!-- Resend Email Status -->
		<Card variant="default" class="p-5">
			<div class="flex items-center justify-between">
				<span class="text-xs font-bold tracking-wider text-slate uppercase dark:text-pebble">
					{t('admin.health.emailService')}
				</span>
				<div
					class="rounded-lg bg-linen-mist p-2 text-forest-ink dark:bg-spruce dark:text-lime-voltage"
				>
					<HugeiconsIcon icon={Mail01Icon} size={20} />
				</div>
			</div>
			<div class="mt-3">
				<span class="text-sm font-bold text-obsidian dark:text-paper">
					{t('admin.health.emailRate')}
				</span>
				<p class="mt-1 text-xs text-slate dark:text-pebble">
					{t('admin.health.emailFreeQuota')}
				</p>
			</div>
		</Card>
	</div>

	<!-- Section 1: D1 Database Breakdown -->
	<Card variant="default" class="p-6">
		<div class="flex items-center justify-between border-b border-fog pb-4 dark:border-dark-border">
			<div class="flex items-center gap-2.5">
				<div
					class="rounded-lg bg-linen-mist p-2 text-forest-ink dark:bg-spruce dark:text-lime-voltage"
				>
					<HugeiconsIcon icon={DatabaseIcon} size={20} />
				</div>
				<div>
					<h2 class="text-lg font-bold text-obsidian dark:text-paper">
						{t('admin.health.d1Breakdown')}
					</h2>
					<p class="text-xs text-slate dark:text-pebble">
						{t('admin.health.d1Limits')}
					</p>
				</div>
			</div>
			<Badge variant="lime">D1 Binding: DB</Badge>
		</div>

		<div class="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
			{#each Object.entries(health.tableBreakdown) as [tblKey, count] (tblKey)}
				<div
					class="flex items-center justify-between rounded-xl border border-fog bg-paper/60 p-3.5 transition dark:border-dark-border dark:bg-dark-card/60"
				>
					<div>
						<p class="font-mono text-xs font-semibold text-obsidian dark:text-paper">
							{tableNameLabels[tblKey] || tblKey}
						</p>
					</div>
					<span class="font-mono text-sm font-bold text-forest-ink dark:text-lime-voltage">
						{count.toLocaleString('id-ID')}
					</span>
				</div>
			{/each}
		</div>
	</Card>

	<!-- Section 2: AI Usage Limits & Monitoring -->
	<Card variant="default" class="p-6">
		<div class="flex items-center justify-between border-b border-fog pb-4 dark:border-dark-border">
			<div class="flex items-center gap-2.5">
				<div
					class="rounded-lg bg-linen-mist p-2 text-forest-ink dark:bg-spruce dark:text-lime-voltage"
				>
					<HugeiconsIcon icon={AiBrain01Icon} size={20} />
				</div>
				<div>
					<h2 class="text-lg font-bold text-obsidian dark:text-paper">
						{t('admin.health.aiMonitoring')}
					</h2>
					<p class="text-xs text-slate dark:text-pebble">
						{t('admin.health.aiFailover')}
					</p>
				</div>
			</div>
		</div>

		<div class="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
			<!-- Groq Card -->
			<div
				class="rounded-xl border border-fog bg-linen-mist/30 p-4 dark:border-dark-border dark:bg-dark-surface/40"
			>
				<div class="flex items-center justify-between">
					<h3 class="font-bold text-obsidian dark:text-paper">{t('admin.health.groqTitle')}</h3>
					<Badge variant="lime">Llama 3.3 70B</Badge>
				</div>
				<ul class="mt-3 space-y-1 text-xs text-slate dark:text-pebble">
					<li>• {t('admin.health.groqLimit')}</li>
					<li>• {t('admin.health.groqSpeed')}</li>
					<li>• {t('admin.health.groqPrivacy')}</li>
				</ul>
			</div>

			<!-- Gemini Card -->
			<div
				class="rounded-xl border border-fog bg-linen-mist/30 p-4 dark:border-dark-border dark:bg-dark-surface/40"
			>
				<div class="flex items-center justify-between">
					<h3 class="font-bold text-obsidian dark:text-paper">{t('admin.health.geminiTitle')}</h3>
					<Badge variant="neutral">Gemini 1.5 Flash</Badge>
				</div>
				<ul class="mt-3 space-y-1 text-xs text-slate dark:text-pebble">
					<li>• {t('admin.health.geminiLimit')}</li>
					<li>• {t('admin.health.geminiFallback')}</li>
					<li>• {t('admin.health.geminiPrivacy')}</li>
				</ul>
			</div>
		</div>
	</Card>

	<!-- Section 3: Resend Email Usage & Manual Check -->
	<Card variant="default" class="p-6">
		<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
			<div class="flex items-center gap-3">
				<div
					class="rounded-lg bg-linen-mist p-2.5 text-forest-ink dark:bg-spruce dark:text-lime-voltage"
				>
					<HugeiconsIcon icon={Mail01Icon} size={22} />
				</div>
				<div>
					<h2 class="text-lg font-bold text-obsidian dark:text-paper">
						{t('admin.health.resendTitle')}
					</h2>
					<p class="text-xs text-slate dark:text-pebble">
						{t('admin.health.resendDesc')}
					</p>
				</div>
			</div>

			<a
				href="https://resend.com/emails"
				target="_blank"
				rel="noopener noreferrer"
				class="inline-flex items-center justify-center gap-2 rounded-full bg-forest-ink px-4 py-2.5 text-xs font-bold text-lime-voltage shadow-sm transition hover:bg-forest-ink/90 dark:bg-lime-voltage dark:text-forest-ink dark:hover:bg-lime-voltage/90"
			>
				<span>{t('admin.health.openResendDashboard')}</span>
				<HugeiconsIcon icon={ArrowUpRight01Icon} size={15} />
			</a>
		</div>

		<div
			class="mt-4 rounded-xl border border-fog bg-paper p-4 text-xs text-slate dark:border-dark-border dark:bg-dark-surface dark:text-pebble"
		>
			<p>
				{t('admin.health.resendNote')}
			</p>
		</div>
	</Card>
</div>
