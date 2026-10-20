<script lang="ts">
	import type { PageProps } from './$types';
	import { resolve } from '$app/paths';
	import { Button, Card, Input, Badge, ProgressBar, ThemeToggle, StatusBadge } from '#lib';
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import {
		SparklesIcon,
		ArrowRight01Icon,
		Wallet02Icon,
		PiggyBankIcon,
		AlertCircleIcon
	} from '@hugeicons/core-free-icons';

	let { data }: PageProps = $props();

	let sampleAmount = $state('2.500.000');
	let sampleNote = $state('Belanja bulanan kebutuhan dapur');

	const colorTokens = [
		{ name: 'Forest Ink', hex: '#163300', bgClass: 'bg-forest-ink text-paper' },
		{ name: 'Lime Voltage', hex: '#9fe870', bgClass: 'bg-lime-voltage text-forest-ink' },
		{ name: 'Spruce', hex: '#054d28', bgClass: 'bg-spruce text-paper' },
		{ name: 'Linen Mist', hex: '#e2f6d5', bgClass: 'bg-linen-mist text-forest-ink' },
		{ name: 'Signal Blue', hex: '#0b4c72', bgClass: 'bg-signal-blue text-paper' },
		{ name: 'Alarm Red', hex: '#cb272f', bgClass: 'bg-alarm-red text-paper' },
		{ name: 'Charcoal', hex: '#454745', bgClass: 'bg-charcoal text-paper' },
		{ name: 'Obsidian', hex: '#0e0f0c', bgClass: 'bg-obsidian text-paper' },
		{ name: 'Pebble', hex: '#868685', bgClass: 'bg-pebble text-paper' },
		{ name: 'Slate', hex: '#6a6c6a', bgClass: 'bg-slate text-paper' },
		{ name: 'Fog', hex: '#e8ebe6', bgClass: 'bg-fog text-charcoal' },
		{ name: 'Paper', hex: '#ffffff', bgClass: 'bg-paper text-obsidian border border-fog' }
	];
</script>

<svelte:head>
	<title>Takerin — Showcase Sistem Desain & Tema</title>
</svelte:head>

<div
	class="min-h-screen bg-fog/40 font-sans text-obsidian transition-colors dark:bg-dark-canvas dark:text-paper"
>
	<!-- Header / Navbar -->
	<header
		class="sticky top-0 z-50 border-b border-fog bg-paper/80 backdrop-blur-md dark:border-dark-border dark:bg-dark-surface/90"
	>
		<div class="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
			<div class="flex items-center gap-3">
				<span
					class="font-display text-2xl font-extrabold tracking-tight text-forest-ink dark:text-lime-voltage"
				>
					takerin.
				</span>
				<Badge variant="lime" class="hidden sm:inline-flex">Sistem Desain v1</Badge>
			</div>

			<div class="flex items-center gap-3">
				<StatusBadge status={data.dbStatus} />
				<ThemeToggle showLabel />
				{#if data.user}
					<a href={resolve('/dashboard')}>
						<Button variant="primary" size="sm">Dashboard</Button>
					</a>
				{:else}
					<a href={resolve('/auth/login')} class="hidden sm:inline-block">
						<Button variant="secondary" size="sm">Masuk</Button>
					</a>
					<a href={resolve('/auth/register')}>
						<Button variant="primary" size="sm">Daftar</Button>
					</a>
				{/if}
			</div>
		</div>
	</header>

	<main class="mx-auto max-w-5xl space-y-12 px-6 py-10">
		<!-- Hero Section -->
		<section class="space-y-4">
			<div class="inline-flex items-center gap-2">
				<Badge variant="default">
					<HugeiconsIcon icon={SparklesIcon} size={14} />
					<span>Tailwind CSS v4 & Svelte 5</span>
				</Badge>
			</div>

			<h1
				class="font-display text-4xl font-extrabold tracking-tight text-forest-ink sm:text-5xl dark:text-lime-voltage"
			>
				Atur dan catat pengeluaran berdasarkan pemasukan.
			</h1>

			<p class="max-w-2xl text-lg text-charcoal dark:text-stone-300">
				{data.message} Sistem tema mendukung mode terang dan mode gelap yang serasi, tipografi Manrope
				& Inter, serta komponen dasar UI siap pakai.
			</p>
		</section>

		<!-- Color Tokens Palette Swatch -->
		<section class="space-y-4">
			<h2 class="font-display text-2xl font-extrabold text-forest-ink dark:text-paper">
				Palet Warna Tokens
			</h2>
			<div class="grid grid-cols-2 gap-3 sm:grid-cols-4 md:grid-cols-6">
				{#each colorTokens as token (token.name)}
					<div
						class="rounded-lg border border-fog p-3 shadow-sm dark:border-dark-border {token.bgClass}"
					>
						<div class="text-xs font-semibold">{token.name}</div>
						<div class="text-[10px] opacity-75">{token.hex}</div>
					</div>
				{/each}
			</div>
		</section>

		<!-- Base UI Components Showcase -->
		<section class="space-y-6">
			<h2 class="font-display text-2xl font-extrabold text-forest-ink dark:text-paper">
				Komponen Dasar (Base UI)
			</h2>

			<div class="grid grid-cols-1 gap-6 md:grid-cols-2">
				<!-- Buttons Card -->
				<Card variant="default" class="space-y-4">
					<h3 class="font-display text-lg font-extrabold text-forest-ink dark:text-lime-voltage">
						Tombol (Berbentuk Pil)
					</h3>
					<div class="flex flex-wrap items-center gap-3">
						<Button variant="primary">
							<span>Mulai Sekarang</span>
							<HugeiconsIcon icon={ArrowRight01Icon} size={16} />
						</Button>
						<Button variant="secondary">Batal</Button>
						<Button variant="dark">Simpan</Button>
						<Button variant="ghost">Pelajari Selengkapnya</Button>
					</div>

					<div class="flex flex-wrap items-center gap-2 pt-2">
						<Button size="sm" variant="primary">Ukuran SM</Button>
						<Button size="md" variant="primary">Ukuran MD</Button>
						<Button size="lg" variant="primary">Ukuran LG</Button>
						<Button variant="primary" disabled>Dinonaktifkan</Button>
					</div>
				</Card>

				<!-- Badges Card -->
				<Card variant="default" class="space-y-4">
					<h3 class="font-display text-lg font-extrabold text-forest-ink dark:text-lime-voltage">
						Lencana / Tag (Badge)
					</h3>
					<div class="flex flex-wrap items-center gap-2">
						<Badge variant="default">Standar (Linen)</Badge>
						<Badge variant="forest">Forest Ink</Badge>
						<Badge variant="lime">Lime Voltage</Badge>
						<Badge variant="neutral">Netral</Badge>
						<Badge variant="danger">Melebihi Budget</Badge>
						<Badge variant="info">Tabungan</Badge>
					</div>

					<p class="text-xs text-slate dark:text-stone-400">
						Badge berukuran 9999px radius (pil) digunakan untuk status kategori, periode, dan
						notifikasi limit.
					</p>
				</Card>

				<!-- Input Form Card -->
				<Card variant="muted" class="space-y-4">
					<h3 class="font-display text-lg font-extrabold text-forest-ink dark:text-lime-voltage">
						Input Formulir (Radius 10px)
					</h3>
					<Input
						label="Nominal Pengeluaran"
						placeholder="0"
						bind:value={sampleAmount}
						hint="Masukkan nominal pengeluaran dalam Rupiah"
					/>
					<Input
						label="Catatan Pengeluaran"
						placeholder="Contoh: Makan siang"
						bind:value={sampleNote}
					/>
					<Input
						label="Input Contoh Validasi Error"
						value="Format salah"
						error="Jumlah pengeluaran tidak boleh kurang dari 0"
					/>
				</Card>

				<!-- ProgressBar Card -->
				<Card variant="tinted" class="space-y-5">
					<h3 class="font-display text-lg font-extrabold text-forest-ink dark:text-lime-voltage">
						Bilah Progres Alokasi & Budget
					</h3>

					<ProgressBar label="Kebutuhan Pokok (Aman)" value={650000} max={1000000} showValue />

					<ProgressBar
						label="Kebutuhan Hiburan (Mendekati Limit)"
						value={850000}
						max={1000000}
						showValue
					/>

					<ProgressBar
						label="Makan di Luar (Melebihi Budget)"
						value={1150000}
						max={1000000}
						showValue
					/>

					<ProgressBar
						label="Kategori Tabungan (Positif)"
						value={500000}
						max={1000000}
						variant="savings"
						showValue
					/>
				</Card>
			</div>

			<!-- Card Surfaces Comparison -->
			<div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
				<Card variant="forest" class="space-y-2">
					<div class="flex items-center gap-2">
						<HugeiconsIcon icon={Wallet02Icon} size={20} class="text-lime-voltage" />
						<span class="font-display text-base font-extrabold text-lime-voltage">
							Kartu Forest Ink
						</span>
					</div>
					<p class="text-xs text-paper/80">
						Permukaan gelap premium untuk ringkasan saldo utama dan kartu sorotan finansial.
					</p>
				</Card>

				<Card variant="default" class="space-y-2">
					<div class="flex items-center gap-2">
						<HugeiconsIcon
							icon={PiggyBankIcon}
							size={20}
							class="text-forest-ink dark:text-lime-voltage"
						/>
						<span
							class="font-display text-base font-extrabold text-forest-ink dark:text-lime-voltage"
						>
							Kartu Standar (Paper)
						</span>
					</div>
					<p class="text-xs text-slate dark:text-stone-300">
						Permukaan bersih berlatar Paper atau Stone-900 dengan bayangan lembut (subtle shadow).
					</p>
				</Card>

				<Card variant="tinted" class="space-y-2">
					<div class="flex items-center gap-2">
						<HugeiconsIcon
							icon={AlertCircleIcon}
							size={20}
							class="text-forest-ink dark:text-lime-voltage"
						/>
						<span
							class="font-display text-base font-extrabold text-forest-ink dark:text-lime-voltage"
						>
							Kartu Linen Tinted
						</span>
					</div>
					<p class="text-xs text-charcoal dark:text-linen-mist/80">
						Aksen hijau lembut Linen Mist untuk kartu tips finansial dan ringkasan bulanan.
					</p>
				</Card>
			</div>
		</section>

		<!-- System Information Footer Card -->
		<Card variant="muted" class="space-y-3">
			<div class="flex items-center justify-between">
				<span class="text-sm font-semibold text-charcoal dark:text-stone-200">
					Informasi Infrastruktur & Stack
				</span>
				<Badge variant="neutral">Status Normal</Badge>
			</div>
			<div class="grid grid-cols-2 gap-2 text-xs text-slate sm:grid-cols-4 dark:text-stone-400">
				<div>
					<span class="block font-medium text-obsidian dark:text-paper">Framework</span>
					<span>SvelteKit + Svelte 5</span>
				</div>
				<div>
					<span class="block font-medium text-obsidian dark:text-paper">Styling</span>
					<span>Tailwind CSS v4 (@theme)</span>
				</div>
				<div>
					<span class="block font-medium text-obsidian dark:text-paper">Font Display</span>
					<span>Manrope 800</span>
				</div>
				<div>
					<span class="block font-medium text-obsidian dark:text-paper">Basis Data</span>
					<span>Cloudflare D1 + Drizzle</span>
				</div>
			</div>
		</Card>
	</main>
</div>
