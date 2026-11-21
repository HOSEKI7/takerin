import type { PageServerLoad, Actions } from './$types.js';
import { redirect, fail } from '@sveltejs/kit';
import { getDashboardData } from '#lib/server/db/dashboard.js';
import { getExpenses, countExpenses, deleteExpense } from '#lib/server/db/expense.js';
import { calculatePagination } from '#lib/pagination.js';

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
			totalCount: 0,
			allExpensesCount: 0,
			page: 1,
			limit: 15,
			totalPages: 1,
			hasMore: false,
			selectedCategory: ''
		};
	}

	const selectedCategory = url.searchParams.get('category') ?? '';
	const limit = 15;
	const pageParam = url.searchParams.get('page');
	const parsedPage = parseInt(pageParam ?? '1', 10);
	const isFirstPage = !parsedPage || parsedPage <= 1;

	// Fast-path: When activePeriod is known and requesting page 1, fetch dashboardData, counts, and expenses concurrently
	if (locals.activePeriod && isFirstPage) {
		const [dashboardData, counts, expenses] = await Promise.all([
			getDashboardData(platform.env.DB, locals.user.id, locals.activePeriod, {
				skipRecentExpenses: true
			}),
			Promise.all([
				countExpenses(platform.env.DB, {
					userId: locals.user.id,
					periodId: locals.activePeriod.id,
					categoryId: selectedCategory || undefined
				}),
				selectedCategory
					? countExpenses(platform.env.DB, {
							userId: locals.user.id,
							periodId: locals.activePeriod.id
						})
					: Promise.resolve(0)
			]),
			getExpenses(platform.env.DB, {
				userId: locals.user.id,
				periodId: locals.activePeriod.id,
				categoryId: selectedCategory || undefined,
				limit,
				offset: 0
			})
		]);

		if (!dashboardData.period) {
			throw redirect(303, '/dashboard');
		}

		const totalCount = counts[0];
		const rawAllCount = counts[1];
		const allExpensesCount = selectedCategory ? rawAllCount : totalCount;
		const pagination = calculatePagination({
			pageParam,
			totalCount,
			limit
		});

		return {
			period: dashboardData.period,
			summary: dashboardData.summary,
			categories: dashboardData.categories,
			expenses,
			totalCount,
			allExpensesCount,
			page: pagination.page,
			limit: pagination.limit,
			totalPages: pagination.totalPages,
			hasMore: pagination.hasMore,
			selectedCategory
		};
	}

	const dashboardData = await getDashboardData(
		platform.env.DB,
		locals.user.id,
		locals.activePeriod,
		{ skipRecentExpenses: true }
	);
	if (!dashboardData.period) {
		throw redirect(303, '/dashboard');
	}

	const [totalCount, rawAllCount] = await Promise.all([
		countExpenses(platform.env.DB, {
			userId: locals.user.id,
			periodId: dashboardData.period.id,
			categoryId: selectedCategory || undefined
		}),
		selectedCategory
			? countExpenses(platform.env.DB, {
					userId: locals.user.id,
					periodId: dashboardData.period.id
				})
			: Promise.resolve(0)
	]);

	const allExpensesCount = selectedCategory ? rawAllCount : totalCount;
	const pagination = calculatePagination({
		pageParam,
		totalCount,
		limit
	});

	const expenses = await getExpenses(platform.env.DB, {
		userId: locals.user.id,
		periodId: dashboardData.period.id,
		categoryId: selectedCategory || undefined,
		limit: pagination.limit,
		offset: pagination.offset
	});

	return {
		period: dashboardData.period,
		summary: dashboardData.summary,
		categories: dashboardData.categories,
		expenses,
		totalCount,
		allExpensesCount,
		page: pagination.page,
		limit: pagination.limit,
		totalPages: pagination.totalPages,
		hasMore: pagination.hasMore,
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
