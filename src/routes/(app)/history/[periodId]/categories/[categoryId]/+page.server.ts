import type { PageServerLoad } from './$types.js';
import { redirect, error } from '@sveltejs/kit';
import { getCompletedCategoryDetail } from '#lib/server/db/history.js';
import { getExpenses, countExpenses } from '#lib/server/db/expense.js';

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

	const [expenses, totalCount] = await Promise.all([
		getExpenses(platform.env.DB, {
			userId: locals.user.id,
			periodId: params.periodId,
			categoryId: params.categoryId,
			limit: 50,
			offset: 0
		}),
		countExpenses(platform.env.DB, {
			userId: locals.user.id,
			periodId: params.periodId,
			categoryId: params.categoryId
		})
	]);

	return {
		user: locals.user,
		period: overview.period,
		category: overview.category,
		expenses,
		totalCount
	};
};
