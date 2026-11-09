<script lang="ts">
	import type { LayoutProps } from './$types.js';
	import DesktopSidebar from '#lib/components/DesktopSidebar.svelte';
	import MobileNav from '#lib/components/MobileNav.svelte';
	import ContentHeader from '#lib/components/ContentHeader.svelte';
	import IncomeConfirmationModal from '#lib/components/IncomeConfirmationModal.svelte';
	import ReviewFeedbackModal from '#lib/components/ReviewFeedbackModal.svelte';
	import { authClient } from '#lib/auth-client.js';
	import { beforeNavigate, goto } from '$app/navigation';
	import { resolve } from '$app/paths';

	let { data, children }: LayoutProps = $props();

	let isLoggingOut = $state(false);
	let isSidebarCollapsed = $state(false);

	const showIncomeGate = $derived(Boolean(data.activePeriod && data.incomeConfirmedAt === null));

	// Feedback auto-trigger gate & session deferral state (Issue #55)
	const FEEDBACK_DEFERRED_STORAGE_KEY = 'takerin_feedback_deferred';
	let isFeedbackModalOpen = $state(false);
	let hasDismissedThisSession = $state(false);
	let hasSubmittedFeedbackLocally = $state(false);

	$effect(() => {
		if (
			data.shouldPromptFeedback &&
			!hasSubmittedFeedbackLocally &&
			!data.hasSubmittedFeedback &&
			!showIncomeGate &&
			!hasDismissedThisSession &&
			!isFeedbackModalOpen
		) {
			if (typeof window !== 'undefined' && typeof sessionStorage !== 'undefined') {
				const isDeferred = sessionStorage.getItem(FEEDBACK_DEFERRED_STORAGE_KEY) === 'true';
				if (!isDeferred) {
					isFeedbackModalOpen = true;
				}
			}
		}
	});

	function handleFeedbackModalClose() {
		isFeedbackModalOpen = false;
		hasDismissedThisSession = true;
	}

	function handleFeedbackSuccess() {
		hasSubmittedFeedbackLocally = true;
	}

	// Prevent client-side navigation bypass while gate is active
	beforeNavigate(({ cancel, type }) => {
		if (showIncomeGate && !isLoggingOut && (type === 'link' || type === 'popstate')) {
			cancel();
		}
	});

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
	<!-- App Shell: rendered inert and non-interactive when the income confirmation gate is active -->
	<div
		inert={showIncomeGate ? true : undefined}
		class={showIncomeGate ? 'pointer-events-none select-none' : ''}
	>
		<!-- Desktop Sidebar Navigation (≥ 1024px) -->
		<DesktopSidebar
			user={data?.user}
			bind:isCollapsed={isSidebarCollapsed}
			{isLoggingOut}
			onLogout={handleLogout}
		/>

		<!-- Mobile & Tablet Navigation (< 1024px) -->
		<MobileNav user={data?.user} {isLoggingOut} onLogout={handleLogout} />

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

	<!-- Blocking Income Confirmation Gate (Issue #48) -->
	<IncomeConfirmationModal
		isOpen={showIncomeGate}
		initialSources={data.incomeSources}
		actionUrl="/dashboard?/confirmIncome"
	/>

	<!-- Non-intrusive Automated & Global Review/Feedback Modal (Issue #55) -->
	<ReviewFeedbackModal
		bind:isOpen={isFeedbackModalOpen}
		showSessionDeferCheckbox={true}
		actionUrl="/settings?/submitFeedback"
		onClose={handleFeedbackModalClose}
		onSuccess={handleFeedbackSuccess}
	/>
</div>
