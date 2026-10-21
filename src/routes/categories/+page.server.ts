import type { PageServerLoad, Actions } from './$types.js';
import { redirect, fail } from '@sveltejs/kit';
import { getManageCategoriesData, updateCategoriesMidPeriod } from '#lib/server/db/category.js';
import {
	validateCategoryManagementInput,
	type ManagedCategoryInput
} from '#lib/validation/category.js';

export const load: PageServerLoad = async ({ locals, platform }) => {
	if (!locals.user) {
		throw redirect(303, '/auth/login');
	}

	if (!platform?.env?.DB) {
		return {
			period: null,
			activeCategories: [],
			frozenCategories: []
		};
	}

	const data = await getManageCategoriesData(platform.env.DB, locals.user.id);
	if (!data.period) {
		throw redirect(303, '/dashboard');
	}

	return {
		period: data.period,
		activeCategories: data.activeCategories,
		frozenCategories: data.frozenCategories
	};
};

export const actions: Actions = {
	default: async ({ locals, platform, request }) => {
		if (!locals.user) {
			throw redirect(303, '/auth/login');
		}

		if (!platform?.env?.DB) {
			return fail(500, { error: 'Database tidak tersedia.' });
		}

		const formData = await request.formData();
		const periodId = String(formData.get('periodId') || '');
		if (!periodId) {
			return fail(400, { error: 'ID Periode tidak valid.' });
		}

		let parsedCategories: ManagedCategoryInput[];
		try {
			const rawJson = String(formData.get('categories') || '[]');
			parsedCategories = JSON.parse(rawJson);
		} catch {
			return fail(400, { error: 'Format data kategori tidak valid.' });
		}

		let freezeCategoryIds: string[];
		try {
			const rawFreeze = String(formData.get('freezeCategoryIds') || '[]');
			freezeCategoryIds = JSON.parse(rawFreeze);
		} catch {
			freezeCategoryIds = [];
		}

		const validation = validateCategoryManagementInput(parsedCategories);
		if (!validation.success || !validation.data) {
			return fail(400, { error: validation.error || 'Validasi kategori gagal.' });
		}

		try {
			await updateCategoriesMidPeriod(platform.env.DB, {
				userId: locals.user.id,
				periodId,
				activeCategories: validation.data,
				freezeCategoryIds
			});

			return { success: true, message: 'Kategori berhasil diperbarui.' };
		} catch (err) {
			const message = err instanceof Error ? err.message : 'Gagal memperbarui kategori.';
			return fail(400, { error: message });
		}
	}
};
