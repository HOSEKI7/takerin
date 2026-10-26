<script lang="ts">
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import {
		PiggyBankIcon,
		Restaurant01Icon,
		Car01Icon,
		ShoppingBag01Icon,
		Coins01Icon,
		CheckmarkCircle02Icon
	} from '@hugeicons/core-free-icons';
	import { formatRupiah } from '#lib/validation/onboarding.js';
	import { t } from '#lib/i18n/index.js';

	export interface CategoryOption {
		id: string;
		name: string;
		percentage?: number;
		isSavings?: boolean;
		balance?: number;
		status?: string;
	}

	interface Props {
		categories: CategoryOption[];
		selectedId?: string;
		onSelect?: (id: string) => void;
		class?: string;
	}

	let {
		categories = [],
		selectedId = $bindable(''),
		onSelect,
		class: className = ''
	}: Props = $props();

	function getCategoryIcon(name: string, isSavings?: boolean) {
		if (isSavings) return PiggyBankIcon;
		const lower = name.toLowerCase();
		if (
			lower.includes('makan') ||
			lower.includes('minum') ||
			lower.includes('kuliner') ||
			lower.includes('pangan') ||
			lower.includes('kebutuhan') ||
			lower.includes('needs') ||
			lower.includes('food') ||
			lower.includes('dining') ||
			lower.includes('groceries')
		) {
			return Restaurant01Icon;
		}
		if (
			lower.includes('transport') ||
			lower.includes('bensin') ||
			lower.includes('kendaraan') ||
			lower.includes('mobil') ||
			lower.includes('motor') ||
			lower.includes('commute') ||
			lower.includes('fuel') ||
			lower.includes('transit')
		) {
			return Car01Icon;
		}
		if (
			lower.includes('belanja') ||
			lower.includes('keinginan') ||
			lower.includes('hiburan') ||
			lower.includes('shopping') ||
			lower.includes('wants') ||
			lower.includes('entertainment')
		) {
			return ShoppingBag01Icon;
		}
		return Coins01Icon;
	}

	function handleChoose(id: string) {
		selectedId = id;
		onSelect?.(id);
	}

	const visibleCategories = $derived(
		categories.filter((c) => c.status !== 'frozen' || selectedId === c.id)
	);

	const activeCount = $derived(categories.filter((c) => c.status !== 'frozen').length);
</script>

<div class="w-full space-y-2 {className}">
	<div class="flex items-center justify-between">
		<span class="text-sm font-semibold text-charcoal dark:text-linen-mist">
			{t('categoryPicker.selectCategory')} <span class="text-alarm-red">*</span>
		</span>
		<span class="text-xs text-slate dark:text-pebble">
			{t('categoryPicker.activeCount', { count: activeCount })}
		</span>
	</div>

	<div
		class="grid grid-cols-2 gap-2.5 sm:grid-cols-3"
		role="radiogroup"
		aria-label={t('nav.categories')}
	>
		{#each visibleCategories as cat (cat.id)}
			{@const isSelected = selectedId === cat.id}
			{@const icon = getCategoryIcon(cat.name, cat.isSavings)}

			<button
				type="button"
				role="radio"
				aria-checked={isSelected}
				class="relative flex flex-col justify-between rounded-xl border p-3 text-left transition active:scale-[0.98] {isSelected
					? 'border-forest-ink bg-linen-mist/50 ring-2 ring-forest-ink dark:border-lime-voltage dark:bg-spruce/30 dark:ring-lime-voltage'
					: 'border-fog bg-paper hover:border-pebble/60 hover:bg-fog/30 dark:border-dark-border dark:bg-dark-card dark:hover:border-slate/60'}"
				onclick={() => handleChoose(cat.id)}
			>
				<div class="flex items-start justify-between gap-2">
					<div
						class="flex h-8 w-8 items-center justify-center rounded-lg {isSelected
							? 'bg-forest-ink text-paper dark:bg-lime-voltage dark:text-forest-ink'
							: 'bg-fog text-charcoal dark:bg-dark-surface dark:text-linen-mist'}"
					>
						<HugeiconsIcon {icon} class="h-4 w-4" />
					</div>

					{#if isSelected}
						<HugeiconsIcon
							icon={CheckmarkCircle02Icon}
							class="h-4 w-4 text-forest-ink dark:text-lime-voltage"
						/>
					{/if}
				</div>

				<div class="mt-2.5">
					<p class="line-clamp-1 text-xs font-bold text-obsidian dark:text-paper">
						{cat.name}
					</p>

					{#if cat.balance !== undefined}
						<p
							class="mt-0.5 text-[11px] font-medium {cat.balance < 0
								? 'font-bold text-alarm-red'
								: 'text-slate dark:text-pebble'}"
						>
							{t('categories.balancePrefix')}: {formatRupiah(cat.balance)}
						</p>
					{/if}

					{#if cat.isSavings}
						<span
							class="py-0.2 mt-1 inline-block rounded-full bg-spruce/10 px-1.5 text-[10px] font-semibold text-spruce dark:bg-spruce/30 dark:text-lime-voltage"
						>
							{t('categories.savingsBadge')}
						</span>
					{/if}
				</div>
			</button>
		{/each}
	</div>
</div>
