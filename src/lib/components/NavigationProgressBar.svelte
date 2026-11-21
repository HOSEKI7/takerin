<script lang="ts">
	import { navigating } from '$app/state';

	let progress = $state(0);
	let isVisible = $state(false);
	let timer: ReturnType<typeof setTimeout> | undefined;
	let fadeTimer: ReturnType<typeof setTimeout> | undefined;

	const isNavigating = $derived(Boolean(navigating.to));

	$effect(() => {
		if (isNavigating) {
			clearTimeout(timer);
			clearTimeout(fadeTimer);
			isVisible = true;
			progress = 15;

			const step = () => {
				timer = setTimeout(() => {
					if (progress < 85) {
						progress += Math.max(1, (85 - progress) * 0.2);
						step();
					}
				}, 100);
			};
			step();
		} else if (isVisible) {
			clearTimeout(timer);
			progress = 100;
			fadeTimer = setTimeout(() => {
				isVisible = false;
				setTimeout(() => {
					progress = 0;
				}, 200);
			}, 200);
		}

		return () => {
			clearTimeout(timer);
			clearTimeout(fadeTimer);
		};
	});
</script>

{#if isVisible}
	<div
		class="pointer-events-none fixed top-0 right-0 left-0 z-[100] h-0.5 overflow-hidden bg-transparent"
		role="progressbar"
		aria-hidden="true"
	>
		<div
			class="h-full bg-forest-ink shadow-[0_0_8px_rgba(22,51,0,0.6)] transition-all duration-200 ease-out dark:bg-lime-voltage dark:shadow-[0_0_10px_rgba(159,232,112,0.8)]"
			style="width: {progress}%; opacity: {progress === 100 ? 0 : 1};"
		></div>
	</div>
{/if}
