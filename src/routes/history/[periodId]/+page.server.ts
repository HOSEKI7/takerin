import type { PageServerLoad } from './$types.js';
import { redirect, error } from '@sveltejs/kit';
import { getCompletedPeriodDetail } from '#lib/server/db/history.js';

export const load: PageServerLoad = async ({ locals, platform, params }) => {
	if (!locals.user) {
		throw redirect(303, '/auth/login');
	}

	if (!platform?.env?.DB) {
		throw error(500, 'Database tidak tersedia.');
	}

	const detail = await getCompletedPeriodDetail(platform.env.DB, locals.user.id, params.periodId);

	if (!detail) {
		throw error(404, 'Periode Bulan tidak ditemukan.');
	}

	return {
		user: locals.user,
		period: detail.period,
		summary: detail.summary,
		categories: detail.categories,
		expenses: detail.expenses
	};
};
