import type { PageServerLoad, Actions } from './$types.js';
import { redirect, fail } from '@sveltejs/kit';
import { getDashboardData } from '#lib/server/db/dashboard.js';
import { getActivePeriodCategories, createExpense } from '#lib/server/db/expense.js';
import { validateExpenseInput } from '#lib/validation/expense.js';

export const load: PageServerLoad = async ({ locals, platform }) => {
	if (!locals.user) {
		throw redirect(303, '/auth/login');
	}

	if (!platform?.env?.DB) {
		return {
			period: null,
			categories: [],
			allCategoriesWithBalance: []
		};
	}

	const dashboardData = await getDashboardData(platform.env.DB, locals.user.id);
	if (!dashboardData.period) {
		throw redirect(303, '/dashboard');
	}

	const selectableCategories = await getActivePeriodCategories(platform.env.DB, {
		userId: locals.user.id,
		periodId: dashboardData.period.id,
		includeFrozen: false
	});

	return {
		period: dashboardData.period,
		categories: selectableCategories,
		allCategoriesWithBalance: dashboardData.categories
	};
};

export const actions: Actions = {
	default: async ({ locals, platform, request }) => {
		if (!locals.user) {
			throw redirect(303, '/auth/login');
		}

		if (!platform?.env?.DB) {
			return fail(500, { error: 'Database tidak tersedia.' });
		}

		const dashboardData = await getDashboardData(platform.env.DB, locals.user.id);
		if (!dashboardData.period) {
			return fail(400, { error: 'Tidak ada Periode Bulan aktif.' });
		}

		const formData = await request.formData();
		const validation = validateExpenseInput({
			name: formData.get('name'),
			amount: formData.get('amount') ? Number(formData.get('amount')) : NaN,
			categoryId: formData.get('categoryId'),
			date: formData.get('date'),
			time: formData.get('time') || undefined,
			notes: formData.get('notes') || undefined
		});

		if (!validation.success || !validation.data) {
			return fail(400, { error: validation.error });
		}

		await createExpense(platform.env.DB, {
			userId: locals.user.id,
			periodId: dashboardData.period.id,
			categoryId: validation.data.categoryId,
			name: validation.data.name,
			amount: validation.data.amount,
			date: validation.data.date,
			time: validation.data.time,
			notes: validation.data.notes
		});

		throw redirect(303, '/expenses');
	}
};
