<script lang="ts">
	import { untrack } from 'svelte';
	import type { PageProps } from './$types.js';
	import { enhance } from '$app/forms';
	import Button from '#lib/components/Button.svelte';
	import Input from '#lib/components/Input.svelte';
	import Card from '#lib/components/Card.svelte';
	import ProgressBar from '#lib/components/ProgressBar.svelte';
	import ThemeToggle from '#lib/components/ThemeToggle.svelte';
	import {
		validatePayDay,
		validateIncomeSources,
		calculateTotalIncome,
		formatRupiah
	} from '#lib/validation/onboarding.js';
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import {
		Calendar01Icon,
		Add01Icon,
		Delete02Icon,
		ArrowRight02Icon,
		ArrowLeft02Icon
	} from '@hugeicons/core-free-icons';

	let { data, form }: PageProps = $props();

	// Step tracking: 1 = Tanggal Gajian, 2 = Sumber Pemasukan
	let currentStep = $state<1 | 2>(1);

	// Step 1: Tanggal Gajian
	let payDay = $state<number | string>(untrack(() => data.userSettings?.payDay ?? 25));
	let step1Error = $state<string>('');

	// Step 2: Sumber Pemasukan
	interface IncomeSourceState {
		id: string;
		name: string;
		amount: number | string;
	}

	let incomeSources = $state<IncomeSourceState[]>(
		untrack(() =>
			data.incomeSources && data.incomeSources.length > 0
				? data.incomeSources.map((s) => ({
						id: s.id,
						name: s.name,
						amount: s.amount
					}))
				: [{ id: 'src-1', name: 'Gaji Pokok', amount: '' }]
		)
	);
	let step2Error = $state<string>('');
	let isSubmitting = $state(false);

	// Derived calculations
	const totalIncome = $derived(calculateTotalIncome(incomeSources));

	const popularPayDays = [1, 15, 25, 28, 30];

	function handleSelectQuickPayDay(day: number) {
		payDay = day;
		step1Error = '';
	}

	function handleNextToStep2() {
		step1Error = '';
		const error = validatePayDay(payDay);
		if (error) {
			step1Error = error;
			return;
		}
		currentStep = 2;
	}

	function handleBackToStep1() {
		step2Error = '';
		currentStep = 1;
	}

	function handleAddSource() {
		step2Error = '';
		incomeSources = [
			...incomeSources,
			{
				id: 'src-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
				name: '',
				amount: ''
			}
		];
	}

	function handleRemoveSource(index: number) {
		if (incomeSources.length <= 1) {
			step2Error = 'Minimal harus memiliki satu sumber pemasukan.';
			return;
		}
		step2Error = '';
		incomeSources = incomeSources.filter((_, i) => i !== index);
	}

	function validateAndPrepareSubmit(event: { cancel: () => void }) {
		step2Error = '';
		const payError = validatePayDay(payDay);
		if (payError) {
			currentStep = 1;
			step1Error = payError;
			event.cancel();
			return;
		}

		const sourcesError = validateIncomeSources(incomeSources);
		if (sourcesError) {
			step2Error = sourcesError;
			event.cancel();
			return;
		}

		isSubmitting = true;
	}
</script>

<div
	class="flex min-h-screen flex-col bg-paper font-sans text-charcoal transition-colors dark:bg-dark-surface dark:text-linen-mist"
>
	<!-- Header -->
	<header
		class="border-b border-fog bg-paper/80 px-6 py-4 backdrop-blur dark:border-dark-border dark:bg-dark-card/80"
	>
		<div class="mx-auto flex max-w-4xl items-center justify-between">
			<div class="flex items-center gap-3">
				<span class="text-xl font-black tracking-tight text-forest-ink dark:text-lime-voltage">
					Takerin
				</span>
				<span
					class="rounded-full bg-linen-mist px-2.5 py-0.5 text-xs font-semibold text-forest-ink dark:bg-spruce/60 dark:text-linen-mist"
				>
					Setup Awal
				</span>
			</div>
			<ThemeToggle />
		</div>
	</header>

	<!-- Main Content -->
	<main class="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center px-4 py-8 sm:px-6">
		<!-- Progress Bar -->
		<div class="mb-6">
			<ProgressBar
				value={currentStep === 1 ? 50 : 100}
				max={100}
				variant="lime"
				label={currentStep === 1
					? 'Langkah 1 dari 2: Tanggal Gajian'
					: 'Langkah 2 dari 2: Sumber Pemasukan'}
				showValue={true}
			/>
		</div>

		<!-- Error alert from server if any -->
		{#if form?.errorMessage}
			<div
				role="alert"
				class="mb-6 rounded-lg border border-alarm-red/30 bg-red-50 p-4 text-sm font-medium text-alarm-red dark:bg-red-950/30 dark:text-red-300"
			>
				{form.errorMessage}
			</div>
		{/if}

		<Card variant="default" padding="lg" class="shadow-md">
			{#if currentStep === 1}
				<!-- Step 1: Set Tanggal Gajian -->
				<div class="space-y-6">
					<div>
						<div
							class="mb-2 inline-flex items-center gap-2 rounded-full bg-linen-mist px-3 py-1 text-xs font-bold text-forest-ink dark:bg-spruce/50 dark:text-lime-voltage"
						>
							<HugeiconsIcon icon={Calendar01Icon} size={16} />
							<span>Langkah 1: Tanggal Gajian</span>
						</div>
						<h1 class="text-2xl font-extrabold text-obsidian sm:text-3xl dark:text-paper">
							Kapan Tanggal Gajian Anda?
						</h1>
						<p class="mt-2 text-sm leading-relaxed text-slate dark:text-stone-300">
							<strong>Periode Bulan</strong> Anda akan dimulai dari tanggal ini setiap bulannya. Jika
							suatu bulan tidak memiliki tanggal tersebut (misal tanggal 31 di bulan Februari), sistem
							akan otomatis menyesuaikan ke hari terakhir bulan.
						</p>
					</div>

					{#if step1Error}
						<div
							role="alert"
							class="rounded-lg border border-alarm-red/30 bg-red-50 p-3.5 text-sm font-medium text-alarm-red dark:bg-red-950/30 dark:text-red-300"
						>
							{step1Error}
						</div>
					{/if}

					<!-- Quick Selection Buttons -->
					<div class="space-y-2">
						<p class="text-xs font-semibold text-slate dark:text-stone-300">
							Pilihan Cepat Tanggal Gajian:
						</p>
						<div class="flex flex-wrap gap-2">
							{#each popularPayDays as day (day)}
								<button
									type="button"
									onclick={() => handleSelectQuickPayDay(day)}
									class="cursor-pointer rounded-lg border px-3.5 py-2 text-sm font-semibold transition {Number(
										payDay
									) === day
										? 'border-forest-ink bg-forest-ink text-paper dark:border-lime-voltage dark:bg-lime-voltage dark:text-forest-ink'
										: 'border-pebble bg-paper text-charcoal hover:border-forest-ink dark:border-dark-border dark:bg-dark-surface dark:text-linen-mist dark:hover:border-lime-voltage'}"
								>
									Tanggal {day}
								</button>
							{/each}
						</div>
					</div>

					<!-- Manual Input -->
					<div class="space-y-2">
						<Input
							id="onboarding-payday"
							label="Atau Masukkan Tanggal Gajian (1 - 31)"
							type="number"
							min="1"
							max="31"
							placeholder="Misal: 25"
							required
							bind:value={payDay}
						/>
						<p class="text-xs text-slate dark:text-stone-400">
							Masukkan angka antara 1 sampai 31 sesuai siklus gaji atau pemasukan utama Anda.
						</p>
					</div>

					<div class="pt-4">
						<Button
							type="button"
							variant="primary"
							size="md"
							class="w-full"
							onclick={handleNextToStep2}
						>
							<span>Lanjut ke Sumber Pemasukan</span>
							<HugeiconsIcon icon={ArrowRight02Icon} size={18} />
						</Button>
					</div>
				</div>
			{:else}
				<!-- Step 2: Input Sumber Pemasukan -->
				<form
					method="POST"
					use:enhance={() => {
						return async ({ update }) => {
							isSubmitting = false;
							await update();
						};
					}}
					onsubmit={(e) => {
						validateAndPrepareSubmit({
							cancel: () => {
								e.preventDefault();
							}
						});
					}}
					class="space-y-6"
				>
					<input type="hidden" name="payDay" value={payDay} />
					<input type="hidden" name="incomeSources" value={JSON.stringify(incomeSources)} />

					<div>
						<div
							class="mb-2 inline-flex items-center gap-2 rounded-full bg-linen-mist px-3 py-1 text-xs font-bold text-forest-ink dark:bg-spruce/50 dark:text-lime-voltage"
						>
							<span>Langkah 2: Sumber Pemasukan</span>
						</div>
						<h1 class="text-2xl font-extrabold text-obsidian sm:text-3xl dark:text-paper">
							Dari Mana Saja Pemasukan Anda?
						</h1>
						<p class="mt-2 text-sm leading-relaxed text-slate dark:text-stone-300">
							Tambahkan satu atau lebih sumber pemasukan bulanan (seperti gaji, komisi, freelance,
							atau bisnis). Total ini akan menjadi <strong>Pemasukan Bulanan</strong> sebagai dasar pembagian
							budget.
						</p>
					</div>

					{#if step2Error}
						<div
							role="alert"
							class="rounded-lg border border-alarm-red/30 bg-red-50 p-3.5 text-sm font-medium text-alarm-red dark:bg-red-950/30 dark:text-red-300"
						>
							{step2Error}
						</div>
					{/if}

					<!-- Income Sources List -->
					<div class="space-y-4">
						{#each incomeSources as source, index (source.id)}
							<div
								class="relative rounded-xl border border-fog bg-paper/60 p-4 transition dark:border-dark-border dark:bg-dark-card/60"
							>
								<div class="flex items-center justify-between pb-2">
									<span
										class="text-xs font-bold tracking-wide text-forest-ink uppercase dark:text-lime-voltage"
									>
										Sumber #{index + 1}
									</span>
									{#if incomeSources.length > 1}
										<button
											type="button"
											onclick={() => handleRemoveSource(index)}
											aria-label={`Hapus ${source.name || 'sumber pemasukan'}`}
											class="cursor-pointer text-xs font-semibold text-alarm-red hover:underline dark:text-red-400"
										>
											<HugeiconsIcon icon={Delete02Icon} size={16} />
										</button>
									{/if}
								</div>

								<div class="grid gap-3 sm:grid-cols-2">
									<Input
										id={`source-name-${index}`}
										label="Nama Sumber Pemasukan"
										type="text"
										placeholder="contoh: Gaji Pokok"
										required
										bind:value={source.name}
										disabled={isSubmitting}
									/>

									<Input
										id={`source-amount-${index}`}
										label="Nominal (IDR)"
										type="number"
										min="1"
										placeholder="contoh: 8000000"
										required
										bind:value={source.amount}
										disabled={isSubmitting}
									/>
								</div>
							</div>
						{/each}

						<button
							type="button"
							onclick={handleAddSource}
							disabled={isSubmitting}
							class="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-forest-ink/30 bg-paper py-3 font-sans text-sm font-semibold text-forest-ink transition hover:border-forest-ink hover:bg-fog dark:border-lime-voltage/30 dark:bg-dark-surface dark:text-lime-voltage dark:hover:border-lime-voltage dark:hover:bg-dark-card"
						>
							<HugeiconsIcon icon={Add01Icon} size={18} />
							<span>Tambah Sumber Pemasukan Lain</span>
						</button>
					</div>

					<!-- Total Monthly Income Display Card -->
					<div
						class="rounded-xl border border-lime-voltage/50 bg-linen-mist/60 p-5 dark:border-lime-voltage/40 dark:bg-spruce/30"
					>
						<span
							class="text-xs font-bold tracking-wider text-forest-ink uppercase dark:text-lime-voltage"
						>
							Total Pemasukan Bulanan
						</span>
						<div class="mt-1 flex items-baseline justify-between gap-2">
							<span class="text-2xl font-black text-forest-ink sm:text-3xl dark:text-lime-voltage">
								{formatRupiah(totalIncome)}
							</span>
							<span class="text-xs text-slate dark:text-stone-300">
								{incomeSources.length} sumber pemasukan
							</span>
						</div>
						<p class="mt-2 text-xs text-charcoal/80 dark:text-linen-mist/80">
							Total ini akan dialokasikan ke pos kategori budget bulanan Anda.
						</p>
					</div>

					<!-- Navigation Actions -->
					<div class="flex flex-col gap-3 pt-2 sm:flex-row">
						<Button
							type="button"
							variant="secondary"
							size="md"
							class="flex-1"
							onclick={handleBackToStep1}
							disabled={isSubmitting}
						>
							<HugeiconsIcon icon={ArrowLeft02Icon} size={18} />
							<span>Kembali</span>
						</Button>

						<Button
							type="submit"
							variant="primary"
							size="md"
							class="flex-1"
							disabled={isSubmitting || totalIncome <= 0}
						>
							{isSubmitting ? 'Menyimpan...' : 'Simpan & Lanjut'}
						</Button>
					</div>
				</form>
			{/if}
		</Card>
	</main>
</div>
