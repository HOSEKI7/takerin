<script lang="ts">
	import { onMount } from 'svelte';
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import { Sun01Icon, Moon01Icon } from '@hugeicons/core-free-icons';
	import {
		getThemePreference,
		resolveTheme,
		setTheme,
		toggleTheme,
		type Theme,
		type ResolvedTheme
	} from '../theme';

	interface Props {
		class?: string;
		showLabel?: boolean;
	}

	let { class: className = '', showLabel = false }: Props = $props();

	let currentTheme = $state<Theme>('system');
	let resolvedTheme = $state<ResolvedTheme>('light');

	onMount(() => {
		currentTheme = getThemePreference();
		const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
		resolvedTheme = resolveTheme(currentTheme, systemPrefersDark);

		const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
		const handleChange = (e: MediaQueryListEvent) => {
			if (currentTheme === 'system') {
				resolvedTheme = e.matches ? 'dark' : 'light';
				setTheme('system');
			}
		};

		mediaQuery.addEventListener('change', handleChange);
		return () => mediaQuery.removeEventListener('change', handleChange);
	});

	function handleToggle() {
		const nextResolved = toggleTheme(resolvedTheme);
		resolvedTheme = nextResolved;
		currentTheme = nextResolved;
		setTheme(nextResolved);
	}
</script>

<button
	type="button"
	onclick={handleToggle}
	aria-label={resolvedTheme === 'dark' ? 'Aktifkan mode terang' : 'Aktifkan mode gelap'}
	title={resolvedTheme === 'dark' ? 'Ganti ke Mode Terang' : 'Ganti ke Mode Gelap'}
	class="inline-flex cursor-pointer items-center gap-2 rounded-full bg-linen-mist/80 p-2.5 text-forest-ink transition hover:bg-linen-mist dark:border dark:border-dark-border dark:bg-dark-surface dark:text-lime-voltage dark:hover:bg-dark-card {className}"
>
	{#if resolvedTheme === 'dark'}
		<HugeiconsIcon icon={Sun01Icon} size={20} />
	{:else}
		<HugeiconsIcon icon={Moon01Icon} size={20} />
	{/if}

	{#if showLabel}
		<span class="font-sans text-xs font-medium">
			{resolvedTheme === 'dark' ? 'Mode Terang' : 'Mode Gelap'}
		</span>
	{/if}
</button>
