import { json, type RequestHandler } from '@sveltejs/kit';
import { getExpenses, countExpenses } from '#lib/server/db/expense.js';

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
	const limit =
		Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(Math.max(1, rawLimit), 100) : 20;

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

	const hasMore = offset + expenses.length < totalCount;

	return json({
		expenses,
		totalCount,
		hasMore,
		limit,
		offset
	});
};
