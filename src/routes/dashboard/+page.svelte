<script lang="ts">
	import type { PageProps } from './$types';
	import Button from '#lib/components/Button.svelte';
	import Card from '#lib/components/Card.svelte';
	import Input from '#lib/components/Input.svelte';
	import ThemeToggle from '#lib/components/ThemeToggle.svelte';
	import { authClient } from '#lib/auth-client.js';
	import { formatAuthError } from '#lib/validation/auth.js';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';

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
	<header
		class="border-b border-fog bg-paper/80 px-6 py-4 backdrop-blur dark:border-dark-border dark:bg-dark-card/80"
	>
		<div class="mx-auto flex max-w-5xl items-center justify-between">
			<div class="flex items-center gap-3">
				<a
					href={resolve('/')}
					class="text-xl font-black tracking-tight text-forest-ink dark:text-lime-voltage"
				>
					Takerin
				</a>
				<span
					class="rounded-full bg-linen-mist px-2.5 py-0.5 text-xs font-semibold text-forest-ink dark:bg-spruce/60 dark:text-linen-mist"
				>
					Dashboard
				</span>
			</div>
			<div class="flex items-center gap-4">
				<ThemeToggle />
				<Button variant="secondary" size="sm" onclick={handleLogout} disabled={isLoggingOut}>
					{isLoggingOut ? 'Mengeluarkan...' : 'Keluar'}
				</Button>
			</div>
		</div>
	</header>

	<main class="mx-auto max-w-5xl px-6 py-12">
		<div class="mb-8">
			<h1 class="text-3xl font-extrabold text-obsidian dark:text-paper">
				Selamat datang, {data.user?.name ?? 'Pengguna'}!
			</h1>
			<p class="mt-2 text-base text-slate dark:text-stone-300">
				Kelola alokasi pemasukan dan pantau pengeluaran harian Anda dengan tertib.
			</p>
		</div>

		{#if feedbackMessage}
			<div
				role="status"
				class="mb-6 rounded-lg border border-lime-voltage/40 bg-linen-mist p-4 text-sm font-medium text-forest-ink dark:bg-spruce/40 dark:text-linen-mist"
			>
				{feedbackMessage}
			</div>
		{/if}

		{#if feedbackError}
			<div
				role="alert"
				class="mb-6 rounded-lg border border-alarm-red/40 bg-linen-mist/30 p-4 text-sm font-medium text-alarm-red dark:border-alarm-red/50 dark:bg-spruce/20 dark:text-alarm-red"
			>
				{feedbackError}
			</div>
		{/if}

		<div class="grid gap-6 md:grid-cols-2">
			<Card variant="default" padding="lg">
				<h2 class="text-lg font-bold text-obsidian dark:text-paper">Informasi Akun</h2>
				<div class="mt-4 space-y-3 text-sm">
					<div>
						<span class="text-slate dark:text-pebble">Nama:</span>
						<p class="font-semibold text-forest-ink dark:text-linen-mist">{data.user?.name}</p>
					</div>
					<div>
						<span class="text-slate dark:text-pebble">Email:</span>
						<p class="font-semibold text-forest-ink dark:text-linen-mist">{data.user?.email}</p>
					</div>
					<div>
						<span class="text-slate dark:text-pebble">Peran:</span>
						<p class="font-semibold text-forest-ink dark:text-lime-voltage">
							{data.user?.role === 'admin' ? 'Admin' : 'Pengguna'}
						</p>
					</div>
					<div>
						<span class="text-slate dark:text-pebble">Status Verifikasi:</span>
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

			<Card variant="tinted" padding="lg">
				<h2 class="text-lg font-bold text-forest-ink dark:text-linen-mist">Langkah Selanjutnya</h2>
				<p class="mt-2 text-sm text-charcoal dark:text-stone-300">
					Persiapan Periode Bulan pertama Anda (penentuan Tanggal Gajian dan Sumber Pemasukan) akan
					hadir pada tahap setup anggaran selanjutnya.
				</p>
			</Card>

			<div class="md:col-span-2">
				<Card variant="default" padding="lg">
					<div class="flex items-center justify-between">
						<h2 class="text-lg font-bold text-obsidian dark:text-paper">
							Keamanan Akun: Verifikasi Dua Langkah (2FA)
						</h2>
						<span
							class="rounded-full px-2.5 py-0.5 text-xs font-semibold {twoFactorEnabled
								? 'bg-linen-mist text-forest-ink dark:bg-spruce dark:text-lime-voltage'
								: 'bg-fog text-slate dark:bg-dark-border dark:text-linen-mist/80'}"
						>
							{twoFactorEnabled ? '2FA Aktif' : '2FA Nonaktif'}
						</span>
					</div>

					<p class="mt-3 text-sm text-slate dark:text-linen-mist/80">
						{twoFactorEnabled
							? 'Akun Anda dilindungi dengan verifikasi dua langkah. Saat masuk, kode OTP dikirimkan ke email Anda atau dapat dimasukkan dari aplikasi autentikator.'
							: 'Tingkatkan keamanan akun dengan mewajibkan verifikasi kode OTP setiap kali masuk.'}
					</p>

					<!-- Action Buttons -->
					<div class="mt-6 space-y-4">
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
									class="max-w-md space-y-3 rounded-lg border border-fog bg-paper p-4 dark:border-dark-border dark:bg-dark-surface"
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
									class="max-w-md space-y-3 rounded-lg border border-alarm-red/30 bg-paper p-4 dark:border-alarm-red/40 dark:bg-dark-surface"
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

					<!-- Display Backup Codes & TOTP URI -->
					{#if backupCodes.length > 0}
						<div
							class="mt-6 rounded-lg border border-lime-voltage/40 bg-linen-mist/50 p-5 dark:border-lime-voltage/30 dark:bg-spruce/30"
						>
							<div class="flex items-center justify-between">
								<h3 class="text-sm font-bold text-forest-ink dark:text-lime-voltage">
									Kode Cadangan
								</h3>
								<button
									type="button"
									onclick={handleCopyCodes}
									class="cursor-pointer text-xs font-bold text-forest-ink hover:underline dark:text-lime-voltage"
								>
									{copied ? 'Tersalin ke Clipboard!' : 'Salin Semua'}
								</button>
							</div>
							<p class="mt-1 text-xs text-charcoal dark:text-linen-mist/80">
								Simpan kode cadangan ini di tempat yang aman. Setiap kode hanya bisa digunakan satu
								kali untuk masuk apabila Anda tidak dapat mengakses email verifikasi.
							</p>
							<div class="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
								{#each backupCodes as code (code)}
									<div
										class="rounded-lg border border-fog bg-paper px-3 py-2 text-center font-mono text-xs font-bold text-obsidian dark:border-dark-border dark:bg-dark-surface dark:text-paper"
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
		</div>
	</main>
</div>
