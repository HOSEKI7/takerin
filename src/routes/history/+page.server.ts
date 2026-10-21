import type { PageServerLoad } from './$types.js';
import { redirect } from '@sveltejs/kit';
import { getCompletedPeriods } from '#lib/server/db/history.js';

export const load: PageServerLoad = async ({ locals, platform }) => {
	if (!locals.user) {
		throw redirect(303, '/auth/login');
	}

	if (!platform?.env?.DB) {
		return {
			user: locals.user,
			periods: []
		};
	}

	const periods = await getCompletedPeriods(platform.env.DB, locals.user.id);

	return {
		user: locals.user,
		periods
	};
};
