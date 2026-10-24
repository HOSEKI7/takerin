import type { PageServerLoad } from './$types.js';
import { redirect } from '@sveltejs/kit';
import { getDashboardData, calculateDashboardSummary } from '#lib/server/db/dashboard.js';

export const load: PageServerLoad = async ({ locals, platform }) => {
	if (!locals.user) {
		throw redirect(303, '/auth/login');
	}

	let dashboardData = {
		period: null as Awaited<ReturnType<typeof getDashboardData>>['period'],
		summary: calculateDashboardSummary(0, 0),
		categories: [] as Awaited<ReturnType<typeof getDashboardData>>['categories'],
		recentExpenses: [] as Awaited<ReturnType<typeof getDashboardData>>['recentExpenses']
	};

	if (platform?.env?.DB) {
		try {
			dashboardData = await getDashboardData(platform.env.DB, locals.user.id);
		} catch (err) {
			console.error('Failed to load dashboard data from D1:', err);
		}
	}

	return {
		user: locals.user,
		period: dashboardData.period,
		summary: dashboardData.summary,
		categories: dashboardData.categories,
		recentExpenses: dashboardData.recentExpenses
	};
};
