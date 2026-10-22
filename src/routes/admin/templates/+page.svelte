<script lang="ts">
	import type { PageProps } from './$types.js';
	import { enhance } from '$app/forms';
	import Card from '#lib/components/Card.svelte';
	import Button from '#lib/components/Button.svelte';
	import Badge from '#lib/components/Badge.svelte';
	import Input from '#lib/components/Input.svelte';
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
	let editingId = $state('');
	let templateName = $state('');
	let templateDescription = $state('');
	let templateCategories = $state<CategoryTemplateInputItem[]>([
		{ name: 'Kebutuhan', percentage: 50, isSavings: false },
		{ name: 'Keinginan', percentage: 30, isSavings: false },
		{ name: 'Tabungan', percentage: 20, isSavings: true }
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
			{ name: 'Kebutuhan', percentage: 50, isSavings: false },
			{ name: 'Keinginan', percentage: 30, isSavings: false },
			{ name: 'Tabungan', percentage: 20, isSavings: true }
		];
		modalMode = 'create';
	}

	function openEditModal(tpl: CategoryTemplateRecord) {
		editingId = tpl.id;
		templateName = tpl.name;
		templateDescription = tpl.description || '';
		templateCategories = (tpl.categories || []).map((c) => ({
			name: c.name,
			percentage: c.percentage,
			isSavings: Boolean(c.isSavings)
		}));
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
		templateCategories = [...templateCategories, { name: '', percentage: 10, isSavings: false }];
	}

	function removeCategoryRow(index: number) {
		if (templateCategories.length <= 1) return;
		templateCategories = templateCategories.filter((_, i) => i !== index);
	}
</script>

<div class="space-y-6">
	<!-- Page Header -->
	<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
		<div>
			<div class="flex items-center gap-2">
				<h1 class="text-2xl font-black tracking-tight text-obsidian sm:text-3xl dark:text-paper">
					Template Kategori
				</h1>
				<Badge variant="lime">
					{templates.length} Template
				</Badge>
			</div>
			<p class="mt-1 text-sm text-slate dark:text-pebble">
				Kelola template kategori budget yang otomatis ditawarkan kepada pengguna pada langkah
				Onboarding.
			</p>
		</div>

		<Button
			variant="primary"
			size="md"
			onclick={openCreateModal}
			class="inline-flex items-center gap-2"
		>
			<HugeiconsIcon icon={Add01Icon} size={18} />
			<span>Tambah Template Baru</span>
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
			class="flex items-center gap-2.5 rounded-lg border border-alarm-red/20 bg-red-50 p-4 text-xs font-semibold text-alarm-red dark:border-alarm-red/40 dark:bg-red-950/40 dark:text-red-300"
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
								<span>Template Sistem</span>
							</Badge>
						{:else}
							<Badge variant="neutral" class="shrink-0 text-[10px]">
								<span>Kustom Admin</span>
							</Badge>
						{/if}
					</div>

					<!-- Categories List -->
					<div class="mt-4 border-t border-fog pt-3 dark:border-dark-border">
						<p class="text-[11px] font-bold tracking-wider text-slate uppercase dark:text-pebble">
							Daftar Kategori ({tpl.categories?.length || 0})
						</p>
						<div class="mt-2 flex flex-wrap gap-1.5">
							{#each tpl.categories || [] as cat (cat.name)}
								<span
									class="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold {cat.isSavings
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
							Template bawaan sistem (tetap)
						</span>
					{:else}
						<Button
							variant="secondary"
							size="sm"
							onclick={() => openEditModal(tpl)}
							class="text-xs"
						>
							<HugeiconsIcon icon={Edit02Icon} size={14} />
							<span>Edit</span>
						</Button>

						<Button
							variant="secondary"
							size="sm"
							onclick={() => openDeleteModal(tpl)}
							class="text-xs text-alarm-red hover:bg-red-50 dark:hover:bg-red-950/40"
						>
							<HugeiconsIcon icon={Delete02Icon} size={14} />
							<span>Hapus</span>
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
					{modalMode === 'create' ? 'Tambah Template Kategori Baru' : 'Edit Template Kategori'}
				</h3>
				<button
					type="button"
					onclick={closeModal}
					class="cursor-pointer text-slate hover:text-charcoal dark:text-pebble dark:hover:text-linen-mist"
					aria-label="Tutup modal"
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

				<input type="hidden" name="categories" value={JSON.stringify(templateCategories)} />

				<Input
					id="template-name"
					name="name"
					label="Nama Template"
					type="text"
					placeholder="contoh: 70/20/10 atau Living & Saving"
					required
					bind:value={templateName}
				/>

				<div class="space-y-1">
					<label
						for="template-description"
						class="block text-xs font-bold text-obsidian dark:text-linen-mist"
					>
						Deskripsi (Opsional)
					</label>
					<textarea
						id="template-description"
						name="description"
						rows="2"
						placeholder="contoh: Pembagian proporsional untuk pengeluaran bulanan..."
						bind:value={templateDescription}
						class="w-full rounded-lg border border-fog bg-paper px-3 py-2 text-xs font-medium text-obsidian transition focus:border-forest-ink focus:outline-none dark:border-dark-border dark:bg-dark-surface dark:text-linen-mist dark:focus:border-lime-voltage"
					></textarea>
				</div>

				<!-- Category rows -->
				<div class="space-y-2 pt-2">
					<div class="flex items-center justify-between">
						<span class="text-xs font-bold tracking-wider text-obsidian uppercase dark:text-paper">
							Daftar Kategori
						</span>
						<span
							class="text-xs font-black {isPercentageValid
								? 'text-forest-ink dark:text-lime-voltage'
								: 'text-alarm-red'}"
						>
							Total: {totalPercentage}% {isPercentageValid
								? '✓ Pas'
								: `(${totalPercentage < 100 ? `Kurang ${Math.round((100 - totalPercentage) * 100) / 100}%` : `Lebih ${Math.round((totalPercentage - 100) * 100) / 100}%`})`}
						</span>
					</div>

					<div class="space-y-2">
						{#each templateCategories as cat, idx (idx)}
							<div
								class="flex items-center gap-2 rounded-lg border border-fog bg-paper/60 p-2.5 dark:border-dark-border dark:bg-dark-surface/60"
							>
								<!-- Category Name -->
								<input
									type="text"
									placeholder="Nama Kategori"
									required
									bind:value={cat.name}
									class="flex-1 rounded-md border border-fog bg-paper px-2.5 py-1.5 text-xs text-obsidian focus:border-forest-ink focus:outline-none dark:border-dark-border dark:bg-dark-card dark:text-linen-mist dark:focus:border-lime-voltage"
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
										class="w-full rounded-md border border-fog bg-paper px-2 py-1.5 text-right text-xs font-bold text-obsidian focus:border-forest-ink focus:outline-none dark:border-dark-border dark:bg-dark-card dark:text-linen-mist dark:focus:border-lime-voltage"
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
									<span class="hidden sm:inline">Tabungan</span>
								</label>

								<!-- Remove Button -->
								{#if templateCategories.length > 1}
									<button
										type="button"
										onclick={() => removeCategoryRow(idx)}
										class="cursor-pointer p-1 text-slate hover:text-alarm-red dark:text-pebble"
										aria-label="Hapus baris kategori"
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
						class="mt-2 inline-flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-dashed border-fog py-2 text-xs font-semibold text-forest-ink transition hover:border-forest-ink hover:bg-fog dark:border-dark-border dark:text-lime-voltage dark:hover:border-lime-voltage dark:hover:bg-dark-surface"
					>
						<HugeiconsIcon icon={Add01Icon} size={15} />
						<span>Tambah Kategori Lain</span>
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
						Batal
					</Button>
					<Button
						type="submit"
						variant="primary"
						size="md"
						disabled={isSubmitting || !isPercentageValid || !templateName.trim()}
					>
						{isSubmitting ? 'Menyimpan...' : 'Simpan Template'}
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
				<div class="rounded-full bg-red-100 p-2 text-alarm-red dark:bg-red-950/60">
					<HugeiconsIcon icon={Alert02Icon} size={24} />
				</div>
				<h3 class="text-lg font-bold text-obsidian dark:text-paper">Hapus Template Kategori</h3>
			</div>

			<p class="mt-3 text-xs leading-relaxed text-slate dark:text-pebble">
				Apakah Anda yakin ingin menghapus template <strong class="text-obsidian dark:text-paper"
					>{deletingTemplate.name}</strong
				>? Template ini tidak akan lagi tersedia untuk pengguna baru saat Onboarding.
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
					Batal
				</Button>
				<Button
					type="submit"
					variant="dark"
					size="sm"
					disabled={isSubmitting}
					class="bg-alarm-red text-white hover:bg-red-700"
				>
					{isSubmitting ? 'Menghapus...' : 'Ya, Hapus'}
				</Button>
			</form>
		</div>
	</div>
{/if}
