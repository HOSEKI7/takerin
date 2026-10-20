<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';

	type ProgressVariant = 'lime' | 'forest' | 'danger' | 'savings' | 'auto';

	interface Props extends HTMLAttributes<HTMLDivElement> {
		value: number;
		max?: number;
		variant?: ProgressVariant;
		label?: string;
		showValue?: boolean;
		class?: string;
	}

	let {
		value,
		max = 100,
		variant = 'auto',
		label,
		showValue = false,
		class: className = '',
		...restProps
	}: Props = $props();

	const percentage = $derived(Math.max(0, Math.min(100, Math.round((value / (max || 1)) * 100))));

	const resolvedVariant = $derived.by(() => {
		if (variant !== 'auto') return variant;
		if (percentage >= 100) return 'danger';
		if (percentage >= 80) return 'forest';
		return 'lime';
	});

	const variantClasses: Record<Exclude<ProgressVariant, 'auto'>, string> = {
		lime: 'bg-lime-voltage',
		forest: 'bg-forest-ink dark:bg-lime-voltage',
		danger: 'bg-alarm-red',
		savings: 'bg-spruce dark:bg-lime-voltage'
	};
</script>

<div class="flex w-full flex-col gap-1.5 font-sans {className}" {...restProps}>
	{#if label || showValue}
		<div
			class="flex items-center justify-between text-xs font-medium text-slate dark:text-stone-300"
		>
			{#if label}
				<span>{label}</span>
			{/if}
			{#if showValue}
				<span>{percentage}%</span>
			{/if}
		</div>
	{/if}

	<div
		role="progressbar"
		aria-valuenow={value}
		aria-valuemin={0}
		aria-valuemax={max}
		class="h-2.5 w-full overflow-hidden rounded-full bg-fog dark:bg-dark-muted"
	>
		<div
			class="h-full rounded-full transition-all duration-300 {variantClasses[resolvedVariant]}"
			style="width: {percentage}%"
		></div>
	</div>
</div>
