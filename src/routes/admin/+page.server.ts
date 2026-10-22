import type { PageServerLoad } from './$types.js';
import { getAdminAnalytics, type AdminAnalyticsData } from '#lib/server/db/admin.js';

export const load: PageServerLoad = async ({ platform }) => {
	let analytics: AdminAnalyticsData = {
		totalUsers: 0,
		dau: 0,
		totalExpenses: 0,
		totalExpenseAmount: 0,
		topCategories: []
	};

	if (platform?.env?.DB) {
		try {
			analytics = await getAdminAnalytics(platform.env.DB);
		} catch (err) {
			console.error('Error fetching admin analytics:', err);
		}
	}

	return {
		analytics
	};
};
