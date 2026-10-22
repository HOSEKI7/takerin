<script lang="ts">
	import { resolve } from '$app/paths';
	import { Button, BrandLogo, ThemeToggle, Badge } from '#lib';
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import {
		SparklesIcon,
		ArrowRight01Icon,
		ArrowDown01Icon,
		CheckmarkCircle02Icon,
		Cancel01Icon,
		Shield01Icon,
		GithubIcon,
		Menu01Icon,
		Wallet02Icon,
		PiggyBankIcon,
		AlertCircleIcon
	} from '@hugeicons/core-free-icons';

	let mobileMenuOpen = $state(false);

	const navLinks = [
		{ label: 'Masalah', href: '#masalah' },
		{ label: 'Fitur', href: '#fitur' },
		{ label: 'Cara Kerja', href: '#cara-kerja' },
		{ label: 'Tanya Jawab', href: '#faq' }
	];

	const softwareApplicationSchema = {
		'@context': 'https://schema.org',
		'@type': 'SoftwareApplication',
		name: 'Takerin',
		applicationCategory: 'FinanceApplication',
		operatingSystem: 'All',
		offers: {
			'@type': 'Offer',
			price: '0',
			priceCurrency: 'IDR'
		},
		description:
			'Aplikasi web gratis untuk membagi gaji bulanan ke dalam takaran jatah per kategori dan mencatat pengeluaran harian.',
		url: 'https://takerin.my.id',
		inLanguage: 'id',
		author: {
			'@type': 'Organization',
			name: 'Takerin',
			url: 'https://takerin.my.id'
		}
	};

	const problemComparisons = [
		{
			before: 'Mencatat pengeluaran setelah uang habis, tanpa rencana awal.',
			after: 'Gaji langsung dibagi ke persentase kategori di awal bulan.'
		},
		{
			before: 'Satu kategori pengeluaran menyedot jatah tabungan tanpa disadari.',
			after: 'Batas jatah per kategori jelas, menjaga total tetap seimbang 100%.'
		},
		{
			before: 'Aplikasi pencatat lain rumit, berbayar langganan, dan penuh iklan.',
			after: 'Tampilan bersih, ringan, cepat, dan 100% gratis selamanya.'
		},
		{
			before: 'Rasa waswas dan rasa bersalah setiap kali membuka dompet.',
			after: 'Belanja dengan tenang tanpa rasa bersalah selama dalam takaran.'
		}
	];

	const steps = [
		{
			number: 1,
			title: 'Set Pemasukan',
			desc: 'Masukkan total gaji pokok atau pendapatan bulanan yang kamu terima saat gajian.'
		},
		{
			number: 2,
			title: 'Atur Kategori',
			desc: 'Bagi gaji ke dalam kategori (makan, tabungan, tempat tinggal, transportasi) dengan persentase yang pas 100%.'
		},
		{
			number: 3,
			title: 'Catat Pengeluaran',
			desc: 'Catat pengeluaran harianmu dalam hitungan detik dan pantau jatah sisa saldo tetap aman sepanjang bulan.'
		}
	];

	const faqItems = [
		{
			q: 'Mengapa dinamakan Takerin?',
			a: 'Berasal dari kata "takar" (menakar porsi) ditambah akhiran "-in" ("tolong takarkan"). Seperti menakar beras atau bumbu dapur agar pas, Takerin hadir untuk membantu menakar uangmu ke dalam jatah yang jelas dan proporsional.'
		},
		{
			q: 'Apa bedanya Takerin dengan aplikasi pencatat keuangan lain?',
			a: 'Banyak aplikasi keuangan hanya mencatat pengeluaran setelah terjadi, ketika uang sudah habis. Takerin mengajakmu merencanakan jatah gaji di awal bulan berbasis persentase, sehingga setiap rupiah punya alokasi sebelum dibelanjakan.'
		},
		{
			q: 'Apakah pengeluaran boleh melebihi jatah yang ditentukan?',
			a: 'Boleh. Takerin tidak pernah memblokir atau menghakimi pengeluaranmu. Kamu tetap bisa mencatat pengeluaran, dan Takerin akan mengingatkan dengan ramah bahwa batas takaran kategori tersebut telah terlampaui.'
		},
		{
			q: 'Bagaimana jika ingin menambah atau mengubah kategori di tengah bulan?',
			a: 'Kamu bebas mengubah nama dan persentase kapan pun. Jika menambah kategori baru, persentase kategori lain disesuaikan agar total selalu 100%. Bila kategori dihapus, saldo terpakai tetap tercatat aman sebagai kategori sementara hingga bulan berakhir.'
		},
		{
			q: 'Apakah Takerin benar-benar gratis dan aman?',
			a: 'Ya, Takerin 100% gratis digunakan. Keamanan data menjadi prioritas kami dengan koneksi HTTPS terenkripsi, autentikasi aman, dan opsi verifikasi dua langkah (OTP) via email untuk melindungi privasi finansialmu.'
		},
		{
			q: 'Bagaimana cara mulai atur pengeluaran dan catat keuangan dengan Takerin?',
			a: 'Cukup buat akun gratis, masukkan nominal gaji bulananmu, tentukan persentase kategori sesuai prioritas hidupmu, dan mulai catat pengeluaran harian dengan mudah lewat ponsel atau laptop.'
		}
	];

	const jsonLdString =
		`<script type="application/ld+json">${JSON.stringify(softwareApplicationSchema)}` +
		'</' +
		'script>';
</script>

<!-- eslint-disable svelte/no-navigation-without-resolve -->

<svelte:head>
	<title>Takerin - Takerin Gajimu, Tenangin Bulanmu | Aplikasi Keuangan Gratis</title>
	<meta
		name="description"
		content="Aplikasi web gratis untuk membagi gaji bulanan ke dalam takaran jatah per kategori dan mencatat pengeluaran harian. Atur pengeluaran, catat keuangan, dan atur gaji agar tenang sampai akhir bulan."
	/>
	<meta
		name="keywords"
		content="atur pengeluaran, catat keuangan, atur gaji, aplikasi keuangan gratis, pengelolaan keuangan, budgeting indonesia, takerin"
	/>
	<link rel="canonical" href="https://takerin.my.id/" />

	<!-- Open Graph / Facebook -->
	<meta property="og:type" content="website" />
	<meta property="og:url" content="https://takerin.my.id/" />
	<meta property="og:title" content="Takerin - Takerin Gajimu, Tenangin Bulanmu" />
	<meta
		property="og:description"
		content="Aplikasi web gratis untuk membagi gaji bulanan ke dalam jatah per kategori dan mencatat pengeluaran harian. Atur pengeluaran, catat keuangan, atur gaji."
	/>
	<meta property="og:image" content="https://takerin.my.id/brand/takerin-wordmark.webp" />
	<meta property="og:image:alt" content="Takerin - Aplikasi Pengatur Keuangan dan Pengeluaran" />
	<meta property="og:locale" content="id_ID" />
	<meta property="og:site_name" content="Takerin" />

	<!-- Twitter Cards -->
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:url" content="https://takerin.my.id/" />
	<meta name="twitter:title" content="Takerin - Takerin Gajimu, Tenangin Bulanmu" />
	<meta
		name="twitter:description"
		content="Aplikasi web gratis untuk membagi gaji bulanan ke dalam jatah per kategori dan mencatat pengeluaran harian."
	/>
	<meta name="twitter:image" content="https://takerin.my.id/brand/takerin-wordmark.webp" />

	<!-- JSON-LD Structured Data -->
	<!-- eslint-disable-next-line svelte/no-at-html-tags -->
	{@html jsonLdString}
</svelte:head>

<div
	class="min-h-screen bg-paper font-sans text-obsidian transition-colors dark:bg-dark-canvas dark:text-paper"
>
	<!-- Navigation Bar -->
	<header
		class="sticky top-0 z-50 h-16 border-b border-fog bg-paper transition-colors dark:border-dark-border dark:bg-dark-surface"
	>
		<div class="mx-auto flex h-full max-w-6xl items-center justify-between px-4 sm:px-6">
			<div class="flex items-center gap-8">
				<BrandLogo href="/" size="md" />
				<nav
					class="hidden items-center gap-6 text-sm font-medium text-charcoal md:flex dark:text-fog"
				>
					{#each navLinks as link (link.href)}
						<a
							href={link.href}
							class="transition-colors hover:text-forest-ink dark:hover:text-lime-voltage"
						>
							{link.label}
						</a>
					{/each}
				</nav>
			</div>

			<div class="hidden items-center gap-3 md:flex">
				<ThemeToggle />
				<a href={resolve('/auth/login')}>
					<Button variant="secondary" size="sm">Masuk</Button>
				</a>
				<a href={resolve('/auth/register')}>
					<Button variant="primary" size="sm">Mulai Gratis</Button>
				</a>
			</div>

			<!-- Mobile Menu Button -->
			<div class="flex items-center gap-2 md:hidden">
				<ThemeToggle />
				<button
					type="button"
					onclick={() => (mobileMenuOpen = !mobileMenuOpen)}
					class="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-fog p-1.5 text-charcoal hover:bg-fog dark:border-dark-border dark:text-fog dark:hover:bg-dark-card"
					aria-label={mobileMenuOpen ? 'Tutup menu' : 'Buka menu'}
					aria-expanded={mobileMenuOpen}
				>
					{#if mobileMenuOpen}
						<HugeiconsIcon icon={Cancel01Icon} size={20} />
					{:else}
						<HugeiconsIcon icon={Menu01Icon} size={20} />
					{/if}
				</button>
			</div>
		</div>

		<!-- Mobile Navigation Dropdown -->
		{#if mobileMenuOpen}
			<div
				class="border-b border-fog bg-paper px-4 py-4 md:hidden dark:border-dark-border dark:bg-dark-surface"
			>
				<nav class="flex flex-col gap-3 text-sm font-medium text-charcoal dark:text-fog">
					{#each navLinks as link (link.href)}
						<a
							href={link.href}
							onclick={() => (mobileMenuOpen = false)}
							class="py-1 hover:text-forest-ink dark:hover:text-lime-voltage"
						>
							{link.label}
						</a>
					{/each}
					<div class="mt-2 flex flex-col gap-2 border-t border-fog pt-2 dark:border-dark-border">
						<a href={resolve('/auth/login')} class="w-full">
							<Button variant="secondary" size="sm" class="w-full">Masuk</Button>
						</a>
						<a href={resolve('/auth/register')} class="w-full">
							<Button variant="primary" size="sm" class="w-full">Mulai Gratis</Button>
						</a>
					</div>
				</nav>
			</div>
		{/if}
	</header>

	<main>
		<!-- Section 1: Hero Section -->
		<section class="relative overflow-hidden pt-12 pb-16 sm:pt-16 sm:pb-20 lg:pt-20 lg:pb-24">
			<div class="mx-auto max-w-6xl px-4 sm:px-6">
				<div class="grid grid-cols-1 items-center gap-12 lg:grid-cols-12 lg:gap-8">
					<!-- Hero Text Stack (Strictly 4 text elements) -->
					<div class="space-y-6 lg:col-span-7">
						<!-- Element 1: Eyebrow badge -->
						<div class="inline-flex items-center gap-2">
							<Badge variant="lime">
								<HugeiconsIcon icon={SparklesIcon} size={14} />
								<span>Aplikasi Anggaran Pribadi 100% Gratis</span>
							</Badge>
						</div>

						<!-- Element 2: Headline -->
						<h1
							class="font-display text-4xl font-extrabold tracking-tight text-forest-ink sm:text-5xl lg:text-6xl lg:leading-[1.08] dark:text-paper"
						>
							Takerin gajimu, tenangin bulanmu.
						</h1>

						<!-- Element 3: Subtext (Max 20 words) -->
						<p class="max-w-xl text-lg text-charcoal sm:text-xl dark:text-fog">
							Bagi gaji ke jatah kategori berbasis persentase, catat pengeluaran harian, dan jaga
							saldo tetap aman sampai akhir bulan.
						</p>

						<!-- Element 4: CTAs -->
						<div class="flex flex-wrap items-center gap-3 pt-2">
							<a href={resolve('/auth/register')}>
								<Button variant="primary" size="lg" class="w-full sm:w-auto">
									<span>Mulai Gratis</span>
									<HugeiconsIcon icon={ArrowRight01Icon} size={18} />
								</Button>
							</a>
							<a href="#cara-kerja">
								<Button variant="secondary" size="lg" class="w-full sm:w-auto">
									Pelajari Cara Kerja
								</Button>
							</a>
						</div>
					</div>

					<!-- Hero Visual Preview: Budgeting Simulation Card -->
					<div class="lg:col-span-5">
						<div
							class="relative rounded-2xl border border-fog bg-fog/30 p-5 sm:p-6 dark:border-dark-border dark:bg-dark-surface"
						>
							<!-- Header of Preview Card -->
							<div
								class="mb-4 flex items-center justify-between border-b border-fog pb-4 dark:border-dark-border"
							>
								<div>
									<div class="text-xs font-medium text-slate dark:text-pebble">Total Pemasukan</div>
									<div
										class="font-display text-2xl font-extrabold text-forest-ink dark:text-lime-voltage"
									>
										Rp 5.000.000
									</div>
								</div>
								<span
									class="inline-flex items-center rounded-full bg-forest-ink px-3 py-1 text-xs font-semibold text-paper dark:bg-lime-voltage dark:text-forest-ink"
								>
									Alokasi 100%
								</span>
							</div>

							<!-- Category Progress Visuals -->
							<div class="space-y-4">
								<div
									class="rounded-xl border border-fog bg-paper p-3 dark:border-dark-border dark:bg-dark-card"
								>
									<div class="flex items-center justify-between text-xs">
										<span class="font-semibold text-forest-ink dark:text-paper"
											>Makan & Minum (30%)</span
										>
										<span class="font-medium text-slate dark:text-pebble">Sisa Rp 650.000</span>
									</div>
									<div
										class="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-fog dark:bg-dark-border"
									>
										<div
											class="h-full rounded-full bg-forest-ink transition-all dark:bg-lime-voltage"
											style="width: 57%;"
										></div>
									</div>
									<div class="mt-1 flex justify-between text-[11px] text-slate dark:text-pebble">
										<span>Terpakai Rp 850.000</span>
										<span>Jatah Rp 1.500.000</span>
									</div>
								</div>

								<div
									class="rounded-xl border border-fog bg-paper p-3 dark:border-dark-border dark:bg-dark-card"
								>
									<div class="flex items-center justify-between text-xs">
										<span class="font-semibold text-forest-ink dark:text-paper"
											>Tabungan & Investasi (35%)</span
										>
										<span class="font-medium text-spruce dark:text-lime-voltage">Aman (100%)</span>
									</div>
									<div
										class="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-fog dark:bg-dark-border"
									>
										<div
											class="h-full rounded-full bg-spruce transition-all dark:bg-lime-voltage"
											style="width: 100%;"
										></div>
									</div>
									<div class="mt-1 flex justify-between text-[11px] text-slate dark:text-pebble">
										<span>Tersimpan utuh</span>
										<span>Jatah Rp 1.750.000</span>
									</div>
								</div>

								<div
									class="rounded-xl border border-fog bg-paper p-3 dark:border-dark-border dark:bg-dark-card"
								>
									<div class="flex items-center justify-between text-xs">
										<span class="font-semibold text-forest-ink dark:text-paper"
											>Transportasi (20%)</span
										>
										<span class="font-medium text-slate dark:text-pebble">Sisa Rp 680.000</span>
									</div>
									<div
										class="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-fog dark:bg-dark-border"
									>
										<div
											class="h-full rounded-full bg-forest-ink transition-all dark:bg-lime-voltage"
											style="width: 32%;"
										></div>
									</div>
									<div class="mt-1 flex justify-between text-[11px] text-slate dark:text-pebble">
										<span>Terpakai Rp 320.000</span>
										<span>Jatah Rp 1.000.000</span>
									</div>
								</div>
							</div>

							<!-- Friendly Reminder Toast -->
							<div
								class="mt-4 flex items-center gap-3 rounded-xl border border-linen-mist bg-linen-mist/60 px-3.5 py-2.5 text-xs text-forest-ink dark:border-lime-voltage/30 dark:bg-lime-voltage/10 dark:text-lime-voltage"
							>
								<HugeiconsIcon icon={CheckmarkCircle02Icon} size={18} class="shrink-0" />
								<span><strong>Tercatat:</strong> Sisa jatah Makan & Minum aman di Rp 650.000.</span>
							</div>
						</div>
					</div>
				</div>
			</div>
		</section>

		<!-- Section 2: Problem Statement (Hook Relatable - NO EYEBROW) -->
		<section
			id="masalah"
			class="border-t border-fog bg-fog/30 py-16 sm:py-20 dark:border-dark-border dark:bg-dark-surface/50"
		>
			<div class="mx-auto max-w-5xl px-4 sm:px-6">
				<div class="text-center">
					<h2
						class="font-display text-3xl font-extrabold tracking-tight text-forest-ink sm:text-4xl dark:text-paper"
					>
						Gaji habis sebelum akhir bulan?
					</h2>
					<p class="mx-auto mt-4 max-w-2xl text-base text-charcoal sm:text-lg dark:text-fog">
						Banyak yang rajin mencatat setelah uang terlanjur habis. Masalahnya bukan di berapa
						banyak gaji yang masuk, tetapi ketiadaan takaran yang jelas sejak hari pertama gajian.
					</p>
				</div>

				<!-- Before vs After Comparison Grid -->
				<div class="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2">
					<!-- Cara Lama -->
					<div
						class="rounded-2xl border border-alarm-red/20 bg-paper p-6 dark:border-alarm-red/30 dark:bg-dark-card"
					>
						<div class="flex items-center gap-3">
							<div
								class="flex h-10 w-10 items-center justify-center rounded-full bg-alarm-red/10 text-alarm-red"
							>
								<HugeiconsIcon icon={Cancel01Icon} size={20} />
							</div>
							<h3 class="font-display text-lg font-bold text-obsidian dark:text-paper">
								Cara Lama (Tanpa Takaran)
							</h3>
						</div>
						<ul class="mt-6 space-y-3.5 text-sm text-charcoal dark:text-fog">
							{#each problemComparisons as item (item.before)}
								<li class="flex items-start gap-2.5">
									<span class="mt-0.5 font-bold text-alarm-red">✕</span>
									<span>{item.before}</span>
								</li>
							{/each}
						</ul>
					</div>

					<!-- Dengan Takerin -->
					<div
						class="rounded-2xl border border-forest-ink/20 bg-paper p-6 dark:border-lime-voltage/30 dark:bg-dark-card"
					>
						<div class="flex items-center gap-3">
							<div
								class="flex h-10 w-10 items-center justify-center rounded-full bg-lime-voltage/30 text-forest-ink dark:bg-lime-voltage/20 dark:text-lime-voltage"
							>
								<HugeiconsIcon icon={CheckmarkCircle02Icon} size={20} />
							</div>
							<h3 class="font-display text-lg font-bold text-forest-ink dark:text-lime-voltage">
								Dengan Takerin (Setiap Rupiah Punya Jatah)
							</h3>
						</div>
						<ul class="mt-6 space-y-3.5 text-sm text-charcoal dark:text-fog">
							{#each problemComparisons as item (item.after)}
								<li class="flex items-start gap-2.5">
									<span class="mt-0.5 font-bold text-spruce dark:text-lime-voltage">✓</span>
									<span>{item.after}</span>
								</li>
							{/each}
						</ul>
					</div>
				</div>
			</div>
		</section>

		<!-- Section 3: Features Showcase (3 Fitur Utama - NO EYEBROW) -->
		<section id="fitur" class="py-16 sm:py-20 lg:py-24">
			<div class="mx-auto max-w-6xl px-4 sm:px-6">
				<div class="text-center">
					<h2
						class="font-display text-3xl font-extrabold tracking-tight text-forest-ink sm:text-4xl dark:text-paper"
					>
						Fitur utama untuk atur pengeluaran harian
					</h2>
					<p class="mx-auto mt-4 max-w-2xl text-base text-charcoal sm:text-lg dark:text-fog">
						Tiga pilar sederhana yang membuat pengelolaan keuangan pribadi terasa ringan dan
						teratur.
					</p>
				</div>

				<div class="mt-12 grid grid-cols-1 gap-8 md:grid-cols-3">
					<!-- Feature 1 -->
					<div
						class="flex flex-col justify-between rounded-2xl border border-fog bg-fog/20 p-6 transition-all hover:border-forest-ink/30 dark:border-dark-border dark:bg-dark-card"
					>
						<div>
							<div
								class="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-forest-ink text-lime-voltage"
							>
								<HugeiconsIcon icon={Wallet02Icon} size={24} />
							</div>
							<h3 class="mt-5 font-display text-xl font-bold text-forest-ink dark:text-paper">
								Bagi Jatah di Awal
							</h3>
							<p class="mt-2.5 text-sm leading-relaxed text-charcoal dark:text-fog">
								Tentukan alokasi gaji bulanan berbasis persentase. Sistem memastikan distribusi
								jatah selalu genap 100% tanpa ada sisa uang liar yang hilang.
							</p>
						</div>

						<div
							class="mt-6 rounded-xl border border-fog bg-paper p-3 text-xs dark:border-dark-border dark:bg-dark-surface"
						>
							<div class="flex justify-between font-medium">
								<span class="text-slate dark:text-pebble">Total Alokasi</span>
								<span class="font-bold text-forest-ink dark:text-lime-voltage">100% Pas</span>
							</div>
							<div class="mt-2 flex h-2 gap-1 overflow-hidden rounded-full">
								<div class="bg-forest-ink dark:bg-lime-voltage" style="width: 30%"></div>
								<div class="bg-spruce dark:bg-linen-mist" style="width: 35%"></div>
								<div class="bg-slate" style="width: 20%"></div>
								<div class="bg-pebble" style="width: 15%"></div>
							</div>
						</div>
					</div>

					<!-- Feature 2 -->
					<div
						class="flex flex-col justify-between rounded-2xl border border-fog bg-fog/20 p-6 transition-all hover:border-forest-ink/30 dark:border-dark-border dark:bg-dark-card"
					>
						<div>
							<div
								class="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-lime-voltage text-forest-ink"
							>
								<HugeiconsIcon icon={PiggyBankIcon} size={24} />
							</div>
							<h3 class="mt-5 font-display text-xl font-bold text-forest-ink dark:text-paper">
								Pencatatan Cepat & Sederhana
							</h3>
							<p class="mt-2.5 text-sm leading-relaxed text-charcoal dark:text-fog">
								Catat pengeluaran cukup dengan nama dan nominal. Sisa saldo langsung terhitung
								secara otomatis tanpa navigasi rumit.
							</p>
						</div>

						<div
							class="mt-6 rounded-xl border border-fog bg-paper p-3 text-xs dark:border-dark-border dark:bg-dark-surface"
						>
							<div class="flex items-center justify-between text-slate dark:text-pebble">
								<span>Kopi Siang</span>
								<span class="font-bold text-alarm-red">-Rp 25.000</span>
							</div>
							<div
								class="mt-1 flex items-center justify-between text-[11px] text-slate dark:text-pebble"
							>
								<span>Jatah Makan</span>
								<span class="font-medium text-forest-ink dark:text-lime-voltage"
									>Sisa Rp 625.000</span
								>
							</div>
						</div>
					</div>

					<!-- Feature 3 -->
					<div
						class="flex flex-col justify-between rounded-2xl border border-fog bg-fog/20 p-6 transition-all hover:border-forest-ink/30 dark:border-dark-border dark:bg-dark-card"
					>
						<div>
							<div
								class="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-spruce text-paper dark:bg-dark-muted dark:text-lime-voltage"
							>
								<HugeiconsIcon icon={AlertCircleIcon} size={24} />
							</div>
							<h3 class="mt-5 font-display text-xl font-bold text-forest-ink dark:text-paper">
								Pengingat Ramah
							</h3>
							<p class="mt-2.5 text-sm leading-relaxed text-charcoal dark:text-fog">
								Pengeluaran boleh melampaui batas takaran. Takerin mengingatkan dengan santai dan
								ramah, tanpa menghakimi atau membatasi pilihanmu.
							</p>
						</div>

						<div
							class="mt-6 rounded-xl border border-linen-mist bg-linen-mist/50 p-3 text-xs text-forest-ink dark:border-dark-border dark:bg-dark-surface dark:text-lime-voltage"
						>
							<div class="font-semibold">Pesan Ramah Takerin:</div>
							<div class="mt-1 text-[11px] text-charcoal dark:text-fog">
								"Jatah Hiburan sudah lewat Rp 35.000. Mau dicatat tetap?"
							</div>
						</div>
					</div>
				</div>
			</div>
		</section>

		<!-- Section 4: How it Works (3 Langkah Simpel - WITH EYEBROW) -->
		<section
			id="cara-kerja"
			class="border-t border-fog bg-fog/30 py-16 sm:py-20 lg:py-24 dark:border-dark-border dark:bg-dark-surface/50"
		>
			<div class="mx-auto max-w-6xl px-4 sm:px-6">
				<div class="text-center">
					<span
						class="inline-block rounded-full bg-linen-mist px-3 py-1 text-xs font-semibold tracking-wider text-forest-ink uppercase dark:bg-dark-card dark:text-lime-voltage"
					>
						Langkah Mudah
					</span>
					<h2
						class="mt-3 font-display text-3xl font-extrabold tracking-tight text-forest-ink sm:text-4xl dark:text-paper"
					>
						Tiga langkah simpel menata uang
					</h2>
					<p class="mx-auto mt-4 max-w-2xl text-base text-charcoal sm:text-lg dark:text-fog">
						Tanpa spreadsheet yang rumit. Kamu hanya butuh 2 menit untuk menata gaji bulanan.
					</p>
				</div>

				<div class="mt-12 grid grid-cols-1 gap-8 md:grid-cols-3">
					{#each steps as step (step.number)}
						<div
							class="relative rounded-2xl border border-fog bg-paper p-6 dark:border-dark-border dark:bg-dark-card"
						>
							<div
								class="flex h-10 w-10 items-center justify-center rounded-full bg-forest-ink font-display text-base font-bold text-lime-voltage"
							>
								{step.number}
							</div>
							<h3 class="mt-5 font-display text-xl font-bold text-forest-ink dark:text-paper">
								{step.title}
							</h3>
							<p class="mt-2 text-sm leading-relaxed text-charcoal dark:text-fog">
								{step.desc}
							</p>
						</div>
					{/each}
				</div>
			</div>
		</section>

		<!-- Section 5: FAQ Section (Pertanyaan Umum - NO EYEBROW) -->
		<section id="faq" class="py-16 sm:py-20 lg:py-24">
			<div class="mx-auto max-w-4xl px-4 sm:px-6">
				<div class="text-center">
					<h2
						class="font-display text-3xl font-extrabold tracking-tight text-forest-ink sm:text-4xl dark:text-paper"
					>
						Pertanyaan yang sering ditanyakan
					</h2>
					<p class="mx-auto mt-4 max-w-xl text-base text-charcoal sm:text-lg dark:text-fog">
						Segala hal tentang cara kerja takaran keuangan dan privasi akun di Takerin.
					</p>
				</div>

				<div class="mt-12 space-y-4">
					{#each faqItems as item (item.q)}
						<details
							class="group rounded-2xl border border-fog bg-paper p-5 transition-colors dark:border-dark-border dark:bg-dark-card"
						>
							<summary
								class="flex cursor-pointer items-center justify-between text-left font-display text-base font-bold text-forest-ink transition-colors group-open:text-spruce dark:text-paper dark:group-open:text-lime-voltage"
							>
								<span>{item.q}</span>
								<HugeiconsIcon
									icon={ArrowDown01Icon}
									size={18}
									class="shrink-0 text-slate transition-transform duration-200 group-open:rotate-180 dark:text-pebble"
								/>
							</summary>
							<p class="mt-3 text-sm leading-relaxed text-charcoal dark:text-fog">
								{item.a}
							</p>
						</details>
					{/each}
				</div>
			</div>
		</section>

		<!-- Section 6: Bottom CTA (NO EYEBROW) -->
		<section class="py-12 sm:py-16">
			<div class="mx-auto max-w-5xl px-4 sm:px-6">
				<div
					class="relative overflow-hidden rounded-3xl bg-forest-ink px-6 py-12 text-center text-paper sm:px-12 sm:py-16 dark:border dark:border-dark-border dark:bg-dark-surface"
				>
					<h2 class="font-display text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl">
						Mulai atur keuanganmu sekarang — gratis selamanya
					</h2>
					<p class="mx-auto mt-4 max-w-xl text-base text-linen-mist sm:text-lg dark:text-fog">
						Takerin gajimu, tentukan jatahmu, dan rasakan ketenangan mengendalikan pengeluaran
						setiap hari.
					</p>
					<div class="mt-8 flex justify-center">
						<a href={resolve('/auth/register')}>
							<Button variant="primary" size="lg">
								<span>Mulai Gratis</span>
								<HugeiconsIcon icon={ArrowRight01Icon} size={18} />
							</Button>
						</a>
					</div>
				</div>
			</div>
		</section>
	</main>

	<!-- Section 7: Footer -->
	<footer
		class="border-t border-fog bg-fog/30 py-12 text-charcoal dark:border-dark-border dark:bg-dark-surface/60 dark:text-pebble"
	>
		<div class="mx-auto max-w-6xl px-4 sm:px-6">
			<div class="grid grid-cols-1 gap-8 md:grid-cols-12">
				<!-- Brand Column -->
				<div class="space-y-4 md:col-span-5">
					<BrandLogo href="/" size="md" />
					<p class="text-sm text-slate dark:text-pebble">
						Takerin gajimu, tenangin bulanmu. Aplikasi pencatat keuangan dan pembagi jatah gaji
						bulanan gratis berbasis persentase.
					</p>
					<div class="flex items-center gap-3 text-xs text-slate dark:text-pebble">
						<HugeiconsIcon
							icon={Shield01Icon}
							size={16}
							class="text-spruce dark:text-lime-voltage"
						/>
						<span>Privasi terjaga · Data terenkripsi</span>
					</div>
				</div>

				<!-- Navigation Links -->
				<div class="grid grid-cols-2 gap-8 sm:grid-cols-3 md:col-span-7">
					<div>
						<h3
							class="text-xs font-semibold tracking-wider text-obsidian uppercase dark:text-paper"
						>
							Navigasi
						</h3>
						<ul class="mt-3 space-y-2 text-sm">
							{#each navLinks as link (link.href)}
								<li>
									<a href={link.href} class="hover:text-forest-ink dark:hover:text-lime-voltage">
										{link.label}
									</a>
								</li>
							{/each}
						</ul>
					</div>

					<div>
						<h3
							class="text-xs font-semibold tracking-wider text-obsidian uppercase dark:text-paper"
						>
							Legal & Privasi
						</h3>
						<ul class="mt-3 space-y-2 text-sm">
							<li>
								<a href="#faq" class="hover:text-forest-ink dark:hover:text-lime-voltage">
									Kebijakan Privasi
								</a>
							</li>
							<li>
								<a href="#faq" class="hover:text-forest-ink dark:hover:text-lime-voltage">
									Syarat & Ketentuan
								</a>
							</li>
						</ul>
					</div>

					<div>
						<h3
							class="text-xs font-semibold tracking-wider text-obsidian uppercase dark:text-paper"
						>
							Komunitas
						</h3>
						<ul class="mt-3 space-y-2 text-sm">
							<li>
								<a
									href="https://github.com/HOSEKI7/takerin"
									target="_blank"
									rel="noopener noreferrer"
									class="inline-flex items-center gap-1.5 hover:text-forest-ink dark:hover:text-lime-voltage"
								>
									<HugeiconsIcon icon={GithubIcon} size={16} />
									<span>GitHub</span>
								</a>
							</li>
						</ul>
					</div>
				</div>
			</div>

			<div
				class="mt-12 flex flex-col items-center justify-between gap-4 border-t border-fog pt-8 text-xs text-slate sm:flex-row dark:border-dark-border dark:text-pebble"
			>
				<p>© 2026 Takerin. Setiap rupiah punya jatah.</p>
				<p>Dibuat untuk pengelolaan keuangan yang lebih tenang.</p>
			</div>
		</div>
	</footer>
</div>
