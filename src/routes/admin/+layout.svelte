<script lang="ts">
	import type { LayoutProps } from './$types.js';
	import AdminDesktopSidebar from '#lib/components/AdminDesktopSidebar.svelte';
	import AdminMobileNav from '#lib/components/AdminMobileNav.svelte';
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
	class="min-h-screen bg-paper font-sans text-charcoal transition-colors selection:bg-lime-voltage selection:text-forest-ink dark:bg-dark-surface dark:text-linen-mist"
>
	<!-- Admin Desktop Sidebar Navigation (≥ 1024px) -->
	<AdminDesktopSidebar
		user={data?.user}
		bind:isCollapsed={isSidebarCollapsed}
		{isLoggingOut}
		onLogout={handleLogout}
	/>

	<!-- Admin Mobile & Tablet Navigation (< 1024px) -->
	<AdminMobileNav user={data?.user} {isLoggingOut} onLogout={handleLogout} />

	<!-- Admin Content Shell with responsive desktop left padding -->
	<div
		class="min-h-screen transition-[padding] duration-300 {isSidebarCollapsed
			? 'lg:pl-[72px]'
			: 'lg:pl-64'}"
	>
		<div class="admin-content-shell flex min-h-screen flex-col">
			<main class="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-8">
				{@render children?.()}
			</main>
		</div>
	</div>
</div>
