<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';

	type CardVariant = 'default' | 'muted' | 'forest' | 'tinted';
	type CardPadding = 'none' | 'sm' | 'md' | 'lg';

	interface Props extends HTMLAttributes<HTMLDivElement> {
		variant?: CardVariant;
		padding?: CardPadding;
		children?: Snippet;
		class?: string;
	}

	let {
		variant = 'default',
		padding = 'md',
		children,
		class: className = '',
		...restProps
	}: Props = $props();

	const variantClasses: Record<CardVariant, string> = {
		default:
			'bg-paper text-obsidian border border-fog shadow-subtle dark:bg-dark-card dark:border-dark-border dark:text-paper',
		muted:
			'bg-fog text-charcoal border border-stone-200/60 dark:bg-dark-surface dark:border-dark-border dark:text-stone-300',
		forest: 'bg-forest-ink text-paper border border-spruce/40 shadow-lg',
		tinted:
			'bg-linen-mist text-forest-ink border border-lime-voltage/30 dark:bg-forest-ink/60 dark:text-linen-mist'
	};

	const paddingClasses: Record<CardPadding, string> = {
		none: 'p-0',
		sm: 'p-4',
		md: 'p-6',
		lg: 'p-8 md:p-10'
	};
</script>

<div
	class="rounded-lg transition-colors {paddingClasses[padding]} {variantClasses[
		variant
	]} {className}"
	{...restProps}
>
	{@render children?.()}
</div>
