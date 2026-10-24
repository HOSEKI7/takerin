<script lang="ts">
	import type { PageProps } from './$types.js';
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import Card from '#lib/components/Card.svelte';
	import Button from '#lib/components/Button.svelte';
	import Badge from '#lib/components/Badge.svelte';
	import Input from '#lib/components/Input.svelte';
	import { t } from '#lib/i18n/index.js';
	import { formatDateIndonesian, formatDateISO } from '#lib/validation/onboarding.js';
	import type { AdminInvitationRecord } from '#lib/server/db/admin.js';
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import {
		ShieldCheckIcon,
		UserAdd01Icon,
		CheckmarkCircle02Icon,
		Alert02Icon,
		Cancel01Icon,
		Copy01Icon,
		Clock01Icon,
		Delete02Icon,
		Mail01Icon
	} from '@hugeicons/core-free-icons';

	let { data, form }: PageProps = $props();

	const admins = $derived(data.admins ?? []);
	const invitations = $derived(data.invitations ?? []);

	// Invite Modal state
	let isInviteModalOpen = $state(false);
	let inviteEmail = $state('');
	let isSubmitting = $state(false);
	let modalCopySuccess = $state(false);
	let inviteResult = $state<{ email: string; url: string } | null>(null);

	// Revoke Modal state
	let revokingInvitation = $state<AdminInvitationRecord | null>(null);
	let isRevoking = $state(false);

	// Table copy link status per invitation id
	let copiedInviteId = $state<string | null>(null);

	function openInviteModal() {
		inviteEmail = '';
		inviteResult = null;
		modalCopySuccess = false;
		isInviteModalOpen = true;
	}

	function closeInviteModal() {
		isInviteModalOpen = false;
		inviteEmail = '';
		inviteResult = null;
		modalCopySuccess = false;
	}

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

	function isExpired(invitation: AdminInvitationRecord): boolean {
		if (invitation.status !== 'pending') return false;
		const exp = new Date(invitation.expiresAt).getTime();
		return exp <= Date.now();
	}

	function getInvitationUrl(token: string): string {
		const origin = page.url.origin.replace(/\/+$/, '');
		return `${origin}/auth/admin-invite/${token}`;
	}

	async function copyToClipboard(text: string, invitationId?: string) {
		try {
			if (navigator?.clipboard?.writeText) {
				await navigator.clipboard.writeText(text);
			}

			if (invitationId) {
				copiedInviteId = invitationId;
				setTimeout(() => {
					if (copiedInviteId === invitationId) {
						copiedInviteId = null;
					}
				}, 2500);
			} else {
				modalCopySuccess = true;
				setTimeout(() => {
					modalCopySuccess = false;
				}, 2500);
			}
		} catch (err) {
			console.error('Gagal menyalin tautan:', err);
		}
	}
</script>

<div class="space-y-8">
	<!-- Page Header -->
	<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
		<div>
			<div class="flex items-center gap-3">
				<h1 class="text-2xl font-black tracking-tight text-obsidian sm:text-3xl dark:text-paper">
					{t('admin.admins.title')}
				</h1>
				<Badge variant="lime">
					{t('admin.admins.activeAdminsCount', { count: admins.length })}
				</Badge>
			</div>
			<p class="mt-1 max-w-2xl text-sm text-slate dark:text-pebble">
				{t('admin.admins.subtitle')}
			</p>
		</div>

		<div>
			<Button
				variant="primary"
				size="md"
				onclick={openInviteModal}
				class="w-full shadow-sm sm:w-auto"
			>
				<HugeiconsIcon icon={UserAdd01Icon} size={18} />
				<span>{t('admin.admins.inviteButton')}</span>
			</Button>
		</div>
	</div>

	<!-- TABEL 1: Administrator Aktif -->
	<div class="space-y-3">
		<div class="flex items-center justify-between">
			<h2 class="text-lg font-bold text-obsidian dark:text-linen-mist">
				{t('admin.admins.activeAdminsTitle')}
			</h2>
			<span class="text-xs text-slate dark:text-pebble">
				{t('admin.admins.activeAdminsCount', { count: admins.length })}
			</span>
		</div>

		<Card variant="default" class="overflow-hidden p-0">
			<div class="overflow-x-auto">
				<table class="w-full text-left text-xs sm:text-sm">
					<thead
						class="border-b border-fog bg-linen-mist/50 text-xs font-bold tracking-wider text-forest-ink uppercase dark:border-dark-border dark:bg-spruce/30 dark:text-lime-voltage"
					>
						<tr>
							<th class="px-5 py-3.5">{t('admin.admins.colAdmin')}</th>
							<th class="px-5 py-3.5">{t('admin.admins.colEmail')}</th>
							<th class="px-5 py-3.5">{t('admin.admins.colRegistered')}</th>
							<th class="px-5 py-3.5">{t('admin.admins.colStatus')}</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-fog dark:divide-dark-border">
						{#if admins.length > 0}
							{#each admins as admin (admin.id)}
								<tr class="transition hover:bg-fog/30 dark:hover:bg-dark-card/40">
									<!-- Name / Avatar -->
									<td class="px-5 py-4">
										<div class="flex items-center gap-3">
											<div
												class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-forest-ink font-bold text-lime-voltage dark:bg-lime-voltage dark:text-forest-ink"
											>
												{admin.name ? admin.name.charAt(0).toUpperCase() : 'A'}
											</div>
											<div class="min-w-0">
												<div class="truncate font-semibold text-obsidian dark:text-paper">
													{admin.name || t('admin.users.anonymous')}
												</div>
												<div class="text-[11px] text-slate dark:text-pebble">
													ID: {admin.id}
												</div>
											</div>
										</div>
									</td>

									<!-- Email -->
									<td class="px-5 py-4 font-mono text-xs text-slate dark:text-pebble">
										{admin.email}
									</td>

									<!-- Registered Date -->
									<td class="px-5 py-4 text-xs text-slate dark:text-pebble">
										{formatDateTime(admin.createdAt)}
									</td>

									<!-- Status -->
									<td class="px-5 py-4">
										<Badge variant="lime">
											<HugeiconsIcon icon={CheckmarkCircle02Icon} size={13} />
											<span>{t('admin.admins.statusActive')}</span>
										</Badge>
									</td>
								</tr>
							{/each}
						{:else}
							<tr>
								<td colspan="4" class="px-5 py-10 text-center text-slate dark:text-pebble">
									<div class="mx-auto flex max-w-xs flex-col items-center gap-2">
										<HugeiconsIcon icon={ShieldCheckIcon} size={32} class="opacity-40" />
										<p class="text-sm font-medium">{t('admin.admins.noAdmins')}</p>
									</div>
								</td>
							</tr>
						{/if}
					</tbody>
				</table>
			</div>
		</Card>
	</div>

	<!-- TABEL 2: Riwayat Undangan Admin -->
	<div class="space-y-3">
		<div class="flex items-center justify-between">
			<h2 class="text-lg font-bold text-obsidian dark:text-linen-mist">
				{t('admin.admins.invitationsTitle')}
			</h2>
			<span class="text-xs text-slate dark:text-pebble">
				{t('admin.admins.invitationsCount', { count: invitations.length })}
			</span>
		</div>

		<Card variant="default" class="overflow-hidden p-0">
			<div class="overflow-x-auto">
				<table class="w-full text-left text-xs sm:text-sm">
					<thead
						class="border-b border-fog bg-linen-mist/50 text-xs font-bold tracking-wider text-forest-ink uppercase dark:border-dark-border dark:bg-spruce/30 dark:text-lime-voltage"
					>
						<tr>
							<th class="px-5 py-3.5">{t('admin.admins.colInvitedEmail')}</th>
							<th class="px-5 py-3.5">{t('admin.admins.colInvitedBy')}</th>
							<th class="px-5 py-3.5">{t('admin.admins.colExpiresAt')}</th>
							<th class="px-5 py-3.5">{t('admin.admins.colStatus')}</th>
							<th class="px-5 py-3.5 text-right">{t('admin.admins.colActions')}</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-fog dark:divide-dark-border">
						{#if invitations.length > 0}
							{#each invitations as inv (inv.id)}
								{@const expired = isExpired(inv)}
								{@const isPending = inv.status === 'pending'}
								{@const canCopy = isPending && !expired}
								{@const directUrl = getInvitationUrl(inv.token)}
								<tr class="transition hover:bg-fog/30 dark:hover:bg-dark-card/40">
									<!-- Invited Email -->
									<td
										class="px-5 py-4 font-mono text-xs font-semibold text-obsidian dark:text-paper"
									>
										<div class="flex items-center gap-2">
											<HugeiconsIcon
												icon={Mail01Icon}
												size={15}
												class="text-slate dark:text-pebble"
											/>
											<span>{inv.email}</span>
										</div>
									</td>

									<!-- Invited By -->
									<td class="px-5 py-4 text-xs text-slate dark:text-pebble">
										{#if inv.inviterName}
											<div class="font-medium text-obsidian dark:text-linen-mist">
												{inv.inviterName}
											</div>
											<div class="text-[11px] text-slate/80 dark:text-pebble/80">
												{inv.inviterEmail || ''}
											</div>
										{:else}
											<span class="text-slate/60">-</span>
										{/if}
									</td>

									<!-- Expires At -->
									<td class="px-5 py-4 text-xs text-slate dark:text-pebble">
										<div class="flex items-center gap-1.5">
											<HugeiconsIcon icon={Clock01Icon} size={14} class="shrink-0 text-slate" />
											<span>{formatDateTime(inv.expiresAt)}</span>
										</div>
									</td>

									<!-- Status Badge -->
									<td class="px-5 py-4">
										{#if inv.status === 'accepted'}
											<Badge variant="lime">
												<HugeiconsIcon icon={CheckmarkCircle02Icon} size={13} />
												<span>{t('admin.admins.statusAccepted')}</span>
											</Badge>
										{:else if inv.status === 'revoked'}
											<Badge variant="neutral">
												<HugeiconsIcon icon={Cancel01Icon} size={13} />
												<span>{t('admin.admins.statusRevoked')}</span>
											</Badge>
										{:else if expired}
											<Badge variant="danger">
												<HugeiconsIcon icon={Alert02Icon} size={13} />
												<span>{t('admin.admins.statusExpired')}</span>
											</Badge>
										{:else}
											<Badge
												variant="default"
												class="bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
											>
												<HugeiconsIcon icon={Clock01Icon} size={13} />
												<span>{t('admin.admins.statusPending')}</span>
											</Badge>
										{/if}
									</td>

									<!-- Actions -->
									<td class="px-5 py-4 text-right">
										<div class="flex items-center justify-end gap-2">
											{#if canCopy}
												<!-- Salin Tautan -->
												<button
													type="button"
													onclick={() => copyToClipboard(directUrl, inv.id)}
													class="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-fog bg-paper px-3 py-1 text-xs font-semibold text-forest-ink transition hover:border-forest-ink hover:bg-fog dark:border-dark-border dark:bg-dark-surface dark:text-linen-mist dark:hover:border-lime-voltage dark:hover:bg-dark-card"
													title={t('admin.admins.copyLink')}
												>
													{#if copiedInviteId === inv.id}
														<HugeiconsIcon
															icon={CheckmarkCircle02Icon}
															size={14}
															class="text-signal-green"
														/>
														<span class="text-signal-green">{t('admin.admins.linkCopied')}</span>
													{:else}
														<HugeiconsIcon icon={Copy01Icon} size={14} />
														<span>{t('admin.admins.copyLink')}</span>
													{/if}
												</button>
											{/if}

											{#if isPending}
												<!-- Revoke Button -->
												<button
													type="button"
													onclick={() => (revokingInvitation = inv)}
													class="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold text-alarm-red transition hover:border-alarm-red hover:bg-red-100 dark:border-red-950/80 dark:bg-red-950/40 dark:text-red-400 dark:hover:bg-red-950/80"
													title={t('admin.admins.revokeButton')}
												>
													<HugeiconsIcon icon={Delete02Icon} size={14} />
													<span>{t('admin.admins.revokeButton')}</span>
												</button>
											{/if}

											{#if !canCopy && !isPending}
												<span class="text-xs text-slate/40 dark:text-pebble/40">-</span>
											{/if}
										</div>
									</td>
								</tr>
							{/each}
						{:else}
							<tr>
								<td colspan="5" class="px-5 py-10 text-center text-slate dark:text-pebble">
									<div class="mx-auto flex max-w-xs flex-col items-center gap-2">
										<HugeiconsIcon icon={Mail01Icon} size={32} class="opacity-40" />
										<p class="text-sm font-medium">{t('admin.admins.noInvitations')}</p>
									</div>
								</td>
							</tr>
						{/if}
					</tbody>
				</table>
			</div>
		</Card>
	</div>
</div>

<!-- MODAL UNDANG ADMIN BARU -->
{#if isInviteModalOpen}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-obsidian/60 p-4 backdrop-blur-sm"
		role="dialog"
		aria-modal="true"
		aria-labelledby="modal-invite-title"
	>
		<div
			class="w-full max-w-md rounded-2xl border border-fog bg-paper p-6 shadow-2xl transition-all sm:p-7 dark:border-dark-border dark:bg-dark-surface"
		>
			{#if inviteResult}
				<!-- SUKSES KARTU -->
				<div class="space-y-5 text-center">
					<div
						class="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-lime-voltage text-forest-ink shadow-sm"
					>
						<HugeiconsIcon icon={CheckmarkCircle02Icon} size={32} />
					</div>

					<div class="space-y-1.5">
						<h3 id="modal-invite-title" class="text-lg font-black text-obsidian dark:text-paper">
							{t('admin.admins.successTitle')}
						</h3>
						<p class="text-xs text-slate dark:text-pebble">
							{t('admin.admins.successDesc')}
						</p>
					</div>

					<!-- URL Box -->
					<div
						class="rounded-xl border border-fog bg-fog/40 p-3 text-left font-mono text-xs break-all text-obsidian dark:border-dark-border dark:bg-dark-card dark:text-linen-mist"
					>
						{inviteResult.url}
					</div>

					<!-- Actions -->
					<div class="flex flex-col gap-2 pt-2">
						<Button
							type="button"
							variant="primary"
							size="md"
							onclick={() => inviteResult && copyToClipboard(inviteResult.url)}
							class="w-full justify-center"
						>
							{#if modalCopySuccess}
								<HugeiconsIcon icon={CheckmarkCircle02Icon} size={16} />
								<span>{t('admin.admins.copied')}</span>
							{:else}
								<HugeiconsIcon icon={Copy01Icon} size={16} />
								<span>{t('admin.admins.copyInviteUrl')}</span>
							{/if}
						</Button>

						<Button
							type="button"
							variant="secondary"
							size="md"
							onclick={closeInviteModal}
							class="w-full justify-center"
						>
							{t('admin.admins.modalClose')}
						</Button>
					</div>
				</div>
			{:else}
				<!-- FORM INPUT EMAIL -->
				<form
					method="POST"
					action="?/invite"
					use:enhance={() => {
						isSubmitting = true;
						return async ({ result, update }) => {
							isSubmitting = false;
							if (result.type === 'success' && result.data && 'inviteUrl' in result.data) {
								inviteResult = {
									email: String(result.data.invitedEmail || ''),
									url: String(result.data.inviteUrl || '')
								};
							}
							await update({ reset: false });
						};
					}}
					class="space-y-4"
				>
					<div class="flex items-start justify-between">
						<div>
							<h3 id="modal-invite-title" class="text-lg font-black text-obsidian dark:text-paper">
								{t('admin.admins.modalInviteTitle')}
							</h3>
							<p class="mt-1 text-xs text-slate dark:text-pebble">
								{t('admin.admins.modalInviteDesc')}
							</p>
						</div>
						<button
							type="button"
							onclick={closeInviteModal}
							class="cursor-pointer rounded-full p-1 text-slate hover:bg-fog hover:text-charcoal dark:text-pebble dark:hover:bg-dark-card"
							aria-label={t('common.close')}
						>
							<HugeiconsIcon icon={Cancel01Icon} size={20} />
						</button>
					</div>

					{#if form?.error}
						<div
							class="flex items-center gap-2 rounded-xl border border-alarm-red/20 bg-red-50 p-3 text-xs text-alarm-red dark:bg-red-950/40 dark:text-red-300"
						>
							<HugeiconsIcon icon={Alert02Icon} size={16} class="shrink-0" />
							<span>{form.error}</span>
						</div>
					{/if}

					<div class="space-y-1.5">
						<Input
							id="invite-email"
							name="email"
							type="email"
							required
							label={t('admin.admins.emailLabel')}
							placeholder={t('admin.admins.emailPlaceholder')}
							bind:value={inviteEmail}
							disabled={isSubmitting}
						/>
					</div>

					<div
						class="flex items-center justify-end gap-2 border-t border-fog pt-4 dark:border-dark-border"
					>
						<Button
							type="button"
							variant="secondary"
							size="md"
							onclick={closeInviteModal}
							disabled={isSubmitting}
						>
							{t('common.cancel')}
						</Button>
						<Button
							type="submit"
							variant="primary"
							size="md"
							disabled={isSubmitting || !inviteEmail.trim()}
						>
							{#if isSubmitting}
								<HugeiconsIcon icon={Clock01Icon} size={16} class="animate-spin" />
								<span>{t('admin.admins.sending')}</span>
							{:else}
								<HugeiconsIcon icon={Mail01Icon} size={16} />
								<span>{t('admin.admins.sendInvite')}</span>
							{/if}
						</Button>
					</div>
				</form>
			{/if}
		</div>
	</div>
{/if}

<!-- MODAL KONFIRMASI PEMBATALAN (REVOKE) -->
{#if revokingInvitation}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-obsidian/60 p-4 backdrop-blur-sm"
		role="dialog"
		aria-modal="true"
		aria-labelledby="modal-revoke-title"
	>
		<div
			class="w-full max-w-md rounded-2xl border border-fog bg-paper p-6 shadow-2xl transition-all sm:p-7 dark:border-dark-border dark:bg-dark-surface"
		>
			<form
				method="POST"
				action="?/revoke"
				use:enhance={() => {
					isRevoking = true;
					return async ({ update }) => {
						isRevoking = false;
						revokingInvitation = null;
						await update();
					};
				}}
				class="space-y-4"
			>
				<input type="hidden" name="invitationId" value={revokingInvitation.id} />

				<div class="flex items-start gap-3">
					<div
						class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100 text-alarm-red dark:bg-red-950/60 dark:text-red-400"
					>
						<HugeiconsIcon icon={Alert02Icon} size={20} />
					</div>
					<div>
						<h3 id="modal-revoke-title" class="text-base font-bold text-obsidian dark:text-paper">
							{t('admin.admins.revokeModalTitle')}
						</h3>
						<p class="mt-1 text-xs text-slate dark:text-pebble">
							{t('admin.admins.revokeModalDesc', { email: revokingInvitation.email })}
						</p>
					</div>
				</div>

				<div
					class="flex items-center justify-end gap-2 border-t border-fog pt-4 dark:border-dark-border"
				>
					<Button
						type="button"
						variant="secondary"
						size="md"
						onclick={() => (revokingInvitation = null)}
						disabled={isRevoking}
					>
						{t('admin.admins.cancel')}
					</Button>
					<Button
						type="submit"
						variant="dark"
						size="md"
						disabled={isRevoking}
						class="!bg-alarm-red !text-white hover:!bg-red-700 dark:!bg-alarm-red dark:!text-white"
					>
						{#if isRevoking}
							<HugeiconsIcon icon={Clock01Icon} size={15} class="animate-spin" />
							<span>{t('admin.admins.revoking')}</span>
						{:else}
							<HugeiconsIcon icon={Delete02Icon} size={15} />
							<span>{t('admin.admins.confirmRevoke')}</span>
						{/if}
					</Button>
				</div>
			</form>
		</div>
	</div>
{/if}
