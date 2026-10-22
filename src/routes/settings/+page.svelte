<script lang="ts">
	import type { PageProps } from './$types.js';
	import Button from '#lib/components/Button.svelte';
	import Card from '#lib/components/Card.svelte';
	import Input from '#lib/components/Input.svelte';
	import ThemeToggle from '#lib/components/ThemeToggle.svelte';
	import BrandLogo from '#lib/components/BrandLogo.svelte';
	import { authClient } from '#lib/auth-client.js';
	import { formatAuthError } from '#lib/validation/auth.js';
	import { formatDateIndonesian, formatDateISO } from '#lib/validation/onboarding.js';
	import { setTheme } from '#lib/theme.js';
	import { t, setLocale, type Locale } from '#lib/i18n/index.js';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { enhance } from '$app/forms';
	import { onMount } from 'svelte';
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import { Calendar01Icon, Download01Icon, Alert02Icon } from '@hugeicons/core-free-icons';

	let { data, form }: PageProps = $props();

	// Navigation & Logout state
	let isLoggingOut = $state(false);

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

	// 1. Profile Name State
	// svelte-ignore state_referenced_locally
	let displayName = $state(data.profile.name);
	let isUpdatingProfile = $state(false);

	// 2. Change Password State (via Better Auth)
	let currentPassword = $state('');
	let newPassword = $state('');
	let confirmPassword = $state('');
	let isChangingPassword = $state(false);
	let passwordError = $state('');
	let passwordSuccess = $state('');

	async function handleChangePassword(e: SubmitEvent) {
		e.preventDefault();
		passwordError = '';
		passwordSuccess = '';

		if (!currentPassword) {
			passwordError = 'Kata sandi saat ini wajib diisi.';
			return;
		}
		if (newPassword.length < 8) {
			passwordError = 'Kata sandi baru minimal 8 karakter.';
			return;
		}
		if (newPassword !== confirmPassword) {
			passwordError = 'Konfirmasi kata sandi tidak cocok.';
			return;
		}

		isChangingPassword = true;
		try {
			const res = await (
				authClient as unknown as {
					changePassword: (opts: {
						newPassword: string;
						currentPassword: string;
						revokeOtherSessions?: boolean;
					}) => Promise<{ error: { message?: string } | null }>;
				}
			).changePassword({
				newPassword,
				currentPassword,
				revokeOtherSessions: true
			});

			if (res.error) {
				passwordError = formatAuthError(res.error.message || 'Gagal mengubah kata sandi.');
			} else {
				passwordSuccess = 'Kata sandi berhasil diubah.';
				currentPassword = '';
				newPassword = '';
				confirmPassword = '';
			}
		} catch (err) {
			passwordError = err instanceof Error ? err.message : 'Terjadi kesalahan sistem.';
		} finally {
			isChangingPassword = false;
		}
	}

	// 3. 2FA State (Better Auth Plugin Integration)
	let customTwoFactor = $state<boolean | null>(null);
	let twoFactorEnabled = $derived(customTwoFactor ?? data.profile.twoFactorEnabled);

	type TwoFactorAction = 'none' | 'enable' | 'disable' | 'backupCodes';
	let twoFactorAction = $state<TwoFactorAction>('none');
	let twoFactorPassword = $state('');
	let twoFactorLoading = $state(false);
	let twoFactorError = $state('');
	let twoFactorSuccess = $state('');
	let backupCodes = $state<string[]>([]);
	let codesCopied = $state(false);

	function resetTwoFactorForm() {
		twoFactorAction = 'none';
		twoFactorPassword = '';
		twoFactorError = '';
	}

	async function handleEnable2FA(e: SubmitEvent) {
		e.preventDefault();
		if (!twoFactorPassword) {
			twoFactorError = 'Password akun wajib diisi untuk mengaktifkan 2FA.';
			return;
		}
		twoFactorLoading = true;
		twoFactorError = '';
		try {
			const res = await authClient.twoFactor.enable({ password: twoFactorPassword });
			if (res.error) {
				twoFactorError = formatAuthError(res.error.message || 'Gagal mengaktifkan 2FA.');
			} else {
				customTwoFactor = true;
				twoFactorSuccess = 'Verifikasi Dua Langkah berhasil diaktifkan!';
				backupCodes = res.data?.backupCodes || [];
				twoFactorAction = 'none';
				twoFactorPassword = '';
			}
		} catch (err) {
			twoFactorError = err instanceof Error ? err.message : 'Gagal menghubungi server.';
		} finally {
			twoFactorLoading = false;
		}
	}

	async function handleDisable2FA(e: SubmitEvent) {
		e.preventDefault();
		if (!twoFactorPassword) {
			twoFactorError = 'Password akun wajib diisi untuk menonaktifkan 2FA.';
			return;
		}
		twoFactorLoading = true;
		twoFactorError = '';
		try {
			const res = await authClient.twoFactor.disable({ password: twoFactorPassword });
			if (res.error) {
				twoFactorError = formatAuthError(res.error.message || 'Gagal menonaktifkan 2FA.');
			} else {
				customTwoFactor = false;
				twoFactorSuccess = 'Verifikasi Dua Langkah berhasil dinonaktifkan.';
				backupCodes = [];
				twoFactorAction = 'none';
				twoFactorPassword = '';
			}
		} catch (err) {
			twoFactorError = err instanceof Error ? err.message : 'Gagal menghubungi server.';
		} finally {
			twoFactorLoading = false;
		}
	}

	async function handleGenerateBackupCodes(e: SubmitEvent) {
		e.preventDefault();
		if (!twoFactorPassword) {
			twoFactorError = 'Password akun wajib diisi.';
			return;
		}
		twoFactorLoading = true;
		twoFactorError = '';
		try {
			const res = await authClient.twoFactor.generateBackupCodes({ password: twoFactorPassword });
			if (res.error) {
				twoFactorError = formatAuthError(res.error.message || 'Gagal membuat kode cadangan baru.');
			} else {
				backupCodes = res.data?.backupCodes || [];
				twoFactorSuccess = 'Kode cadangan baru berhasil dibuat!';
				twoFactorAction = 'none';
				twoFactorPassword = '';
			}
		} catch (err) {
			twoFactorError = err instanceof Error ? err.message : 'Gagal menghubungi server.';
		} finally {
			twoFactorLoading = false;
		}
	}

	async function copyBackupCodes() {
		try {
			await navigator.clipboard.writeText(backupCodes.join('\n'));
			codesCopied = true;
			setTimeout(() => {
				codesCopied = false;
			}, 2500);
		} catch (err) {
			console.error('Gagal menyalin:', err);
		}
	}

	// 4. Pay Day Timing Rules (Option A - Strict)
	// svelte-ignore state_referenced_locally
	let newPayDay = $state(data.settings.payDay);
	let todayISO = formatDateISO(new Date());
	let activePeriodEndDate = $derived(data.activePeriod?.endDate ?? '');
	// Under Option A: changes are allowed strictly before activePeriodEndDate (todayISO < activePeriodEndDate)
	let canChangePayDay = $derived(Boolean(activePeriodEndDate && todayISO < activePeriodEndDate));

	// 5. Language & Theme State
	// svelte-ignore state_referenced_locally
	let selectedLanguage = $state<Locale>(data.settings.language as Locale);
	// svelte-ignore state_referenced_locally
	let selectedTheme = $state(data.settings.theme);

	function onLanguageChange(e: Event) {
		const target = e.target as HTMLSelectElement;
		const val = target.value as Locale;
		selectedLanguage = val;
		setLocale(val);
	}

	function onThemeChange(e: Event) {
		const target = e.target as HTMLSelectElement;
		const val = target.value as 'light' | 'dark';
		selectedTheme = val;
		setTheme(val);
	}

	onMount(() => {
		const handleThemeChange = (e: Event) => {
			const customEvent = e as CustomEvent<{ theme: 'light' | 'dark' }>;
			if (customEvent.detail?.theme) {
				selectedTheme = customEvent.detail.theme;
			}
		};
		const handleLangChange = (e: Event) => {
			const customEvent = e as CustomEvent<{ locale: Locale }>;
			if (customEvent.detail?.locale) {
				selectedLanguage = customEvent.detail.locale;
			}
		};
		window.addEventListener('takerin:themechange', handleThemeChange);
		window.addEventListener('takerin:langchange', handleLangChange);
		return () => {
			window.removeEventListener('takerin:themechange', handleThemeChange);
			window.removeEventListener('takerin:langchange', handleLangChange);
		};
	});

	// 6. PDF Export Selection
	// svelte-ignore state_referenced_locally
	let selectedPdfPeriodId = $state(data.periods[0]?.id ?? '');

	// 7. Delete Account Dialog State
	let showDeleteModal = $state(false);
	let deleteConfirmText = $state('');
	let isDeletingAccount = $state(false);
</script>

<svelte:head>
	<title>{t('settings.title')} - {t('nav.brand')}</title>
</svelte:head>

<div
	class="min-h-screen bg-fog text-obsidian transition-colors dark:bg-dark-surface dark:text-paper"
>
	<!-- HEADER NAVIGATION -->
	<header
		class="sticky top-0 z-20 border-b border-fog bg-paper/95 px-4 py-3 backdrop-blur-md sm:px-8 dark:border-dark-border dark:bg-dark-surface/95"
	>
		<div class="mx-auto flex max-w-6xl items-center justify-between">
			<div class="flex items-center gap-3">
				<BrandLogo href="/dashboard" size="sm" />
				<span
					class="rounded-full bg-linen-mist px-2.5 py-0.5 text-xs font-semibold text-forest-ink dark:bg-spruce/60 dark:text-linen-mist"
				>
					{t('nav.settings')}
				</span>
			</div>
			<div class="flex items-center gap-3 sm:gap-4">
				<a
					href={resolve('/dashboard')}
					class="hidden text-xs font-semibold text-charcoal transition hover:text-forest-ink sm:inline-block dark:text-linen-mist dark:hover:text-lime-voltage"
				>
					{t('nav.dashboard')}
				</a>
				<a
					href={resolve('/categories')}
					class="hidden text-xs font-semibold text-charcoal transition hover:text-forest-ink sm:inline-block dark:text-linen-mist dark:hover:text-lime-voltage"
				>
					{t('nav.categories')}
				</a>
				<a
					href={resolve('/expenses')}
					class="hidden text-xs font-semibold text-charcoal transition hover:text-forest-ink sm:inline-block dark:text-linen-mist dark:hover:text-lime-voltage"
				>
					{t('nav.expenses')}
				</a>
				<a
					href={resolve('/history')}
					class="hidden text-xs font-semibold text-charcoal transition hover:text-forest-ink sm:inline-block dark:text-linen-mist dark:hover:text-lime-voltage"
				>
					{t('nav.history')}
				</a>
				{#if data.user?.role === 'admin'}
					<a
						href={resolve('/admin')}
						class="rounded-full bg-forest-ink/10 px-2.5 py-1 text-xs font-bold text-forest-ink transition hover:bg-forest-ink/20 dark:bg-lime-voltage/20 dark:text-lime-voltage"
					>
						{t('nav.admin')}
					</a>
				{/if}
				<ThemeToggle />
				<Button variant="secondary" size="sm" onclick={handleLogout} disabled={isLoggingOut}>
					{isLoggingOut ? t('nav.loggingOut') : t('nav.logout')}
				</Button>
			</div>
		</div>
	</header>

	<main class="mx-auto max-w-4xl px-4 py-8 sm:px-8 sm:py-10">
		<!-- PAGE TITLE -->
		<div class="mb-8">
			<h1
				class="text-2xl font-bold tracking-tight text-forest-ink sm:text-3xl dark:text-linen-mist"
			>
				{t('settings.title')}
			</h1>
			<p class="mt-1 text-sm text-slate dark:text-linen-mist/70">
				{t('settings.subtitle')}
			</p>
		</div>

		<!-- FLASH ALERTS -->
		{#if form?.profileMessage || form?.settingsMessage}
			<div
				class="mb-6 rounded-lg border border-lime-voltage/40 bg-linen-mist/60 p-4 text-sm font-semibold text-forest-ink dark:border-lime-voltage/30 dark:bg-spruce/40 dark:text-lime-voltage"
			>
				{form?.profileMessage || form?.settingsMessage}
			</div>
		{/if}

		{#if form?.profileError || form?.settingsError || form?.deleteError}
			<div
				class="mb-6 rounded-lg border border-alarm-red/30 bg-alarm-red/10 p-4 text-sm font-semibold text-alarm-red dark:border-alarm-red/40 dark:bg-alarm-red/20"
			>
				{form?.profileError || form?.settingsError || form?.deleteError}
			</div>
		{/if}

		<div class="space-y-8">
			<!-- SECTION 1: PROFIL PENGGUNA -->
			<Card variant="default" padding="lg">
				<h2 class="text-lg font-bold text-obsidian dark:text-paper">{t('settings.profileSection')}</h2>
				<p class="mt-1 text-xs text-slate dark:text-pebble">
					{t('settings.profileSaved')}
				</p>

				<form
					method="POST"
					action="?/updateProfile"
					use:enhance={() => {
						isUpdatingProfile = true;
						return async ({ update }) => {
							await update();
							isUpdatingProfile = false;
						};
					}}
					class="mt-6 space-y-4"
				>
					<div class="grid gap-4 sm:grid-cols-2">
						<div>
							<Input
								id="profile-name"
								name="name"
								label={t('settings.displayNameLabel')}
								placeholder={t('settings.displayNamePlaceholder')}
								required
								bind:value={displayName}
								disabled={isUpdatingProfile}
							/>
						</div>
						<div>
							<Input
								id="profile-email"
								label={t('auth.login.emailLabel')}
								value={data.profile.email}
								disabled
							/>
						</div>
					</div>

					<div class="flex items-center justify-between pt-2">
						<div class="flex items-center gap-2 text-xs">
							<span
								class="rounded-full px-2 py-0.5 font-semibold {data.profile.emailVerified
									? 'bg-linen-mist text-forest-ink dark:bg-spruce/60 dark:text-lime-voltage'
									: 'bg-alarm-red/10 text-alarm-red'}"
							>
								{data.profile.emailVerified ? 'Email Terverifikasi' : 'Belum Verifikasi'}
							</span>
							<span
								class="rounded-full bg-fog px-2 py-0.5 font-semibold text-slate dark:bg-dark-border dark:text-pebble"
							>
								{t('admin.roleCol')}: {data.profile.role === 'admin' ? t('nav.admin') : 'User'}
							</span>
						</div>

						<Button type="submit" variant="primary" size="sm" disabled={isUpdatingProfile}>
							{isUpdatingProfile ? t('common.saving') : t('settings.saveProfile')}
						</Button>
					</div>
				</form>
			</Card>

			<!-- SECTION 2: KEAMANAN & KATA SANDI -->
			<Card variant="default" padding="lg">
				<h2 class="text-lg font-bold text-obsidian dark:text-paper">{t('settings.securitySection')}</h2>
				<p class="mt-1 text-xs text-slate dark:text-pebble">
					{t('settings.subtitle')}
				</p>

				<div class="mt-6 grid gap-8 lg:grid-cols-2">
					<!-- GANTI PASSWORD -->
					<div
						class="border-b border-fog pb-6 lg:border-r lg:border-b-0 lg:pr-6 dark:border-dark-border"
					>
						<h3 class="text-sm font-bold text-obsidian dark:text-paper">{t('settings.changePassword')}</h3>

						{#if passwordSuccess}
							<div
								class="mt-3 rounded-lg border border-lime-voltage/40 bg-linen-mist/60 p-3 text-xs font-semibold text-forest-ink dark:bg-spruce/30 dark:text-lime-voltage"
							>
								{passwordSuccess}
							</div>
						{/if}

						{#if passwordError}
							<div
								class="mt-3 rounded-lg border border-alarm-red/30 bg-alarm-red/10 p-3 text-xs font-semibold text-alarm-red"
							>
								{passwordError}
							</div>
						{/if}

						<form onsubmit={handleChangePassword} class="mt-4 space-y-3">
							<Input
								id="current-password"
								label={t('settings.currentPasswordLabel')}
								type="password"
								placeholder="••••••••"
								required
								bind:value={currentPassword}
								disabled={isChangingPassword}
							/>
							<Input
								id="new-password"
								label={t('settings.newPasswordLabel')}
								type="password"
								placeholder="Minimal 8 karakter"
								required
								bind:value={newPassword}
								disabled={isChangingPassword}
							/>
							<Input
								id="confirm-password"
								label={t('settings.confirmPasswordLabel')}
								type="password"
								placeholder="Ketik ulang kata sandi baru"
								required
								bind:value={confirmPassword}
								disabled={isChangingPassword}
							/>

							<div class="pt-2">
								<Button type="submit" variant="secondary" size="sm" disabled={isChangingPassword}>
									{isChangingPassword ? t('common.updating') : t('settings.savePassword')}
								</Button>
							</div>
						</form>
					</div>

					<!-- VERIFIKASI DUA LANGKAH (2FA) -->
					<div>
						<div class="flex items-center justify-between">
							<h3 class="text-sm font-bold text-obsidian dark:text-paper">
								{t('settings.twoFactorTitle')}
							</h3>
							<span
								class="rounded-full px-2.5 py-0.5 text-xs font-semibold {twoFactorEnabled
									? 'bg-linen-mist text-forest-ink dark:bg-spruce dark:text-lime-voltage'
									: 'bg-fog text-slate dark:bg-dark-border dark:text-pebble'}"
							>
								{twoFactorEnabled ? t('settings.twoFactorEnabledBadge') : t('settings.twoFactorDisabledBadge')}
							</span>
						</div>

						<p class="mt-2 text-xs text-slate dark:text-linen-mist/80">
							{t('settings.twoFactorDesc')}
						</p>

						{#if twoFactorSuccess}
							<div
								class="mt-3 rounded-lg border border-lime-voltage/40 bg-linen-mist/60 p-3 text-xs font-semibold text-forest-ink dark:bg-spruce/30 dark:text-lime-voltage"
							>
								{twoFactorSuccess}
							</div>
						{/if}

						{#if twoFactorError}
							<div
								class="mt-3 rounded-lg border border-alarm-red/30 bg-alarm-red/10 p-3 text-xs font-semibold text-alarm-red"
							>
								{twoFactorError}
							</div>
						{/if}

						<div class="mt-4 space-y-4">
							{#if !twoFactorEnabled}
								{#if twoFactorAction !== 'enable'}
									<Button
										variant="primary"
										size="sm"
										onclick={() => {
											twoFactorAction = 'enable';
											twoFactorPassword = '';
											twoFactorError = '';
										}}
									>
										{t('settings.enableTwoFactor')}
									</Button>
								{:else}
									<form
										onsubmit={handleEnable2FA}
										class="space-y-3 rounded-lg border border-fog bg-fog/60 p-4 dark:border-dark-border dark:bg-dark-card"
									>
										<p class="text-xs font-semibold text-forest-ink dark:text-lime-voltage">
											Masukkan Kata Sandi Akun untuk Mengaktifkan 2FA:
										</p>
										<Input
											id="enable-2fa-pwd"
											label={t('auth.login.passwordLabel')}
											type="password"
											placeholder="Kata sandi akun Anda"
											required
											bind:value={twoFactorPassword}
											disabled={twoFactorLoading}
										/>
										<div class="flex items-center gap-2 pt-1">
											<Button type="submit" variant="primary" size="sm" disabled={twoFactorLoading}>
												{twoFactorLoading ? t('common.processing') : t('common.confirm')}
											</Button>
											<Button
												type="button"
												variant="secondary"
												size="sm"
												onclick={resetTwoFactorForm}
												disabled={twoFactorLoading}
											>
												{t('common.cancel')}
											</Button>
										</div>
									</form>
								{/if}
							{:else}
								<div class="flex flex-wrap items-center gap-2">
									{#if twoFactorAction === 'none'}
										<Button
											variant="secondary"
											size="sm"
											onclick={() => {
												twoFactorAction = 'disable';
												twoFactorPassword = '';
												twoFactorError = '';
											}}
										>
											{t('settings.disableTwoFactor')}
										</Button>
										<Button
											variant="secondary"
											size="sm"
											onclick={() => {
												twoFactorAction = 'backupCodes';
												twoFactorPassword = '';
												twoFactorError = '';
											}}
										>
											{t('settings.generateBackupCodes')}
										</Button>
									{/if}
								</div>

								{#if twoFactorAction === 'disable'}
									<form
										onsubmit={handleDisable2FA}
										class="space-y-3 rounded-lg border border-alarm-red/30 bg-paper p-4 dark:border-alarm-red/40 dark:bg-dark-surface"
									>
										<p class="text-xs font-semibold text-alarm-red">{t('settings.disableTwoFactor')}</p>
										<Input
											id="disable-2fa-pwd"
											label={t('auth.login.passwordLabel')}
											type="password"
											placeholder="Masukkan kata sandi akun Anda"
											required
											bind:value={twoFactorPassword}
											disabled={twoFactorLoading}
										/>
										<div class="flex items-center gap-2 pt-1">
											<Button type="submit" variant="dark" size="sm" disabled={twoFactorLoading}>
												{twoFactorLoading ? t('common.processing') : t('settings.disableTwoFactor')}
											</Button>
											<Button
												type="button"
												variant="secondary"
												size="sm"
												onclick={resetTwoFactorForm}
												disabled={twoFactorLoading}
											>
												{t('common.cancel')}
											</Button>
										</div>
									</form>
								{/if}

								{#if twoFactorAction === 'backupCodes'}
									<form
										onsubmit={handleGenerateBackupCodes}
										class="space-y-3 rounded-lg border border-fog bg-fog/60 p-4 dark:border-dark-border dark:bg-dark-card"
									>
										<p class="text-xs font-semibold text-forest-ink dark:text-lime-voltage">
											{t('settings.generateBackupCodes')}
										</p>
										<Input
											id="gen-codes-pwd"
											label={t('auth.login.passwordLabel')}
											type="password"
											placeholder="Masukkan kata sandi akun Anda"
											required
											bind:value={twoFactorPassword}
											disabled={twoFactorLoading}
										/>
										<div class="flex items-center gap-2 pt-1">
											<Button type="submit" variant="primary" size="sm" disabled={twoFactorLoading}>
												{twoFactorLoading ? t('common.processing') : t('settings.generateBackupCodes')}
											</Button>
											<Button
												type="button"
												variant="secondary"
												size="sm"
												onclick={resetTwoFactorForm}
												disabled={twoFactorLoading}
											>
												{t('common.cancel')}
											</Button>
										</div>
									</form>
								{/if}
							{/if}

							<!-- TAMPILAN KODE CADANGAN -->
							{#if backupCodes.length > 0}
								<div
									class="mt-4 rounded-lg border border-lime-voltage/40 bg-linen-mist/50 p-4 dark:border-lime-voltage/30 dark:bg-spruce/30"
								>
									<div class="flex items-center justify-between">
										<h5 class="text-xs font-bold text-forest-ink dark:text-lime-voltage">
											Kode Cadangan Anda:
										</h5>
										<button
											type="button"
											onclick={copyBackupCodes}
											class="cursor-pointer text-xs font-bold text-forest-ink hover:underline dark:text-lime-voltage"
										>
											{codesCopied ? t('settings.codesCopied') : t('settings.copyCodes')}
										</button>
									</div>
									<p class="mt-1 text-[11px] text-slate dark:text-pebble">
										{t('settings.backupCodesWarning')}
									</p>
									<div class="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
										{#each backupCodes as code (code)}
											<div
												class="rounded-lg border border-fog bg-paper px-2 py-1 text-center font-mono text-xs font-bold text-obsidian dark:border-dark-border dark:bg-dark-surface dark:text-paper"
											>
												{code}
											</div>
										{/each}
									</div>
								</div>
							{/if}
						</div>
					</div>
				</div>
			</Card>

			<!-- SECTION 3: PREFERENSI KEUANGAN (TANGGAL GAJIAN) & APLIKASI -->
			<Card variant="default" padding="lg">
				<h2 class="text-lg font-bold text-obsidian dark:text-paper">
					{t('settings.preferencesSection')}
				</h2>
				<p class="mt-1 text-xs text-slate dark:text-pebble">
					{t('settings.subtitle')}
				</p>

				<form method="POST" action="?/updateSettings" use:enhance class="mt-6 space-y-6">
					<!-- TANGGAL GAJIAN -->
					<div
						class="rounded-lg border border-fog bg-fog/50 p-4 dark:border-dark-border dark:bg-dark-card"
					>
						<div class="flex items-start justify-between gap-4">
							<div>
								<div class="flex items-center gap-2">
									<HugeiconsIcon
										icon={Calendar01Icon}
										size={18}
										class="text-forest-ink dark:text-lime-voltage"
									/>
									<h3 class="text-sm font-bold text-obsidian dark:text-paper">
										{t('settings.payDayLabel')}
									</h3>
								</div>
								<p class="mt-1 text-xs text-slate dark:text-pebble">
									Menandai hari dimulainya Periode Bulan baru (1–31). Periode saat ini:
									<strong class="text-forest-ink dark:text-linen-mist">
										{data.activePeriod
											? `${formatDateIndonesian(data.activePeriod.startDate)} s/d ${formatDateIndonesian(data.activePeriod.endDate)}`
											: '-'}
									</strong>
									(Tanggal Gajian aktif: {data.settings.payDay}).
								</p>
							</div>

							<span
								class="rounded-full px-2.5 py-0.5 text-xs font-semibold {canChangePayDay
									? 'bg-linen-mist text-forest-ink dark:bg-spruce dark:text-lime-voltage'
									: 'bg-alarm-red/10 text-alarm-red'}"
							>
								{canChangePayDay ? 'Dapat Diubah' : 'Batas Waktu'}
							</span>
						</div>

						<div class="mt-4 max-w-xs">
							<Input
								id="settings-pay-day"
								name="payDay"
								type="number"
								min="1"
								max="31"
								label={t('settings.payDayLabel')}
								bind:value={newPayDay}
								disabled={!canChangePayDay}
							/>
						</div>

						{#if !canChangePayDay}
							<div class="mt-3 flex items-center gap-2 text-xs font-medium text-alarm-red">
								<HugeiconsIcon icon={Alert02Icon} size={14} />
								<span>
									{t('settings.payDayLockedHelp')}
								</span>
							</div>
						{:else}
							<p class="mt-2 text-[11px] text-slate dark:text-pebble">
								{t('settings.payDayHelp')}
							</p>
						{/if}
					</div>

					<!-- BAHASA & TEMA -->
					<div class="grid gap-6 sm:grid-cols-2">
						<!-- BAHASA -->
						<div>
							<label
								for="settings-language"
								class="block text-sm font-medium text-charcoal dark:text-linen-mist"
							>
								{t('settings.languageLabel')}
							</label>
							<select
								id="settings-language"
								name="language"
								bind:value={selectedLanguage}
								onchange={onLanguageChange}
								class="mt-1.5 w-full rounded-lg border border-pebble bg-paper px-4 py-2.5 text-sm text-obsidian transition focus:border-forest-ink focus:outline-none dark:border-dark-border dark:bg-dark-surface dark:text-paper"
							>
								<option value="id">Bahasa Indonesia (ID)</option>
								<option value="en">English (EN)</option>
							</select>
							<p class="mt-1 text-xs text-slate dark:text-pebble">
								Tersimpan di preferensi profil pengguna.
							</p>
						</div>

						<!-- TEMA -->
						<div>
							<label
								for="settings-theme"
								class="block text-sm font-medium text-charcoal dark:text-linen-mist"
							>
								{t('settings.themeLabel')}
							</label>
							<select
								id="settings-theme"
								name="theme"
								bind:value={selectedTheme}
								onchange={onThemeChange}
								class="mt-1.5 w-full rounded-lg border border-pebble bg-paper px-4 py-2.5 text-sm text-obsidian transition focus:border-forest-ink focus:outline-none dark:border-dark-border dark:bg-dark-surface dark:text-paper"
							>
								<option value="light">{t('settings.lightTheme')}</option>
								<option value="dark">{t('settings.darkTheme')}</option>
							</select>
							<p class="mt-1 text-xs text-slate dark:text-pebble">
								Tersinkronisasi langsung dengan toggle tema dan tersimpan di database.
							</p>
						</div>
					</div>

					<div class="flex justify-end pt-2">
						<Button type="submit" variant="primary" size="sm">{t('settings.savePreferences')}</Button>
					</div>
				</form>
			</Card>

			<!-- SECTION 4: EKSPOR DATA -->
			<Card variant="default" padding="lg">
				<h2 class="text-lg font-bold text-obsidian dark:text-paper">{t('settings.exportSection')}</h2>
				<p class="mt-1 text-xs text-slate dark:text-pebble">
					{t('settings.exportDesc')}
				</p>

				<div class="mt-6 grid gap-6 sm:grid-cols-2">
					<!-- EKSPOR CSV -->
					<div
						class="flex flex-col justify-between rounded-lg border border-fog bg-fog/50 p-5 dark:border-dark-border dark:bg-dark-card"
					>
						<div>
							<div class="flex items-center gap-2">
								<HugeiconsIcon
									icon={Download01Icon}
									size={18}
									class="text-forest-ink dark:text-lime-voltage"
								/>
								<h3 class="text-sm font-bold text-obsidian dark:text-paper">
									{t('settings.exportCsvButton')}
								</h3>
							</div>
							<p class="mt-2 text-xs text-slate dark:text-linen-mist/80">
								{t('settings.exportDesc')}
							</p>
						</div>

						<div class="pt-4">
							<a href={resolve('/api/export/csv')} download class="inline-block">
								<Button variant="secondary" size="sm">{t('settings.exportCsvButton')}</Button>
							</a>
						</div>
					</div>

					<!-- EKSPOR PDF -->
					<div
						class="flex flex-col justify-between rounded-lg border border-fog bg-fog/50 p-5 dark:border-dark-border dark:bg-dark-card"
					>
						<div>
							<div class="flex items-center gap-2">
								<HugeiconsIcon
									icon={Download01Icon}
									size={18}
									class="text-forest-ink dark:text-lime-voltage"
								/>
								<h3 class="text-sm font-bold text-obsidian dark:text-paper">
									{t('settings.exportPdfButton')}
								</h3>
							</div>
							<p class="mt-2 text-xs text-slate dark:text-linen-mist/80">
								{t('settings.exportDesc')}
							</p>

							<div class="mt-3">
								<label
									for="select-pdf-period"
									class="block text-xs font-semibold text-charcoal dark:text-pebble"
								>
									{t('settings.selectPeriodForPdf')}
								</label>
								<select
									id="select-pdf-period"
									bind:value={selectedPdfPeriodId}
									class="mt-1 w-full rounded-lg border border-pebble bg-paper px-3 py-2 text-xs text-obsidian transition focus:border-forest-ink focus:outline-none dark:border-dark-border dark:bg-dark-surface dark:text-paper"
								>
									{#each data.periods as p (p.id)}
										<option value={p.id}>
											{formatDateIndonesian(p.startDate)} s/d {formatDateIndonesian(p.endDate)} ({p.status ===
											'active'
												? t('common.active')
												: t('common.success')})
										</option>
									{/each}
								</select>
							</div>
						</div>

						<div class="pt-4">
							{#if selectedPdfPeriodId}
								<a
									href="{resolve('/api/export/pdf')}?periodId={selectedPdfPeriodId}"
									download
									class="inline-block"
								>
									<Button variant="primary" size="sm">{t('settings.exportPdfButton')}</Button>
								</a>
							{:else}
								<Button variant="primary" size="sm" disabled>{t('history.selectPeriod')}</Button>
							{/if}
						</div>
					</div>
				</div>
			</Card>

			<!-- SECTION 5: ZONA BAHAYA (HAPUS AKUN) -->
			<div
				class="rounded-lg border border-alarm-red/40 bg-alarm-red/5 p-6 dark:border-alarm-red/30 dark:bg-alarm-red/10"
			>
				<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
					<div>
						<h2 class="text-base font-bold text-alarm-red">{t('settings.deleteAccountSection')}</h2>
						<p class="mt-1 text-xs text-slate dark:text-linen-mist/80">
							{t('settings.deleteDesc')}
						</p>
					</div>

					<div>
						<button
							type="button"
							onclick={() => {
								showDeleteModal = true;
								deleteConfirmText = '';
							}}
							class="cursor-pointer rounded-full bg-alarm-red px-5 py-2 text-xs font-bold text-paper transition hover:bg-alarm-red/90 active:scale-95"
						>
							{t('settings.deleteButton')}
						</button>
					</div>
				</div>
			</div>
		</div>
	</main>

	<!-- MODAL DIALOG KONFIRMASI HAPUS AKUN -->
	{#if showDeleteModal}
		<div
			class="fixed inset-0 z-50 flex items-center justify-center bg-obsidian/60 p-4 backdrop-blur-xs"
			role="dialog"
			aria-modal="true"
			aria-labelledby="delete-modal-title"
		>
			<div
				class="w-full max-w-md rounded-2xl border border-alarm-red/40 bg-paper p-6 shadow-2xl dark:border-alarm-red/40 dark:bg-dark-surface"
			>
				<div class="flex items-center gap-3 text-alarm-red">
					<HugeiconsIcon icon={Alert02Icon} size={24} />
					<h3 id="delete-modal-title" class="text-base font-bold text-alarm-red">
						{t('settings.deleteModalTitle')}
					</h3>
				</div>

				<p class="mt-3 text-xs leading-relaxed text-charcoal dark:text-linen-mist/80">
					{t('settings.deleteModalWarning')}
				</p>

				<form
					method="POST"
					action="?/deleteAccount"
					use:enhance={() => {
						isDeletingAccount = true;
						return async ({ update }) => {
							await update();
							isDeletingAccount = false;
						};
					}}
					class="mt-4 space-y-4"
				>
					<div>
						<label
							for="delete-confirm-input"
							class="block text-xs font-semibold text-charcoal dark:text-linen-mist"
						>
							{t('settings.deleteModalTypeConfirm')}
						</label>
						<input
							id="delete-confirm-input"
							name="confirmText"
							type="text"
							required
							placeholder="HAPUS AKUN SAYA"
							bind:value={deleteConfirmText}
							disabled={isDeletingAccount}
							class="mt-1.5 w-full rounded-lg border border-pebble px-3 py-2 text-xs text-obsidian transition focus:border-alarm-red focus:ring-1 focus:ring-alarm-red focus:outline-none dark:border-dark-border dark:bg-dark-card dark:text-paper"
						/>
					</div>

					<div class="flex items-center justify-end gap-2 pt-2">
						<Button
							type="button"
							variant="secondary"
							size="sm"
							onclick={() => {
								showDeleteModal = false;
								deleteConfirmText = '';
							}}
							disabled={isDeletingAccount}
						>
							{t('common.cancel')}
						</Button>

						<button
							type="submit"
							disabled={deleteConfirmText !== 'HAPUS AKUN SAYA' || isDeletingAccount}
							class="cursor-pointer rounded-full bg-alarm-red px-5 py-1.5 text-xs font-bold text-paper transition hover:bg-alarm-red/90 disabled:cursor-not-allowed disabled:opacity-40"
						>
							{isDeletingAccount ? t('common.deleting') : t('settings.deleteModalConfirmButton')}
						</button>
					</div>
				</form>
			</div>
		</div>
	{/if}
</div>
