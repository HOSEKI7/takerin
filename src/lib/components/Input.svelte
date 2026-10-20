<script lang="ts">
	import type { HTMLInputAttributes } from 'svelte/elements';

	interface Props extends Omit<HTMLInputAttributes, 'value'> {
		label?: string;
		error?: string;
		hint?: string;
		value?: string | number;
		class?: string;
	}

	let {
		label,
		error,
		hint,
		value = $bindable(''),
		class: className = '',
		id,
		type = 'text',
		disabled = false,
		...restProps
	}: Props = $props();

	const inputId = $derived(
		id || (label ? `input-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined)
	);
</script>

<div class="flex w-full flex-col gap-1.5 font-sans">
	{#if label}
		<label for={inputId} class="text-sm font-medium text-charcoal dark:text-stone-200">
			{label}
		</label>
	{/if}

	<input
		id={inputId}
		{type}
		{disabled}
		bind:value
		class="w-full rounded-lg border px-4 py-3 text-base text-obsidian transition-colors placeholder:text-pebble focus:ring-1 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 dark:bg-dark-surface dark:text-paper dark:placeholder:text-pebble {error
			? 'border-alarm-red focus:border-alarm-red focus:ring-alarm-red'
			: 'border-pebble focus:border-forest-ink focus:ring-forest-ink dark:border-dark-border dark:focus:border-lime-voltage dark:focus:ring-lime-voltage'} {className}"
		{...restProps}
	/>

	{#if error}
		<p class="text-xs font-medium text-alarm-red dark:text-red-400">{error}</p>
	{:else if hint}
		<p class="text-xs text-slate dark:text-stone-400">{hint}</p>
	{/if}
</div>
