<script lang="ts">
	import { resolve } from '$app/paths';
	import { Button, BrandLogo, Badge, formatBlogDate, PublicNavbar } from '#lib';
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import {
		SparklesIcon,
		ArrowRight01Icon,
		BookOpen01Icon,
		Clock01Icon,
		Calendar03Icon
	} from '@hugeicons/core-free-icons';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>Blog & Edukasi Finansial — Tips Atur Gaji Bulanan | Takerin</title>
	<meta
		name="description"
		content="Kumpulan panduan praktis cara atur gaji bulanan, tips hemat anak kos, dan strategi alokasi takaran pengeluaran agar tidak boncos bersama Takerin."
	/>
	<meta
		name="keywords"
		content="blog keuangan, cara atur gaji bulanan, tips hemat anak kos, catat pengeluaran, budgeting gaji, takerin"
	/>
	<link rel="canonical" href="https://takerin.my.id/blog" />

	<!-- Open Graph -->
	<meta property="og:title" content="Blog & Edukasi Finansial — Takerin" />
	<meta
		property="og:description"
		content="Panduan praktis atur gaji bulanan, tips hemat anak kos, dan strategi keuangan tanpa rasa bersalah bersama Takerin."
	/>
	<meta property="og:url" content="https://takerin.my.id/blog" />
	<meta property="og:type" content="website" />
	<meta property="og:site_name" content="Takerin" />
	<meta property="og:image" content="https://takerin.my.id/brand/og-image.png" />
	<meta property="og:image:secure_url" content="https://takerin.my.id/brand/og-image.png" />
	<meta property="og:image:width" content="1200" />
	<meta property="og:image:height" content="630" />
	<meta property="og:image:type" content="image/png" />
	<meta property="og:image:alt" content="Blog & Edukasi Finansial — Takerin" />

	<!-- Twitter Cards -->
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content="Blog & Edukasi Finansial — Takerin" />
	<meta
		name="twitter:description"
		content="Panduan praktis atur gaji bulanan, tips hemat anak kos, dan strategi keuangan tanpa rasa bersalah."
	/>
	<meta name="twitter:image" content="https://takerin.my.id/brand/og-image.png" />
	<meta name="twitter:image:alt" content="Blog & Edukasi Finansial — Takerin" />
</svelte:head>

<div
	class="min-h-screen bg-paper font-sans text-charcoal transition-colors duration-200 dark:bg-dark-canvas dark:text-fog"
>
	<!-- Navigation Header -->
	<PublicNavbar />

	<main>
		<!-- Hero Section -->
		<section
			class="border-b border-fog bg-linen-mist/20 py-16 sm:py-20 dark:border-dark-border dark:bg-dark-surface/40"
		>
			<div class="mx-auto max-w-4xl px-4 text-center sm:px-6">
				<div class="mb-4 inline-flex items-center gap-2">
					<Badge variant="forest">
						<HugeiconsIcon icon={SparklesIcon} size={14} />
						<span>Blog & Edukasi Finansial</span>
					</Badge>
				</div>
				<h1 class="text-3xl font-black tracking-tight text-obsidian sm:text-5xl dark:text-paper">
					Tips Finansial Praktis Biar Nggak Boncos
				</h1>
				<p class="mx-auto mt-4 max-w-2xl text-base text-slate sm:text-lg dark:text-pebble">
					Pelajari cara mengatur gaji bulanan, menakar jatah per kategori, dan membangun kebiasaan
					finansial yang tenang bersama Takerin.
				</p>
			</div>
		</section>

		<!-- Articles Grid -->
		<section class="py-12 sm:py-16">
			<div class="mx-auto max-w-6xl px-4 sm:px-6">
				<div class="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
					{#each data.posts as post (post.slug)}
						<article
							class="flex flex-col justify-between rounded-lg border border-fog bg-paper p-6 transition-colors hover:border-forest-ink/30 dark:border-dark-border dark:bg-dark-surface dark:hover:border-lime-voltage/40"
						>
							<div>
								<div class="flex items-center justify-between gap-2">
									<Badge variant="lime" class="text-[11px]">
										{post.targetKeyword ?? 'Tips Finansial'}
									</Badge>
									<span class="inline-flex items-center gap-1 text-xs text-pebble dark:text-pebble">
										<HugeiconsIcon icon={Clock01Icon} size={12} />
										{post.readingTime}
									</span>
								</div>

								<h2
									class="mt-4 text-xl leading-snug font-bold text-obsidian transition-colors hover:text-forest-ink dark:text-paper dark:hover:text-lime-voltage"
								>
									<a href={resolve('/blog/[slug]', { slug: post.slug })}>
										{post.title}
									</a>
								</h2>

								<p class="mt-3 line-clamp-3 text-sm leading-relaxed text-slate dark:text-pebble">
									{post.excerpt}
								</p>
							</div>

							<div
								class="mt-6 flex items-center justify-between border-t border-fog/80 pt-4 text-xs dark:border-dark-border"
							>
								<span class="inline-flex items-center gap-1.5 text-pebble dark:text-pebble">
									<HugeiconsIcon icon={Calendar03Icon} size={13} />
									{formatBlogDate(post.date)}
								</span>

								<a
									href={resolve('/blog/[slug]', { slug: post.slug })}
									class="inline-flex items-center gap-1 font-semibold text-forest-ink transition-colors hover:text-spruce dark:text-lime-voltage dark:hover:brightness-110"
								>
									<span>Baca selengkapnya</span>
									<HugeiconsIcon icon={ArrowRight01Icon} size={14} />
								</a>
							</div>
						</article>
					{/each}
				</div>
			</div>
		</section>

		<!-- Bottom CTA Section -->
		<section
			class="border-t border-fog bg-forest-ink py-16 text-paper dark:border-dark-border dark:bg-dark-surface"
		>
			<div class="mx-auto max-w-4xl px-4 text-center sm:px-6">
				<div
					class="inline-flex items-center gap-2 rounded-full bg-spruce/60 px-3 py-1 text-xs text-lime-voltage"
				>
					<HugeiconsIcon icon={BookOpen01Icon} size={14} />
					<span>Mulai Praktikkan Sekarang</span>
				</div>
				<h2 class="mt-4 text-2xl font-black tracking-tight text-paper sm:text-4xl">
					Takar Gajimu Sekarang, Tenangin Bulanmu
				</h2>
				<p class="mx-auto mt-4 max-w-xl text-sm text-linen-mist/80 sm:text-base dark:text-pebble">
					Jangan biarkan penghasilanmu habis tanpa arah yang jelas. Bergabunglah dengan ribuan orang
					yang mengelola keuangan dengan tenang bersama Takerin.
				</p>
				<div class="mt-8 flex flex-col items-center justify-center gap-6 sm:flex-row">
					<a href={resolve('/auth/register')}>
						<Button variant="primary" size="lg" class="w-full sm:w-auto">
							Daftar Gratis Sekarang
						</Button>
					</a>
					<a
						href={resolve('/')}
						class="text-sm font-semibold text-lime-voltage underline underline-offset-4 transition hover:opacity-80"
					>
						Pelajari Fitur Takerin
					</a>
				</div>
			</div>
		</section>
	</main>

	<!-- Footer -->
	<footer class="border-t border-fog bg-paper py-12 dark:border-dark-border dark:bg-dark-surface">
		<div class="mx-auto max-w-6xl px-4 sm:px-6">
			<div class="flex flex-col items-center justify-between gap-6 sm:flex-row">
				<BrandLogo href="/" size="sm" />
				<div class="flex items-center gap-6 text-xs text-slate dark:text-pebble">
					<a href={resolve('/')} class="hover:text-forest-ink dark:hover:text-lime-voltage"
						>Beranda</a
					>
					<a href={resolve('/blog')} class="hover:text-forest-ink dark:hover:text-lime-voltage"
						>Blog</a
					>
					<a
						href={resolve('/auth/register')}
						class="hover:text-forest-ink dark:hover:text-lime-voltage">Daftar</a
					>
					<a
						href={resolve('/auth/login')}
						class="hover:text-forest-ink dark:hover:text-lime-voltage">Masuk</a
					>
				</div>
				<p class="text-xs text-slate dark:text-pebble">
					© 2026 Takerin. Setiap rupiah punya jatah.
				</p>
			</div>
		</div>
	</footer>
</div>
