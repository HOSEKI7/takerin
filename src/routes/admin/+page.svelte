<script lang="ts">
	import type { PageProps } from './$types.js';
	import Card from '#lib/components/Card.svelte';
	import Badge from '#lib/components/Badge.svelte';
	import { formatRupiah } from '#lib/validation/onboarding.js';
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import {
		UserGroupIcon,
		Activity01Icon,
		Invoice01Icon,
		PieChart01Icon
	} from '@hugeicons/core-free-icons';

	let { data }: PageProps = $props();

	const analytics = $derived(data.analytics);

	// Max count for scaling category frequency bar
	const maxCategoryCount = $derived.by(() => {
		if (!analytics.topCategories || analytics.topCategories.length === 0) return 1;
		return Math.max(...analytics.topCategories.map((c) => c.count), 1);
	});
</script>

<div class="space-y-8">
	<!-- Page Header -->
	<div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
		<div>
			<div class="flex items-center gap-2">
				<h1 class="text-2xl font-black tracking-tight text-obsidian sm:text-3xl dark:text-paper">
					Dashboard Analytics
				</h1>
				<Badge variant="lime">Ringkasan</Badge>
			</div>
			<p class="mt-1 text-sm text-slate dark:text-pebble">
				Pantau metrik utama pengguna, aktivitas harian, pengeluaran, dan tren kategori platform
				Takerin.
			</p>
		</div>
	</div>

	<!-- Top Metric Cards Grid -->
	<div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
		<!-- Total Registered Users -->
		<Card variant="default" class="p-5">
			<div class="flex items-center justify-between">
				<span class="text-xs font-bold tracking-wider text-slate uppercase dark:text-pebble">
					Total Pengguna
				</span>
				<div
					class="rounded-lg bg-linen-mist p-2 text-forest-ink dark:bg-spruce dark:text-lime-voltage"
				>
					<HugeiconsIcon icon={UserGroupIcon} size={20} />
				</div>
			</div>
			<div class="mt-3">
				<span class="text-3xl font-black text-obsidian dark:text-paper">
					{analytics.totalUsers.toLocaleString('id-ID')}
				</span>
				<p class="mt-1 text-xs text-slate dark:text-pebble">
					Pengguna yang telah terdaftar di database
				</p>
			</div>
		</Card>

		<!-- Daily Active Users (DAU) -->
		<Card variant="default" class="p-5">
			<div class="flex items-center justify-between">
				<span class="text-xs font-bold tracking-wider text-slate uppercase dark:text-pebble">
					Pengguna Aktif (DAU)
				</span>
				<div
					class="rounded-lg bg-linen-mist p-2 text-forest-ink dark:bg-spruce dark:text-lime-voltage"
				>
					<HugeiconsIcon icon={Activity01Icon} size={20} />
				</div>
			</div>
			<div class="mt-3">
				<span class="text-3xl font-black text-forest-ink dark:text-lime-voltage">
					{analytics.dau.toLocaleString('id-ID')}
				</span>
				<p class="mt-1 text-xs text-slate dark:text-pebble">
					Aktif dalam 24 jam terakhir (sesi / login)
				</p>
			</div>
		</Card>

		<!-- Total Expenses Recorded -->
		<Card variant="default" class="p-5">
			<div class="flex items-center justify-between">
				<span class="text-xs font-bold tracking-wider text-slate uppercase dark:text-pebble">
					Total Catatan Pengeluaran
				</span>
				<div
					class="rounded-lg bg-linen-mist p-2 text-forest-ink dark:bg-spruce dark:text-lime-voltage"
				>
					<HugeiconsIcon icon={Invoice01Icon} size={20} />
				</div>
			</div>
			<div class="mt-3">
				<span class="text-3xl font-black text-obsidian dark:text-paper">
					{analytics.totalExpenses.toLocaleString('id-ID')}
				</span>
				<p class="mt-1 text-xs text-slate dark:text-pebble">
					Total nominal: <strong class="text-obsidian dark:text-paper"
						>{formatRupiah(analytics.totalExpenseAmount || 0)}</strong
					>
				</p>
			</div>
		</Card>
	</div>

	<!-- Top 10 Categories Breakdown -->
	<Card variant="default" class="p-6">
		<div class="flex items-center justify-between border-b border-fog pb-4 dark:border-dark-border">
			<div class="flex items-center gap-2.5">
				<div
					class="rounded-lg bg-linen-mist p-2 text-forest-ink dark:bg-spruce dark:text-lime-voltage"
				>
					<HugeiconsIcon icon={PieChart01Icon} size={20} />
				</div>
				<div>
					<h2 class="text-lg font-bold text-obsidian dark:text-paper">
						Top 10 Kategori Paling Populer
					</h2>
					<p class="text-xs text-slate dark:text-pebble">
						Berdasarkan frekuensi nama kategori yang dibuat oleh pengguna
					</p>
				</div>
			</div>
			<Badge variant="neutral">Frekuensi</Badge>
		</div>

		{#if analytics.topCategories && analytics.topCategories.length > 0}
			<div class="mt-6 space-y-4">
				{#each analytics.topCategories as cat, index (cat.name)}
					{@const percentageWidth = Math.round((cat.count / maxCategoryCount) * 100)}
					<div class="space-y-1.5">
						<div class="flex items-center justify-between text-xs font-semibold">
							<div class="flex items-center gap-2">
								<span
									class="flex h-5 w-5 items-center justify-center rounded-full bg-fog text-[10px] font-bold text-charcoal dark:bg-dark-surface dark:text-linen-mist"
								>
									{index + 1}
								</span>
								<span class="text-obsidian capitalize dark:text-paper">
									{cat.name}
								</span>
							</div>
							<span class="text-slate dark:text-pebble">
								{cat.count.toLocaleString('id-ID')} kali
							</span>
						</div>
						<!-- Visual Frequency Bar -->
						<div class="h-2 w-full overflow-hidden rounded-full bg-fog dark:bg-dark-surface">
							<div
								class="h-full rounded-full bg-forest-ink transition-all duration-500 dark:bg-lime-voltage"
								style:width="{percentageWidth}%"
							></div>
						</div>
					</div>
				{/each}
			</div>
		{:else}
			<div class="py-12 text-center">
				<p class="text-sm text-slate dark:text-pebble">Belum ada kategori yang tercatat.</p>
			</div>
		{/if}
	</Card>
</div>
