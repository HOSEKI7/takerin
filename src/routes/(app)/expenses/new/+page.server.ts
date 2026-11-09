import type { PageServerLoad, Actions } from './$types.js';
import { redirect, fail } from '@sveltejs/kit';
import { getDashboardData } from '#lib/server/db/dashboard.js';
import { getActivePeriodCategories, createExpense, countExpenses } from '#lib/server/db/expense.js';
import { hasUserSubmittedFeedback } from '#lib/server/db/feedback.js';
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

		const targetCategory = dashboardData.categories.find(
			(c) => c.id === validation.data!.categoryId
		);
		if (!targetCategory || targetCategory.status !== 'active') {
			return fail(400, { error: 'Kategori tidak valid atau sudah dibekukan.' });
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

		try {
			const count = await countExpenses(platform.env.DB, {
				userId: locals.user.id,
				periodId: dashboardData.period.id
			});
			if (count === 5) {
				const hasSubmitted = await hasUserSubmittedFeedback(platform.env.DB, locals.user.id);
				if (!hasSubmitted) {
					throw redirect(303, '/expenses?reviewPrompt=true');
				}
			}
		} catch (err) {
			if (
				err &&
				typeof err === 'object' &&
				'status' in err &&
				(err as { status: number }).status === 303
			) {
				throw err;
			}
			console.error('Error evaluating review trigger on new expense:', err);
		}

		throw redirect(303, '/expenses');
	}
};
