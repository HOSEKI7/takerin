import { fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types.js';
import {
	getAdminTemplates,
	createCategoryTemplate,
	updateCategoryTemplate,
	deleteCategoryTemplate
} from '#lib/server/db/admin.js';
import type { CategoryTemplateRecord } from '#lib/server/db/onboarding.js';
import type { CategoryTemplateInputItem } from '#lib/validation/admin.js';

export const load: PageServerLoad = async ({ platform }) => {
	let templates: CategoryTemplateRecord[] = [];

	if (platform?.env?.DB) {
		try {
			templates = await getAdminTemplates(platform.env.DB);
		} catch (err) {
			console.error('Error fetching admin templates:', err);
		}
	}

	return {
		templates
	};
};

export const actions: Actions = {
	createTemplate: async ({ request, platform }) => {
		if (!platform?.env?.DB) {
			return fail(500, { error: 'Database tidak tersedia.' });
		}

		const formData = await request.formData();
		const name = String(formData.get('name') || '').trim();
		const description = String(formData.get('description') || '').trim() || null;
		const categoriesRaw = String(formData.get('categories') || '[]');

		let categories: CategoryTemplateInputItem[];
		try {
			categories = JSON.parse(categoriesRaw);
		} catch {
			return fail(400, { error: 'Format data kategori tidak valid.' });
		}

		try {
			await createCategoryTemplate(platform.env.DB, {
				name,
				description,
				categories
			});
			return { success: true, message: 'Template berhasil dibuat.' };
		} catch (err) {
			const msg = err instanceof Error ? err.message : 'Gagal membuat template.';
			return fail(400, { error: msg });
		}
	},

	updateTemplate: async ({ request, platform }) => {
		if (!platform?.env?.DB) {
			return fail(500, { error: 'Database tidak tersedia.' });
		}

		const formData = await request.formData();
		const id = String(formData.get('id') || '').trim();
		const name = String(formData.get('name') || '').trim();
		const description = String(formData.get('description') || '').trim() || null;
		const categoriesRaw = String(formData.get('categories') || '[]');

		if (!id) {
			return fail(400, { error: 'ID template wajib diisi.' });
		}

		let categories: CategoryTemplateInputItem[];
		try {
			categories = JSON.parse(categoriesRaw);
		} catch {
			return fail(400, { error: 'Format data kategori tidak valid.' });
		}

		try {
			await updateCategoryTemplate(platform.env.DB, id, {
				name,
				description,
				categories
			});
			return { success: true, message: 'Template berhasil diperbarui.' };
		} catch (err) {
			const msg = err instanceof Error ? err.message : 'Gagal memperbarui template.';
			return fail(400, { error: msg });
		}
	},

	deleteTemplate: async ({ request, platform }) => {
		if (!platform?.env?.DB) {
			return fail(500, { error: 'Database tidak tersedia.' });
		}

		const formData = await request.formData();
		const id = String(formData.get('id') || '').trim();

		if (!id) {
			return fail(400, { error: 'ID template wajib disertakan.' });
		}

		try {
			await deleteCategoryTemplate(platform.env.DB, id);
			return { success: true, message: 'Template berhasil dihapus.' };
		} catch (err) {
			const msg = err instanceof Error ? err.message : 'Gagal menghapus template.';
			return fail(400, { error: msg });
		}
	}
};
