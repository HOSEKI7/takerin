<script lang="ts">
	import type { PageProps } from './$types.js';
	import { enhance } from '$app/forms';
	import Card from '#lib/components/Card.svelte';
	import Badge from '#lib/components/Badge.svelte';
	import Button from '#lib/components/Button.svelte';
	import Input from '#lib/components/Input.svelte';
	import { t, getLocale } from '#lib/i18n/index.js';
	import { formatDate, formatDateISO } from '#lib/validation/onboarding.js';
	import type { AdminFeedbackRecord } from '#lib/server/db/feedback.js';
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import {
		StarIcon,
		Comment01Icon,
		Clock01Icon,
		CheckmarkCircle02Icon,
		Alert02Icon,
		Delete02Icon,
		Cancel01Icon,
		ViewIcon
	} from '@hugeicons/core-free-icons';

	let { data, form }: PageProps = $props();

	const feedbackList = $derived(data.feedbackList ?? []);
	const metrics = $derived(
		data.metrics ?? {
			averageRating: 0,
			totalReviews: 0,
			pendingCount: 0,
			totalFeedback: 0,
			totalAll: 0
		}
	);

	// Filtering & Search state
	let searchQuery = $state('');
	let selectedType = $state<string>('all');
	let selectedCategory = $state<string>('all');
	let selectedRating = $state<string>('all');
	let selectedStatus = $state<string>('all');

	// Modal states
	let selectedDetailFeedback = $state<AdminFeedbackRecord | null>(null);
	let deletingFeedback = $state<AdminFeedbackRecord | null>(null);
	let isActionSubmitting = $state(false);

	// Toast notification
	let toast = $state<{ type: 'success' | 'error'; message: string } | null>(null);
	let toastTimer: ReturnType<typeof setTimeout> | null = null;

	function showToast(type: 'success' | 'error', message: string) {
		if (toastTimer) clearTimeout(toastTimer);
		toast = { type, message };
		toastTimer = setTimeout(() => {
			toast = null;
		}, 3500);
	}

	$effect(() => {
		if (form?.success && form?.message) {
			showToast('success', form.message);
		} else if (form?.error) {
			showToast('error', form.error);
		}
	});

	const hasActiveFilters = $derived(
		searchQuery.trim().length > 0 ||
			selectedType !== 'all' ||
			selectedCategory !== 'all' ||
			selectedRating !== 'all' ||
			selectedStatus !== 'all'
	);

	function resetFilters() {
		searchQuery = '';
		selectedType = 'all';
		selectedCategory = 'all';
		selectedRating = 'all';
		selectedStatus = 'all';
	}

	const filteredFeedback = $derived.by(() => {
		let list = feedbackList;

		const q = searchQuery.trim().toLowerCase();
		if (q) {
			list = list.filter(
				(item) =>
					(item.userName && item.userName.toLowerCase().includes(q)) ||
					(item.userEmail && item.userEmail.toLowerCase().includes(q)) ||
					(item.content && item.content.toLowerCase().includes(q))
			);
		}

		if (selectedType !== 'all') {
			list = list.filter((item) => item.type === selectedType);
		}

		if (selectedCategory !== 'all') {
			list = list.filter((item) => item.category === selectedCategory);
		}

		if (selectedRating !== 'all') {
			const r = Number(selectedRating);
			list = list.filter((item) => item.rating === r);
		}

		if (selectedStatus !== 'all') {
			list = list.filter((item) => item.status === selectedStatus);
		}

		return list;
	});

	function formatDateTime(dateInput: Date | string | number | null | undefined): string {
		if (!dateInput) return '-';
		let d =
			typeof dateInput === 'number' && dateInput < 10000000000
				? new Date(dateInput * 1000)
				: new Date(dateInput);
		if (isNaN(d.getTime())) return '-';
		if (d.getFullYear() > 3000) {
			d = new Date(Math.floor(d.getTime() / 1000));
		}

		const dayStr = formatDate(formatDateISO(d), getLocale());
		const localeCode = getLocale() === 'en' ? 'en-US' : 'id-ID';
		const tzSuffix = getLocale() === 'en' ? 'UTC+7' : 'WIB';
		const timeStr = d.toLocaleTimeString(localeCode, {
			hour: '2-digit',
			minute: '2-digit',
			timeZone: 'Asia/Jakarta'
		});
		return `${dayStr}, ${timeStr} ${tzSuffix}`;
	}

	function parseDeviceInfo(rawInfo: string | null): {
		browser: string;
		screen?: string;
		isParsed: boolean;
	} {
		if (!rawInfo) return { browser: '-', isParsed: false };
		try {
			const parsed = JSON.parse(rawInfo);
			if (typeof parsed === 'object' && parsed !== null) {
				return {
					browser: parsed.browser || '-',
					screen: parsed.screen || undefined,
					isParsed: true
				};
			}
		} catch {
			// Not JSON format
		}
		return { browser: rawInfo, isParsed: false };
	}

	function openDetailModal(item: AdminFeedbackRecord) {
		selectedDetailFeedback = item;
	}

	function closeDetailModal() {
		selectedDetailFeedback = null;
	}

	function openDeleteModal(item: AdminFeedbackRecord) {
		deletingFeedback = item;
	}

	function closeDeleteModal() {
		deletingFeedback = null;
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			if (deletingFeedback) {
				closeDeleteModal();
			} else if (selectedDetailFeedback) {
				closeDetailModal();
			}
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="space-y-8">
	<!-- Page Header -->
	<div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
		<div>
			<div class="flex items-center gap-2.5">
				<h1 class="text-2xl font-black tracking-tight text-obsidian sm:text-3xl dark:text-paper">
					{t('admin.feedback.title')}
				</h1>
				<Badge variant="lime">{t('admin.feedback.badge')}</Badge>
			</div>
			<p class="mt-1 text-sm text-slate dark:text-pebble">
				{t('admin.feedback.subtitle')}
			</p>
		</div>
	</div>

	<!-- Toast Notification Banner -->
	{#if toast}
		<div
			role="alert"
			class="flex items-center gap-3 rounded-xl border p-4 text-sm font-medium shadow-sm transition-all {toast.type ===
			'success'
				? 'border-forest-ink/20 bg-lime-voltage/15 text-forest-ink dark:border-lime-voltage/30 dark:bg-spruce/60 dark:text-lime-voltage'
				: 'border-alarm-red/20 bg-red-50 text-alarm-red dark:bg-red-950/40 dark:text-red-300'}"
		>
			<HugeiconsIcon
				icon={toast.type === 'success' ? CheckmarkCircle02Icon : Alert02Icon}
				size={18}
				class="shrink-0"
			/>
			<span class="flex-1">{toast.message}</span>
			<button
				type="button"
				onclick={() => (toast = null)}
				aria-label={t('admin.feedback.closeButton')}
				class="text-current opacity-70 hover:opacity-100"
			>
				<HugeiconsIcon icon={Cancel01Icon} size={16} />
			</button>
		</div>
	{/if}

	<!-- Metrik Kartu Ringkasan (AC 2) -->
	<div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
		<!-- Card 1: Rata-rata Rating Bintang -->
		<Card variant="default" class="p-5">
			<div class="flex items-center justify-between">
				<span class="text-xs font-bold tracking-wider text-slate uppercase dark:text-pebble">
					{t('admin.feedback.metricAvgRating')}
				</span>
				<div
					class="rounded-lg bg-amber-500/10 p-2 text-amber-500 dark:bg-amber-400/10 dark:text-amber-400"
				>
					<HugeiconsIcon icon={StarIcon} size={20} class="fill-current" />
				</div>
			</div>
			<div class="mt-3">
				<div class="flex items-baseline gap-2">
					<span class="text-3xl font-black text-obsidian dark:text-paper">
						{metrics.averageRating > 0 ? metrics.averageRating.toFixed(1) : '-'}
					</span>
					<span class="text-sm font-semibold text-slate dark:text-pebble">/ 5.0</span>
				</div>
				<p class="mt-1 text-xs text-slate dark:text-pebble">
					{t('admin.feedback.metricAvgRatingDesc')}
				</p>
			</div>
		</Card>

		<!-- Card 2: Total Ulasan Masuk -->
		<Card variant="default" class="p-5">
			<div class="flex items-center justify-between">
				<span class="text-xs font-bold tracking-wider text-slate uppercase dark:text-pebble">
					{t('admin.feedback.metricTotalReviews')}
				</span>
				<div
					class="rounded-lg bg-linen-mist p-2 text-forest-ink dark:bg-spruce dark:text-lime-voltage"
				>
					<HugeiconsIcon icon={Comment01Icon} size={20} />
				</div>
			</div>
			<div class="mt-3">
				<span class="text-3xl font-black text-forest-ink dark:text-lime-voltage">
					{metrics.totalReviews.toLocaleString('id-ID')}
				</span>
				<p class="mt-1 text-xs text-slate dark:text-pebble">
					{t('admin.feedback.metricTotalReviewsDesc')}
				</p>
			</div>
		</Card>

		<!-- Card 3: Umpan Balik Berstatus Menunggu -->
		<Card variant="default" class="p-5">
			<div class="flex items-center justify-between">
				<span class="text-xs font-bold tracking-wider text-slate uppercase dark:text-pebble">
					{t('admin.feedback.metricPending')}
				</span>
				<div
					class="rounded-lg bg-amber-500/10 p-2 text-amber-600 dark:bg-amber-400/10 dark:text-amber-400"
				>
					<HugeiconsIcon icon={Clock01Icon} size={20} />
				</div>
			</div>
			<div class="mt-3">
				<span class="text-3xl font-black text-amber-600 dark:text-amber-400">
					{metrics.pendingCount.toLocaleString('id-ID')}
				</span>
				<p class="mt-1 text-xs text-slate dark:text-pebble">
					{t('admin.feedback.metricPendingDesc')}
				</p>
			</div>
		</Card>
	</div>

	<!-- Filter & Search Controls (AC 3) -->
	<Card variant="default" class="space-y-4 p-5">
		<div class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
			<!-- Search Input -->
			<div class="max-w-md flex-1">
				<Input
					id="feedback-search"
					label={t('admin.feedback.searchLabel')}
					type="text"
					placeholder={t('admin.feedback.searchPlaceholder')}
					bind:value={searchQuery}
				/>
			</div>

			<!-- Filter Selects -->
			<div class="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:flex lg:items-center">
				<!-- Tipe Filter -->
				<div class="space-y-1">
					<label for="filter-type" class="block text-xs font-bold text-slate dark:text-pebble">
						{t('admin.feedback.filterType')}
					</label>
					<select
						id="filter-type"
						bind:value={selectedType}
						class="w-full rounded-xl border border-fog bg-paper px-3 py-2 text-xs font-medium text-obsidian transition focus:border-forest-ink focus:outline-none dark:border-dark-border dark:bg-dark-card dark:text-linen-mist"
					>
						<option value="all">{t('admin.feedback.allTypes')}</option>
						<option value="review">{t('admin.feedback.typeReview')}</option>
						<option value="feedback">{t('admin.feedback.typeFeedback')}</option>
					</select>
				</div>

				<!-- Kategori Filter -->
				<div class="space-y-1">
					<label for="filter-category" class="block text-xs font-bold text-slate dark:text-pebble">
						{t('admin.feedback.filterCategory')}
					</label>
					<select
						id="filter-category"
						bind:value={selectedCategory}
						class="w-full rounded-xl border border-fog bg-paper px-3 py-2 text-xs font-medium text-obsidian transition focus:border-forest-ink focus:outline-none dark:border-dark-border dark:bg-dark-card dark:text-linen-mist"
					>
						<option value="all">{t('admin.feedback.allCategories')}</option>
						<option value="bug">{t('admin.feedback.categoryBug')}</option>
						<option value="feature">{t('admin.feedback.categoryFeature')}</option>
						<option value="general">{t('admin.feedback.categoryGeneral')}</option>
					</select>
				</div>

				<!-- Rating Filter -->
				<div class="space-y-1">
					<label for="filter-rating" class="block text-xs font-bold text-slate dark:text-pebble">
						{t('admin.feedback.filterRating')}
					</label>
					<select
						id="filter-rating"
						bind:value={selectedRating}
						class="w-full rounded-xl border border-fog bg-paper px-3 py-2 text-xs font-medium text-obsidian transition focus:border-forest-ink focus:outline-none dark:border-dark-border dark:bg-dark-card dark:text-linen-mist"
					>
						<option value="all">{t('admin.feedback.allRatings')}</option>
						<option value="5">5 ★★★★★</option>
						<option value="4">4 ★★★★</option>
						<option value="3">3 ★★★</option>
						<option value="2">2 ★★</option>
						<option value="1">1 ★</option>
					</select>
				</div>

				<!-- Status Filter -->
				<div class="space-y-1">
					<label for="filter-status" class="block text-xs font-bold text-slate dark:text-pebble">
						{t('admin.feedback.filterStatus')}
					</label>
					<select
						id="filter-status"
						bind:value={selectedStatus}
						class="w-full rounded-xl border border-fog bg-paper px-3 py-2 text-xs font-medium text-obsidian transition focus:border-forest-ink focus:outline-none dark:border-dark-border dark:bg-dark-card dark:text-linen-mist"
					>
						<option value="all">{t('admin.feedback.allStatuses')}</option>
						<option value="pending">{t('admin.feedback.statusPending')}</option>
						<option value="reviewed">{t('admin.feedback.statusReviewed')}</option>
						<option value="resolved">{t('admin.feedback.statusResolved')}</option>
					</select>
				</div>
			</div>
		</div>

		{#if hasActiveFilters}
			<div
				class="flex items-center justify-between border-t border-fog pt-3 text-xs text-slate dark:border-dark-border dark:text-pebble"
			>
				<span>
					{filteredFeedback.length} entri ditemukan
				</span>
				<button
					type="button"
					onclick={resetFilters}
					class="font-bold text-forest-ink underline hover:text-charcoal dark:text-lime-voltage dark:hover:text-paper"
				>
					Reset Semua Filter
				</button>
			</div>
		{/if}
	</Card>

	<!-- Tabel Data Masukan & Ulasan (AC 3) -->
	<Card variant="default" class="overflow-hidden p-0">
		<div class="overflow-x-auto">
			<table class="w-full text-left text-xs sm:text-sm">
				<thead
					class="border-b border-fog bg-linen-mist/50 text-xs font-bold tracking-wider text-forest-ink uppercase dark:border-dark-border dark:bg-spruce/30 dark:text-lime-voltage"
				>
					<tr>
						<th class="px-5 py-3.5">{t('admin.feedback.colUser')}</th>
						<th class="px-5 py-3.5">{t('admin.feedback.colType')}</th>
						<th class="px-5 py-3.5">{t('admin.feedback.colContent')}</th>
						<th class="px-5 py-3.5">{t('admin.feedback.colRoute')}</th>
						<th class="px-5 py-3.5">{t('admin.feedback.colStatus')}</th>
						<th class="px-5 py-3.5">{t('admin.feedback.colDate')}</th>
						<th class="px-5 py-3.5 text-right">{t('admin.feedback.colActions')}</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-fog dark:divide-dark-border">
					{#if filteredFeedback.length > 0}
						{#each filteredFeedback as item (item.id)}
							<tr class="transition hover:bg-fog/30 dark:hover:bg-dark-card/40">
								<!-- Pengguna -->
								<td class="px-5 py-4">
									<div class="flex items-center gap-3">
										{#if item.userImage}
											<img
												src={item.userImage}
												alt={item.userName}
												class="h-8 w-8 shrink-0 rounded-full border border-fog object-cover dark:border-dark-border"
											/>
										{:else}
											<div
												class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-linen-mist text-xs font-bold text-forest-ink dark:bg-spruce dark:text-lime-voltage"
											>
												{(item.userName?.trim()?.[0] || 'U').toUpperCase()}
											</div>
										{/if}
										<div class="min-w-0">
											<div class="truncate font-bold text-obsidian dark:text-paper">
												{item.userName || t('admin.feedback.anonymousUser')}
											</div>
											<div class="truncate text-xs text-slate dark:text-pebble">
												{item.userEmail}
											</div>
										</div>
									</div>
								</td>

								<!-- Tipe & Rating/Kategori -->
								<td class="px-5 py-4 whitespace-nowrap">
									{#if item.type === 'review'}
										<div class="flex items-center gap-1.5">
											<Badge variant="lime">{t('admin.feedback.typeReview')}</Badge>
											{#if item.rating}
												<span
													class="inline-flex items-center gap-0.5 text-xs font-bold text-amber-500"
												>
													<HugeiconsIcon icon={StarIcon} size={14} class="fill-current" />
													{item.rating}/5
												</span>
											{/if}
										</div>
									{:else}
										<div class="flex items-center gap-1.5">
											<Badge variant="default">{t('admin.feedback.typeFeedback')}</Badge>
											{#if item.category}
												<span
													class="rounded-md px-1.5 py-0.5 text-[11px] font-semibold {item.category ===
													'bug'
														? 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300'
														: item.category === 'feature'
															? 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
															: 'bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300'}"
												>
													{item.category === 'bug'
														? t('admin.feedback.categoryBug')
														: item.category === 'feature'
															? t('admin.feedback.categoryFeature')
															: t('admin.feedback.categoryGeneral')}
												</span>
											{/if}
										</div>
									{/if}
								</td>

								<!-- Isi Masukan (preview) -->
								<td class="max-w-xs px-5 py-4">
									<p class="line-clamp-2 text-xs text-charcoal sm:text-sm dark:text-linen-mist">
										{item.content}
									</p>
								</td>

								<!-- Rute -->
								<td class="px-5 py-4 whitespace-nowrap">
									{#if item.currentRoute}
										<code
											class="rounded-md bg-linen-mist/60 px-2 py-0.5 font-mono text-xs text-forest-ink dark:bg-spruce/40 dark:text-lime-voltage"
										>
											{item.currentRoute}
										</code>
									{:else}
										<span class="text-xs text-slate dark:text-pebble">-</span>
									{/if}
								</td>

								<!-- Status -->
								<td class="px-5 py-4 whitespace-nowrap">
									{#if item.status === 'pending'}
										<span
											class="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
										>
											<HugeiconsIcon icon={Clock01Icon} size={12} />
											{t('admin.feedback.statusPending')}
										</span>
									{:else if item.status === 'reviewed'}
										<span
											class="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-bold text-blue-800 dark:bg-blue-950/60 dark:text-blue-300"
										>
											<HugeiconsIcon icon={ViewIcon} size={12} />
											{t('admin.feedback.statusReviewed')}
										</span>
									{:else}
										<span
											class="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
										>
											<HugeiconsIcon icon={CheckmarkCircle02Icon} size={12} />
											{t('admin.feedback.statusResolved')}
										</span>
									{/if}
								</td>

								<!-- Tanggal Masuk -->
								<td class="px-5 py-4 text-xs whitespace-nowrap text-slate dark:text-pebble">
									{formatDateTime(item.createdAt)}
								</td>

								<!-- Aksi -->
								<td class="px-5 py-4 text-right whitespace-nowrap">
									<div class="flex items-center justify-end gap-1.5">
										<button
											type="button"
											onclick={() => openDetailModal(item)}
											class="inline-flex items-center gap-1 rounded-lg border border-fog bg-paper px-2.5 py-1 text-xs font-bold text-forest-ink shadow-2xs transition hover:bg-linen-mist dark:border-dark-border dark:bg-dark-card dark:text-lime-voltage dark:hover:bg-dark-surface"
											aria-label="{t('admin.feedback.actionDetail')} {item.id}"
										>
											<HugeiconsIcon icon={ViewIcon} size={14} />
											<span>{t('admin.feedback.actionDetail')}</span>
										</button>

										<button
											type="button"
											onclick={() => openDeleteModal(item)}
											class="inline-flex items-center rounded-lg p-1.5 text-slate transition hover:bg-red-50 hover:text-alarm-red dark:text-pebble dark:hover:bg-red-950/40 dark:hover:text-red-400"
											aria-label="{t('admin.feedback.actionDelete')} {item.id}"
										>
											<HugeiconsIcon icon={Delete02Icon} size={16} />
										</button>
									</div>
								</td>
							</tr>
						{/each}
					{:else}
						<tr>
							<td colspan="7" class="px-5 py-12 text-center text-slate dark:text-pebble">
								<div class="flex flex-col items-center justify-center gap-2">
									<HugeiconsIcon icon={Comment01Icon} size={32} class="opacity-40" />
									<p class="font-medium">
										{hasActiveFilters
											? t('admin.feedback.noFeedbackFound')
											: t('admin.feedback.noFeedbackYet')}
									</p>
									{#if hasActiveFilters}
										<Button variant="secondary" size="sm" onclick={resetFilters}>
											Reset Filter
										</Button>
									{/if}
								</div>
							</td>
						</tr>
					{/if}
				</tbody>
			</table>
		</div>
	</Card>
</div>

<!-- MODAL DETAIL & DIAGNOSTIK (AC 4) -->
{#if selectedDetailFeedback}
	{@const diag = parseDeviceInfo(selectedDetailFeedback.deviceInfo)}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-obsidian/60 p-4 backdrop-blur-sm"
		role="dialog"
		aria-modal="true"
		aria-labelledby="modal-detail-title"
	>
		<div
			class="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-fog bg-paper p-6 shadow-2xl transition-all sm:p-7 dark:border-dark-border dark:bg-dark-surface"
		>
			<div
				class="flex items-start justify-between border-b border-fog pb-4 dark:border-dark-border"
			>
				<div>
					<div class="flex items-center gap-2">
						<h3
							id="modal-detail-title"
							class="text-lg font-bold text-obsidian sm:text-xl dark:text-paper"
						>
							{t('admin.feedback.modalDetailTitle')}
						</h3>
						<Badge variant={selectedDetailFeedback.type === 'review' ? 'lime' : 'default'}>
							{selectedDetailFeedback.type === 'review'
								? t('admin.feedback.typeReview')
								: t('admin.feedback.typeFeedback')}
						</Badge>
					</div>
					<p class="mt-0.5 text-xs text-slate dark:text-pebble">
						{t('admin.feedback.modalDetailDesc')}
					</p>
				</div>
				<button
					type="button"
					onclick={closeDetailModal}
					class="rounded-lg p-1.5 text-slate hover:bg-fog hover:text-obsidian dark:text-pebble dark:hover:bg-dark-border dark:hover:text-paper"
					aria-label={t('admin.feedback.closeButton')}
				>
					<HugeiconsIcon icon={Cancel01Icon} size={20} />
				</button>
			</div>

			<div class="mt-5 space-y-5 text-xs sm:text-sm">
				<!-- Identitas Pengguna -->
				<div
					class="rounded-xl border border-fog/60 bg-linen-mist/30 p-4 dark:border-dark-border dark:bg-dark-card/30"
				>
					<span class="text-xs font-bold tracking-wider text-slate uppercase dark:text-pebble">
						{t('admin.feedback.labelUserInfo')}
					</span>
					<div class="mt-2 flex items-center gap-3">
						{#if selectedDetailFeedback.userImage}
							<img
								src={selectedDetailFeedback.userImage}
								alt={selectedDetailFeedback.userName}
								class="h-10 w-10 shrink-0 rounded-full border border-fog object-cover dark:border-dark-border"
							/>
						{:else}
							<div
								class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-forest-ink font-bold text-lime-voltage"
							>
								{(selectedDetailFeedback.userName?.trim()?.[0] || 'U').toUpperCase()}
							</div>
						{/if}
						<div>
							<div class="font-bold text-obsidian dark:text-paper">
								{selectedDetailFeedback.userName || t('admin.feedback.anonymousUser')}
							</div>
							<div class="text-xs text-slate dark:text-pebble">
								{selectedDetailFeedback.userEmail}
							</div>
							<div class="font-mono text-[11px] text-pebble">
								ID: {selectedDetailFeedback.userId}
							</div>
						</div>
					</div>
				</div>

				<!-- Rating / Kategori -->
				{#if selectedDetailFeedback.type === 'review' && selectedDetailFeedback.rating}
					<div
						class="rounded-xl border border-fog/60 bg-paper p-4 dark:border-dark-border dark:bg-dark-card/40"
					>
						<span class="text-xs font-bold tracking-wider text-slate uppercase dark:text-pebble">
							{t('admin.feedback.labelRating')}
						</span>
						<div class="mt-2 flex items-center gap-2">
							<div class="flex items-center gap-1 text-amber-500">
								{#each [1, 2, 3, 4, 5] as star (star)}
									<HugeiconsIcon
										icon={StarIcon}
										size={20}
										class={star <= (selectedDetailFeedback?.rating ?? 0)
											? 'fill-current text-amber-500'
											: 'text-stone-300 dark:text-stone-700'}
									/>
								{/each}
							</div>
							<span class="font-bold text-obsidian dark:text-paper">
								{selectedDetailFeedback.rating} / 5
							</span>
						</div>
					</div>
				{:else if selectedDetailFeedback.type === 'feedback' && selectedDetailFeedback.category}
					<div
						class="rounded-xl border border-fog/60 bg-paper p-4 dark:border-dark-border dark:bg-dark-card/40"
					>
						<span class="text-xs font-bold tracking-wider text-slate uppercase dark:text-pebble">
							{t('admin.feedback.labelCategory')}
						</span>
						<div class="mt-2">
							<span
								class="inline-block rounded-md px-2.5 py-1 text-xs font-bold {selectedDetailFeedback.category ===
								'bug'
									? 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
									: selectedDetailFeedback.category === 'feature'
										? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
										: 'bg-stone-100 text-stone-800 dark:bg-stone-800 dark:text-stone-300'}"
							>
								{selectedDetailFeedback.category === 'bug'
									? t('admin.feedback.categoryBug')
									: selectedDetailFeedback.category === 'feature'
										? t('admin.feedback.categoryFeature')
										: t('admin.feedback.categoryGeneral')}
							</span>
						</div>
					</div>
				{/if}

				<!-- Isi Masukan Lengkap -->
				<div
					class="rounded-xl border border-fog/60 bg-paper p-4 dark:border-dark-border dark:bg-dark-card/40"
				>
					<span class="text-xs font-bold tracking-wider text-slate uppercase dark:text-pebble">
						{t('admin.feedback.labelContent')}
					</span>
					<p
						class="mt-2 text-sm leading-relaxed whitespace-pre-wrap text-charcoal dark:text-linen-mist"
					>
						{selectedDetailFeedback.content}
					</p>
				</div>

				<!-- Metadata Diagnostik Teknis (Rute & Peramban) -->
				<div
					class="rounded-xl border border-fog/60 bg-linen-mist/20 p-4 dark:border-dark-border dark:bg-dark-card/20"
				>
					<span class="text-xs font-bold tracking-wider text-slate uppercase dark:text-pebble">
						{t('admin.feedback.labelDiagnostics')}
					</span>
					<div class="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
						<!-- Rute Halaman Asal -->
						<div>
							<span class="block text-xs font-medium text-slate dark:text-pebble">
								{t('admin.feedback.labelRoute')}
							</span>
							<code
								class="mt-1 inline-block rounded-md border border-fog bg-paper px-2 py-1 font-mono text-xs text-forest-ink dark:border-dark-border dark:bg-dark-card dark:text-lime-voltage"
							>
								{selectedDetailFeedback.currentRoute || '-'}
							</code>
						</div>

						<!-- Waktu Pengiriman -->
						<div>
							<span class="block text-xs font-medium text-slate dark:text-pebble">
								{t('admin.feedback.labelDate')}
							</span>
							<span class="mt-1 block text-xs font-semibold text-obsidian dark:text-paper">
								{formatDateTime(selectedDetailFeedback.createdAt)}
							</span>
						</div>

						<!-- Metadata Peramban -->
						<div class="sm:col-span-2">
							<span class="block text-xs font-medium text-slate dark:text-pebble">
								{t('admin.feedback.labelDevice')}
							</span>
							<p
								class="mt-1 rounded-md border border-fog bg-paper p-2 font-mono text-xs break-all text-slate dark:border-dark-border dark:bg-dark-card dark:text-pebble"
							>
								{diag.browser}
								{#if diag.screen}
									<br />
									<span class="font-sans font-bold text-forest-ink dark:text-lime-voltage"
										>Viewport:</span
									>
									{diag.screen}
								{/if}
							</p>
						</div>
					</div>
				</div>

				<!-- Moderasi Status Penanganan (Server Action AC 5) -->
				<div
					class="rounded-xl border border-fog/60 bg-paper p-4 dark:border-dark-border dark:bg-dark-card/40"
				>
					<span class="text-xs font-bold tracking-wider text-slate uppercase dark:text-pebble">
						{t('admin.feedback.labelStatusAction')}
					</span>
					<div class="mt-3 flex flex-wrap items-center gap-2">
						<!-- Status: Pending -->
						<form
							method="POST"
							action="?/updateStatus"
							use:enhance={() => {
								isActionSubmitting = true;
								return async ({ update }) => {
									isActionSubmitting = false;
									await update();
									closeDetailModal();
								};
							}}
						>
							<input type="hidden" name="id" value={selectedDetailFeedback.id} />
							<input type="hidden" name="status" value="pending" />
							<Button
								type="submit"
								size="sm"
								variant={selectedDetailFeedback.status === 'pending' ? 'primary' : 'secondary'}
								disabled={isActionSubmitting || selectedDetailFeedback.status === 'pending'}
							>
								<HugeiconsIcon icon={Clock01Icon} size={14} />
								<span>{t('admin.feedback.statusPending')}</span>
							</Button>
						</form>

						<!-- Status: Reviewed -->
						<form
							method="POST"
							action="?/updateStatus"
							use:enhance={() => {
								isActionSubmitting = true;
								return async ({ update }) => {
									isActionSubmitting = false;
									await update();
									closeDetailModal();
								};
							}}
						>
							<input type="hidden" name="id" value={selectedDetailFeedback.id} />
							<input type="hidden" name="status" value="reviewed" />
							<Button
								type="submit"
								size="sm"
								variant={selectedDetailFeedback.status === 'reviewed' ? 'primary' : 'secondary'}
								disabled={isActionSubmitting || selectedDetailFeedback.status === 'reviewed'}
							>
								<HugeiconsIcon icon={ViewIcon} size={14} />
								<span>{t('admin.feedback.statusReviewed')}</span>
							</Button>
						</form>

						<!-- Status: Resolved -->
						<form
							method="POST"
							action="?/updateStatus"
							use:enhance={() => {
								isActionSubmitting = true;
								return async ({ update }) => {
									isActionSubmitting = false;
									await update();
									closeDetailModal();
								};
							}}
						>
							<input type="hidden" name="id" value={selectedDetailFeedback.id} />
							<input type="hidden" name="status" value="resolved" />
							<Button
								type="submit"
								size="sm"
								variant={selectedDetailFeedback.status === 'resolved' ? 'primary' : 'secondary'}
								disabled={isActionSubmitting || selectedDetailFeedback.status === 'resolved'}
							>
								<HugeiconsIcon icon={CheckmarkCircle02Icon} size={14} />
								<span>{t('admin.feedback.statusResolved')}</span>
							</Button>
						</form>
					</div>
				</div>
			</div>

			<!-- Footer Modal Detail -->
			<div
				class="mt-6 flex items-center justify-between border-t border-fog pt-4 dark:border-dark-border"
			>
				<Button
					type="button"
					variant="secondary"
					size="sm"
					class="border-alarm-red/40 text-alarm-red hover:bg-red-50 dark:border-red-900/60 dark:text-red-400 dark:hover:bg-red-950/40"
					onclick={() => {
						const target = selectedDetailFeedback;
						closeDetailModal();
						if (target) openDeleteModal(target);
					}}
				>
					<HugeiconsIcon icon={Delete02Icon} size={14} />
					<span>{t('admin.feedback.actionDelete')}</span>
				</Button>

				<Button type="button" variant="secondary" size="md" onclick={closeDetailModal}>
					{t('admin.feedback.closeButton')}
				</Button>
			</div>
		</div>
	</div>
{/if}

<!-- MODAL KONFIRMASI HAPUS (AC 5 Moderasi Penghapusan) -->
{#if deletingFeedback}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-obsidian/60 p-4 backdrop-blur-sm"
		role="dialog"
		aria-modal="true"
		aria-labelledby="modal-delete-title"
	>
		<div
			class="w-full max-w-md rounded-2xl border border-fog bg-paper p-6 shadow-2xl transition-all sm:p-7 dark:border-dark-border dark:bg-dark-surface"
		>
			<div class="flex items-center gap-3">
				<div
					class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-100 text-alarm-red dark:bg-red-950/60 dark:text-red-400"
				>
					<HugeiconsIcon icon={Alert02Icon} size={22} />
				</div>
				<div>
					<h3 id="modal-delete-title" class="text-lg font-bold text-obsidian dark:text-paper">
						{t('admin.feedback.deleteConfirmTitle')}
					</h3>
					<span class="text-xs text-slate dark:text-pebble">ID: {deletingFeedback.id}</span>
				</div>
			</div>

			<p class="mt-3 text-xs leading-relaxed text-slate sm:text-sm dark:text-pebble">
				{t('admin.feedback.deleteConfirmDesc')}
			</p>

			<div
				class="mt-3 rounded-lg border border-fog bg-linen-mist/40 p-3 text-xs text-charcoal dark:border-dark-border dark:bg-dark-card dark:text-linen-mist"
			>
				<div class="font-bold">{deletingFeedback.userName} ({deletingFeedback.userEmail})</div>
				<p class="mt-1 line-clamp-2 text-slate italic dark:text-pebble">
					"{deletingFeedback.content}"
				</p>
			</div>

			<form
				method="POST"
				action="?/deleteFeedback"
				use:enhance={() => {
					isActionSubmitting = true;
					return async ({ update }) => {
						isActionSubmitting = false;
						await update();
						closeDeleteModal();
					};
				}}
				class="mt-6 flex items-center justify-end gap-2 border-t border-fog pt-4 dark:border-dark-border"
			>
				<input type="hidden" name="id" value={deletingFeedback.id} />
				<Button
					type="button"
					variant="secondary"
					size="md"
					onclick={closeDeleteModal}
					disabled={isActionSubmitting}
				>
					{t('admin.feedback.cancelButton')}
				</Button>
				<Button
					type="submit"
					variant="dark"
					size="md"
					disabled={isActionSubmitting}
					class="!bg-alarm-red !text-white hover:!bg-red-700 dark:!bg-alarm-red dark:!text-white"
				>
					{#if isActionSubmitting}
						<HugeiconsIcon icon={Clock01Icon} size={16} class="animate-spin" />
						<span>{t('admin.feedback.actionDeleting')}</span>
					{:else}
						<HugeiconsIcon icon={Delete02Icon} size={16} />
						<span>{t('admin.feedback.deleteButtonConfirm')}</span>
					{/if}
				</Button>
			</form>
		</div>
	</div>
{/if}
