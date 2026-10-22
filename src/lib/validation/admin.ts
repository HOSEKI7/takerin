export interface CategoryTemplateInputItem {
	name: string;
	percentage: number;
	isSavings: boolean;
}

export interface CreateTemplateInput {
	name: string;
	description?: string | null;
	categories: CategoryTemplateInputItem[];
}

export interface ValidationResult<T> {
	isValid: boolean;
	errors: Record<string, string>;
	sanitizedData?: T;
}

/**
 * Validates category template input.
 * Ensures:
 * 1. Name is non-empty.
 * 2. At least 1 category exists.
 * 3. All category names are non-empty and unique.
 * 4. All category percentages are > 0.
 * 5. Sum of percentages is exactly 100% (within 0.01 tolerance for floating point math).
 */
export function validateTemplateInput(
	input: CreateTemplateInput
): ValidationResult<CreateTemplateInput> {
	const errors: Record<string, string> = {};

	const trimmedName = input.name?.trim() ?? '';
	if (!trimmedName) {
		errors.name = 'Nama template wajib diisi.';
	}

	const trimmedDescription = input.description ? input.description.trim() : null;

	if (!Array.isArray(input.categories) || input.categories.length === 0) {
		errors.categories = 'Minimal harus ada 1 kategori.';
	} else {
		const namesSeen = new Set<string>();
		let totalPercentage = 0;

		for (const cat of input.categories) {
			const catName = (cat.name ?? '').trim();
			if (!catName) {
				errors.categories = 'Setiap kategori harus memiliki nama.';
				break;
			}

			const lowerName = catName.toLowerCase();
			if (namesSeen.has(lowerName)) {
				errors.categories = 'Nama kategori tidak boleh duplikat.';
				break;
			}
			namesSeen.add(lowerName);

			const pct = Number(cat.percentage);
			if (isNaN(pct) || pct <= 0) {
				errors.categories = 'Persentase setiap kategori harus lebih dari 0%.';
				break;
			}

			totalPercentage += pct;
		}

		if (!errors.categories) {
			// Round sum to 2 decimal places to prevent float precision issues (e.g. 33.33 + 33.33 + 33.34 = 100)
			const roundedTotal = Math.round(totalPercentage * 100) / 100;
			if (Math.abs(roundedTotal - 100) > 0.01) {
				errors.percentageTotal = `Total persentase kategori harus tepat 100%. Saat ini ${roundedTotal}%.`;
			}
		}
	}

	if (Object.keys(errors).length > 0) {
		return { isValid: false, errors };
	}

	const sanitizedCategories: CategoryTemplateInputItem[] = input.categories.map((c) => ({
		name: c.name.trim(),
		percentage: Math.round(Number(c.percentage) * 100) / 100,
		isSavings: Boolean(c.isSavings)
	}));

	return {
		isValid: true,
		errors: {},
		sanitizedData: {
			name: trimmedName,
			description: trimmedDescription,
			categories: sanitizedCategories
		}
	};
}
