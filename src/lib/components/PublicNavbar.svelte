<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { Button, BrandLogo, ThemeToggle } from '#lib';
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import { Menu01Icon, Cancel01Icon } from '@hugeicons/core-free-icons';

	interface Props {
		class?: string;
		currentPath?: string;
		mobileMenuOpen?: boolean;
	}

	let {
		class: className = '',
		currentPath: propCurrentPath,
		mobileMenuOpen = $bindable(false)
	}: Props = $props();

	const currentPath = $derived(propCurrentPath ?? page.url.pathname);
	const isLandingPage = $derived(currentPath === '/');

	const landingNavLinks = [
		{ label: 'Masalah', href: '#masalah' },
		{ label: 'Fitur', href: '#fitur' },
		{ label: 'Cara Kerja', href: '#cara-kerja' },
		{ label: 'Blog', href: resolve('/blog') },
		{ label: 'Tanya Jawab', href: '#faq' }
	];

	const blogNavLinks = [
		{ label: 'Beranda', href: resolve('/') },
		{ label: 'Blog', href: resolve('/blog') }
	];

	const navLinks = $derived(isLandingPage ? landingNavLinks : blogNavLinks);

	function isLinkActive(href: string): boolean {
		if (isLandingPage) {
			return false;
		}
		if (href === resolve('/blog')) {
			return currentPath.startsWith('/blog');
		}
		if (href === resolve('/')) {
			return currentPath === '/';
		}
		return false;
	}
</script>

<!-- eslint-disable svelte/no-navigation-without-resolve -->

<header
	class="sticky top-0 z-50 h-16 border-b border-fog bg-paper/90 backdrop-blur-md transition-colors dark:border-dark-border dark:bg-dark-surface/90 {className}"
>
	<div class="mx-auto flex h-full max-w-6xl items-center justify-between px-4 sm:px-6">
		<div class="flex items-center gap-8">
			<BrandLogo href="/" size="md" />
			<nav
				class="hidden items-center gap-6 text-sm font-medium text-charcoal md:flex dark:text-fog"
				aria-label="Navigasi Utama"
			>
				{#each navLinks as link (link.href)}
					{@const active = isLinkActive(link.href)}
					<a
						href={link.href}
						aria-current={active ? 'page' : undefined}
						class="transition-colors {active
							? 'font-semibold text-forest-ink dark:text-lime-voltage'
							: 'hover:text-forest-ink dark:hover:text-lime-voltage'}"
					>
						{link.label}
					</a>
				{/each}
			</nav>
		</div>

		<!-- Desktop Action Buttons -->
		<div class="hidden items-center gap-3 md:flex">
			<ThemeToggle />
			<a href={resolve('/auth/login')}>
				<Button variant="secondary" size="sm">Masuk</Button>
			</a>
			<a href={resolve('/auth/register')}>
				<Button variant="primary" size="sm">Mulai Gratis</Button>
			</a>
		</div>

		<!-- Mobile Menu & Theme Toggle -->
		<div class="flex items-center gap-2 md:hidden">
			<ThemeToggle />
			<button
				type="button"
				onclick={() => (mobileMenuOpen = !mobileMenuOpen)}
				class="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-fog p-1.5 text-charcoal hover:bg-fog dark:border-dark-border dark:text-fog dark:hover:bg-dark-card"
				aria-label={mobileMenuOpen ? 'Tutup menu' : 'Buka menu'}
				aria-expanded={mobileMenuOpen}
			>
				{#if mobileMenuOpen}
					<HugeiconsIcon icon={Cancel01Icon} size={20} />
				{:else}
					<HugeiconsIcon icon={Menu01Icon} size={20} />
				{/if}
			</button>
		</div>
	</div>

	<!-- Mobile Navigation Dropdown -->
	{#if mobileMenuOpen}
		<div
			class="border-b border-fog bg-paper px-4 py-4 md:hidden dark:border-dark-border dark:bg-dark-surface"
		>
			<nav
				class="flex flex-col gap-3 text-sm font-medium text-charcoal dark:text-fog"
				aria-label="Navigasi Mobile"
			>
				{#each navLinks as link (link.href)}
					{@const active = isLinkActive(link.href)}
					<a
						href={link.href}
						onclick={() => (mobileMenuOpen = false)}
						aria-current={active ? 'page' : undefined}
						class="py-1 transition-colors {active
							? 'font-semibold text-forest-ink dark:text-lime-voltage'
							: 'hover:text-forest-ink dark:hover:text-lime-voltage'}"
					>
						{link.label}
					</a>
				{/each}
				<div class="mt-2 flex flex-col gap-2 border-t border-fog pt-2 dark:border-dark-border">
					<a href={resolve('/auth/login')} onclick={() => (mobileMenuOpen = false)} class="w-full">
						<Button variant="secondary" size="sm" class="w-full">Masuk</Button>
					</a>
					<a
						href={resolve('/auth/register')}
						onclick={() => (mobileMenuOpen = false)}
						class="w-full"
					>
						<Button variant="primary" size="sm" class="w-full">Mulai Gratis</Button>
					</a>
				</div>
			</nav>
		</div>
	{/if}
</header>
