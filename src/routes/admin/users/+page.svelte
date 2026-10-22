<script lang="ts">
	import type { PageProps } from './$types.js';
	import Card from '#lib/components/Card.svelte';
	import Badge from '#lib/components/Badge.svelte';
	import Input from '#lib/components/Input.svelte';
	import { t } from '#lib/i18n/index.js';
	import { formatDateIndonesian, formatDateISO } from '#lib/validation/onboarding.js';
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import {
		ShieldCheckIcon,
		UserIcon,
		CheckmarkCircle02Icon,
		Alert02Icon
	} from '@hugeicons/core-free-icons';

	let { data }: PageProps = $props();

	let searchQuery = $state('');

	const users = $derived(data.users ?? []);

	const filteredUsers = $derived.by(() => {
		const q = searchQuery.trim().toLowerCase();
		if (!q) return users;
		return users.filter(
			(u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
		);
	});

	function formatDateTime(dateInput: Date | string | number | null | undefined): string {
		if (!dateInput) return '-';
		const d = new Date(dateInput);
		if (isNaN(d.getTime())) return '-';

		const dayStr = formatDateIndonesian(formatDateISO(d));
		const timeStr = d.toLocaleTimeString('id-ID', {
			hour: '2-digit',
			minute: '2-digit',
			timeZone: 'Asia/Jakarta'
		});
		return `${dayStr}, ${timeStr} WIB`;
	}
</script>

<div class="space-y-6">
	<!-- Page Header -->
	<div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
		<div>
			<div class="flex items-center gap-2">
				<h1 class="text-2xl font-black tracking-tight text-obsidian sm:text-3xl dark:text-paper">
					{t('admin.users.title')}
				</h1>
				<Badge variant="lime">
					{t('admin.users.registeredCount', { count: users.length })}
				</Badge>
			</div>
			<p class="mt-1 text-sm text-slate dark:text-pebble">
				{t('admin.users.subtitle')}
			</p>
		</div>
	</div>

	<!-- Search & Filter Card -->
	<Card variant="default" class="p-4">
		<div class="max-w-md">
			<Input
				id="user-search"
				label={t('admin.users.searchLabel')}
				type="text"
				placeholder={t('admin.users.searchPlaceholder')}
				bind:value={searchQuery}
			/>
		</div>
	</Card>

	<!-- Users Table Card -->
	<Card variant="default" class="overflow-hidden p-0">
		<div class="overflow-x-auto">
			<table class="w-full text-left text-xs sm:text-sm">
				<thead
					class="border-b border-fog bg-linen-mist/50 text-xs font-bold tracking-wider text-forest-ink uppercase dark:border-dark-border dark:bg-spruce/30 dark:text-lime-voltage"
				>
					<tr>
						<th class="px-5 py-3.5">{t('admin.users.colUser')}</th>
						<th class="px-5 py-3.5">{t('admin.users.colRole')}</th>
						<th class="px-5 py-3.5">{t('admin.users.colOnboarding')}</th>
						<th class="px-5 py-3.5">{t('admin.users.colRegistered')}</th>
						<th class="px-5 py-3.5">{t('admin.users.colLastActive')}</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-fog dark:divide-dark-border">
					{#if filteredUsers.length > 0}
						{#each filteredUsers as u (u.id)}
							<tr class="transition hover:bg-fog/30 dark:hover:bg-dark-card/40">
								<!-- Name & Email -->
								<td class="px-5 py-4">
									<div class="flex items-center gap-3">
										<div
											class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-linen-mist font-bold text-forest-ink dark:bg-spruce dark:text-lime-voltage"
										>
											{u.name ? u.name.charAt(0).toUpperCase() : '?'}
										</div>
										<div class="min-w-0">
											<p class="truncate font-bold text-obsidian dark:text-paper">
												{u.name || t('admin.users.anonymous')}
											</p>
											<p class="truncate text-xs text-slate dark:text-pebble">
												{u.email}
											</p>
										</div>
									</div>
								</td>

								<!-- Role -->
								<td class="px-5 py-4">
									{#if u.role === 'admin'}
										<Badge variant="lime">
											<HugeiconsIcon icon={ShieldCheckIcon} size={14} />
											<span>{t('admin.users.roleAdmin')}</span>
										</Badge>
									{:else}
										<Badge variant="neutral">
											<HugeiconsIcon icon={UserIcon} size={14} />
											<span>{t('admin.users.roleUser')}</span>
										</Badge>
									{/if}
								</td>

								<!-- Onboarding Status -->
								<td class="px-5 py-4">
									{#if u.onboardingCompleted}
										<span
											class="inline-flex items-center gap-1.5 text-xs font-semibold text-forest-ink dark:text-lime-voltage"
										>
											<HugeiconsIcon icon={CheckmarkCircle02Icon} size={15} />
											<span>{t('admin.users.statusDone')}</span>
										</span>
									{:else}
										<span
											class="inline-flex items-center gap-1.5 text-xs font-semibold text-slate dark:text-pebble"
										>
											<HugeiconsIcon icon={Alert02Icon} size={15} />
											<span>{t('admin.users.statusPending')}</span>
										</span>
									{/if}
								</td>

								<!-- Registration Date -->
								<td class="px-5 py-4 text-xs whitespace-nowrap text-slate dark:text-pebble">
									{formatDateTime(u.createdAt)}
								</td>

								<!-- Last Active Date -->
								<td
									class="px-5 py-4 text-xs font-medium whitespace-nowrap text-obsidian dark:text-paper"
								>
									{formatDateTime(u.lastActiveAt)}
								</td>
							</tr>
						{/each}
					{:else}
						<tr>
							<td colspan="5" class="px-5 py-12 text-center text-sm text-slate dark:text-pebble">
								{#if searchQuery}
									{t('admin.users.noUsersFound', { query: searchQuery })}
								{:else}
									{t('admin.users.noUsersRegistered')}
								{/if}
							</td>
						</tr>
					{/if}
				</tbody>
			</table>
		</div>
	</Card>
</div>
