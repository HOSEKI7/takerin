import type { PageServerLoad } from './$types.js';
import { getAdminUsers, type AdminUserRecord } from '#lib/server/db/admin.js';

export const load: PageServerLoad = async ({ platform }) => {
	let users: AdminUserRecord[] = [];

	if (platform?.env?.DB) {
		try {
			users = await getAdminUsers(platform.env.DB);
		} catch (err) {
			console.error('Error fetching admin users:', err);
		}
	}

	return {
		users
	};
};
