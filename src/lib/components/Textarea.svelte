<script lang="ts">
	import type { HTMLTextareaAttributes } from 'svelte/elements';

	interface Props extends Omit<HTMLTextareaAttributes, 'value'> {
		label?: string;
		error?: string;
		hint?: string;
		value?: string;
		class?: string;
		maxlength?: number;
		showCharCount?: boolean;
	}

	let {
		label,
		error,
		hint,
		value = $bindable(''),
		class: className = '',
		id,
		disabled = false,
		rows = 3,
		maxlength,
		showCharCount = false,
		...restProps
	}: Props = $props();

	const textareaId = $derived(
		id || (label ? `textarea-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined)
	);

	const charCount = $derived(value !== undefined && value !== null ? String(value).length : 0);
	const displayCounter = $derived(Boolean(showCharCount && maxlength !== undefined));
</script>

<div class="flex w-full flex-col gap-1.5 font-sans">
	{#if label}
		<label for={textareaId} class="text-sm font-medium text-charcoal dark:text-stone-200">
			{label}
		</label>
	{/if}

	<textarea
		id={textareaId}
		{disabled}
		{rows}
		{maxlength}
		bind:value
		class="w-full rounded-lg border px-3.5 py-2 text-sm text-obsidian transition placeholder:text-pebble focus:ring-1 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 dark:bg-dark-surface dark:text-paper dark:placeholder:text-pebble {error
			? 'border-alarm-red focus:border-alarm-red focus:ring-alarm-red'
			: 'border-pebble focus:border-forest-ink focus:ring-forest-ink dark:border-dark-border dark:focus:border-lime-voltage dark:focus:ring-lime-voltage'} {className}"
		{...restProps}></textarea>

	{#if error || hint || displayCounter}
		<div class="flex items-center justify-between gap-2 text-xs">
			<div>
				{#if error}
					<p class="font-medium text-alarm-red dark:text-red-400">{error}</p>
				{:else if hint}
					<p class="text-slate dark:text-stone-400">{hint}</p>
				{/if}
			</div>
			{#if displayCounter}
				<span
					data-testid="textarea-char-count"
					class="ml-auto shrink-0 text-[11px] font-medium text-slate/75 tabular-nums dark:text-pebble/75"
					aria-live="polite"
				>
					{charCount}/{maxlength}
				</span>
			{/if}
		</div>
	{/if}
</div>
