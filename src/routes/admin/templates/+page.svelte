<script lang="ts">
	import type { PageProps } from './$types.js';
	import { enhance } from '$app/forms';
	import Card from '#lib/components/Card.svelte';
	import Button from '#lib/components/Button.svelte';
	import Badge from '#lib/components/Badge.svelte';
	import Input from '#lib/components/Input.svelte';
	import { t } from '#lib/i18n/index.js';
	import type { CategoryTemplateRecord } from '#lib/server/db/onboarding.js';
	import type { CategoryTemplateInputItem } from '#lib/validation/admin.js';
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import {
		Layers01Icon,
		Add01Icon,
		Edit02Icon,
		Delete02Icon,
		CheckmarkCircle02Icon,
		Alert02Icon,
		Cancel01Icon,
		LockKeyIcon,
		PiggyBankIcon
	} from '@hugeicons/core-free-icons';

	let { data, form }: PageProps = $props();

	const templates = $derived(data.templates ?? []);

	// Modal State
	type ModalMode = 'none' | 'create' | 'edit' | 'delete';
	let modalMode = $state<ModalMode>('none');
	let isSubmitting = $state(false);

	// Form values for Create / Edit
	interface CategoryTemplateItemWithId extends CategoryTemplateInputItem {
		id: string;
	}

	let nextRowId = 0;
	function makeCategoryItem(
		name = '',
		percentage = 10,
		isSavings = false
	): CategoryTemplateItemWithId {
		return { id: `row-${Date.now()}-${nextRowId++}`, name, percentage, isSavings };
	}

	let editingId = $state('');
	let templateName = $state('');
	let templateDescription = $state('');
	let templateCategories = $state<CategoryTemplateItemWithId[]>([
		makeCategoryItem('Kebutuhan', 50, false),
		makeCategoryItem('Keinginan', 30, false),
		makeCategoryItem('Tabungan', 20, true)
	]);

	// Delete Confirmation state
	let deletingTemplate = $state<CategoryTemplateRecord | null>(null);

	// Total Percentage Calculation
	const totalPercentage = $derived.by(() => {
		const sum = templateCategories.reduce((acc, cat) => acc + (Number(cat.percentage) || 0), 0);
		return Math.round(sum * 100) / 100;
	});

	const isPercentageValid = $derived(Math.abs(totalPercentage - 100) < 0.01);

	function openCreateModal() {
		editingId = '';
		templateName = '';
		templateDescription = '';
		templateCategories = [
			makeCategoryItem('Kebutuhan', 50, false),
			makeCategoryItem('Keinginan', 30, false),
			makeCategoryItem('Tabungan', 20, true)
		];
		modalMode = 'create';
	}

	function openEditModal(tpl: CategoryTemplateRecord) {
		editingId = tpl.id;
		templateName = tpl.name;
		templateDescription = tpl.description || '';
		templateCategories = (tpl.categories || []).map((c) =>
			makeCategoryItem(c.name, c.percentage, Boolean(c.isSavings))
		);
		modalMode = 'edit';
	}

	function openDeleteModal(tpl: CategoryTemplateRecord) {
		deletingTemplate = tpl;
		modalMode = 'delete';
	}

	function closeModal() {
		modalMode = 'none';
		deletingTemplate = null;
	}

	function addCategoryRow() {
		templateCategories = [...templateCategories, makeCategoryItem('', 10, false)];
	}

	function removeCategoryRow(id: string) {
		if (templateCategories.length <= 1) return;
		templateCategories = templateCategories.filter((cat) => cat.id !== id);
	}
</script>

<div class="space-y-6">
	<!-- Page Header -->
	<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
		<div>
			<div class="flex items-center gap-2">
				<h1 class="text-2xl font-black tracking-tight text-obsidian sm:text-3xl dark:text-paper">
					{t('admin.templates.title')}
				</h1>
				<Badge variant="lime">
					{t('admin.templates.templateCount', { count: templates.length })}
				</Badge>
			</div>
			<p class="mt-1 text-sm text-slate dark:text-pebble">
				{t('admin.templates.subtitle')}
			</p>
		</div>

		<Button
			variant="primary"
			size="md"
			onclick={openCreateModal}
			class="inline-flex items-center gap-2"
		>
			<HugeiconsIcon icon={Add01Icon} size={18} />
			<span>{t('admin.templates.addNew')}</span>
		</Button>
	</div>

	<!-- Action Feedback Messages -->
	{#if form?.success && form?.message}
		<div
			class="flex items-center gap-2.5 rounded-lg border border-forest-ink/20 bg-linen-mist/80 p-4 text-xs font-semibold text-forest-ink dark:border-lime-voltage/30 dark:bg-spruce/40 dark:text-lime-voltage"
		>
			<HugeiconsIcon icon={CheckmarkCircle02Icon} size={18} />
			<span>{form.message}</span>
		</div>
	{/if}

	{#if form?.error}
		<div
			class="flex items-center gap-2.5 rounded-xl border border-alarm-red/20 bg-alarm-red/10 p-4 text-xs font-semibold text-alarm-red dark:border-alarm-red/40 dark:bg-alarm-red/20"
		>
			<HugeiconsIcon icon={Alert02Icon} size={18} />
			<span>{form.error}</span>
		</div>
	{/if}

	<!-- Templates Grid -->
	<div class="grid grid-cols-1 gap-5 md:grid-cols-2">
		{#each templates as tpl (tpl.id)}
			<Card variant="default" class="flex flex-col justify-between p-5">
				<div>
					<!-- Header: Name & is_system Badge -->
					<div class="flex items-start justify-between gap-3">
						<div class="flex items-center gap-2.5">
							<div
								class="rounded-lg bg-linen-mist p-2 text-forest-ink dark:bg-spruce dark:text-lime-voltage"
							>
								<HugeiconsIcon icon={Layers01Icon} size={20} />
							</div>
							<div>
								<h2 class="text-base font-black text-obsidian sm:text-lg dark:text-paper">
									{tpl.name}
								</h2>
								{#if tpl.description}
									<p class="mt-0.5 line-clamp-2 text-xs text-slate dark:text-pebble">
										{tpl.description}
									</p>
								{/if}
							</div>
						</div>

						{#if tpl.isSystem}
							<Badge variant="lime" class="shrink-0 text-[10px]">
								<HugeiconsIcon icon={LockKeyIcon} size={12} />
								<span>{t('admin.templates.systemBadge')}</span>
							</Badge>
						{:else}
							<Badge variant="neutral" class="shrink-0 text-[10px]">
								<span>{t('admin.templates.customBadge')}</span>
							</Badge>
						{/if}
					</div>

					<!-- Categories List -->
					<div class="mt-4 border-t border-fog pt-3 dark:border-dark-border">
						<p class="text-[11px] font-bold tracking-wider text-slate uppercase dark:text-pebble">
							{t('admin.templates.categoryListCount', { count: tpl.categories?.length || 0 })}
						</p>
						<div class="mt-2 flex flex-wrap gap-1.5">
							{#each tpl.categories || [] as cat (`${tpl.id}-${cat.name}`)}
								<span
									class="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold {cat.isSavings
										? 'bg-linen-mist text-forest-ink dark:bg-spruce/80 dark:text-lime-voltage'
										: 'bg-fog text-charcoal dark:bg-dark-card dark:text-linen-mist'}"
								>
									{#if cat.isSavings}
										<HugeiconsIcon icon={PiggyBankIcon} size={12} />
									{/if}
									<span>{cat.name} ({cat.percentage}%)</span>
								</span>
							{/each}
						</div>
					</div>
				</div>

				<!-- Actions Footer -->
				<div
					class="mt-6 flex items-center justify-end gap-2 border-t border-fog pt-3 dark:border-dark-border"
				>
					{#if tpl.isSystem}
						<span class="text-xs font-semibold text-slate dark:text-pebble">
							{t('admin.templates.systemNote')}
						</span>
					{:else}
						<Button
							variant="secondary"
							size="sm"
							onclick={() => openEditModal(tpl)}
							class="text-xs"
						>
							<HugeiconsIcon icon={Edit02Icon} size={14} />
							<span>{t('common.edit')}</span>
						</Button>

						<Button
							variant="secondary"
							size="sm"
							onclick={() => openDeleteModal(tpl)}
							class="text-xs text-alarm-red hover:bg-alarm-red/10 dark:hover:bg-alarm-red/20"
						>
							<HugeiconsIcon icon={Delete02Icon} size={14} />
							<span>{t('common.delete')}</span>
						</Button>
					{/if}
				</div>
			</Card>
		{/each}
	</div>
</div>

<!-- CREATE / EDIT MODAL -->
{#if modalMode === 'create' || modalMode === 'edit'}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-obsidian/60 p-4 backdrop-blur-sm"
		role="dialog"
		aria-modal="true"
	>
		<div
			class="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-fog bg-paper p-6 shadow-2xl dark:border-dark-border dark:bg-dark-card"
		>
			<div
				class="flex items-center justify-between border-b border-fog pb-3 dark:border-dark-border"
			>
				<h3 class="text-lg font-bold text-obsidian dark:text-paper">
					{modalMode === 'create'
						? t('admin.templates.modalAddTitle')
						: t('admin.templates.modalEditTitle')}
				</h3>
				<button
					type="button"
					onclick={closeModal}
					class="cursor-pointer text-slate hover:text-charcoal dark:text-pebble dark:hover:text-linen-mist"
					aria-label={t('admin.templates.closeModalAria')}
				>
					<HugeiconsIcon icon={Cancel01Icon} size={20} />
				</button>
			</div>

			<form
				method="POST"
				action={modalMode === 'create' ? '?/createTemplate' : '?/updateTemplate'}
				use:enhance={() => {
					isSubmitting = true;
					return async ({ update, result }) => {
						isSubmitting = false;
						if (result.type === 'success') {
							closeModal();
						}
						await update();
					};
				}}
				class="mt-4 space-y-4"
			>
				{#if modalMode === 'edit'}
					<input type="hidden" name="id" value={editingId} />
				{/if}

				<input
					type="hidden"
					name="categories"
					value={JSON.stringify(
						templateCategories.map(({ name, percentage, isSavings }) => ({
							name,
							percentage,
							isSavings
						}))
					)}
				/>

				<Input
					id="template-name"
					name="name"
					label={t('admin.templates.nameLabel')}
					type="text"
					placeholder={t('admin.templates.namePlaceholder')}
					required
					bind:value={templateName}
				/>

				<div class="space-y-1">
					<label
						for="template-description"
						class="block text-xs font-bold text-obsidian dark:text-linen-mist"
					>
						{t('admin.templates.descLabel')}
					</label>
					<textarea
						id="template-description"
						name="description"
						rows="2"
						placeholder={t('admin.templates.descPlaceholder')}
						bind:value={templateDescription}
						class="w-full rounded-[10px] border border-fog bg-paper px-3 py-2 text-xs font-medium text-obsidian transition focus:border-forest-ink focus:outline-none dark:border-dark-border dark:bg-dark-surface dark:text-linen-mist dark:focus:border-lime-voltage"
					></textarea>
				</div>

				<!-- Category rows -->
				<div class="space-y-2 pt-2">
					<div class="flex items-center justify-between">
						<span class="text-xs font-bold tracking-wider text-obsidian uppercase dark:text-paper">
							{t('admin.templates.categoryList')}
						</span>
						<span
							class="text-xs font-black {isPercentageValid
								? 'text-forest-ink dark:text-lime-voltage'
								: 'text-alarm-red'}"
						>
							{t('admin.templates.totalAlloc', { percent: totalPercentage })}
							{isPercentageValid
								? t('admin.templates.exactFit')
								: `(${totalPercentage < 100 ? t('admin.templates.underFit', { percent: Math.round((100 - totalPercentage) * 100) / 100 }) : t('admin.templates.overFit', { percent: Math.round((totalPercentage - 100) * 100) / 100 })})`}
						</span>
					</div>

					<div class="space-y-2">
						{#each templateCategories as cat (cat.id)}
							<div
								class="flex items-center gap-2 rounded-xl border border-fog bg-paper/60 p-2.5 dark:border-dark-border dark:bg-dark-surface/60"
							>
								<!-- Category Name -->
								<input
									type="text"
									placeholder={t('admin.templates.categoryNamePlaceholder')}
									required
									bind:value={cat.name}
									class="flex-1 rounded-[10px] border border-fog bg-paper px-2.5 py-1.5 text-xs text-obsidian focus:border-forest-ink focus:outline-none dark:border-dark-border dark:bg-dark-card dark:text-linen-mist dark:focus:border-lime-voltage"
								/>

								<!-- Category Percentage -->
								<div class="flex w-24 items-center gap-1">
									<input
										type="number"
										min="1"
										max="100"
										step="0.01"
										required
										placeholder="%"
										bind:value={cat.percentage}
										class="w-full rounded-[10px] border border-fog bg-paper px-2 py-1.5 text-right text-xs font-bold text-obsidian focus:border-forest-ink focus:outline-none dark:border-dark-border dark:bg-dark-card dark:text-linen-mist dark:focus:border-lime-voltage"
									/>
									<span class="text-xs font-bold text-slate dark:text-pebble">%</span>
								</div>

								<!-- Savings Flag -->
								<label
									class="inline-flex cursor-pointer items-center gap-1 text-[11px] font-semibold text-slate dark:text-pebble"
								>
									<input
										type="checkbox"
										bind:checked={cat.isSavings}
										class="rounded border-fog text-forest-ink accent-forest-ink dark:accent-lime-voltage"
									/>
									<span class="hidden sm:inline">{t('admin.templates.savingsLabel')}</span>
								</label>

								<!-- Remove Button -->
								{#if templateCategories.length > 1}
									<button
										type="button"
										onclick={() => removeCategoryRow(cat.id)}
										class="cursor-pointer p-1 text-slate hover:text-alarm-red dark:text-pebble"
										aria-label={t('admin.templates.deleteRowAria')}
									>
										<HugeiconsIcon icon={Delete02Icon} size={16} />
									</button>
								{/if}
							</div>
						{/each}
					</div>

					<button
						type="button"
						onclick={addCategoryRow}
						class="mt-2 inline-flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-full border border-dashed border-fog py-2 text-xs font-semibold text-forest-ink transition hover:border-forest-ink hover:bg-fog dark:border-dark-border dark:text-lime-voltage dark:hover:border-lime-voltage dark:hover:bg-dark-surface"
					>
						<HugeiconsIcon icon={Add01Icon} size={15} />
						<span>{t('admin.templates.addCategoryRow')}</span>
					</button>
				</div>

				<!-- Modal Actions -->
				<div
					class="mt-6 flex items-center justify-end gap-2 border-t border-fog pt-4 dark:border-dark-border"
				>
					<Button
						type="button"
						variant="secondary"
						size="md"
						onclick={closeModal}
						disabled={isSubmitting}
					>
						{t('common.cancel')}
					</Button>
					<Button
						type="submit"
						variant="primary"
						size="md"
						disabled={isSubmitting || !isPercentageValid || !templateName.trim()}
					>
						{isSubmitting ? t('admin.templates.saving') : t('admin.templates.saveTemplate')}
					</Button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- DELETE CONFIRMATION MODAL -->
{#if modalMode === 'delete' && deletingTemplate}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-obsidian/60 p-4 backdrop-blur-sm"
		role="dialog"
		aria-modal="true"
	>
		<div
			class="w-full max-w-md rounded-2xl border border-alarm-red/30 bg-paper p-6 shadow-2xl dark:border-alarm-red/40 dark:bg-dark-card"
		>
			<div class="flex items-center gap-3">
				<div class="rounded-full bg-alarm-red/10 p-2 text-alarm-red dark:bg-alarm-red/20">
					<HugeiconsIcon icon={Alert02Icon} size={24} />
				</div>
				<h3 class="text-lg font-bold text-obsidian dark:text-paper">
					{t('admin.templates.deleteTitle')}
				</h3>
			</div>

			<p class="mt-3 text-xs leading-relaxed text-slate dark:text-pebble">
				{t('admin.templates.deleteConfirm', { name: deletingTemplate.name })}
			</p>

			<form
				method="POST"
				action="?/deleteTemplate"
				use:enhance={() => {
					isSubmitting = true;
					return async ({ update, result }) => {
						isSubmitting = false;
						if (result.type === 'success') {
							closeModal();
						}
						await update();
					};
				}}
				class="mt-6 flex items-center justify-end gap-2"
			>
				<input type="hidden" name="id" value={deletingTemplate.id} />
				<Button
					type="button"
					variant="secondary"
					size="sm"
					onclick={closeModal}
					disabled={isSubmitting}
				>
					{t('common.cancel')}
				</Button>
				<Button
					type="submit"
					variant="dark"
					size="sm"
					disabled={isSubmitting}
					class="bg-alarm-red text-paper hover:bg-alarm-red/90"
				>
					{isSubmitting ? t('admin.templates.deleting') : t('admin.templates.confirmDelete')}
				</Button>
			</form>
		</div>
	</div>
{/if}
