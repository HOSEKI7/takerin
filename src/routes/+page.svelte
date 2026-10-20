<script lang="ts">
	import type { PageProps } from './$types';
	import StatusBadge from '#lib/components/StatusBadge.svelte';

	let { data }: PageProps = $props();
</script>

<svelte:head>
	<title>Takerin — Atur dan Catat Pengeluaran Berdasarkan Pemasukan</title>
</svelte:head>

<main
	class="flex min-h-screen flex-col items-center justify-center bg-stone-900 px-4 text-stone-100"
>
	<div
		class="w-full max-w-md rounded-2xl border border-stone-800 bg-stone-950/80 p-8 shadow-2xl backdrop-blur"
	>
		<div class="mb-6 flex items-center justify-between">
			<span class="text-2xl font-bold tracking-tight text-white">takerin.</span>
			<StatusBadge status={data.dbStatus} />
		</div>

		<h1 class="text-xl font-semibold text-white">Halo Dunia! 👋</h1>

		<p class="mt-2 text-sm leading-relaxed text-stone-400">
			{data.message}
		</p>

		<div
			class="mt-6 space-y-1 rounded-lg border border-stone-800/80 bg-stone-900/90 p-4 text-xs text-stone-400"
		>
			<div class="flex justify-between">
				<span>Framework</span>
				<span class="font-mono text-stone-200">SvelteKit + Svelte 5</span>
			</div>
			<div class="flex justify-between">
				<span>Styling</span>
				<span class="font-mono text-stone-200">Tailwind CSS v4</span>
			</div>
			<div class="flex justify-between">
				<span>Basis Data</span>
				<span class="font-mono text-stone-200">Cloudflare D1 + Drizzle ORM</span>
			</div>
			<div class="flex justify-between">
				<span>Target Hosting</span>
				<span class="font-mono text-stone-200">takerin.my.id (Cloudflare Pages)</span>
			</div>
		</div>
	</div>
</main>
