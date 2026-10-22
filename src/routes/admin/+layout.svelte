<script lang="ts">
	import type { LayoutProps } from './$types.js';
	import BrandLogo from '#lib/components/BrandLogo.svelte';
	import ThemeToggle from '#lib/components/ThemeToggle.svelte';
	import Button from '#lib/components/Button.svelte';
	import Badge from '#lib/components/Badge.svelte';
	import { t } from '#lib/i18n/index.js';
	import { authClient } from '#lib/auth-client.js';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import {
		Analytics01Icon,
		UserGroupIcon,
		Layers01Icon,
		Activity01Icon,
		ArrowLeft02Icon,
		Logout01Icon
	} from '@hugeicons/core-free-icons';

	let { children }: LayoutProps = $props();

	let isLoggingOut = $state(false);

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
		{ href: resolve('/admin'), label: t('admin.navOverview'), icon: Analytics01Icon, exact: true },
		{ href: resolve('/admin/users'), label: t('admin.navUsers'), icon: UserGroupIcon, exact: false },
		{
			href: resolve('/admin/templates'),
			label: t('admin.navTemplates'),
			icon: Layers01Icon,
			exact: false
		},
		{
			href: resolve('/admin/health'),
			label: t('admin.navHealth'),
			icon: Activity01Icon,
			exact: false
		}
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
	class="min-h-screen bg-fog/30 font-sans text-charcoal transition-colors selection:bg-lime-voltage selection:text-forest-ink dark:bg-dark-surface dark:text-linen-mist"
>
	<!-- ADMIN TOPBAR -->
	<header
		class="sticky top-0 z-30 border-b border-fog bg-paper/95 px-4 py-3 backdrop-blur-md sm:px-8 dark:border-dark-border dark:bg-dark-surface/95"
	>
		<div class="mx-auto flex max-w-7xl items-center justify-between gap-4">
			<!-- Left: Logo & Admin Badge -->
			<div class="flex items-center gap-3">
				<BrandLogo href="/admin" size="sm" />
				<Badge variant="lime" class="hidden sm:inline-flex">{t('admin.adminPanel')}</Badge>
			</div>

			<!-- Center: Navigation Tabs (Desktop) -->
			<nav class="hidden items-center gap-1 md:flex">
				{#each navItems as item (item.href)}
					{@const active = isNavActive(item.href, item.exact)}
					<a
						href={item.href}
						class="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold transition {active
							? 'bg-forest-ink text-lime-voltage dark:bg-lime-voltage dark:text-forest-ink'
							: 'text-charcoal hover:bg-fog hover:text-forest-ink dark:text-pebble dark:hover:bg-dark-card dark:hover:text-linen-mist'}"
					>
						<HugeiconsIcon icon={item.icon} size={16} />
						<span>{item.label}</span>
					</a>
				{/each}
			</nav>

			<!-- Right: Actions -->
			<div class="flex items-center gap-2 sm:gap-3">
				<a
					href={resolve('/dashboard')}
					class="inline-flex items-center gap-1.5 rounded-full border border-fog px-3 py-1 text-xs font-semibold text-charcoal transition hover:border-pebble hover:text-forest-ink dark:border-dark-border dark:text-linen-mist dark:hover:border-lime-voltage dark:hover:text-lime-voltage"
				>
					<HugeiconsIcon icon={ArrowLeft02Icon} size={14} />
					<span class="hidden sm:inline">{t('admin.toApp')}</span>
				</a>
				<ThemeToggle />
				<Button
					variant="secondary"
					size="sm"
					onclick={handleLogout}
					disabled={isLoggingOut}
					class="text-xs"
				>
					<HugeiconsIcon icon={Logout01Icon} size={14} class="sm:hidden" />
					<span class="hidden sm:inline">{isLoggingOut ? t('admin.loggingOut') : t('admin.logout')}</span>
				</Button>
			</div>
		</div>

		<!-- Mobile Navigation Bar -->
		<div
			class="mt-3 flex overflow-x-auto border-t border-fog/60 pt-2 pb-1 md:hidden dark:border-dark-border/60"
		>
			<div class="flex w-full min-w-max items-center justify-around gap-1">
				{#each navItems as item (item.href)}
					{@const active = isNavActive(item.href, item.exact)}
					<a
						href={item.href}
						class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap transition {active
							? 'bg-forest-ink text-lime-voltage dark:bg-lime-voltage dark:text-forest-ink'
							: 'text-slate hover:bg-fog hover:text-charcoal dark:text-pebble dark:hover:bg-dark-card'}"
					>
						<HugeiconsIcon icon={item.icon} size={15} />
						<span>{item.label}</span>
					</a>
				{/each}
			</div>
		</div>
	</header>

	<!-- MAIN CONTENT -->
	<main class="mx-auto max-w-7xl px-4 py-8 sm:px-8">
		{@render children?.()}
	</main>
</div>
