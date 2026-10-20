<script lang="ts">
	interface Props {
		status: 'connected' | 'disconnected' | 'error';
	}

	let { status }: Props = $props();

	const statusConfig = {
		connected: {
			label: 'Terhubung',
			style: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300',
			dot: 'bg-emerald-500 animate-pulse'
		},
		disconnected: {
			label: 'Terputus',
			style: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300',
			dot: 'bg-amber-500'
		},
		error: {
			label: 'Galat',
			style: 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300',
			dot: 'bg-rose-500'
		}
	} as const;
</script>

<div
	class="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium {statusConfig[
		status
	].style}"
>
	<span class="inline-block h-2 w-2 rounded-full {statusConfig[status].dot}"></span>
	<span>Basis Data D1: {statusConfig[status].label}</span>
</div>
