<script lang="ts">
	interface Props {
		status: 'connected' | 'disconnected' | 'error';
	}

	let { status }: Props = $props();

	const labelMap = {
		connected: 'Terhubung',
		disconnected: 'Terputus',
		error: 'Galat'
	} as const;

	const styleMap = {
		connected: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300',
		disconnected: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300',
		error: 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
	} as const;

	const dotMap = {
		connected: 'bg-emerald-500 animate-pulse',
		disconnected: 'bg-amber-500',
		error: 'bg-rose-500'
	} as const;
</script>

<div
	class="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium {styleMap[
		status
	]}"
>
	<span class="inline-block h-2 w-2 rounded-full {dotMap[status]}"></span>
	<span>Basis Data D1: {labelMap[status]}</span>
</div>
