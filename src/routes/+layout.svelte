<script lang="ts">
	import './layout.css';
	import favicon from '#lib/assets/favicon.svg';
	import type { LayoutProps } from './$types.js';
	import { initI18n, setLocale } from '#lib/i18n/index.js';
	import { onMount, untrack } from 'svelte';
	import { page } from '$app/state';

	let { data, children }: LayoutProps = $props();

	// Initialize i18n
	initI18n(untrack(() => data.language));

	const isIndonesianOnlyPage = $derived(
		page.url.pathname === '/' || page.url.pathname.startsWith('/blog')
	);

	$effect(() => {
		if (data.language) {
			setLocale(data.language);
		}
	});

	$effect(() => {
		if (typeof document !== 'undefined') {
			document.documentElement.lang = isIndonesianOnlyPage ? 'id' : data.language || 'id';
		}
	});

	onMount(() => {
		const handleLangChange = (e: Event) => {
			const ce = e as CustomEvent<{ locale: string }>;
			if (ce.detail?.locale && typeof document !== 'undefined') {
				if (!isIndonesianOnlyPage) {
					document.documentElement.lang = ce.detail.locale;
				}
			}
		};
		window.addEventListener('takerin:langchange', handleLangChange);

		return () => {
			window.removeEventListener('takerin:langchange', handleLangChange);
		};
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

{@render children()}
