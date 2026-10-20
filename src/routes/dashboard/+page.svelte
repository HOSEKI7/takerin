<script lang="ts">
	import type { PageProps } from './$types';
	import Button from '#lib/components/Button.svelte';
	import Card from '#lib/components/Card.svelte';
	import ThemeToggle from '#lib/components/ThemeToggle.svelte';
	import { authClient } from '#lib/auth-client.js';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';

	let { data }: PageProps = $props();

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

		<div class="grid gap-6 md:grid-cols-2">
			<Card variant="default" padding="lg">
				<h2 class="text-lg font-bold text-obsidian dark:text-paper">Informasi Akun</h2>
				<div class="mt-4 space-y-3 text-sm">
					<div>
						<span class="text-slate dark:text-stone-400">Nama:</span>
						<p class="font-semibold text-forest-ink dark:text-linen-mist">{data.user?.name}</p>
					</div>
					<div>
						<span class="text-slate dark:text-stone-400">Email:</span>
						<p class="font-semibold text-forest-ink dark:text-linen-mist">{data.user?.email}</p>
					</div>
					<div>
						<span class="text-slate dark:text-stone-400">Peran:</span>
						<p class="font-semibold text-forest-ink dark:text-lime-voltage">
							{data.user?.role === 'admin' ? 'Admin' : 'Pengguna'}
						</p>
					</div>
					<div>
						<span class="text-slate dark:text-stone-400">Status Verifikasi:</span>
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
		</div>
	</main>
</div>
