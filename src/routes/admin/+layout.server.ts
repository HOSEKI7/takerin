import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types.js';

export const load: LayoutServerLoad = async ({ locals }) => {
	if (!locals.user) {
		throw redirect(303, '/auth/login');
	}

	if (locals.user.role !== 'admin') {
		throw redirect(303, '/dashboard');
	}

	return {
		user: locals.user
	};
};
