<script lang="ts">
	import { untrack } from 'svelte';
	import type { PageProps } from './$types.js';
	import { enhance } from '$app/forms';
	import Button from '#lib/components/Button.svelte';
	import Input from '#lib/components/Input.svelte';
	import Card from '#lib/components/Card.svelte';
	import ProgressBar from '#lib/components/ProgressBar.svelte';
	import ThemeToggle from '#lib/components/ThemeToggle.svelte';
	import BrandLogo from '#lib/components/BrandLogo.svelte';
	import {
		validatePayDay,
		validateIncomeSources,
		validateCategories,
		calculateTotalIncome,
		formatRupiah
	} from '#lib/validation/onboarding.js';
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import {
		Calendar01Icon,
		Add01Icon,
		Delete02Icon,
		ArrowRight02Icon,
		ArrowLeft02Icon,
		CheckmarkCircle02Icon,
		MoneySavingJarIcon,
		Layers01Icon,
		PieChart01Icon,
		PiggyBankIcon
	} from '@hugeicons/core-free-icons';

	let { data, form }: PageProps = $props();

	// Step tracking: 1 = Tanggal Gajian, 2 = Sumber Pemasukan, 3 = Template Kategori, 4 = Customize Kategori
	let currentStep = $state<1 | 2 | 3 | 4>(1);

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

	// Step 3 & 4: Template Kategori & Customization
	interface CategoryItemState {
		id: string;
		name: string;
		percentage: number | string;
		isSavings: boolean;
	}

	let selectedTemplate = $state<string>('50/30/20');
	let lastLoadedTemplate = $state<string>('');

	// System presets fallback
	const fallbackPresets: Record<
		string,
		Array<{ name: string; percentage: number; isSavings: boolean }>
	> = {
		'50/30/20': [
			{ name: 'Kebutuhan', percentage: 50, isSavings: false },
			{ name: 'Keinginan', percentage: 30, isSavings: false },
			{ name: 'Tabungan & Investasi', percentage: 20, isSavings: true }
		],
		'6 Toples': [
			{ name: 'Kebutuhan Hidup', percentage: 55, isSavings: false },
			{ name: 'Tabungan Jangka Panjang', percentage: 10, isSavings: true },
			{ name: 'Investasi Finansial', percentage: 10, isSavings: true },
			{ name: 'Pendidikan', percentage: 10, isSavings: false },
			{ name: 'Hiburan', percentage: 10, isSavings: false },
			{ name: 'Berbagi / Donasi', percentage: 5, isSavings: false }
		],
		Custom: [
			{ name: 'Kebutuhan', percentage: 70, isSavings: false },
			{ name: 'Tabungan & Investasi', percentage: 30, isSavings: true }
		]
	};

	let categories = $state<CategoryItemState[]>(
		fallbackPresets['50/30/20'].map((c, i) => ({
			id: `cat-${i + 1}`,
			name: c.name,
			percentage: c.percentage,
			isSavings: c.isSavings
		}))
	);

	let step4Error = $state<string>('');
	let isSubmitting = $state(false);

	// Derived calculations
	const totalIncome = $derived(calculateTotalIncome(incomeSources));

	const totalPercentage = $derived(
		categories.reduce((acc, cat) => {
			const p = Number(cat.percentage);
			return acc + (Number.isNaN(p) ? 0 : p);
		}, 0)
	);

	const serializedIncomeSources = $derived(
		JSON.stringify(
			incomeSources.map((s) => ({
				name: s.name.trim(),
				amount: Number(s.amount)
			}))
		)
	);

	const serializedCategories = $derived(
		JSON.stringify(
			categories.map((c) => ({
				name: c.name.trim(),
				percentage: Number(c.percentage),
				isSavings: Boolean(c.isSavings)
			}))
		)
	);

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

	function handleNextToStep3() {
		step2Error = '';
		const error = validateIncomeSources(incomeSources);
		if (error) {
			step2Error = error;
			return;
		}
		currentStep = 3;
	}

	function handleBackToStep2() {
		currentStep = 2;
	}

	function getTemplateCategories(templateKey: string) {
		const dbTemplate = data.categoryTemplates?.find(
			(t) => t.name.toLowerCase() === templateKey.toLowerCase()
		);
		if (dbTemplate && dbTemplate.categories && dbTemplate.categories.length > 0) {
			return dbTemplate.categories;
		}
		return fallbackPresets[templateKey] ?? fallbackPresets['50/30/20'];
	}

	function handleSelectTemplate(key: string) {
		selectedTemplate = key;
	}

	function handleNextToStep4() {
		if (lastLoadedTemplate !== selectedTemplate) {
			const preset = getTemplateCategories(selectedTemplate);
			categories = preset.map((c, i) => ({
				id: `cat-${Date.now()}-${i + 1}`,
				name: c.name,
				percentage: c.percentage,
				isSavings: Boolean(c.isSavings)
			}));
			lastLoadedTemplate = selectedTemplate;
		}
		step4Error = '';
		currentStep = 4;
	}

	function handleBackToStep3() {
		step4Error = '';
		currentStep = 3;
	}

	function handleAddCategory() {
		step4Error = '';
		categories = [
			...categories,
			{
				id: `cat-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
				name: '',
				percentage: '',
				isSavings: false
			}
		];
	}

	function handleRemoveCategory(index: number) {
		if (categories.length <= 1) {
			step4Error = 'Minimal harus memiliki satu kategori.';
			return;
		}
		step4Error = '';
		categories = categories.filter((_, i) => i !== index);
	}

	function handleToggleSavings(index: number) {
		categories = categories.map((cat, i) =>
			i === index ? { ...cat, isSavings: !cat.isSavings } : cat
		);
	}

	function validateAndPrepareSubmit(event: { cancel: () => void }) {
		step4Error = '';

		const payError = validatePayDay(payDay);
		if (payError) {
			currentStep = 1;
			step1Error = payError;
			event.cancel();
			return;
		}

		const sourcesError = validateIncomeSources(incomeSources);
		if (sourcesError) {
			currentStep = 2;
			step2Error = sourcesError;
			event.cancel();
			return;
		}

		const categoriesFormatted = categories.map((c) => ({
			name: c.name.trim(),
			percentage: Number(c.percentage),
			isSavings: c.isSavings
		}));

		const catError = validateCategories(categoriesFormatted);
		if (catError) {
			step4Error = catError;
			event.cancel();
			return;
		}

		isSubmitting = true;
	}

	const progressInfo = $derived.by(() => {
		switch (currentStep) {
			case 1:
				return { value: 25, label: 'Langkah 1 dari 4: Tanggal Gajian' };
			case 2:
				return { value: 50, label: 'Langkah 2 dari 4: Sumber Pemasukan' };
			case 3:
				return { value: 75, label: 'Langkah 3 dari 4: Pilih Template Kategori' };
			case 4:
				return { value: 100, label: 'Langkah 4 dari 4: Atur & Sesuaikan Kategori' };
		}
	});

	// Prepared template list for Step 3
	const availableTemplates = $derived.by(() => {
		const dbList =
			data.categoryTemplates && data.categoryTemplates.length > 0
				? data.categoryTemplates
				: [
						{
							id: 'tpl_50_30_20',
							name: '50/30/20',
							description:
								'Pembagian klasik: 50% Kebutuhan, 30% Keinginan, 20% Tabungan & Investasi.',
							categories: fallbackPresets['50/30/20']
						},
						{
							id: 'tpl_6_toples',
							name: '6 Toples',
							description:
								'Metode T. Harv Eker: Kebutuhan (55%), Tabungan Jangka Panjang (10%), Investasi Finansial (10%), Edukasi (10%), Hiburan (10%), Donasi (5%).',
							categories: fallbackPresets['6 Toples']
						}
					];

		return [
			...dbList,
			{
				id: 'tpl_custom',
				name: 'Custom',
				description: 'Tentukan nama kategori dan persentase sesuai gaya hidup finansial Anda.',
				categories: fallbackPresets['Custom']
			}
		];
	});
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
				<BrandLogo size="sm" />
				<span
					class="rounded-full bg-linen-mist px-2.5 py-0.5 text-xs font-semibold text-forest-ink dark:bg-spruce/60 dark:text-linen-mist"
				>
					Onboarding
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
				value={progressInfo.value}
				max={100}
				variant="lime"
				label={progressInfo.label}
				showValue={true}
			/>
		</div>

		<!-- Error alert from server if any -->
		{#if form?.errorMessage}
			<div
				role="alert"
				class="mb-6 rounded-[10px] border border-alarm-red/30 bg-alarm-red/10 p-4 text-sm font-medium text-alarm-red"
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
						<p class="mt-2 text-sm leading-relaxed text-slate dark:text-pebble">
							<strong>Periode Bulan</strong> Anda akan dimulai dari tanggal ini setiap bulannya. Jika
							suatu bulan tidak memiliki tanggal tersebut (misal tanggal 31 di bulan Februari), sistem
							akan otomatis menyesuaikan ke hari terakhir bulan.
						</p>
					</div>

					{#if step1Error}
						<div
							role="alert"
							class="rounded-[10px] border border-alarm-red/30 bg-alarm-red/10 p-3.5 text-sm font-medium text-alarm-red"
						>
							{step1Error}
						</div>
					{/if}

					<!-- Quick Selection Buttons -->
					<div class="space-y-2">
						<p class="text-xs font-semibold text-slate dark:text-pebble">
							Pilihan Cepat Tanggal Gajian:
						</p>
						<div class="flex flex-wrap gap-2">
							{#each popularPayDays as day (day)}
								<button
									type="button"
									onclick={() => handleSelectQuickPayDay(day)}
									class="cursor-pointer rounded-full border px-4 py-2 text-sm font-semibold transition {Number(
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
					<form
						onsubmit={(e) => {
							e.preventDefault();
							handleNextToStep2();
						}}
						class="space-y-2"
					>
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
						<p class="text-xs text-slate dark:text-pebble">
							Masukkan angka antara 1 sampai 31 sesuai siklus gaji atau pemasukan utama Anda.
						</p>
					</form>

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
			{:else if currentStep === 2}
				<!-- Step 2: Input Sumber Pemasukan -->
				<div class="space-y-6">
					<div>
						<div
							class="mb-2 inline-flex items-center gap-2 rounded-full bg-linen-mist px-3 py-1 text-xs font-bold text-forest-ink dark:bg-spruce/50 dark:text-lime-voltage"
						>
							<span>Langkah 2: Sumber Pemasukan</span>
						</div>
						<h1 class="text-2xl font-extrabold text-obsidian sm:text-3xl dark:text-paper">
							Dari Mana Saja Pemasukan Anda?
						</h1>
						<p class="mt-2 text-sm leading-relaxed text-slate dark:text-pebble">
							Tambahkan satu atau lebih sumber pemasukan bulanan (seperti gaji, komisi, freelance,
							atau bisnis). Total ini akan menjadi <strong>Pemasukan Bulanan</strong> sebagai dasar pembagian
							budget.
						</p>
					</div>

					{#if step2Error}
						<div
							role="alert"
							class="rounded-[10px] border border-alarm-red/30 bg-alarm-red/10 p-3.5 text-sm font-medium text-alarm-red"
						>
							{step2Error}
						</div>
					{/if}

					<!-- Income Sources List -->
					<div class="space-y-4">
						{#each incomeSources as source, index (source.id)}
							<div
								class="relative rounded-[10px] border border-fog bg-paper/60 p-4 transition dark:border-dark-border dark:bg-dark-card/60"
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
											class="cursor-pointer text-xs font-semibold text-alarm-red hover:underline"
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
									/>

									<Input
										id={`source-amount-${index}`}
										label="Nominal (IDR)"
										type="number"
										min="1"
										placeholder="contoh: 8000000"
										required
										bind:value={source.amount}
										hint={source.amount && Number(source.amount) > 0
											? formatRupiah(source.amount)
											: undefined}
									/>
								</div>
							</div>
						{/each}

						<button
							type="button"
							onclick={handleAddSource}
							class="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-full border border-dashed border-forest-ink/30 bg-paper py-3 font-sans text-sm font-semibold text-forest-ink transition hover:border-forest-ink hover:bg-fog dark:border-lime-voltage/30 dark:bg-dark-surface dark:text-lime-voltage dark:hover:border-lime-voltage dark:hover:bg-dark-card"
						>
							<HugeiconsIcon icon={Add01Icon} size={18} />
							<span>Tambah Sumber Pemasukan Lain</span>
						</button>
					</div>

					<!-- Total Monthly Income Display Card -->
					<div
						class="rounded-[10px] border border-lime-voltage/50 bg-linen-mist/60 p-5 dark:border-lime-voltage/40 dark:bg-spruce/30"
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
							<span class="text-xs text-slate dark:text-pebble">
								{incomeSources.length} sumber pemasukan
							</span>
						</div>
						<p class="mt-2 text-xs text-charcoal/80 dark:text-linen-mist/80">
							Total ini akan dialokasikan ke Kategori budget bulanan Anda pada langkah berikutnya.
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
						>
							<HugeiconsIcon icon={ArrowLeft02Icon} size={18} />
							<span>Kembali</span>
						</Button>

						<Button
							type="button"
							variant="primary"
							size="md"
							class="flex-1"
							onclick={handleNextToStep3}
							disabled={totalIncome <= 0}
						>
							<span>Lanjut ke Pilih Template</span>
							<HugeiconsIcon icon={ArrowRight02Icon} size={18} />
						</Button>
					</div>
				</div>
			{:else if currentStep === 3}
				<!-- Step 3: Pilih Template Kategori -->
				<div class="space-y-6">
					<div>
						<div
							class="mb-2 inline-flex items-center gap-2 rounded-full bg-linen-mist px-3 py-1 text-xs font-bold text-forest-ink dark:bg-spruce/50 dark:text-lime-voltage"
						>
							<HugeiconsIcon icon={PieChart01Icon} size={16} />
							<span>Langkah 3: Template Kategori</span>
						</div>
						<h1 class="text-2xl font-extrabold text-obsidian sm:text-3xl dark:text-paper">
							Pilih Template Kategori
						</h1>
						<p class="mt-2 text-sm leading-relaxed text-slate dark:text-pebble">
							Pilih titik awal pembagian budget Anda. Anda tetap dapat mengubah nama, persentase,
							maupun menambah atau menghapus kategori di langkah berikutnya.
						</p>
					</div>

					<!-- Dynamic Template Options from D1 / Presets -->
					<div class="grid gap-4">
						{#each availableTemplates as tpl (tpl.id)}
							<button
								type="button"
								onclick={() => handleSelectTemplate(tpl.name)}
								class="group flex w-full cursor-pointer flex-col rounded-[10px] border p-5 text-left transition {selectedTemplate.toLowerCase() ===
								tpl.name.toLowerCase()
									? 'border-forest-ink bg-linen-mist/40 shadow-sm dark:border-lime-voltage dark:bg-spruce/30'
									: 'border-fog bg-paper hover:border-pebble dark:border-dark-border dark:bg-dark-card/60'}"
							>
								<div class="flex items-center justify-between">
									<div class="flex items-center gap-3">
										<div
											class="rounded-full bg-linen-mist p-2 text-forest-ink dark:bg-spruce dark:text-lime-voltage"
										>
											{#if tpl.name === '6 Toples'}
												<HugeiconsIcon icon={MoneySavingJarIcon} size={22} />
											{:else if tpl.name === 'Custom'}
												<HugeiconsIcon icon={Layers01Icon} size={22} />
											{:else}
												<HugeiconsIcon icon={PieChart01Icon} size={22} />
											{/if}
										</div>
										<div>
											<h2 class="text-lg font-black text-obsidian dark:text-paper">
												{tpl.name === 'Custom' ? 'Kustom / Buat Sendiri' : `Template ${tpl.name}`}
											</h2>
											{#if tpl.description}
												<p class="text-xs text-slate dark:text-pebble">
													{tpl.description}
												</p>
											{/if}
										</div>
									</div>
									{#if selectedTemplate.toLowerCase() === tpl.name.toLowerCase()}
										<div class="text-forest-ink dark:text-lime-voltage">
											<HugeiconsIcon icon={CheckmarkCircle02Icon} size={24} />
										</div>
									{/if}
								</div>

								{#if tpl.categories && tpl.categories.length > 0}
									<div class="mt-4 flex flex-wrap gap-2">
										{#each tpl.categories as cat (cat.name)}
											<span
												class="rounded-full bg-forest-ink/10 px-2.5 py-1 text-xs font-semibold text-forest-ink dark:bg-lime-voltage/20 dark:text-lime-voltage"
											>
												{cat.name} ({cat.percentage}%)
											</span>
										{/each}
									</div>
								{/if}
							</button>
						{/each}
					</div>

					<!-- Navigation Actions -->
					<div class="flex flex-col gap-3 pt-2 sm:flex-row">
						<Button
							type="button"
							variant="secondary"
							size="md"
							class="flex-1"
							onclick={handleBackToStep2}
						>
							<HugeiconsIcon icon={ArrowLeft02Icon} size={18} />
							<span>Kembali</span>
						</Button>

						<Button
							type="button"
							variant="primary"
							size="md"
							class="flex-1"
							onclick={handleNextToStep4}
						>
							<span>Lanjut ke Atur Kategori</span>
							<HugeiconsIcon icon={ArrowRight02Icon} size={18} />
						</Button>
					</div>
				</div>
			{:else}
				<!-- Step 4: Customize Kategori & Submit -->
				<form
					method="POST"
					use:enhance={({ formData, cancel }) => {
						validateAndPrepareSubmit({ cancel });
						if (isSubmitting) {
							formData.set('payDay', String(payDay));
							formData.set('incomeSources', serializedIncomeSources);
							formData.set('categories', serializedCategories);
						}
						return async ({ update }) => {
							isSubmitting = false;
							await update();
						};
					}}
					class="space-y-6"
				>
					<input type="hidden" name="payDay" value={payDay} />
					<input type="hidden" name="incomeSources" value={serializedIncomeSources} />
					<input type="hidden" name="categories" value={serializedCategories} />

					<div>
						<div
							class="mb-2 inline-flex items-center gap-2 rounded-full bg-linen-mist px-3 py-1 text-xs font-bold text-forest-ink dark:bg-spruce/50 dark:text-lime-voltage"
						>
							<HugeiconsIcon icon={Layers01Icon} size={16} />
							<span>Langkah 4: Atur Kategori</span>
						</div>
						<h1 class="text-2xl font-extrabold text-obsidian sm:text-3xl dark:text-paper">
							Sesuaikan Kategori Budget Anda
						</h1>
						<p class="mt-2 text-sm leading-relaxed text-slate dark:text-pebble">
							Beri nama, tentukan persentase alokasi, dan tandai jika termasuk
							<strong>Kategori Tabungan</strong>. Jumlah total persentase semua kategori harus tepat
							<strong>100%</strong>.
						</p>
					</div>

					{#if step4Error}
						<div
							role="alert"
							class="rounded-[10px] border border-alarm-red/30 bg-alarm-red/10 p-3.5 text-sm font-medium text-alarm-red"
						>
							{step4Error}
						</div>
					{/if}

					<!-- Income Summary Bar -->
					<div
						class="flex items-center justify-between rounded-[10px] border border-fog bg-paper/80 px-4 py-3 dark:border-dark-border dark:bg-dark-card/60"
					>
						<div>
							<span class="text-xs font-medium text-slate dark:text-pebble">
								Total Pemasukan Bulanan:
							</span>
							<p class="text-base font-extrabold text-forest-ink dark:text-lime-voltage">
								{formatRupiah(totalIncome)}
							</p>
						</div>
						<span
							class="rounded-full bg-linen-mist px-3 py-1 text-xs font-bold text-forest-ink dark:bg-spruce/60 dark:text-linen-mist"
						>
							Gajian Tgl {payDay}
						</span>
					</div>

					<!-- Categories List -->
					<div class="space-y-4">
						{#each categories as category, index (category.id)}
							<div
								class="relative rounded-[10px] border border-fog bg-paper/60 p-4 transition dark:border-dark-border dark:bg-dark-card/60"
							>
								<div class="flex items-center justify-between pb-2">
									<div class="flex items-center gap-2">
										<span
											class="text-xs font-bold tracking-wide text-forest-ink uppercase dark:text-lime-voltage"
										>
											Kategori #{index + 1}
										</span>
										{#if category.isSavings}
											<span
												class="inline-flex items-center gap-1 rounded-full bg-spruce/10 px-2 py-0.5 text-xs font-semibold text-spruce dark:bg-lime-voltage/20 dark:text-lime-voltage"
											>
												<HugeiconsIcon icon={PiggyBankIcon} size={12} />
												<span>Tabungan</span>
											</span>
										{/if}
									</div>

									{#if categories.length > 1}
										<button
											type="button"
											onclick={() => handleRemoveCategory(index)}
											aria-label={`Hapus ${category.name || 'kategori'}`}
											class="cursor-pointer text-xs font-semibold text-alarm-red hover:underline"
										>
											<HugeiconsIcon icon={Delete02Icon} size={16} />
										</button>
									{/if}
								</div>

								<div class="grid gap-3 sm:grid-cols-2">
									<Input
										id={`category-name-${index}`}
										label="Nama Kategori"
										type="text"
										placeholder="contoh: Kebutuhan Hidup"
										required
										bind:value={category.name}
										disabled={isSubmitting}
									/>

									<Input
										id={`category-percentage-${index}`}
										label="Alokasi Persentase (%)"
										type="number"
										step="any"
										min="0.1"
										max="100"
										placeholder="contoh: 50"
										required
										bind:value={category.percentage}
										hint={category.percentage && Number(category.percentage) > 0
											? `Estimasi: ${formatRupiah((totalIncome * Number(category.percentage)) / 100)}`
											: undefined}
										disabled={isSubmitting}
									/>
								</div>

								<!-- Savings Flag Toggle -->
								<div
									class="mt-3 flex items-center justify-between border-t border-fog/60 pt-3 dark:border-dark-border/60"
								>
									<label
										for={`category-savings-${index}`}
										class="flex cursor-pointer items-center gap-2 text-xs font-semibold text-charcoal select-none dark:text-linen-mist"
									>
										<input
											id={`category-savings-${index}`}
											type="checkbox"
											checked={category.isSavings}
											onchange={() => handleToggleSavings(index)}
											disabled={isSubmitting}
											class="h-4 w-4 rounded border-pebble text-forest-ink focus:ring-forest-ink dark:border-dark-border dark:focus:ring-lime-voltage"
										/>
										<span>Tandai sebagai Kategori Tabungan</span>
									</label>
									<span class="text-xs text-slate dark:text-pebble">
										{category.isSavings
											? 'Uang dihitung sebagai aset tabungan'
											: 'Kategori pengeluaran rutin'}
									</span>
								</div>
							</div>
						{/each}

						<button
							type="button"
							onclick={handleAddCategory}
							disabled={isSubmitting}
							class="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-full border border-dashed border-forest-ink/30 bg-paper py-3 font-sans text-sm font-semibold text-forest-ink transition hover:border-forest-ink hover:bg-fog dark:border-lime-voltage/30 dark:bg-dark-surface dark:text-lime-voltage dark:hover:border-lime-voltage dark:hover:bg-dark-card"
						>
							<HugeiconsIcon icon={Add01Icon} size={18} />
							<span>Tambah Kategori Lain</span>
						</button>
					</div>

					<!-- Total Percentage Meter Card -->
					<div
						class="rounded-[10px] border p-5 transition {Math.abs(totalPercentage - 100) < 0.001
							? 'border-lime-voltage/60 bg-linen-mist/60 dark:border-lime-voltage/40 dark:bg-spruce/30'
							: 'border-alarm-red/40 bg-alarm-red/10'}"
					>
						<div class="flex items-center justify-between pb-2">
							<span
								class="text-xs font-bold tracking-wider uppercase {Math.abs(totalPercentage - 100) <
								0.001
									? 'text-forest-ink dark:text-lime-voltage'
									: 'text-alarm-red'}"
							>
								Total Alokasi Persentase
							</span>
							<span
								class="text-lg font-black {Math.abs(totalPercentage - 100) < 0.001
									? 'text-forest-ink dark:text-lime-voltage'
									: 'text-alarm-red'}"
							>
								{totalPercentage}% / 100%
							</span>
						</div>

						<ProgressBar
							value={totalPercentage}
							max={100}
							variant={Math.abs(totalPercentage - 100) < 0.001 ? 'lime' : 'danger'}
							class="my-1"
						/>

						<div class="mt-2 text-xs">
							{#if Math.abs(totalPercentage - 100) < 0.001}
								<p class="font-semibold text-forest-ink dark:text-lime-voltage">
									✓ Total persentase sudah tepat 100%. Anda siap menggunakan Takerin!
								</p>
							{:else if totalPercentage < 100}
								<p class="font-medium text-alarm-red">
									Kurang {Math.round((100 - totalPercentage) * 100) / 100}% lagi untuk mencapai
									100%.
								</p>
							{:else}
								<p class="font-medium text-alarm-red">
									Kelebihan {Math.round((totalPercentage - 100) * 100) / 100}%. Total alokasi tidak
									boleh melebihi 100%.
								</p>
							{/if}
						</div>
					</div>

					<!-- Navigation Actions -->
					<div class="flex flex-col gap-3 pt-2 sm:flex-row">
						<Button
							type="button"
							variant="secondary"
							size="md"
							class="flex-1"
							onclick={handleBackToStep3}
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
							disabled={isSubmitting || Math.abs(totalPercentage - 100) >= 0.001}
						>
							{isSubmitting ? 'Menyimpan & Menyiapkan Akun...' : 'Selesai & Mulai Pakai Takerin'}
						</Button>
					</div>
				</form>
			{/if}
		</Card>
	</main>
</div>
