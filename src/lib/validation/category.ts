export interface ManagedCategoryInput {
	id?: string;
	name: string;
	percentage: number | string;
	isSavings?: boolean;
}

export interface ValidationResult<T> {
	success: boolean;
	data?: T;
	error?: string;
}

/**
 * Validates category management input mid-period.
 * Rules:
 * - At least 1 active category.
 * - Names cannot be empty or whitespace.
 * - Each percentage must be a number > 0.
 * - Total sum of percentages must equal 100%.
 */
export function validateCategoryManagementInput(
	categories: ManagedCategoryInput[] | null | undefined
): ValidationResult<Array<{ id?: string; name: string; percentage: number; isSavings: boolean }>> {
	if (!categories || !Array.isArray(categories) || categories.length === 0) {
		return { success: false, error: 'Minimal harus memiliki satu kategori aktif.' };
	}

	let totalPercentage = 0;
	const sanitized: Array<{ id?: string; name: string; percentage: number; isSavings: boolean }> =
		[];

	for (const cat of categories) {
		const trimmedName = (cat.name ?? '').trim();
		if (trimmedName.length === 0) {
			return { success: false, error: 'Nama kategori tidak boleh kosong.' };
		}

		const pct = Number(cat.percentage);
		if (Number.isNaN(pct) || cat.percentage === '' || pct <= 0) {
			return { success: false, error: 'Persentase kategori harus lebih besar dari 0%.' };
		}

		totalPercentage += pct;
		sanitized.push({
			id: cat.id,
			name: trimmedName,
			percentage: Math.round(pct * 100) / 100,
			isSavings: Boolean(cat.isSavings)
		});
	}

	// Floating point tolerance check for 100%
	if (Math.abs(totalPercentage - 100) > 0.001) {
		const formattedTotal = Math.round(totalPercentage * 100) / 100;
		return {
			success: false,
			error: `Total persentase harus tepat 100% (saat ini: ${formattedTotal}%).`
		};
	}

	return { success: true, data: sanitized };
}

/**
 * Redistributes a freed percentage amount proportionally among remaining categories.
 * Rounds to 2 decimal places and adjusts the last element to guarantee exact sum.
 */
export function redistributePercentage<T extends { percentage: number }>(
	remainingCategories: T[],
	percentageToRedistribute: number
): T[] {
	if (remainingCategories.length === 0) return [];
	if (remainingCategories.length === 1) {
		return [
			{
				...remainingCategories[0],
				percentage:
					Math.round((remainingCategories[0].percentage + percentageToRedistribute) * 100) / 100
			}
		];
	}

	const currentTotal = remainingCategories.reduce((acc, c) => acc + Number(c.percentage || 0), 0);

	let accumulatedAdded = 0;
	return remainingCategories.map((cat, idx) => {
		if (idx === remainingCategories.length - 1) {
			// Ensure exact redistribution without floating precision drift
			const remainingToAdd = Math.round((percentageToRedistribute - accumulatedAdded) * 100) / 100;
			return {
				...cat,
				percentage: Math.round((cat.percentage + remainingToAdd) * 100) / 100
			};
		}

		const proportion =
			currentTotal > 0 ? cat.percentage / currentTotal : 1 / remainingCategories.length;
		const toAdd = Math.round(percentageToRedistribute * proportion * 100) / 100;
		accumulatedAdded += toAdd;

		return {
			...cat,
			percentage: Math.round((cat.percentage + toAdd) * 100) / 100
		};
	});
}

export interface ActiveCategoryStateItem {
	id?: string;
	name: string;
	percentage: number | string;
	isSavings?: boolean | null;
}

export interface FrozenCategoryStateItem {
	id: string;
	name: string;
}

export interface HasCategoryChangesParams {
	initialActive: ActiveCategoryStateItem[];
	currentActive: ActiveCategoryStateItem[];
	initialFrozen?: FrozenCategoryStateItem[];
	currentFrozen?: FrozenCategoryStateItem[];
	freezeCategoryIds?: string[];
}

/**
 * Checks if there are any uncommitted changes in category management:
 * - Active categories count difference
 * - New category added (id starts with 'new-' or undefined)
 * - Category marked to freeze (freezeCategoryIds > 0)
 * - Active category name modified
 * - Active category percentage modified (> 0.001 delta)
 * - Active category isSavings status modified
 * - Frozen category name modified
 */
export function hasCategoryChanges(params: HasCategoryChangesParams): boolean {
	const {
		initialActive = [],
		currentActive = [],
		initialFrozen = [],
		currentFrozen = [],
		freezeCategoryIds = []
	} = params;

	if (freezeCategoryIds.length > 0) {
		return true;
	}

	if (currentActive.length !== initialActive.length) {
		return true;
	}

	const initialActiveMap = new Map<string, ActiveCategoryStateItem>();
	for (const item of initialActive) {
		if (item.id) {
			initialActiveMap.set(item.id, item);
		}
	}

	for (const current of currentActive) {
		if (!current.id || current.id.startsWith('new-')) {
			return true;
		}

		const initial = initialActiveMap.get(current.id);
		if (!initial) {
			return true;
		}

		if ((current.name ?? '').trim() !== (initial.name ?? '').trim()) {
			return true;
		}

		if (Math.abs(Number(current.percentage) - Number(initial.percentage)) > 0.001) {
			return true;
		}

		if (Boolean(current.isSavings) !== Boolean(initial.isSavings)) {
			return true;
		}
	}

	if (currentFrozen.length > 0 && initialFrozen.length > 0) {
		const initialFrozenMap = new Map<string, string>();
		for (const f of initialFrozen) {
			initialFrozenMap.set(f.id, (f.name ?? '').trim());
		}

		for (const currentF of currentFrozen) {
			const initialName = initialFrozenMap.get(currentF.id);
			if (initialName !== undefined && (currentF.name ?? '').trim() !== initialName) {
				return true;
			}
		}
	}

	return false;
}

