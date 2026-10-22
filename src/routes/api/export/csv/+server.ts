import { type RequestHandler } from '@sveltejs/kit';
import { getAllUserExpensesForExport } from '#lib/server/db/settings.js';
import { formatExpensesCsv } from '#lib/validation/settings.js';
import { formatDateISO } from '#lib/validation/onboarding.js';

export const GET: RequestHandler = async ({ locals, platform }) => {
	if (!locals.user) {
		return new Response('Tidak terotentikasi', { status: 401 });
	}

	if (!platform?.env?.DB) {
		return new Response('Database tidak tersedia', { status: 500 });
	}

	const expenses = await getAllUserExpensesForExport(platform.env.DB, locals.user.id);
	const csvContent = formatExpensesCsv(expenses);

	const filename = `takerin-pengeluaran-${formatDateISO(new Date())}.csv`;

	return new Response(csvContent, {
		status: 200,
		headers: {
			'Content-Type': 'text/csv; charset=utf-8',
			'Content-Disposition': `attachment; filename="${filename}"`
		}
	});
};
