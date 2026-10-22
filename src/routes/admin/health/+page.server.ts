import type { PageServerLoad } from './$types.js';
import { getSystemHealth, type SystemHealthData } from '#lib/server/db/admin.js';

export const load: PageServerLoad = async ({ platform }) => {
	let health: SystemHealthData = {
		totalD1RowsEstimate: 0,
		tableBreakdown: {
			user: 0,
			session: 0,
			monthlyPeriod: 0,
			category: 0,
			expense: 0,
			incomeSource: 0,
			categoryTemplate: 0,
			userSettings: 0,
			healthCheck: 0
		},
		aiCallsCount: 0,
		resendUsageLink: 'https://resend.com/emails',
		databaseStatus: 'healthy',
		databaseLatencyMs: 0
	};

	if (platform?.env?.DB) {
		try {
			health = await getSystemHealth(platform.env.DB);
		} catch (err) {
			console.error('Error fetching system health:', err);
			health.databaseStatus = 'degraded';
		}
	}

	return {
		health
	};
};
