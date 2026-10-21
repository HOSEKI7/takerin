<script lang="ts">
	import type { PageProps } from './$types.js';
	import Button from '#lib/components/Button.svelte';
	import Card from '#lib/components/Card.svelte';
	import Input from '#lib/components/Input.svelte';
	import ProgressBar from '#lib/components/ProgressBar.svelte';
	import ThemeToggle from '#lib/components/ThemeToggle.svelte';
	import BrandLogo from '#lib/components/BrandLogo.svelte';
	import { authClient } from '#lib/auth-client.js';
	import { formatAuthError } from '#lib/validation/auth.js';
	import { formatRupiah, formatDateIndonesian } from '#lib/validation/onboarding.js';
	import { goto } from '$app/navigation';
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

	let isLoggingOut = $state(false);

	// 2FA state
	let customTwoFactorEnabled = $state<boolean | null>(null);
	let twoFactorEnabled = $derived(customTwoFactorEnabled ?? data.user?.twoFactorEnabled ?? false);

	type ActionType = 'none' | 'enable' | 'disable';
	let activeAction = $state<ActionType>('none');
	let actionPassword = $state('');

	let backupCodes = $state<string[]>([]);
	let totpURI = $state<string>('');
	let feedbackMessage = $state('');
	let feedbackError = $state('');
	let isActionLoading = $state(false);
	let copied = $state(false);

	// Settings accordion toggle
	let showAccountSecurity = $state(false);

	async function handleLogout() {
		isLoggingOut = true;
		try {
			await authClient.signOut();
			goto(resolve('/auth/login'));
		} catch (error) {
			console.error('Gagal logout:', error);
			isLoggingOut = false;
		}
	}

	function resetActionState() {
		activeAction = 'none';
		actionPassword = '';
		feedbackError = '';
	}

	async function handleEnable2FA(event: SubmitEvent) {
		event.preventDefault();
		feedbackMessage = '';
		feedbackError = '';

		if (!actionPassword) {
			feedbackError = 'Password wajib diisi untuk mengaktifkan verifikasi dua langkah.';
			return;
		}

		isActionLoading = true;
		try {
			const res = await authClient.twoFactor.enable({
				password: actionPassword
			});

			if (res.error) {
				feedbackError = formatAuthError(res.error);
			} else if (res.data) {
				customTwoFactorEnabled = true;
				backupCodes = res.data.backupCodes || [];
				totpURI = res.data.totpURI || '';
				resetActionState();
				feedbackMessage =
					'Verifikasi Dua Langkah berhasil diaktifkan! Simpan kode cadangan Anda di bawah ini.';
			}
		} catch (err: unknown) {
			feedbackError = formatAuthError(err instanceof Error ? err.message : null);
		} finally {
			resetActionState();
			isActionLoading = false;
		}
	}

	async function handleDisable2FA(event: SubmitEvent) {
		event.preventDefault();
		feedbackMessage = '';
		feedbackError = '';

		if (!actionPassword) {
			feedbackError = 'Password wajib diisi untuk menonaktifkan verifikasi dua langkah.';
			return;
		}

		isActionLoading = true;
		try {
			const res = await authClient.twoFactor.disable({
				password: actionPassword
			});

			if (res.error) {
				feedbackError = formatAuthError(res.error);
			} else {
				customTwoFactorEnabled = false;
				backupCodes = [];
				totpURI = '';
				resetActionState();
				feedbackMessage = 'Verifikasi Dua Langkah berhasil dinonaktifkan.';
			}
		} catch (err: unknown) {
			feedbackError = formatAuthError(err instanceof Error ? err.message : null);
		} finally {
			isActionLoading = false;
		}
	}

	async function handleCopyCodes() {
		if (backupCodes.length === 0) return;
		try {
			await navigator.clipboard.writeText(backupCodes.join('\n'));
			copied = true;
			setTimeout(() => {
				copied = false;
			}, 2500);
		} catch (err) {
			console.error('Gagal menyalin kode:', err);
		}
	}
</script>

<div
	class="min-h-screen bg-paper font-sans text-charcoal transition-colors dark:bg-dark-surface dark:text-linen-mist"
>
	<!-- App Header -->
	<header
		class="sticky top-0 z-20 border-b border-fog bg-paper/90 px-4 py-3.5 backdrop-blur sm:px-6 dark:border-dark-border dark:bg-dark-card/90"
	>
		<div class="mx-auto flex max-w-6xl items-center justify-between">
			<div class="flex items-center gap-3">
				<BrandLogo href="/dashboard" size="sm" />
				<span
					class="rounded-full bg-linen-mist px-2.5 py-0.5 text-xs font-semibold text-forest-ink dark:bg-spruce/60 dark:text-linen-mist"
				>
					Dashboard
				</span>
			</div>
			<div class="flex items-center gap-3 sm:gap-4">
				<ThemeToggle />
				<Button variant="secondary" size="sm" onclick={handleLogout} disabled={isLoggingOut}>
					{isLoggingOut ? 'Mengeluarkan...' : 'Keluar'}
				</Button>
			</div>
		</div>
	</header>

	<main class="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
		<!-- Welcome Header -->
		<div class="mb-6 flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
			<div>
				<h1 class="text-2xl font-extrabold text-obsidian sm:text-3xl dark:text-paper">
					Selamat datang, {data.user?.name ?? 'Pengguna'}!
				</h1>
				<p class="mt-1 text-sm text-slate dark:text-pebble">
					Overview pengelolaan alokasi budget dan pemantauan keuangan Periode Bulan aktif Anda.
				</p>
			</div>

			{#if data.period}
				<div
					class="flex items-center gap-2 rounded-xl border border-fog bg-fog/40 px-3.5 py-1.5 text-xs font-medium text-forest-ink dark:border-dark-border dark:bg-dark-card dark:text-linen-mist"
				>
					<HugeiconsIcon
						icon={Calendar01Icon}
						class="h-4 w-4 text-forest-ink dark:text-lime-voltage"
					/>
					<span>
						{formatDateIndonesian(data.period.startDate)} – {formatDateIndonesian(
							data.period.endDate
						)}
					</span>
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
					<p class="font-bold">Peringatan Anggaran: Pengeluaran Telah Melebihi 80%</p>
					<p class="mt-0.5 text-xs text-alarm-red/90">
						Total pengeluaran Anda telah mencapai
						<span class="font-extrabold">{data.summary.spentPercentage}%</span>
						dari Pemasukan Bulanan ({formatRupiah(data.summary.totalSpent)} dari {formatRupiah(
							data.summary.totalIncome
						)}). Harap kendalikan pengeluaran harian hingga Tanggal Gajian berikutnya.
					</p>
				</div>
			</div>
		{/if}

		<!-- Feedback Alerts -->
		{#if feedbackMessage}
			<div
				role="status"
				class="mb-6 rounded-xl border border-lime-voltage/40 bg-linen-mist p-4 text-sm font-medium text-forest-ink dark:bg-spruce/40 dark:text-linen-mist"
			>
				{feedbackMessage}
			</div>
		{/if}

		{#if feedbackError}
			<div
				role="alert"
				class="mb-6 rounded-xl border border-alarm-red/40 bg-alarm-red/10 p-4 text-sm font-medium text-alarm-red dark:border-alarm-red/50 dark:bg-alarm-red/20"
			>
				{feedbackError}
			</div>
		{/if}

		{#if !data.period}
			<!-- Empty state when no active period is found -->
			<Card variant="tinted" padding="lg" class="text-center">
				<div
					class="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-linen-mist dark:bg-spruce/60"
				>
					<HugeiconsIcon
						icon={Wallet01Icon}
						class="h-6 w-6 text-forest-ink dark:text-lime-voltage"
					/>
				</div>
				<h2 class="mt-4 text-lg font-bold text-forest-ink dark:text-linen-mist">
					Belum Ada Periode Bulan Aktif
				</h2>
				<p class="mx-auto mt-2 max-w-md text-sm text-charcoal dark:text-pebble">
					Anda belum memiliki konfigurasi budget bulanan yang aktif. Mulai atur Tanggal Gajian dan
					alokasi kategori Anda untuk memulai pemantauan.
				</p>
				<div class="mt-5">
					<a href={resolve('/onboarding')}>
						<Button variant="primary" size="md">Mulai Setup Periode</Button>
					</a>
				</div>
			</Card>
		{:else}
			<!-- SUMMARY CARD -->
			<section aria-label="Ringkasan Keuangan Periode Aktif" class="mb-8">
				<Card variant="default" padding="lg" class="shadow-sm">
					<div
						class="flex flex-col justify-between gap-3 border-b border-fog pb-4 sm:flex-row sm:items-center dark:border-dark-border"
					>
						<div>
							<span
								class="text-xs font-semibold tracking-wider text-slate uppercase dark:text-pebble"
							>
								Periode Bulan Aktif
							</span>
							<h2 class="text-lg font-bold text-obsidian sm:text-xl dark:text-paper">
								Ringkasan Anggaran
							</h2>
						</div>
						<div class="flex items-center gap-2 text-xs font-semibold text-slate dark:text-pebble">
							<span class="inline-block h-2 w-2 rounded-full bg-lime-voltage"></span>
							<span>Tanggal Gajian: setiap tgl {data.period.payDay}</span>
						</div>
					</div>

					<!-- Metrics Grid -->
					<div class="mt-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
						<!-- Total Pemasukan Bulanan -->
						<div
							class="rounded-xl border border-fog/80 bg-fog/30 p-4 dark:border-dark-border/60 dark:bg-dark-surface/50"
						>
							<span class="text-xs font-medium text-slate dark:text-pebble">Pemasukan Bulanan</span>
							<p
								class="mt-1.5 text-lg font-black tracking-tight text-forest-ink sm:text-2xl dark:text-paper"
							>
								{formatRupiah(data.summary.totalIncome)}
							</p>
							<span class="mt-1 block text-[11px] text-slate dark:text-pebble">
								Basis alokasi 100% kategori
							</span>
						</div>

						<!-- Total Terpakai -->
						<div
							class="rounded-xl border border-fog/80 bg-fog/30 p-4 dark:border-dark-border/60 dark:bg-dark-surface/50"
						>
							<span class="text-xs font-medium text-slate dark:text-pebble">Total Terpakai</span>
							<p
								class="mt-1.5 text-lg font-black tracking-tight text-obsidian sm:text-2xl dark:text-paper"
							>
								{formatRupiah(data.summary.totalSpent)}
							</p>
							<span
								class="mt-1 block text-[11px] {data.summary.isWarning80
									? 'font-bold text-alarm-red'
									: 'text-slate dark:text-pebble'}"
							>
								{data.summary.spentPercentage}% dari total pemasukan
							</span>
						</div>

						<!-- Sisa Saldo -->
						<div
							class="rounded-xl border border-fog/80 bg-fog/30 p-4 dark:border-dark-border/60 dark:bg-dark-surface/50"
						>
							<span class="text-xs font-medium text-slate dark:text-pebble">Sisa Saldo</span>
							<p
								class="mt-1.5 text-lg font-black tracking-tight {data.summary.remaining < 0
									? 'text-alarm-red'
									: 'text-forest-ink dark:text-lime-voltage'} sm:text-2xl"
							>
								{formatRupiah(data.summary.remaining)}
							</p>
							<span class="mt-1 block text-[11px] text-slate dark:text-pebble">
								{Math.max(0, 100 - data.summary.spentPercentage)}% anggaran tersisa
							</span>
						</div>

						<!-- Persentase Terpakai Overall -->
						<div
							class="rounded-xl border border-fog/80 bg-fog/30 p-4 dark:border-dark-border/60 dark:bg-dark-surface/50"
						>
							<span class="text-xs font-medium text-slate dark:text-pebble">Status Penggunaan</span>
							<p
								class="mt-1.5 text-lg font-black tracking-tight sm:text-2xl {data.summary
									.isWarning80
									? 'text-alarm-red'
									: 'text-forest-ink dark:text-linen-mist'}"
							>
								{data.summary.spentPercentage}%
							</p>
							<div class="mt-2">
								<ProgressBar
									value={data.summary.totalSpent}
									max={data.summary.totalIncome || 1}
									variant={data.summary.isWarning80 ? 'danger' : 'lime'}
								/>
							</div>
						</div>
					</div>
				</Card>
			</section>

			<!-- RESPONSIVE SIDE-BY-SIDE ON DESKTOP, SCROLLABLE ON MOBILE -->
			<div class="grid grid-cols-1 gap-8 lg:grid-cols-12">
				<!-- LEFT / MAIN COLUMN: CATEGORY BREAKDOWN -->
				<section aria-label="Rincian Alokasi Kategori" class="lg:col-span-7">
					<div class="mb-4 flex items-center justify-between">
						<div>
							<h2 class="text-lg font-extrabold text-obsidian sm:text-xl dark:text-paper">
								Rincian Kategori
							</h2>
							<p class="text-xs text-slate dark:text-pebble">
								Alokasi budget dan sisa saldo untuk tiap kategori aktif.
							</p>
						</div>
						<span
							class="rounded-full bg-fog px-2.5 py-0.5 text-xs font-semibold text-slate dark:bg-dark-border dark:text-linen-mist"
						>
							{data.categories.length} Kategori
						</span>
					</div>

					{#if data.categories.length === 0}
						<Card variant="default" padding="md" class="text-center">
							<p class="text-sm text-slate dark:text-pebble">
								Belum ada kategori yang terhubung dengan Periode Bulan ini.
							</p>
						</Card>
					{:else}
						<div class="space-y-4">
							{#each data.categories as cat (cat.id)}
								<div
									class="rounded-xl border p-4 transition-colors {cat.isSavings
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
															class="rounded-full bg-spruce/15 px-2 py-0.5 text-[10px] font-bold tracking-wide text-spruce dark:bg-lime-voltage/25 dark:text-lime-voltage"
														>
															Tabungan
														</span>
													{/if}
												</div>
												<span class="text-xs text-slate dark:text-pebble">
													Alokasi: {formatRupiah(cat.allocation)} ({cat.percentage}%)
												</span>
											</div>
										</div>

										<!-- Balance / Spent display -->
										<div class="text-right">
											{#if cat.isSavings}
												<span class="text-xs text-slate dark:text-pebble">Terkumpul</span>
												<p
													class="text-sm font-black text-spruce sm:text-base dark:text-lime-voltage"
												>
													{formatRupiah(cat.spent)}
												</p>
											{:else}
												<span class="text-xs text-slate dark:text-pebble">Saldo Sisa</span>
												<p
													class="text-sm font-black sm:text-base {cat.balance < 0
														? 'text-alarm-red'
														: 'text-forest-ink dark:text-linen-mist'}"
												>
													{formatRupiah(cat.balance)}
												</p>
											{/if}
										</div>
									</div>

									<!-- Progress Bar per kategori -->
									<div class="mt-3.5">
										{#if cat.isSavings}
											<!-- Visual treatment berbeda: progress = positif (terkumpul menuju target alokasi) -->
											<ProgressBar value={cat.spent} max={cat.allocation || 1} variant="savings" />
											<div
												class="mt-1.5 flex items-center justify-between text-[11px] text-slate dark:text-pebble"
											>
												<span>Tersisa: {formatRupiah(cat.balance)}</span>
												<span class="font-semibold text-spruce dark:text-lime-voltage">
													{cat.spentPercentage}% tercapai
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
												class="mt-1.5 flex items-center justify-between text-[11px] text-slate dark:text-pebble"
											>
												<span>Terpakai: {formatRupiah(cat.spent)}</span>
												<span
													class="font-semibold {cat.remainingPercentage <= 20
														? 'font-bold text-alarm-red'
														: 'text-slate dark:text-linen-mist'}"
												>
													{cat.remainingPercentage}% saldo tersisa
												</span>
											</div>
										{/if}
									</div>
								</div>
							{/each}
						</div>
					{/if}
				</section>

				<!-- RIGHT / SIDE COLUMN: RECENT EXPENSES & QUICK ACTIONS -->
				<section aria-label="Pengeluaran Terbaru" class="space-y-6 lg:col-span-5">
					<Card variant="default" padding="lg" class="shadow-sm">
						<div class="mb-4 flex items-center justify-between">
							<div>
								<h2 class="text-lg font-extrabold text-obsidian dark:text-paper">
									Pengeluaran Terbaru
								</h2>
								<p class="text-xs text-slate dark:text-pebble">
									Catatan pengeluaran dalam Periode Bulan ini.
								</p>
							</div>
							<HugeiconsIcon icon={Invoice01Icon} class="h-5 w-5 text-slate dark:text-pebble" />
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
									Belum Ada Pengeluaran
								</h3>
								<p class="mt-1 text-xs text-slate dark:text-pebble">
									Belum ada pengeluaran yang dicatat pada periode ini. Seluruh saldo kategori Anda
									masih utuh 100%.
								</p>
								<div class="mt-4">
									<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
									<a href="/expenses/new">
										<Button variant="primary" size="sm">Catat Pengeluaran</Button>
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
												<span>{formatDateIndonesian(expense.date)}</span>
											</div>
										</div>
										<p class="text-sm font-bold text-forest-ink dark:text-lime-voltage">
											{formatRupiah(expense.amount)}
										</p>
									</div>
								{/each}
							</div>
						{/if}
					</Card>

					<!-- Periode Detail Card -->
					<Card variant="tinted" padding="md">
						<h3 class="text-sm font-bold text-forest-ink dark:text-linen-mist">
							Tentang Periode Bulan Ini
						</h3>
						<p class="mt-1.5 text-xs leading-relaxed text-charcoal dark:text-linen-mist/80">
							Siklus budget berjalan dari tanggal <span class="font-bold"
								>{formatDateIndonesian(data.period.startDate)}</span
							>
							hingga <span class="font-bold">{formatDateIndonesian(data.period.endDate)}</span>.
							Saldo tidak carry-over ke periode berikutnya demi menjaga evaluasi bulanan yang
							disiplin.
						</p>
					</Card>
				</section>
			</div>
		{/if}

		<!-- BOTTOM SECTION: ACCOUNT SECURITY & SETTINGS -->
		<div class="mt-12 border-t border-fog pt-6 dark:border-dark-border">
			<button
				type="button"
				aria-expanded={showAccountSecurity}
				aria-controls="account-security-section"
				class="flex w-full cursor-pointer items-center justify-between text-left"
				onclick={() => {
					showAccountSecurity = !showAccountSecurity;
				}}
			>
				<div>
					<h3 class="text-base font-bold text-obsidian dark:text-paper">
						Informasi Akun & Keamanan (2FA)
					</h3>
					<p class="text-xs text-slate dark:text-pebble">
						Pengaturan profil pengguna dan verifikasi dua langkah.
					</p>
				</div>
				<span
					class="rounded-lg border border-fog px-2.5 py-1 text-xs font-semibold text-slate dark:border-dark-border dark:text-pebble"
				>
					{showAccountSecurity ? 'Sembunyikan' : 'Buka Pengaturan'}
				</span>
			</button>

			{#if showAccountSecurity}
				<div id="account-security-section" class="mt-6 grid gap-6 md:grid-cols-2">
					<Card variant="default" padding="lg">
						<h4 class="text-sm font-bold text-obsidian dark:text-paper">Informasi Akun</h4>
						<div class="mt-4 space-y-3 text-sm">
							<div>
								<span class="text-xs text-slate dark:text-pebble">Nama:</span>
								<p class="font-semibold text-forest-ink dark:text-linen-mist">{data.user?.name}</p>
							</div>
							<div>
								<span class="text-xs text-slate dark:text-pebble">Email:</span>
								<p class="font-semibold text-forest-ink dark:text-linen-mist">{data.user?.email}</p>
							</div>
							<div>
								<span class="text-xs text-slate dark:text-pebble">Peran:</span>
								<p class="font-semibold text-forest-ink dark:text-lime-voltage">
									{data.user?.role === 'admin' ? 'Admin' : 'Pengguna'}
								</p>
							</div>
							<div>
								<span class="text-xs text-slate dark:text-pebble">Status Verifikasi:</span>
								<p
									class="font-semibold {data.user?.emailVerified
										? 'text-forest-ink dark:text-lime-voltage'
										: 'text-alarm-red'}"
								>
									{data.user?.emailVerified ? 'Email Terverifikasi' : 'Belum Verifikasi'}
								</p>
							</div>
						</div>
					</Card>

					<Card variant="default" padding="lg">
						<div class="flex items-center justify-between">
							<h4 class="text-sm font-bold text-obsidian dark:text-paper">
								Verifikasi Dua Langkah (2FA)
							</h4>
							<span
								class="rounded-full px-2.5 py-0.5 text-xs font-semibold {twoFactorEnabled
									? 'bg-linen-mist text-forest-ink dark:bg-spruce dark:text-lime-voltage'
									: 'bg-fog text-slate dark:bg-dark-border dark:text-linen-mist/80'}"
							>
								{twoFactorEnabled ? '2FA Aktif' : '2FA Nonaktif'}
							</span>
						</div>

						<p class="mt-3 text-xs text-slate dark:text-linen-mist/80">
							{twoFactorEnabled
								? 'Akun Anda dilindungi dengan verifikasi dua langkah saat masuk.'
								: 'Tingkatkan keamanan akun dengan mewajibkan verifikasi OTP setiap masuk.'}
						</p>

						<!-- 2FA Actions -->
						<div class="mt-5 space-y-4">
							{#if !twoFactorEnabled}
								{#if activeAction !== 'enable'}
									<Button
										variant="primary"
										size="sm"
										onclick={() => {
											activeAction = 'enable';
											actionPassword = '';
											feedbackError = '';
										}}
									>
										Aktifkan 2FA
									</Button>
								{:else}
									<form
										onsubmit={handleEnable2FA}
										class="space-y-3 rounded-lg border border-fog bg-paper p-4 dark:border-dark-border dark:bg-dark-surface"
									>
										<p class="text-xs font-semibold text-forest-ink dark:text-lime-voltage">
											Masukkan Password Akun Anda:
										</p>
										<Input
											id="enable-2fa-password"
											label="Password"
											type="password"
											placeholder="Password akun Anda"
											required
											bind:value={actionPassword}
											disabled={isActionLoading}
										/>
										<div class="flex items-center gap-2 pt-1">
											<Button type="submit" variant="primary" size="sm" disabled={isActionLoading}>
												{isActionLoading ? 'Memproses...' : 'Konfirmasi Aktifkan 2FA'}
											</Button>
											<Button
												type="button"
												variant="secondary"
												size="sm"
												onclick={resetActionState}
												disabled={isActionLoading}
											>
												Batal
											</Button>
										</div>
									</form>
								{/if}
							{:else}
								<div class="flex flex-wrap items-center gap-3">
									{#if activeAction === 'none'}
										<Button
											variant="secondary"
											size="sm"
											onclick={() => {
												activeAction = 'disable';
												actionPassword = '';
												feedbackError = '';
											}}
										>
											Nonaktifkan 2FA
										</Button>
									{/if}
								</div>

								{#if activeAction === 'disable'}
									<form
										onsubmit={handleDisable2FA}
										class="space-y-3 rounded-lg border border-alarm-red/30 bg-paper p-4 dark:border-alarm-red/40 dark:bg-dark-surface"
									>
										<p class="text-xs font-semibold text-alarm-red">
											Konfirmasi Nonaktifkan Verifikasi Dua Langkah
										</p>
										<Input
											id="disable-2fa-password"
											label="Password Akun"
											type="password"
											placeholder="Masukkan password akun Anda"
											required
											bind:value={actionPassword}
											disabled={isActionLoading}
										/>
										<div class="flex items-center gap-2 pt-1">
											<Button type="submit" variant="dark" size="sm" disabled={isActionLoading}>
												{isActionLoading ? 'Memproses...' : 'Ya, Nonaktifkan'}
											</Button>
											<Button
												type="button"
												variant="secondary"
												size="sm"
												onclick={resetActionState}
												disabled={isActionLoading}
											>
												Batal
											</Button>
										</div>
									</form>
								{/if}
							{/if}
						</div>

						<!-- Backup Codes -->
						{#if backupCodes.length > 0}
							<div
								class="mt-6 rounded-lg border border-lime-voltage/40 bg-linen-mist/50 p-4 dark:border-lime-voltage/30 dark:bg-spruce/30"
							>
								<div class="flex items-center justify-between">
									<h5 class="text-xs font-bold text-forest-ink dark:text-lime-voltage">
										Kode Cadangan
									</h5>
									<button
										type="button"
										onclick={handleCopyCodes}
										class="cursor-pointer text-xs font-bold text-forest-ink hover:underline dark:text-lime-voltage"
									>
										{copied ? 'Tersalin!' : 'Salin Semua'}
									</button>
								</div>
								<div class="mt-2.5 grid grid-cols-2 gap-2 sm:grid-cols-4">
									{#each backupCodes as code (code)}
										<div
											class="rounded-lg border border-fog bg-paper px-2 py-1 text-center font-mono text-xs font-bold text-obsidian dark:border-dark-border dark:bg-dark-surface dark:text-paper"
										>
											{code}
										</div>
									{/each}
								</div>

								{#if totpURI}
									<div class="mt-4 border-t border-forest-ink/10 pt-3 dark:border-white/10">
										<p class="text-xs font-semibold text-forest-ink dark:text-lime-voltage">
											Pengaturan Aplikasi Autentikator (Opsional):
										</p>
										<p
											class="mt-1 font-mono text-[11px] break-all text-slate dark:text-linen-mist/80"
										>
											{totpURI}
										</p>
									</div>
								{/if}
							</div>
						{/if}
					</Card>
				</div>
			{/if}
		</div>
	</main>
</div>
