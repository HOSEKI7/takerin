<script lang="ts">
	import { fade, fly } from 'svelte/transition';
	import { page } from '$app/state';
	import { resolve, asset } from '$app/paths';
	import { afterNavigate } from '$app/navigation';
	import BrandLogo from './BrandLogo.svelte';
	import ThemeToggle from './ThemeToggle.svelte';
	import Button from './Button.svelte';
	import DonationModal from './DonationModal.svelte';
	import { isRouteActive } from './DesktopSidebar.svelte';
	import { t } from '#lib/i18n/index.js';
	import { lockScroll, unlockScroll } from '#lib/scroll-lock.js';
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import {
		LayoutDashboardIcon,
		Wallet01Icon,
		Coins01Icon,
		Layers01Icon,
		Calendar01Icon,
		Settings01Icon,
		PlusSignIcon,
		Logout01Icon,
		Menu01Icon,
		Cancel01Icon,
		Coffee01Icon
	} from '@hugeicons/core-free-icons';

	interface Props {
		user?: {
			name?: string | null;
			email?: string | null;
			image?: string | null;
		} | null;
		isOpen?: boolean;
		isLoggingOut?: boolean;
		currentPath?: string;
		onLogout?: () => void;
	}

	let {
		user = null,
		isOpen = $bindable(false),
		isLoggingOut = false,
		currentPath,
		onLogout
	}: Props = $props();

	let isDonationModalOpen = $state(false);

	const effectivePath = $derived(
		currentPath ?? (typeof page !== 'undefined' && page?.url ? page.url.pathname : '')
	);

	const userInitial = $derived((user?.name?.trim()?.[0] || 'U').toUpperCase());

	function toggleDrawer() {
		isOpen = !isOpen;
	}

	function closeDrawer() {
		isOpen = false;
	}

	function handleLogout() {
		if (isLoggingOut) return;
		closeDrawer();
		if (onLogout) {
			onLogout();
		}
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape' && isOpen) {
			closeDrawer();
		}
	}

	// Edge-swipe touch gesture handling (< 1024px)
	let touchStartX = 0;
	let touchStartY = 0;

	function handleTouchStart(event: TouchEvent) {
		if (typeof window !== 'undefined' && window.innerWidth >= 1024) return;
		if (event.touches.length !== 1) return;
		touchStartX = event.touches[0].clientX;
		touchStartY = event.touches[0].clientY;
	}

	function handleTouchEnd(event: TouchEvent) {
		if (typeof window !== 'undefined' && window.innerWidth >= 1024) return;
		if (event.changedTouches.length !== 1) return;
		const deltaX = event.changedTouches[0].clientX - touchStartX;
		const deltaY = event.changedTouches[0].clientY - touchStartY;

		// Horizontal gesture must dominate vertical scrolling (ratio > 1.5)
		if (Math.abs(deltaX) > Math.abs(deltaY) * 1.5) {
			// Swipe right from left edge (start X <= 40px) opens drawer
			if (!isOpen && touchStartX <= 40 && deltaX > 50) {
				isOpen = true;
			}
			// Swipe left when drawer is open closes drawer
			else if (isOpen && deltaX < -50) {
				isOpen = false;
			}
		}
	}

	afterNavigate(() => {
		closeDrawer();
	});

	$effect(() => {
		if (isOpen) {
			lockScroll();
			return () => {
				unlockScroll();
			};
		}
	});

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
			href: resolve('/(app)/incomes'),
			label: t('nav.incomes'),
			icon: Coins01Icon,
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

	const isDashboardActive = $derived(
		isRouteActive(effectivePath, resolve('/(app)/dashboard'), true)
	);
	const isExpensesActive = $derived(
		isRouteActive(effectivePath, resolve('/(app)/expenses'), false) &&
			!effectivePath.endsWith('/expenses/new')
	);
	const isQuickAddActive = $derived(
		isRouteActive(effectivePath, resolve('/(app)/expenses/new'), true) ||
			effectivePath.endsWith('/expenses/new')
	);
	const isCategoriesActive = $derived(
		isRouteActive(effectivePath, resolve('/(app)/categories'), false)
	);
	const isHistoryActive = $derived(isRouteActive(effectivePath, resolve('/(app)/history'), false));
</script>

<!-- eslint-disable svelte/no-navigation-without-resolve -->

<svelte:window
	onkeydown={handleKeydown}
	ontouchstart={handleTouchStart}
	ontouchend={handleTouchEnd}
/>

{#snippet userAvatar()}
	{#if user?.image}
		<img
			src={user.image}
			alt={user?.name ?? t('common.user')}
			class="h-8 w-8 rounded-full border border-fog object-cover dark:border-dark-border"
		/>
	{:else}
		<div
			class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-forest-ink text-xs font-bold text-lime-voltage shadow-xs dark:bg-forest-ink dark:text-lime-voltage"
		>
			{userInitial}
		</div>
	{/if}
{/snippet}

<!-- Mobile Top Header (< 1024px / lg:hidden) -->
<header
	class="sticky top-0 z-20 flex h-12 items-center justify-between border-b border-fog bg-paper/95 px-4 backdrop-blur-md lg:hidden dark:border-dark-border dark:bg-dark-card/95"
>
	<!-- Left: Hamburger button & Brand Logo -->
	<div class="flex items-center gap-3">
		<button
			type="button"
			onclick={toggleDrawer}
			class="inline-flex h-10 w-10 items-center justify-center rounded-xl text-slate transition-colors hover:bg-fog hover:text-charcoal focus-visible:ring-2 focus-visible:ring-forest-ink focus-visible:outline-none dark:text-pebble dark:hover:bg-dark-surface dark:hover:text-linen-mist dark:focus-visible:ring-lime-voltage"
			aria-label={t('nav.openMenu')}
			aria-expanded={isOpen}
			aria-controls="mobile-drawer"
		>
			<HugeiconsIcon icon={Menu01Icon} size={22} />
		</button>
		<BrandLogo href="/(app)/dashboard" size="sm" />
	</div>

	<!-- Right: ThemeToggle & User Avatar (tap to toggle drawer) -->
	<div class="flex items-center gap-2.5">
		<ThemeToggle />
		<button
			type="button"
			onclick={toggleDrawer}
			class="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full transition-transform focus-visible:ring-2 focus-visible:ring-forest-ink focus-visible:outline-none active:scale-95 dark:focus-visible:ring-lime-voltage"
			aria-label={t('nav.openMenu')}
			aria-expanded={isOpen}
		>
			{@render userAvatar()}
		</button>
	</div>
</header>

<!-- Slide-over Drawer & Backdrop (< 1024px / lg:hidden) -->
{#if isOpen}
	<!-- Backdrop overlay semi-transparan -->
	<button
		type="button"
		transition:fade={{ duration: 200 }}
		class="fixed inset-0 z-40 h-full w-full cursor-default border-none bg-obsidian/40 p-0 backdrop-blur-sm outline-none lg:hidden"
		onclick={closeDrawer}
		aria-label={t('nav.closeMenu')}
		tabindex="-1"
	></button>

	<!-- Slide-over Drawer Container -->
	<div
		id="mobile-drawer"
		role="dialog"
		aria-modal="true"
		aria-label={t('nav.mobileNav')}
		transition:fly={{ x: -300, duration: 250 }}
		class="fixed inset-y-0 left-0 z-50 flex h-full w-72 max-w-[85vw] flex-col border-r border-fog bg-paper shadow-2xl lg:hidden dark:border-dark-border dark:bg-dark-surface"
	>
		<!-- Drawer Header -->
		<div
			class="flex items-center justify-between border-b border-fog/60 px-4 py-3.5 dark:border-dark-border/60"
		>
			<div onclick={closeDrawer} role="presentation">
				<BrandLogo href="/(app)/dashboard" size="sm" />
			</div>
			<button
				type="button"
				onclick={closeDrawer}
				class="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate transition-colors hover:bg-fog hover:text-charcoal focus-visible:ring-2 focus-visible:ring-forest-ink focus-visible:outline-none dark:text-pebble dark:hover:bg-dark-card dark:hover:text-linen-mist dark:focus-visible:ring-lime-voltage"
				aria-label={t('nav.closeMenu')}
			>
				<HugeiconsIcon icon={Cancel01Icon} size={20} />
			</button>
		</div>

		<!-- Quick Action CTA: + Catat Pengeluaran -->
		<div class="px-4 pt-4 pb-2">
			<a
				href={resolve('/(app)/expenses/new')}
				onclick={closeDrawer}
				class="block w-full rounded-xl focus-visible:ring-2 focus-visible:ring-forest-ink focus-visible:outline-none dark:focus-visible:ring-lime-voltage"
			>
				<Button
					variant="primary"
					size="md"
					class="flex w-full items-center justify-center gap-2 text-sm font-bold shadow-xs"
				>
					<HugeiconsIcon icon={PlusSignIcon} size={18} />
					<span>{t('nav.newExpense')}</span>
				</Button>
			</a>
		</div>

		<!-- Navigation Menu Groups (Scrollable) -->
		<nav
			class="flex-1 space-y-4 overflow-y-auto px-3 py-3"
			aria-label={t('nav.aria.mobileMenuAndPreferences')}
		>
			<!-- Group 1: Menu Utama -->
			<div>
				<h3
					class="px-3 pb-1.5 text-[11px] font-bold tracking-wider text-slate uppercase dark:text-pebble"
				>
					{t('nav.mainMenu')}
				</h3>
				<ul class="space-y-1">
					{#each mainMenuItems as item (item.href)}
						{@const active = isRouteActive(effectivePath, item.href, item.exact)}
						<li>
							<a
								href={item.href}
								onclick={closeDrawer}
								aria-current={active ? 'page' : undefined}
								class="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-forest-ink focus-visible:outline-none dark:focus-visible:ring-lime-voltage {active
									? 'bg-forest-ink text-lime-voltage shadow-xs dark:bg-forest-ink dark:text-lime-voltage'
									: 'text-charcoal hover:bg-fog hover:text-forest-ink dark:text-linen-mist dark:hover:bg-dark-card dark:hover:text-lime-voltage'}"
							>
								<HugeiconsIcon icon={item.icon} size={20} class="shrink-0" />
								<span class="truncate">{item.label}</span>
							</a>
						</li>
					{/each}
				</ul>
			</div>

			<!-- Divider -->
			<div class="mx-1 border-t border-fog/60 dark:border-dark-border/60"></div>

			<!-- Group 2: Preferensi -->
			<div>
				<h3
					class="px-3 pb-1.5 text-[11px] font-bold tracking-wider text-slate uppercase dark:text-pebble"
				>
					{t('nav.preferences')}
				</h3>
				<ul class="space-y-1">
					{#each preferenceItems as item (item.href)}
						{@const active = isRouteActive(effectivePath, item.href, item.exact)}
						<li>
							<a
								href={item.href}
								onclick={closeDrawer}
								aria-current={active ? 'page' : undefined}
								class="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-forest-ink focus-visible:outline-none dark:focus-visible:ring-lime-voltage {active
									? 'bg-forest-ink text-lime-voltage shadow-xs dark:bg-forest-ink dark:text-lime-voltage'
									: 'text-charcoal hover:bg-fog hover:text-forest-ink dark:text-linen-mist dark:hover:bg-dark-card dark:hover:text-lime-voltage'}"
							>
								<HugeiconsIcon icon={item.icon} size={20} class="shrink-0" />
								<span class="truncate">{item.label}</span>
							</a>
						</li>
					{/each}
				</ul>
			</div>

			<!-- Developer Support Mini Card (Mobile Drawer) -->
			<div
				class="mt-auto rounded-2xl border border-fog/80 bg-fog/40 p-3 transition-colors dark:border-dark-border dark:bg-dark-card/40"
			>
				<div class="flex items-center gap-2.5">
					<img
						src={asset('mascot/mascot-coffee.webp')}
						alt={t('support.mascotAlt')}
						width="44"
						height="40"
						class="h-10 w-11 shrink-0 object-contain drop-shadow-xs"
					/>
					<div class="min-w-0 flex-1">
						<p class="text-xs font-bold text-charcoal dark:text-linen-mist">
							{t('support.sidebarCardTitle')}
						</p>
						<p class="line-clamp-2 text-[10px] leading-tight text-slate dark:text-pebble">
							{t('support.sidebarCardDesc')}
						</p>
					</div>
				</div>
				<button
					type="button"
					onclick={() => {
						closeDrawer();
						isDonationModalOpen = true;
					}}
					class="mt-2.5 flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-full bg-forest-ink px-3 py-1.5 text-xs font-bold text-paper shadow-xs transition hover:bg-spruce focus-visible:ring-2 focus-visible:ring-forest-ink focus-visible:outline-none active:scale-[0.99] dark:bg-lime-voltage dark:text-forest-ink dark:hover:brightness-95 dark:focus-visible:ring-lime-voltage"
				>
					<HugeiconsIcon icon={Coffee01Icon} size={14} />
					<span>{t('support.sidebarBtn')}</span>
				</button>
			</div>
		</nav>

		<!-- Sticky Footer: Profile Card & Utilities -->
		<div
			class="mt-auto space-y-3 border-t border-fog/60 bg-fog/20 p-3.5 dark:border-dark-border/60 dark:bg-dark-surface/50"
		>
			<!-- Profile Card -->
			<div class="flex items-center gap-3 px-1 py-0.5">
				{@render userAvatar()}
				<div class="min-w-0 flex-1">
					<p class="truncate text-xs font-bold text-charcoal dark:text-linen-mist">
						{user?.name ?? t('common.user')}
					</p>
					{#if user?.email}
						<p class="truncate text-[11px] text-slate dark:text-pebble">{user.email}</p>
					{/if}
				</div>
			</div>

			<!-- Utilities (ThemeToggle & Logout) -->
			<div
				class="flex items-center justify-between gap-2 border-t border-fog/40 pt-2 dark:border-dark-border/40"
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
		</div>
	</div>
{/if}

<DonationModal bind:isOpen={isDonationModalOpen} />

{#snippet bottomTab(href: string, label: string, icon: any, active: boolean)}
	<a
		{href}
		class="flex flex-col items-center justify-center gap-0.5 py-1 text-center transition-colors {active
			? 'font-bold text-forest-ink dark:text-lime-voltage'
			: 'font-medium text-slate hover:text-charcoal dark:text-pebble dark:hover:text-linen-mist'}"
		aria-current={active ? 'page' : undefined}
	>
		<HugeiconsIcon {icon} size={20} />
		<span class="max-w-[64px] truncate text-xs leading-tight">{label}</span>
		{#if active}
			<span class="h-1 w-1 rounded-full bg-forest-ink dark:bg-lime-voltage"></span>
		{/if}
	</a>
{/snippet}

<!-- Fixed Bottom Navigation Bar (< 1024px / lg:hidden) -->
<nav
	aria-label={t('nav.bottomNav')}
	class="fixed inset-x-0 bottom-0 z-30 border-t border-fog/80 bg-paper/95 backdrop-blur-md lg:hidden dark:border-dark-border dark:bg-dark-card/95"
	style="padding-bottom: calc(env(safe-area-inset-bottom, 0px) + 0.5rem);"
>
	<div class="grid h-16 grid-cols-5 items-center px-1">
		<!-- Tab 1: Dashboard -->
		{@render bottomTab(
			resolve('/(app)/dashboard'),
			t('nav.dashboard'),
			LayoutDashboardIcon,
			isDashboardActive
		)}

		<!-- Tab 2: Pengeluaran -->
		{@render bottomTab(
			resolve('/(app)/expenses'),
			t('nav.expenses'),
			Wallet01Icon,
			isExpensesActive
		)}

		<!-- Tab 3: Center Elevated (+) Action Button -->
		<div class="flex items-center justify-center">
			<a
				href={resolve('/(app)/expenses/new')}
				class="flex h-12 w-12 -translate-y-2.5 items-center justify-center rounded-full border-4 border-paper bg-forest-ink text-lime-voltage shadow-lg transition-transform hover:scale-105 focus-visible:ring-2 focus-visible:ring-forest-ink focus-visible:outline-none active:scale-95 dark:border-dark-card dark:bg-lime-voltage dark:text-forest-ink dark:focus-visible:ring-lime-voltage"
				aria-label={t('nav.quickAdd')}
				aria-current={isQuickAddActive ? 'page' : undefined}
			>
				<HugeiconsIcon icon={PlusSignIcon} size={22} />
			</a>
		</div>

		<!-- Tab 4: Kategori -->
		{@render bottomTab(
			resolve('/(app)/categories'),
			t('nav.categories'),
			Layers01Icon,
			isCategoriesActive
		)}

		<!-- Tab 5: Riwayat -->
		{@render bottomTab(
			resolve('/(app)/history'),
			t('nav.history'),
			Calendar01Icon,
			isHistoryActive
		)}
	</div>
</nav>
