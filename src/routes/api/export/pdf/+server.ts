import { type RequestHandler } from '@sveltejs/kit';
import { getPeriodDetailForExport } from '#lib/server/db/settings.js';
import { generatePeriodSummaryPdf } from '#lib/server/pdf/summary-pdf.js';

export const GET: RequestHandler = async (event) => {
	const { url, cookies, locals, platform } = event;
	if (!locals?.user) {
		return new Response('Tidak terotentikasi', { status: 401 });
	}

	if (!platform?.env?.DB) {
		return new Response('Database tidak tersedia', { status: 500 });
	}

	const periodId = url?.searchParams?.get ? url.searchParams.get('periodId') : null;
	if (!periodId) {
		return new Response('Parameter periodId wajib disertakan.', { status: 400 });
	}

	const detail = await getPeriodDetailForExport(platform.env.DB, locals.user.id, periodId);
	if (!detail) {
		return new Response('Periode Bulan tidak ditemukan.', { status: 404 });
	}

	const cookieLocale = cookies?.get ? cookies.get('takerin_lang') : undefined;
	const queryLocale = url?.searchParams?.get ? url.searchParams.get('lang') : undefined;
	const locale: 'id' | 'en' =
		queryLocale === 'en' || (!queryLocale && cookieLocale === 'en') ? 'en' : 'id';

	const pdfBytes = await generatePeriodSummaryPdf(detail, locals.user.name, locale);

	const prefix = locale === 'en' ? 'takerin-period-summary' : 'takerin-ringkasan-periode';
	const filename = `${prefix}-${detail.period.startDate}-${detail.period.endDate}.pdf`;

	return new Response(pdfBytes as unknown as BodyInit, {
		status: 200,
		headers: {
			'Content-Type': 'application/pdf',
			'Content-Disposition': `attachment; filename="${filename}"`
		}
	});
};
