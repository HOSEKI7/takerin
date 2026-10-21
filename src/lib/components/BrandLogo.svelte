<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import type { RouteId } from '$app/types';
	import { resolve, asset } from '$app/paths';

	type LogoVariant = 'mark' | 'wordmark' | 'combined';
	type LogoSize = 'sm' | 'md' | 'lg' | 'xl';
	type DistributiveExclude<T> = T extends `${string}[${string}` ? never : T;
	type StaticRoute = DistributiveExclude<RouteId>;

	interface Props extends HTMLAttributes<HTMLElement> {
		variant?: LogoVariant;
		size?: LogoSize;
		href?: StaticRoute;
		alt?: string;
		priority?: boolean;
		class?: string;
	}

	let {
		variant = 'combined',
		size = 'md',
		href,
		alt = 'Takerin',
		priority = true,
		class: className = '',
		...restProps
	}: Props = $props();

	const markSrc = asset('brand/takerin-logo.webp');
	const wordmarkSrc = asset('brand/takerin-wordmark.webp');

	const sizeClasses: Record<
		LogoSize,
		{ mark: string; wordmark: string; text: string; gap: string }
	> = {
		sm: {
			mark: 'w-7 h-7 sm:w-8 sm:h-8',
			wordmark: 'h-6 sm:h-7',
			text: 'text-lg sm:text-xl',
			gap: 'gap-2 sm:gap-2.5'
		},
		md: {
			mark: 'w-8 h-8 sm:w-9 sm:h-9',
			wordmark: 'h-7 sm:h-8',
			text: 'text-xl sm:text-2xl',
			gap: 'gap-2.5 sm:gap-3'
		},
		lg: {
			mark: 'w-10 h-10 sm:w-12 sm:h-12',
			wordmark: 'h-9 sm:h-10',
			text: 'text-2xl sm:text-3xl',
			gap: 'gap-3'
		},
		xl: {
			mark: 'w-14 h-14 sm:w-16 sm:h-16',
			wordmark: 'h-12 sm:h-14',
			text: 'text-3xl sm:text-4xl',
			gap: 'gap-3.5 sm:gap-4'
		}
	};
</script>

{#snippet logoBody()}
	{#if variant === 'mark'}
		<div
			class="relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full shadow-xs {sizeClasses[
				size
			].mark}"
		>
			<img
				src={markSrc}
				{alt}
				width="1024"
				height="1024"
				loading={priority ? 'eager' : 'lazy'}
				fetchpriority={priority ? 'high' : 'auto'}
				decoding="async"
				class="h-full w-full scale-[1.7] object-contain"
			/>
		</div>
	{:else if variant === 'wordmark'}
		<div
			class="relative inline-flex shrink-0 items-center justify-center overflow-hidden {sizeClasses[
				size
			].wordmark} aspect-[3.13/1]"
		>
			<img
				src={wordmarkSrc}
				{alt}
				width="1920"
				height="1080"
				loading={priority ? 'eager' : 'lazy'}
				fetchpriority={priority ? 'high' : 'auto'}
				decoding="async"
				class="h-full w-full scale-[3.0] object-contain"
			/>
		</div>
	{:else}
		<div class="inline-flex items-center {sizeClasses[size].gap}">
			<div
				class="relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full shadow-xs {sizeClasses[
					size
				].mark}"
			>
				<img
					src={markSrc}
					alt=""
					width="1024"
					height="1024"
					loading={priority ? 'eager' : 'lazy'}
					fetchpriority={priority ? 'high' : 'auto'}
					decoding="async"
					class="h-full w-full scale-[1.7] object-contain"
				/>
			</div>
			<span
				class="font-display font-extrabold tracking-tight text-forest-ink transition-colors dark:text-lime-voltage {sizeClasses[
					size
				].text}"
			>
				Takerin
			</span>
		</div>
	{/if}
{/snippet}

{#if href}
	<a
		href={resolve(href)}
		class="group inline-flex items-center rounded-lg transition-opacity outline-none hover:opacity-90 focus-visible:ring-2 focus-visible:ring-forest-ink focus-visible:ring-offset-2 dark:focus-visible:ring-lime-voltage dark:focus-visible:ring-offset-dark-surface {className}"
		{...restProps}
	>
		{@render logoBody()}
	</a>
{:else}
	<div class="inline-flex items-center {className}" {...restProps}>
		{@render logoBody()}
	</div>
{/if}
