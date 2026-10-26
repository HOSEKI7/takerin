import { type RequestHandler } from '@sveltejs/kit';
import { getAllUserExpensesForExport } from '#lib/server/db/settings.js';
import { formatExpensesCsv } from '#lib/validation/settings.js';
import { formatDateISO } from '#lib/validation/onboarding.js';

export const GET: RequestHandler = async (event) => {
	const { url, cookies, locals, platform } = event;
	if (!locals?.user) {
		return new Response('Tidak terotentikasi', { status: 401 });
	}

	if (!platform?.env?.DB) {
		return new Response('Database tidak tersedia', { status: 500 });
	}

	const cookieLocale = cookies?.get ? cookies.get('takerin_lang') : undefined;
	const queryLocale = url?.searchParams?.get ? url.searchParams.get('lang') : undefined;
	const locale: 'id' | 'en' =
		queryLocale === 'en' || (!queryLocale && cookieLocale === 'en') ? 'en' : 'id';

	const expenses = await getAllUserExpensesForExport(platform.env.DB, locals.user.id);
	const csvContent = formatExpensesCsv(expenses, locale);

	const prefix = locale === 'en' ? 'takerin-expenses' : 'takerin-pengeluaran';
	const filename = `${prefix}-${formatDateISO(new Date())}.csv`;

	return new Response(csvContent, {
		status: 200,
		headers: {
			'Content-Type': 'text/csv; charset=utf-8',
			'Content-Disposition': `attachment; filename="${filename}"`
		}
	});
};
