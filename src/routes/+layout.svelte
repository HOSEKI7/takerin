<script lang="ts">
	import './layout.css';
	import favicon from '#lib/assets/favicon.svg';
	import type { LayoutProps } from './$types.js';
	import { initI18n, setLocale } from '#lib/i18n/index.js';
	import { onMount, untrack } from 'svelte';

	let { data, children }: LayoutProps = $props();

	// Initialize i18n
	initI18n(untrack(() => data.language));

	$effect(() => {
		if (data.language) {
			setLocale(data.language);
		}
	});

	onMount(() => {
		const handleLangChange = (e: Event) => {
			const ce = e as CustomEvent<{ locale: string }>;
			if (ce.detail?.locale && typeof document !== 'undefined') {
				document.documentElement.lang = ce.detail.locale;
			}
		};
		window.addEventListener('takerin:langchange', handleLangChange);
		if (typeof document !== 'undefined') {
			document.documentElement.lang = data.language || 'id';
		}

		return () => {
			window.removeEventListener('takerin:langchange', handleLangChange);
		};
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

{@render children()}
