import type { PageServerLoad } from './$types.js';
import { redirect, error } from '@sveltejs/kit';
import { getCompletedCategoryDetail } from '#lib/server/db/history.js';

export const load: PageServerLoad = async ({ locals, platform, params }) => {
	if (!locals.user) {
		throw redirect(303, '/auth/login');
	}

	if (!platform?.env?.DB) {
		throw error(500, 'Database tidak tersedia.');
	}

	const overview = await getCompletedCategoryDetail(
		platform.env.DB,
		locals.user.id,
		params.periodId,
		params.categoryId
	);

	if (!overview) {
		throw error(404, 'Detail kategori riwayat tidak ditemukan.');
	}

	return {
		user: locals.user,
		period: overview.period,
		category: overview.category
	};
};
