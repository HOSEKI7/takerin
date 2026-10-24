<script module lang="ts">
	export function isRouteActive(currentPath: string, targetHref: string, exact: boolean): boolean {
		if (exact) {
			return currentPath === targetHref;
		}
		return currentPath === targetHref || currentPath.startsWith(`${targetHref}/`);
	}
</script>

<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import BrandLogo from './BrandLogo.svelte';
	import ThemeToggle from './ThemeToggle.svelte';
	import Button from './Button.svelte';
	import { t } from '#lib/i18n/index.js';
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import {
		LayoutDashboardIcon,
		Wallet01Icon,
		Layers01Icon,
		Calendar01Icon,
		Settings01Icon,
		PlusSignIcon,
		Logout01Icon,
		ArrowLeft02Icon,
		ArrowRight02Icon
	} from '@hugeicons/core-free-icons';

	const STORAGE_KEY = 'takerin_sidebar_collapsed';

	interface Props {
		user?: {
			name?: string | null;
			email?: string | null;
			image?: string | null;
		} | null;
		isCollapsed?: boolean;
		currentPath?: string;
		onLogout?: () => void;
	}

	let { user = null, isCollapsed = $bindable(false), currentPath, onLogout }: Props = $props();

	let isLoggingOut = $state(false);

	const effectivePath = $derived(
		currentPath ?? (typeof page !== 'undefined' && page?.url ? page.url.pathname : '')
	);

	const userInitial = $derived((user?.name?.trim()?.[0] || 'U').toUpperCase());

	onMount(() => {
		try {
			const stored = localStorage.getItem(STORAGE_KEY);
			if (stored !== null) {
				isCollapsed = stored === 'true';
			}
		} catch {
			// localStorage not available or security restricted
		}
	});

	function toggleCollapse() {
		isCollapsed = !isCollapsed;
		try {
			localStorage.setItem(STORAGE_KEY, String(isCollapsed));
		} catch {
			// ignore storage errors
		}
	}

	async function handleLogout() {
		if (isLoggingOut) return;
		isLoggingOut = true;
		if (onLogout) {
			onLogout();
		}
	}

	const mainMenuItems = $derived([
		{
			href: resolve('/(app)/dashboard'),
			label: t('nav.dashboard'),
			icon: LayoutDashboardIcon,
			exact: true
		},
		{
			href: resolve('/(app)/expenses'),
			label: t('nav.expenses'),
			icon: Wallet01Icon,
			exact: false
		},
		{
			href: resolve('/(app)/categories'),
			label: t('nav.categories'),
			icon: Layers01Icon,
			exact: false
		},
		{
			href: resolve('/(app)/history'),
			label: t('nav.history'),
			icon: Calendar01Icon,
			exact: false
		}
	]);

	const preferenceItems = $derived([
		{
			href: resolve('/(app)/settings'),
			label: t('nav.accountSettings'),
			icon: Settings01Icon,
			exact: false
		}
	]);
</script>

{#snippet userAvatar()}
	{#if user?.image}
		<img
			src={user.image}
			alt={user?.name ?? 'Pengguna'}
			class="h-9 w-9 rounded-full border border-fog object-cover dark:border-dark-border"
		/>
	{:else}
		<div
			class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-forest-ink text-sm font-bold text-lime-voltage shadow-xs dark:bg-forest-ink dark:text-lime-voltage"
		>
			{userInitial}
		</div>
	{/if}
{/snippet}

{#snippet navLink(item: { href: string; label: string; icon: any; exact: boolean })}
	{@const active = isRouteActive(effectivePath, item.href, item.exact)}
	<li>
		<a
			href={item.href}
			aria-current={active ? 'page' : undefined}
			class="group relative flex items-center rounded-xl font-semibold transition-colors {isCollapsed
				? 'mx-auto h-11 w-11 justify-center'
				: 'gap-3 px-3.5 py-2.5 text-sm'} {active
				? 'bg-forest-ink text-lime-voltage shadow-xs dark:bg-forest-ink dark:text-lime-voltage'
				: 'text-charcoal hover:bg-fog hover:text-forest-ink dark:text-linen-mist dark:hover:bg-dark-card dark:hover:text-lime-voltage'}"
		>
			<HugeiconsIcon icon={item.icon} size={20} class="shrink-0" />
			{#if !isCollapsed}
				<span class="truncate">{item.label}</span>
			{/if}

			{#if isCollapsed}
				<div
					role="tooltip"
					class="pointer-events-none absolute left-full z-50 ml-3 rounded-md bg-charcoal px-2.5 py-1 text-xs font-semibold whitespace-nowrap text-paper opacity-0 shadow-md transition-opacity group-hover:opacity-100 dark:bg-paper dark:text-charcoal"
				>
					{item.label}
				</div>
			{/if}
		</a>
	</li>
{/snippet}

<aside
	class="fixed inset-y-0 left-0 z-30 hidden flex-col border-r border-fog bg-fog/40 transition-all duration-300 ease-in-out lg:flex dark:border-dark-border dark:bg-dark-surface {isCollapsed
		? 'w-[72px]'
		: 'w-64'}"
	aria-label="Navigasi Desktop Sidebar"
>
	<!-- Header Branding & Collapse Toggle -->
	<div
		class="flex items-center justify-between border-b border-fog/60 px-4 py-4 dark:border-dark-border/60 {isCollapsed
			? 'flex-col justify-center gap-3 px-2'
			: 'px-4'}"
	>
		{#if isCollapsed}
			<BrandLogo href="/(app)/dashboard" size="sm" variant="mark" />
			<button
				type="button"
				onclick={toggleCollapse}
				class="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate transition-colors hover:bg-fog hover:text-charcoal focus-visible:ring-2 focus-visible:ring-forest-ink focus-visible:outline-none dark:text-pebble dark:hover:bg-dark-card dark:hover:text-linen-mist dark:focus-visible:ring-lime-voltage"
				aria-label={t('nav.expandSidebar')}
				aria-expanded="false"
				title={t('nav.expandSidebar')}
			>
				<HugeiconsIcon icon={ArrowRight02Icon} size={18} />
			</button>
		{:else}
			<BrandLogo href="/(app)/dashboard" size="sm" variant="combined" />
			<button
				type="button"
				onclick={toggleCollapse}
				class="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate transition-colors hover:bg-fog hover:text-charcoal focus-visible:ring-2 focus-visible:ring-forest-ink focus-visible:outline-none dark:text-pebble dark:hover:bg-dark-card dark:hover:text-linen-mist dark:focus-visible:ring-lime-voltage"
				aria-label={t('nav.collapseSidebar')}
				aria-expanded="true"
				title={t('nav.collapseSidebar')}
			>
				<HugeiconsIcon icon={ArrowLeft02Icon} size={18} />
			</button>
		{/if}
	</div>

	<!-- Quick Action CTA: + Catat Pengeluaran -->
	<div class="pt-4 {isCollapsed ? 'flex justify-center px-2' : 'px-4'}">
		{#if isCollapsed}
			<a
				href={resolve('/(app)/expenses/new')}
				class="group relative inline-flex items-center justify-center"
				aria-label={t('nav.newExpense')}
			>
				<div
					class="flex h-11 w-11 items-center justify-center rounded-full bg-lime-voltage text-forest-ink shadow-xs transition-transform hover:brightness-95 active:scale-95 dark:bg-lime-voltage dark:text-forest-ink"
				>
					<HugeiconsIcon icon={PlusSignIcon} size={20} />
				</div>
				<div
					role="tooltip"
					class="pointer-events-none absolute left-full z-50 ml-3 rounded-md bg-charcoal px-2.5 py-1 text-xs font-semibold whitespace-nowrap text-paper opacity-0 shadow-md transition-opacity group-hover:opacity-100 dark:bg-paper dark:text-charcoal"
				>
					{t('nav.newExpense')}
				</div>
			</a>
		{:else}
			<a href={resolve('/(app)/expenses/new')} class="block w-full">
				<Button
					variant="primary"
					size="md"
					class="flex w-full items-center justify-center gap-2 text-sm font-bold shadow-xs"
				>
					<HugeiconsIcon icon={PlusSignIcon} size={18} />
					<span>{t('nav.newExpense')}</span>
				</Button>
			</a>
		{/if}
	</div>

	<!-- Navigation Menu Groups -->
	<nav
		class="flex-1 space-y-4 px-3 py-4 {isCollapsed ? 'overflow-visible' : 'overflow-y-auto'}"
		aria-label="Menu Utama dan Preferensi"
	>
		<!-- Group 1: Menu Utama -->
		<div>
			{#if isCollapsed}
				<div class="sr-only">{t('nav.mainMenu')}</div>
			{:else}
				<h3
					class="px-3 pb-1.5 text-[11px] font-bold tracking-wider text-slate/70 uppercase dark:text-pebble/70"
				>
					{t('nav.mainMenu')}
				</h3>
			{/if}

			<ul class="space-y-1">
				{#each mainMenuItems as item (item.href)}
					{@render navLink(item)}
				{/each}
			</ul>
		</div>

		<!-- Divider -->
		<div class="mx-1 border-t border-fog/60 dark:border-dark-border/60"></div>

		<!-- Group 2: Preferensi -->
		<div>
			{#if isCollapsed}
				<div class="sr-only">{t('nav.preferences')}</div>
			{:else}
				<h3
					class="px-3 pb-1.5 text-[11px] font-bold tracking-wider text-slate/70 uppercase dark:text-pebble/70"
				>
					{t('nav.preferences')}
				</h3>
			{/if}

			<ul class="space-y-1">
				{#each preferenceItems as item (item.href)}
					{@render navLink(item)}
				{/each}
			</ul>
		</div>
	</nav>

	<!-- Sticky Footer: Profile Card & Utilities -->
	<div
		class="mt-auto border-t border-fog/60 bg-fog/20 dark:border-dark-border/60 dark:bg-dark-surface/50 {isCollapsed
			? 'flex flex-col items-center gap-3 p-2 py-3'
			: 'space-y-3 p-3.5'}"
	>
		<!-- Profile Card -->
		{#if isCollapsed}
			<div
				class="group relative flex items-center justify-center"
				aria-label={user?.name ?? 'Pengguna'}
			>
				{@render userAvatar()}
				<div
					role="tooltip"
					class="pointer-events-none absolute left-full z-50 ml-3 rounded-md bg-charcoal px-2.5 py-1 text-xs font-semibold whitespace-nowrap text-paper opacity-0 shadow-md transition-opacity group-hover:opacity-100 dark:bg-paper dark:text-charcoal"
				>
					<span class="block font-bold">{user?.name ?? 'Pengguna'}</span>
					{#if user?.email}
						<span class="block text-[10px] opacity-80">{user.email}</span>
					{/if}
				</div>
			</div>
		{:else}
			<div class="flex items-center gap-3 px-1 py-0.5">
				{@render userAvatar()}
				<div class="min-w-0 flex-1">
					<p class="truncate text-xs font-bold text-charcoal dark:text-linen-mist">
						{user?.name ?? 'Pengguna'}
					</p>
					{#if user?.email}
						<p class="truncate text-[11px] text-slate dark:text-pebble">{user.email}</p>
					{/if}
				</div>
			</div>
		{/if}

		<!-- Utilities (ThemeToggle & Logout) -->
		{#if isCollapsed}
			<div
				class="flex w-full flex-col items-center gap-2 border-t border-fog/40 pt-1 dark:border-dark-border/40"
			>
				<ThemeToggle />
				<button
					type="button"
					onclick={handleLogout}
					disabled={isLoggingOut}
					class="group relative inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate transition-colors hover:bg-fog hover:text-charcoal focus-visible:ring-2 focus-visible:ring-forest-ink focus-visible:outline-none dark:text-pebble dark:hover:bg-dark-card dark:hover:text-linen-mist dark:focus-visible:ring-lime-voltage"
					aria-label={t('nav.logout')}
				>
					<HugeiconsIcon icon={Logout01Icon} size={18} />
					<div
						role="tooltip"
						class="pointer-events-none absolute left-full z-50 ml-3 rounded-md bg-charcoal px-2.5 py-1 text-xs font-semibold whitespace-nowrap text-paper opacity-0 shadow-md transition-opacity group-hover:opacity-100 dark:bg-paper dark:text-charcoal"
					>
						{isLoggingOut ? t('nav.loggingOut') : t('nav.logout')}
					</div>
				</button>
			</div>
		{:else}
			<div
				class="flex items-center justify-between gap-2 border-t border-fog/40 pt-1.5 dark:border-dark-border/40"
			>
				<ThemeToggle />
				<Button
					variant="secondary"
					size="sm"
					onclick={handleLogout}
					disabled={isLoggingOut}
					class="flex items-center gap-1.5 text-xs"
				>
					<HugeiconsIcon icon={Logout01Icon} size={14} />
					<span>{isLoggingOut ? t('nav.loggingOut') : t('nav.logout')}</span>
				</Button>
			</div>
		{/if}
	</div>
</aside>
