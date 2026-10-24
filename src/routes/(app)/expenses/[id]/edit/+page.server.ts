import type { PageServerLoad, Actions } from './$types.js';
import { redirect, fail, error } from '@sveltejs/kit';
import { getDashboardData } from '#lib/server/db/dashboard.js';
import {
	getExpenseById,
	updateExpense,
	getActivePeriodCategories
} from '#lib/server/db/expense.js';
import { validateExpenseInput } from '#lib/validation/expense.js';

export const load: PageServerLoad = async ({ locals, platform, params }) => {
	if (!locals.user) {
		throw redirect(303, '/auth/login');
	}

	if (!platform?.env?.DB) {
		throw error(500, 'Database tidak tersedia.');
	}

	const dashboardData = await getDashboardData(platform.env.DB, locals.user.id);
	if (!dashboardData.period) {
		throw redirect(303, '/dashboard');
	}

	const expenseItem = await getExpenseById(platform.env.DB, {
		id: params.id,
		userId: locals.user.id
	});

	if (!expenseItem) {
		throw error(404, 'Pengeluaran tidak ditemukan.');
	}

	const allCategories = await getActivePeriodCategories(platform.env.DB, {
		userId: locals.user.id,
		periodId: dashboardData.period.id,
		includeFrozen: true
	});

	const categories = allCategories.filter(
		(c) => c.status === 'active' || c.id === expenseItem.categoryId
	);

	return {
		expense: expenseItem,
		categories,
		categoriesWithBalance: dashboardData.categories,
		period: dashboardData.period
	};
};

export const actions: Actions = {
	default: async ({ locals, platform, params, request }) => {
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

		const expenseItem = await getExpenseById(platform.env.DB, {
			id: params.id,
			userId: locals.user.id
		});

		if (!expenseItem) {
			return fail(404, { error: 'Pengeluaran tidak ditemukan.' });
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
		if (
			!targetCategory ||
			(targetCategory.status !== 'active' && targetCategory.id !== expenseItem.categoryId)
		) {
			return fail(400, { error: 'Kategori tidak valid atau sudah dibekukan.' });
		}

		await updateExpense(platform.env.DB, {
			id: params.id,
			userId: locals.user.id,
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
