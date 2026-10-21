<script lang="ts">
	import type { PageProps } from './$types.js';
	import Button from '#lib/components/Button.svelte';
	import Card from '#lib/components/Card.svelte';
	import ProgressBar from '#lib/components/ProgressBar.svelte';
	import ThemeToggle from '#lib/components/ThemeToggle.svelte';
	import BrandLogo from '#lib/components/BrandLogo.svelte';
	import { resolve } from '$app/paths';
	import { formatRupiah, formatDateIndonesian } from '#lib/validation/onboarding.js';
	import { onMount } from 'svelte';
	import { untrack } from 'svelte';
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import {
		ArrowLeft02Icon,
		Wallet01Icon,
		Coins01Icon,
		PiggyBankIcon,
		AiChat02Icon,
		Alert02Icon
	} from '@hugeicons/core-free-icons';

	let { data }: PageProps = $props();

	// AI summary state
	let aiSummary = $state<string | null>(untrack(() => data.period.aiSummary));
	let isLoadingAi = $state<boolean>(untrack(() => !data.period.aiSummary));
	let aiError = $state<string>('');

	async function fetchAiSummary() {
		isLoadingAi = true;
		aiError = '';
		try {
			const res = await fetch(
				resolve('/api/periods/[periodId]/ai-summary', { periodId: data.period.id }),
				{
					method: 'POST'
				}
			);

			if (!res.ok) {
				const errData = (await res.json().catch(() => null)) as { error?: string } | null;
				aiError = errData?.error ?? 'Gagal membuat frasa analisis AI.';
				return;
			}

			const result = (await res.json()) as { aiSummary: string; cached: boolean };
			aiSummary = result.aiSummary;
		} catch (err) {
			console.error('Error fetching AI summary:', err);
			aiError = 'Terjadi kendala jaringan saat menghubungi layanan AI.';
		} finally {
			isLoadingAi = false;
		}
	}

	onMount(() => {
		if (!aiSummary) {
			fetchAiSummary();
		}
	});
</script>

<div
	class="min-h-screen bg-paper font-sans text-charcoal transition-colors dark:bg-dark-surface dark:text-linen-mist"
>
	<!-- App Header -->
	<header
		class="sticky top-0 z-20 border-b border-fog bg-paper/90 px-4 py-3.5 backdrop-blur sm:px-6 dark:border-dark-border dark:bg-dark-card/90"
	>
		<div class="mx-auto flex max-w-5xl items-center justify-between">
			<div class="flex items-center gap-3">
				<a
					href={resolve('/history')}
					class="flex h-9 w-9 items-center justify-center rounded-xl border border-fog bg-paper text-slate transition hover:bg-fog hover:text-obsidian dark:border-dark-border dark:bg-dark-surface dark:text-pebble dark:hover:text-paper"
					aria-label="Kembali ke Riwayat"
				>
					<HugeiconsIcon icon={ArrowLeft02Icon} class="h-4 w-4" />
				</a>
				<BrandLogo href="/dashboard" size="sm" />
				<span
					class="rounded-full bg-linen-mist px-2.5 py-0.5 text-xs font-semibold text-forest-ink dark:bg-spruce/60 dark:text-linen-mist"
				>
					Ringkasan Bulanan
				</span>
			</div>
			<div class="flex items-center gap-2 sm:gap-4">
				<a
					href={resolve('/dashboard')}
					class="hidden text-xs font-semibold text-charcoal transition hover:text-forest-ink sm:inline-block dark:text-linen-mist dark:hover:text-lime-voltage"
				>
					Dashboard
				</a>
				<a
					href={resolve('/history')}
					class="hidden text-xs font-semibold text-charcoal transition hover:text-forest-ink sm:inline-block dark:text-linen-mist dark:hover:text-lime-voltage"
				>
					Riwayat
				</a>
				<ThemeToggle />
			</div>
		</div>
	</header>

	<main class="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
		<!-- Period Header -->
		<div class="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
			<div>
				<div class="flex items-center gap-2">
					<span
						class="rounded-full bg-fog px-2.5 py-0.5 text-xs font-semibold text-slate dark:bg-spruce/40 dark:text-linen-mist"
					>
						Periode Selesai
					</span>
					<span class="text-xs text-slate dark:text-pebble">
						Tanggal Gajian: {data.period.payDay}
					</span>
				</div>
				<h1 class="mt-1 text-2xl font-extrabold text-obsidian sm:text-3xl dark:text-paper">
					{formatDateIndonesian(data.period.startDate)} – {formatDateIndonesian(
						data.period.endDate
					)}
				</h1>
			</div>

			<a href={resolve('/history')}>
				<Button variant="secondary" size="sm" class="flex items-center gap-1.5 self-start">
					<HugeiconsIcon icon={ArrowLeft02Icon} class="h-4 w-4" />
					<span>Daftar Riwayat</span>
				</Button>
			</a>
		</div>

		<!-- AI Summary Phrase Section -->
		<div class="mb-8">
			{#if isLoadingAi}
				<Card
					class="animate-pulse border-lime-voltage/40 bg-linen-mist/30 p-5 dark:border-lime-voltage/30 dark:bg-spruce/20"
				>
					<div class="flex items-center gap-3">
						<div
							class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-lime-voltage/30 text-forest-ink dark:bg-spruce/60 dark:text-lime-voltage"
						>
							<HugeiconsIcon icon={AiChat02Icon} class="h-5 w-5 animate-spin" />
						</div>
						<div class="flex-1">
							<p class="text-xs font-bold text-forest-ink dark:text-lime-voltage">
								Analisis AI Takerin (Groq + Gemini)
							</p>
							<p class="mt-0.5 text-sm text-slate dark:text-linen-mist/80">
								Sedang menganalisis pola alokasi dan kebiasaan finansial Anda...
							</p>
						</div>
					</div>
				</Card>
			{:else if aiSummary}
				<Card
					class="border-lime-voltage/50 bg-linen-mist/50 p-5 shadow-sm dark:border-lime-voltage/40 dark:bg-spruce/30"
				>
					<div class="flex items-start gap-3">
						<div
							class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-lime-voltage text-forest-ink shadow-sm dark:bg-lime-voltage dark:text-forest-ink"
						>
							<HugeiconsIcon icon={AiChat02Icon} class="h-5 w-5" />
						</div>
						<div class="flex-1">
							<div class="flex items-center justify-between">
								<span
									class="rounded-full bg-forest-ink/10 px-2 py-0.5 text-[10px] font-extrabold tracking-wide text-forest-ink uppercase dark:bg-lime-voltage/20 dark:text-lime-voltage"
								>
									Catatan AI Takerin
								</span>
								<span class="text-[11px] text-slate dark:text-linen-mist/70"> Tersimpan </span>
							</div>
							<p class="mt-2 text-base font-bold text-obsidian sm:text-lg dark:text-paper">
								"{aiSummary}"
							</p>
						</div>
					</div>
				</Card>
			{:else if aiError}
				<Card
					class="border-alarm-red/30 bg-alarm-red/5 p-4 dark:border-alarm-red/40 dark:bg-alarm-red/10"
				>
					<div class="flex items-center justify-between">
						<div class="flex items-center gap-2 text-sm text-alarm-red">
							<HugeiconsIcon icon={Alert02Icon} class="h-4 w-4" />
							<span>{aiError}</span>
						</div>
						<Button variant="secondary" size="sm" onclick={fetchAiSummary}>Coba Lagi</Button>
					</div>
				</Card>
			{/if}
		</div>

		<!-- High-Level Financial Summary Cards -->
		<div class="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
			<Card class="p-4 sm:p-5">
				<div class="flex items-center gap-3">
					<div
						class="flex h-10 w-10 items-center justify-center rounded-xl bg-fog text-forest-ink dark:bg-spruce/40 dark:text-lime-voltage"
					>
						<HugeiconsIcon icon={Wallet01Icon} class="h-5 w-5" />
					</div>
					<div>
						<p class="text-xs font-semibold text-slate dark:text-pebble">Pemasukan Bulanan</p>
						<p class="text-lg font-extrabold text-obsidian sm:text-xl dark:text-paper">
							{formatRupiah(data.summary.totalIncome)}
						</p>
					</div>
				</div>
			</Card>

			<Card class="p-4 sm:p-5">
				<div class="flex items-center gap-3">
					<div
						class="flex h-10 w-10 items-center justify-center rounded-xl bg-fog text-forest-ink dark:bg-spruce/40 dark:text-lime-voltage"
					>
						<HugeiconsIcon icon={Coins01Icon} class="h-5 w-5" />
					</div>
					<div>
						<p class="text-xs font-semibold text-slate dark:text-pebble">Total Pengeluaran</p>
						<p class="text-lg font-extrabold text-obsidian sm:text-xl dark:text-paper">
							{formatRupiah(data.summary.totalSpent)}
							<span class="text-xs font-semibold text-slate dark:text-pebble">
								({data.summary.spentPercentage}%)
							</span>
						</p>
					</div>
				</div>
			</Card>

			<Card class="p-4 sm:p-5">
				<div class="flex items-center gap-3">
					<div
						class="flex h-10 w-10 items-center justify-center rounded-xl bg-fog text-forest-ink dark:bg-spruce/40 dark:text-lime-voltage"
					>
						<HugeiconsIcon icon={PiggyBankIcon} class="h-5 w-5" />
					</div>
					<div>
						<p class="text-xs font-semibold text-slate dark:text-pebble">Sisa Saldo</p>
						<p
							class={`text-lg font-extrabold sm:text-xl ${
								data.summary.remaining >= 0
									? 'text-forest-ink dark:text-lime-voltage'
									: 'text-alarm-red'
							}`}
						>
							{formatRupiah(data.summary.remaining)}
						</p>
					</div>
				</div>
			</Card>
		</div>

		<!-- Category Breakdown Section -->
		<div class="mb-8">
			<div class="mb-4">
				<h2 class="text-lg font-bold text-obsidian sm:text-xl dark:text-paper">
					Rincian Kategori & Saldo
				</h2>
				<p class="text-xs text-slate dark:text-pebble">
					Alokasi nominal, total terpakai, dan sisa saldo pada masing-masing kategori (termasuk
					kategori yang sempat dibekukan).
				</p>
			</div>

			<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
				{#each data.categories as cat (cat.id)}
					<Card class="p-4 sm:p-5">
						<div class="flex items-start justify-between">
							<div>
								<div class="flex flex-wrap items-center gap-2">
									<h3 class="font-bold text-obsidian dark:text-paper">
										{cat.name}
									</h3>
									{#if cat.isSavings}
										<span
											class="flex items-center gap-1 rounded-full bg-lime-voltage/20 px-2 py-0.5 text-[10px] font-bold text-forest-ink dark:bg-spruce/60 dark:text-lime-voltage"
										>
											<HugeiconsIcon icon={PiggyBankIcon} class="h-3 w-3" />
											Tabungan
										</span>
									{/if}
									{#if cat.status === 'frozen'}
										<span
											class="rounded-full bg-fog px-2 py-0.5 text-[10px] font-bold text-slate dark:bg-dark-surface dark:text-pebble"
										>
											Dibekukan
										</span>
									{/if}
								</div>
								<p class="mt-0.5 text-xs text-slate dark:text-pebble">
									Alokasi: {cat.percentage}% ({formatRupiah(cat.allocation)})
								</p>
							</div>

							<div class="text-right">
								<p class="text-xs font-semibold text-slate dark:text-pebble">Sisa Saldo</p>
								<p
									class={`text-sm font-bold ${
										cat.balance >= 0 ? 'text-forest-ink dark:text-lime-voltage' : 'text-alarm-red'
									}`}
								>
									{formatRupiah(cat.balance)}
								</p>
							</div>
						</div>

						<div class="mt-4">
							<div class="mb-1.5 flex justify-between text-xs font-semibold">
								<span class="text-slate dark:text-pebble">
									Terpakai: {formatRupiah(cat.spent)}
								</span>
								<span
									class={cat.spentPercentage > 100
										? 'font-bold text-alarm-red'
										: 'text-slate dark:text-pebble'}
								>
									{cat.spentPercentage}%
								</span>
							</div>
							<ProgressBar
								value={Math.min(100, cat.spentPercentage)}
								color={cat.spentPercentage > 100 ? 'alarm' : cat.isSavings ? 'spruce' : 'forest'}
							/>
						</div>
					</Card>
				{/each}
			</div>
		</div>

		<!-- Expense List Section -->
		<div>
			<div class="mb-4">
				<h2 class="text-lg font-bold text-obsidian sm:text-xl dark:text-paper">
					Daftar Pengeluaran ({data.expenses.length})
				</h2>
				<p class="text-xs text-slate dark:text-pebble">
					Semua entri pengeluaran yang tercatat pada periode ini.
				</p>
			</div>

			{#if data.expenses.length === 0}
				<Card class="p-6 text-center">
					<p class="text-sm text-slate dark:text-pebble">
						Tidak ada pengeluaran yang tercatat dalam periode ini.
					</p>
				</Card>
			{:else}
				<Card class="divide-y divide-fog overflow-hidden p-0 dark:divide-dark-border">
					{#each data.expenses as exp (exp.id)}
						<div
							class="flex items-center justify-between p-4 transition-colors hover:bg-fog/30 dark:hover:bg-dark-border/20"
						>
							<div>
								<p class="font-bold text-obsidian dark:text-paper">{exp.name}</p>
								<div
									class="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-slate dark:text-pebble"
								>
									<span class="font-medium text-forest-ink dark:text-lime-voltage">
										{exp.categoryName}
									</span>
									<span>•</span>
									<span>{formatDateIndonesian(exp.date)}</span>
									{#if exp.time}
										<span>•</span>
										<span>{exp.time}</span>
									{/if}
									{#if exp.notes}
										<span>•</span>
										<span class="italic">"{exp.notes}"</span>
									{/if}
								</div>
							</div>
							<p class="text-sm font-bold text-obsidian dark:text-paper">
								{formatRupiah(exp.amount)}
							</p>
						</div>
					{/each}
				</Card>
			{/if}
		</div>
	</main>
</div>
