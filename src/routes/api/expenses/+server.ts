import { json, type RequestHandler } from '@sveltejs/kit';
import { getExpenses, countExpenses } from '#lib/server/db/expense.js';
import { calculatePagination } from '#lib/pagination.js';

export const GET: RequestHandler = async ({ locals, platform, url }) => {
	if (!locals?.user) {
		return json({ error: 'Tidak terotentikasi' }, { status: 401 });
	}

	if (!platform?.env?.DB) {
		return json({ error: 'Database tidak tersedia' }, { status: 500 });
	}

	const periodId = url.searchParams.get('periodId') ?? locals.activePeriod?.id;
	if (!periodId) {
		return json({ error: 'Periode aktif tidak ditemukan' }, { status: 400 });
	}

	const categoryParam = url.searchParams.get('categoryId') || url.searchParams.get('category');
	const categoryId =
		categoryParam && categoryParam.trim().length > 0 ? categoryParam.trim() : undefined;

	const rawLimit = Number(url.searchParams.get('limit'));
	const defaultLimit = url.searchParams.has('page') ? 15 : 20;
	const limit =
		Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(Math.max(1, rawLimit), 100) : defaultLimit;

	if (url.searchParams.has('page')) {
		const totalCount = await countExpenses(platform.env.DB, {
			userId: locals.user.id,
			periodId,
			categoryId
		});

		const pagination = calculatePagination({
			pageParam: url.searchParams.get('page'),
			totalCount,
			limit
		});

		const expenses = await getExpenses(platform.env.DB, {
			userId: locals.user.id,
			periodId,
			categoryId,
			limit: pagination.limit,
			offset: pagination.offset
		});

		return json({
			expenses,
			totalCount,
			totalPages: pagination.totalPages,
			page: pagination.page,
			hasMore: pagination.hasMore,
			limit: pagination.limit,
			offset: pagination.offset
		});
	}

	// Offset-based path (parallel execution)
	const rawOffset = Number(url.searchParams.get('offset'));
	const offset = Number.isFinite(rawOffset) && rawOffset >= 0 ? rawOffset : 0;

	const [expenses, totalCount] = await Promise.all([
		getExpenses(platform.env.DB, {
			userId: locals.user.id,
			periodId,
			categoryId,
			limit,
			offset
		}),
		countExpenses(platform.env.DB, {
			userId: locals.user.id,
			periodId,
			categoryId
		})
	]);

	const totalPages = Math.max(1, Math.ceil(totalCount / limit));
	const page = Math.floor(offset / limit) + 1;
	const hasMore = offset + expenses.length < totalCount;

	return json({
		expenses,
		totalCount,
		totalPages,
		page,
		hasMore,
		limit,
		offset
	});
};
