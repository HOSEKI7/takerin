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
