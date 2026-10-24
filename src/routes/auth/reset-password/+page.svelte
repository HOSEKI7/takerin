<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { t } from '#lib/i18n/index.js';

	$effect(() => {
		goto(resolve('/auth/forgot-password'), { replaceState: true });
	});
</script>

<div class="flex min-h-screen items-center justify-center p-4">
	<p class="text-sm text-slate dark:text-stone-300">
		{t('auth.resetPassword.redirecting') || 'Mengalihkan ke halaman lupa kata sandi...'}
	</p>
</div>
