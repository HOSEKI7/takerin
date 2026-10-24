import type { PageServerLoad, Actions } from './$types.js';
import { redirect, fail } from '@sveltejs/kit';
import { getDashboardData } from '#lib/server/db/dashboard.js';
import { getExpenses, deleteExpense } from '#lib/server/db/expense.js';

export const load: PageServerLoad = async ({ locals, platform, url }) => {
	if (!locals.user) {
		throw redirect(303, '/auth/login');
	}

	if (!platform?.env?.DB) {
		return {
			period: null,
			summary: null,
			categories: [],
			expenses: [],
			selectedCategory: ''
		};
	}

	const dashboardData = await getDashboardData(platform.env.DB, locals.user.id);
	if (!dashboardData.period) {
		throw redirect(303, '/dashboard');
	}

	const selectedCategory = url.searchParams.get('category') ?? '';

	const expenses = await getExpenses(platform.env.DB, {
		userId: locals.user.id,
		periodId: dashboardData.period.id,
		categoryId: selectedCategory || undefined
	});

	return {
		period: dashboardData.period,
		summary: dashboardData.summary,
		categories: dashboardData.categories,
		expenses,
		selectedCategory
	};
};

export const actions: Actions = {
	delete: async ({ locals, platform, request }) => {
		if (!locals.user) {
			throw redirect(303, '/auth/login');
		}

		if (!platform?.env?.DB) {
			return fail(500, { error: 'Database tidak tersedia.' });
		}

		const formData = await request.formData();
		const id = formData.get('id');

		if (typeof id !== 'string' || !id) {
			return fail(400, { error: 'ID pengeluaran tidak valid.' });
		}

		await deleteExpense(platform.env.DB, {
			id,
			userId: locals.user.id
		});

		return { success: true };
	}
};
