<script lang="ts">
	import { resolve } from '$app/paths';
	import { Button, BrandLogo, Badge, formatBlogDate, PublicNavbar } from '#lib';
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import {
		ArrowLeft01Icon,
		Clock01Icon,
		Calendar03Icon,
		UserIcon,
		SparklesIcon
	} from '@hugeicons/core-free-icons';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const articleSchema = $derived({
		'@context': 'https://schema.org',
		'@type': 'Article',
		headline: data.post.title,
		description: data.post.excerpt,
		datePublished: data.post.date,
		image: data.post.image ?? 'https://takerin.my.id/brand/takerin-wordmark.webp',
		author: {
			'@type': 'Organization',
			name: data.post.author,
			url: 'https://takerin.my.id'
		},
		publisher: {
			'@type': 'Organization',
			name: 'Takerin',
			url: 'https://takerin.my.id',
			logo: {
				'@type': 'ImageObject',
				url: 'https://takerin.my.id/brand/takerin-logo.webp'
			}
		},
		mainEntityOfPage: {
			'@type': 'WebPage',
			'@id': `https://takerin.my.id/blog/${data.post.slug}`
		}
	});

	const breadcrumbSchema = $derived({
		'@context': 'https://schema.org',
		'@type': 'BreadcrumbList',
		itemListElement: [
			{
				'@type': 'ListItem',
				position: 1,
				name: 'Beranda',
				item: 'https://takerin.my.id'
			},
			{
				'@type': 'ListItem',
				position: 2,
				name: 'Blog',
				item: 'https://takerin.my.id/blog'
			},
			{
				'@type': 'ListItem',
				position: 3,
				name: data.post.title,
				item: `https://takerin.my.id/blog/${data.post.slug}`
			}
		]
	});

	const jsonLdArticle = $derived(
		`<script type="application/ld+json">${JSON.stringify(articleSchema)}` + '</' + 'script>'
	);

	const jsonLdBreadcrumb = $derived(
		`<script type="application/ld+json">${JSON.stringify(breadcrumbSchema)}` + '</' + 'script>'
	);
</script>

<svelte:head>
	<title>{data.post.title} — Blog Takerin</title>
	<meta name="description" content={data.post.excerpt} />
	<meta
		name="keywords"
		content={data.post.keywords?.join(', ') || data.post.targetKeyword || 'tips keuangan'}
	/>
	<link rel="canonical" href={`https://takerin.my.id/blog/${data.post.slug}`} />

	<!-- Open Graph -->
	<meta property="og:title" content={`${data.post.title} — Takerin`} />
	<meta property="og:description" content={data.post.excerpt} />
	<meta property="og:url" content={`https://takerin.my.id/blog/${data.post.slug}`} />
	<meta property="og:type" content="article" />
	<meta property="og:site_name" content="Takerin" />
	<meta
		property="og:image"
		content={data.post.image ?? 'https://takerin.my.id/brand/takerin-wordmark.webp'}
	/>
	<meta property="article:published_time" content={data.post.date} />
	<meta property="article:author" content={data.post.author} />

	<!-- Twitter Cards -->
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content={`${data.post.title} — Takerin`} />
	<meta name="twitter:description" content={data.post.excerpt} />
	<meta
		name="twitter:image"
		content={data.post.image ?? 'https://takerin.my.id/brand/takerin-wordmark.webp'}
	/>

	<!-- Structured Data -->
	<!-- eslint-disable-next-line svelte/no-at-html-tags -->
	{@html jsonLdArticle}
	<!-- eslint-disable-next-line svelte/no-at-html-tags -->
	{@html jsonLdBreadcrumb}
</svelte:head>

<div
	class="min-h-screen bg-paper font-sans text-charcoal transition-colors duration-200 dark:bg-dark-canvas dark:text-fog"
>
	<!-- Navigation Header -->
	<PublicNavbar />

	<main class="py-10 sm:py-16">
		<article class="mx-auto max-w-3xl px-4 sm:px-6">
			<!-- Breadcrumbs -->
			<nav
				class="mb-8 flex items-center gap-2 text-xs text-slate dark:text-pebble"
				aria-label="Breadcrumb"
			>
				<a href={resolve('/')} class="hover:text-forest-ink dark:hover:text-lime-voltage">Beranda</a
				>
				<span>/</span>
				<a href={resolve('/blog')} class="hover:text-forest-ink dark:hover:text-lime-voltage"
					>Blog</a
				>
				<span>/</span>
				<span class="truncate text-charcoal dark:text-fog">{data.post.title}</span>
			</nav>

			<!-- Article Header -->
			<header class="mb-10 space-y-4 border-b border-fog pb-8 dark:border-dark-border">
				{#if data.post.targetKeyword}
					<Badge variant="lime" class="text-xs">
						{data.post.targetKeyword}
					</Badge>
				{/if}

				<h1
					class="text-3xl leading-tight font-black tracking-tight text-obsidian sm:text-4xl lg:text-5xl dark:text-paper"
				>
					{data.post.title}
				</h1>

				<p class="text-lg leading-relaxed text-slate dark:text-pebble">
					{data.post.excerpt}
				</p>

				<div class="flex flex-wrap items-center gap-4 pt-2 text-xs text-slate dark:text-pebble">
					<span class="inline-flex items-center gap-1.5 font-medium text-charcoal dark:text-fog">
						<HugeiconsIcon icon={UserIcon} size={14} />
						{data.post.author}
					</span>
					<span>•</span>
					<span class="inline-flex items-center gap-1.5">
						<HugeiconsIcon icon={Calendar03Icon} size={14} />
						{formatBlogDate(data.post.date)}
					</span>
					<span>•</span>
					<span class="inline-flex items-center gap-1.5">
						<HugeiconsIcon icon={Clock01Icon} size={14} />
						{data.post.readingTime}
					</span>
				</div>
			</header>

			<!-- Article Content (Markdown HTML) -->
			<div
				class="blog-content space-y-6 leading-relaxed text-charcoal dark:text-fog [&_a]:font-semibold [&_a]:text-forest-ink [&_a]:underline hover:[&_a]:text-spruce dark:[&_a]:text-lime-voltage dark:hover:[&_a]:brightness-110 [&_blockquote]:rounded-r-lg [&_blockquote]:border-l-4 [&_blockquote]:border-lime-voltage [&_blockquote]:bg-linen-mist/30 [&_blockquote]:p-4 [&_blockquote]:italic dark:[&_blockquote]:bg-forest-ink/30 [&_h1]:text-2xl [&_h1]:font-black [&_h1]:text-obsidian dark:[&_h1]:text-paper [&_h2]:mt-8 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-obsidian dark:[&_h2]:text-paper [&_h3]:mt-6 [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:text-obsidian dark:[&_h3]:text-paper [&_li]:text-base [&_ol]:list-decimal [&_ol]:space-y-2 [&_ol]:pl-6 [&_p]:text-base [&_p]:leading-relaxed [&_strong]:font-semibold [&_strong]:text-obsidian dark:[&_strong]:text-paper [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-6"
			>
				<!-- eslint-disable-next-line svelte/no-at-html-tags -->
				{@html data.post.html}
			</div>

			<!-- In-article Conversion / CTA Box -->
			<div
				class="mt-12 rounded-lg border border-forest-ink/20 bg-linen-mist/40 p-6 sm:p-8 dark:border-dark-border dark:bg-dark-surface"
			>
				<div class="flex items-center gap-2 text-forest-ink dark:text-lime-voltage">
					<HugeiconsIcon icon={SparklesIcon} size={20} />
					<span class="text-sm font-bold tracking-wide uppercase">Coba Takerin Gratis</span>
				</div>
				<h3 class="mt-2 text-xl font-bold text-obsidian sm:text-2xl dark:text-paper">
					Mulai Atur Gajimu dengan Takaran yang Pas
				</h3>
				<p class="mt-2 text-sm text-slate sm:text-base dark:text-pebble">
					Jangan biarkan pengeluaran melampaui pemasukan. Bagikan gajimu ke dalam takaran jatah per
					kategori dan catat pengeluaran harian hanya dalam hitungan detik.
				</p>
				<div class="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
					<a href={resolve('/auth/register')}>
						<Button variant="primary" size="md" class="w-full sm:w-auto">
							Daftar Gratis Sekarang
						</Button>
					</a>
					<a
						href={resolve('/')}
						class="text-center text-sm font-semibold text-forest-ink underline hover:opacity-80 dark:text-lime-voltage"
					>
						Lihat Semua Fitur
					</a>
				</div>
			</div>

			<!-- Back to Blog Link -->
			<div class="mt-12 border-t border-fog pt-8 dark:border-dark-border">
				<a
					href={resolve('/blog')}
					class="inline-flex items-center gap-2 font-semibold text-forest-ink transition-colors hover:text-spruce dark:text-lime-voltage dark:hover:brightness-110"
				>
					<HugeiconsIcon icon={ArrowLeft01Icon} size={16} />
					<span>Kembali ke Semua Artikel</span>
				</a>
			</div>
		</article>
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
