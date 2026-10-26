<script lang="ts">
	import { fade, fly } from 'svelte/transition';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { afterNavigate } from '$app/navigation';
	import BrandLogo from './BrandLogo.svelte';
	import Badge from './Badge.svelte';
	import ThemeToggle from './ThemeToggle.svelte';
	import Button from './Button.svelte';
	import { isRouteActive } from '#lib/navigation/route.js';
	import { t } from '#lib/i18n/index.js';
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import {
		Analytics01Icon,
		UserGroupIcon,
		SecurityCheckIcon,
		Layers01Icon,
		Activity01Icon,
		Logout01Icon,
		Menu01Icon,
		Cancel01Icon
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

	const effectivePath = $derived(
		currentPath ?? (typeof page !== 'undefined' && page?.url ? page.url.pathname : '')
	);

	const userInitial = $derived((user?.name?.trim()?.[0] || 'A').toUpperCase());

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

	afterNavigate(() => {
		closeDrawer();
	});

	$effect(() => {
		if (typeof document !== 'undefined') {
			if (isOpen) {
				const originalOverflow = document.body.style.overflow;
				document.body.style.overflow = 'hidden';
				return () => {
					document.body.style.overflow = originalOverflow;
				};
			}
		}
	});

	const navItems = $derived([
		{
			href: resolve('/admin'),
			label: t('admin.navOverview'),
			icon: Analytics01Icon,
			exact: true
		},
		{
			href: resolve('/admin/users'),
			label: t('admin.navUsers'),
			icon: UserGroupIcon,
			exact: false
		},
		{
			href: resolve('/admin/admins'),
			label: t('admin.navAdmins'),
			icon: SecurityCheckIcon,
			exact: false
		},
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
</script>

<!-- eslint-disable svelte/no-navigation-without-resolve -->

<svelte:window onkeydown={handleKeydown} />

{#snippet userAvatar()}
	{#if user?.image}
		<img
			src={user.image}
			alt={user?.name ?? t('common.admin')}
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
	class="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-fog bg-paper/95 px-4 backdrop-blur-md lg:hidden dark:border-dark-border dark:bg-dark-card/95"
>
	<!-- Left: Hamburger button, Brand Logo, & Admin Panel Badge -->
	<div class="flex items-center gap-2 sm:gap-2.5">
		<button
			type="button"
			onclick={toggleDrawer}
			class="inline-flex h-10 w-10 items-center justify-center rounded-xl text-slate transition-colors hover:bg-fog hover:text-charcoal focus-visible:ring-2 focus-visible:ring-forest-ink focus-visible:outline-none dark:text-pebble dark:hover:bg-dark-surface dark:hover:text-linen-mist dark:focus-visible:ring-lime-voltage"
			aria-label={t('nav.openMenu')}
			aria-expanded={isOpen}
			aria-controls="admin-mobile-drawer"
		>
			<HugeiconsIcon icon={Menu01Icon} size={22} />
		</button>
		<BrandLogo href="/admin" size="sm" />
		<Badge variant="lime" class="shrink-0">{t('admin.adminPanel')}</Badge>
	</div>

	<!-- Right: ThemeToggle & Admin Avatar -->
	<div class="flex items-center gap-2.5">
		<ThemeToggle />
		{@render userAvatar()}
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
		id="admin-mobile-drawer"
		role="dialog"
		aria-modal="true"
		aria-label={t('nav.aria.adminMobileNav')}
		transition:fly={{ x: -300, duration: 250 }}
		class="fixed inset-y-0 left-0 z-50 flex h-full w-72 max-w-[85vw] flex-col border-r border-fog bg-paper shadow-2xl lg:hidden dark:border-dark-border dark:bg-dark-surface"
	>
		<!-- Drawer Header -->
		<div
			class="flex items-center justify-between border-b border-fog/60 px-4 py-3.5 dark:border-dark-border/60"
		>
			<div class="flex items-center gap-2" onclick={closeDrawer} role="presentation">
				<BrandLogo href="/admin" size="sm" />
				<Badge variant="lime">{t('admin.adminPanel')}</Badge>
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

		<!-- Navigation Menu Groups (Scrollable) -->
		<nav
			class="flex-1 space-y-4 overflow-y-auto px-3 py-4"
			aria-label={t('nav.aria.adminMobileConsole')}
		>
			<div>
				<h3
					class="px-3 pb-1.5 text-[11px] font-bold tracking-wider text-slate uppercase dark:text-pebble"
				>
					{t('admin.title')}
				</h3>
				<ul class="space-y-1">
					{#each navItems as item (item.href)}
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
		</nav>

		<!-- Sticky Footer: Admin Profile Card & Utilities -->
		<div
			class="mt-auto space-y-3 border-t border-fog/60 bg-fog/20 p-3.5 dark:border-dark-border/60 dark:bg-dark-surface/50"
		>
			<!-- Profile Card -->
			<div class="flex items-center gap-3 px-1 py-0.5">
				{@render userAvatar()}
				<div class="min-w-0 flex-1">
					<p class="truncate text-xs font-bold text-charcoal dark:text-linen-mist">
						{user?.name ?? t('common.admin')}
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
					<span>{isLoggingOut ? t('admin.loggingOut') : t('admin.logout')}</span>
				</Button>
			</div>
		</div>
	</div>
{/if}
