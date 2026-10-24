<script lang="ts">
	import type { LayoutProps } from './$types.js';
	import BrandLogo from '#lib/components/BrandLogo.svelte';
	import ThemeToggle from '#lib/components/ThemeToggle.svelte';
	import Button from '#lib/components/Button.svelte';
	import DesktopSidebar from '#lib/components/DesktopSidebar.svelte';
	import { t } from '#lib/i18n/index.js';
	import { authClient } from '#lib/auth-client.js';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import { PlusSignIcon, Logout01Icon } from '@hugeicons/core-free-icons';

	let { data, children }: LayoutProps = $props();

	let isLoggingOut = $state(false);
	let isSidebarCollapsed = $state(false);

	async function handleLogout() {
		isLoggingOut = true;
		try {
			await authClient.signOut();
			goto(resolve('/auth/login'));
		} catch (error) {
			console.error('Gagal logout:', error);
			isLoggingOut = false;
		}
	}

	const navItems = $derived([
		{ href: resolve('/(app)/dashboard'), label: t('nav.dashboard'), exact: true },
		{ href: resolve('/(app)/expenses'), label: t('nav.expenses'), exact: false },
		{ href: resolve('/(app)/categories'), label: t('nav.categories'), exact: false },
		{ href: resolve('/(app)/history'), label: t('nav.history'), exact: false },
		{ href: resolve('/(app)/settings'), label: t('nav.settings'), exact: false }
	]);

	function isNavActive(itemHref: string, exact: boolean) {
		const currentPath = page.url.pathname;
		if (exact) {
			return currentPath === itemHref;
		}
		return currentPath.startsWith(itemHref);
	}
</script>

<div
	class="min-h-screen bg-paper font-sans text-charcoal transition-colors dark:bg-dark-surface dark:text-linen-mist"
>
	<!-- Desktop Sidebar Navigation (≥ 1024px) -->
	<DesktopSidebar
		user={data?.user}
		bind:isCollapsed={isSidebarCollapsed}
		{isLoggingOut}
		onLogout={handleLogout}
	/>

	<!-- Centralized App Header Shell (Mobile & Tablet < 1024px) -->
	<header
		class="sticky top-0 z-20 border-b border-fog bg-paper/90 px-4 py-3.5 backdrop-blur sm:px-6 lg:hidden dark:border-dark-border dark:bg-dark-card/90"
	>
		<div class="mx-auto flex max-w-6xl items-center justify-between">
			<div class="flex items-center gap-4">
				<BrandLogo href="/(app)/dashboard" size="sm" />
				<nav class="hidden items-center gap-1 sm:flex" aria-label="Navigasi Utama">
					{#each navItems as item (item.href)}
						{@const active = isNavActive(item.href, item.exact)}
						<a
							href={item.href}
							aria-current={active ? 'page' : undefined}
							class="rounded-full px-3 py-1.5 text-xs font-semibold transition {active
								? 'bg-forest-ink text-lime-voltage dark:bg-lime-voltage dark:text-forest-ink'
								: 'text-charcoal hover:bg-fog hover:text-forest-ink dark:text-linen-mist dark:hover:bg-dark-surface dark:hover:text-lime-voltage'}"
						>
							{item.label}
						</a>
					{/each}
				</nav>
			</div>
			<div class="flex items-center gap-2 sm:gap-3">
				<a href={resolve('/(app)/expenses/new')} class="hidden sm:inline-flex">
					<Button
						variant="primary"
						size="sm"
						class="flex items-center gap-1.5 text-xs font-bold shadow-sm"
					>
						<HugeiconsIcon icon={PlusSignIcon} class="h-3.5 w-3.5" />
						<span>{t('expenses.newExpenseButton')}</span>
					</Button>
				</a>
				<ThemeToggle />
				<Button
					variant="secondary"
					size="sm"
					onclick={handleLogout}
					disabled={isLoggingOut}
					class="text-xs"
				>
					<HugeiconsIcon icon={Logout01Icon} class="h-3.5 w-3.5 sm:hidden" />
					<span class="hidden sm:inline">
						{isLoggingOut ? t('nav.loggingOut') : t('nav.logout')}
					</span>
				</Button>
			</div>
		</div>

		<!-- Mobile Navigation Bar -->
		<div
			class="mt-3 flex overflow-x-auto border-t border-fog/60 pt-2 pb-1 sm:hidden dark:border-dark-border/60"
		>
			<nav
				class="flex w-full min-w-max items-center justify-around gap-1"
				aria-label="Navigasi Mobile"
			>
				{#each navItems as item (item.href)}
					{@const active = isNavActive(item.href, item.exact)}
					<a
						href={item.href}
						aria-current={active ? 'page' : undefined}
						class="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap transition {active
							? 'bg-forest-ink text-lime-voltage dark:bg-lime-voltage dark:text-forest-ink'
							: 'text-slate hover:bg-fog hover:text-charcoal dark:text-pebble dark:hover:bg-dark-card'}"
					>
						{item.label}
					</a>
				{/each}
			</nav>
		</div>
	</header>

	<!-- App Content Shell with responsive desktop left padding -->
	<div
		class="min-h-screen transition-[padding] duration-300 {isSidebarCollapsed
			? 'lg:pl-[72px]'
			: 'lg:pl-64'}"
	>
		<div class="app-content-shell">
			{@render children()}
		</div>
	</div>
</div>
