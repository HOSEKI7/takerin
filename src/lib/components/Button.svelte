<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLButtonAttributes } from 'svelte/elements';

	type ButtonVariant = 'primary' | 'secondary' | 'dark' | 'ghost';
	type ButtonSize = 'sm' | 'md' | 'lg';

	interface Props extends HTMLButtonAttributes {
		variant?: ButtonVariant;
		size?: ButtonSize;
		children?: Snippet;
		class?: string;
	}

	let {
		variant = 'primary',
		size = 'md',
		children,
		class: className = '',
		type = 'button',
		disabled = false,
		...restProps
	}: Props = $props();

	const variantClasses: Record<ButtonVariant, string> = {
		primary:
			'bg-lime-voltage text-forest-ink font-semibold hover:brightness-95 active:brightness-90 transition shadow-sm',
		secondary:
			'border border-forest-ink text-forest-ink bg-paper hover:bg-fog dark:bg-dark-surface dark:border-dark-border dark:text-linen-mist dark:hover:bg-dark-card transition',
		dark: 'bg-forest-ink text-paper hover:bg-spruce dark:bg-lime-voltage dark:text-forest-ink transition',
		ghost:
			'text-forest-ink dark:text-lime-voltage underline underline-offset-4 hover:opacity-80 bg-transparent'
	};

	const sizeClasses: Record<ButtonSize, string> = {
		sm: 'px-4 py-1.5 text-xs rounded-full',
		md: 'px-6 py-2.5 text-base rounded-full',
		lg: 'px-8 py-3.5 text-lg rounded-full'
	};
</script>

<button
	{type}
	{disabled}
	class="inline-flex cursor-pointer items-center justify-center gap-2 font-sans transition disabled:cursor-not-allowed disabled:opacity-50 {variantClasses[
		variant
	]} {sizeClasses[size]} {className}"
	{...restProps}
>
	{@render children?.()}
</button>
