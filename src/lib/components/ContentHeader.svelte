<script lang="ts">
	import { page } from '$app/state';
	import { getBreadcrumbs } from '#lib/navigation/breadcrumb.js';
	import { t } from '#lib/i18n/index.js';
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import { ArrowRight01Icon } from '@hugeicons/core-free-icons';

	interface Props {
		currentPath?: string;
		class?: string;
	}

	let { currentPath, class: className = '' }: Props = $props();

	const effectivePath = $derived(
		currentPath ?? (typeof page !== 'undefined' && page?.url ? page.url.pathname : '')
	);

	const breadcrumbs = $derived(getBreadcrumbs(effectivePath));
</script>

<!-- eslint-disable svelte/no-navigation-without-resolve -->
<header
	class="content-header w-full border-b border-fog/60 bg-fog/40 px-4 py-3 transition-colors sm:px-6 lg:px-8 dark:border-dark-border dark:bg-dark-surface {className}"
>
	<div class="mx-auto flex w-full max-w-6xl items-center justify-between">
		<nav aria-label={t('nav.breadcrumb')} class="flex items-center">
			<ol class="flex flex-wrap items-center gap-1.5 text-xs sm:text-sm">
				{#each breadcrumbs as item (item.label + (item.href ?? ''))}
					<li class="inline-flex items-center gap-1.5">
						{#if item.current}
							<span
								aria-current="page"
								class="font-semibold text-obsidian transition-colors dark:text-paper"
							>
								{item.label}
							</span>
						{:else if item.href}
							<a
								href={item.href}
								class="rounded-sm font-medium text-slate transition-colors hover:text-obsidian focus-visible:ring-2 focus-visible:ring-forest-ink focus-visible:outline-none dark:text-pebble dark:hover:text-paper dark:focus-visible:ring-lime-voltage"
							>
								{item.label}
							</a>
							<span
								aria-hidden="true"
								class="select-none text-slate/40 dark:text-pebble/40"
							>
								<HugeiconsIcon icon={ArrowRight01Icon} class="h-3 w-3" />
							</span>
						{:else}
							<span class="text-slate dark:text-pebble">
								{item.label}
							</span>
						{/if}
					</li>
				{/each}
			</ol>
		</nav>
	</div>
</header>
