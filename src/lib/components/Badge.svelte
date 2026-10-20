<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';

	type BadgeVariant = 'default' | 'forest' | 'lime' | 'neutral' | 'danger' | 'info';

	interface Props extends HTMLAttributes<HTMLSpanElement> {
		variant?: BadgeVariant;
		children?: Snippet;
		class?: string;
	}

	let { variant = 'default', children, class: className = '', ...restProps }: Props = $props();

	const variantClasses: Record<BadgeVariant, string> = {
		default: 'bg-linen-mist text-forest-ink dark:bg-spruce/60 dark:text-linen-mist',
		forest: 'bg-forest-ink text-lime-voltage border border-lime-voltage/30',
		lime: 'bg-lime-voltage text-forest-ink font-semibold',
		neutral:
			'bg-fog text-charcoal dark:bg-dark-surface dark:text-stone-300 dark:border dark:border-dark-border',
		danger: 'bg-red-100 text-alarm-red dark:bg-red-950/60 dark:text-red-300',
		info: 'bg-blue-100 text-signal-blue dark:bg-blue-950/60 dark:text-blue-300'
	};
</script>

<span
	class="inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-sans text-xs font-medium transition-colors {variantClasses[
		variant
	]} {className}"
	{...restProps}
>
	{@render children?.()}
</span>
