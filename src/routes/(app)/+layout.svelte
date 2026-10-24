<script lang="ts">
	import type { LayoutProps } from './$types.js';
	import DesktopSidebar from '#lib/components/DesktopSidebar.svelte';
	import MobileNav from '#lib/components/MobileNav.svelte';
	import ContentHeader from '#lib/components/ContentHeader.svelte';
	import { authClient } from '#lib/auth-client.js';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';

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

	<!-- Mobile & Tablet Navigation (< 1024px) -->
	<MobileNav
		user={data?.user}
		{isLoggingOut}
		onLogout={handleLogout}
	/>

	<!-- App Content Shell with responsive desktop left padding -->
	<div
		class="min-h-screen transition-[padding] duration-300 {isSidebarCollapsed
			? 'lg:pl-[72px]'
			: 'lg:pl-64'}"
	>
		<div class="app-content-shell flex min-h-screen flex-col">
			<!-- Minimalist Content Header with Dynamic Breadcrumbs (Issue #29) -->
			<ContentHeader />

			<div class="flex-1">
				{@render children()}
			</div>
		</div>
	</div>
</div>
