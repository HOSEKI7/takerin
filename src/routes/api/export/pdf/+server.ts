import { type RequestHandler } from '@sveltejs/kit';
import { getPeriodDetailForExport } from '#lib/server/db/settings.js';
import { generatePeriodSummaryPdf } from '#lib/server/pdf/summary-pdf.js';

export const GET: RequestHandler = async ({ url, locals, platform }) => {
	if (!locals.user) {
		return new Response('Tidak terotentikasi', { status: 401 });
	}

	if (!platform?.env?.DB) {
		return new Response('Database tidak tersedia', { status: 500 });
	}

	const periodId = url.searchParams.get('periodId');
	if (!periodId) {
		return new Response('Parameter periodId wajib disertakan.', { status: 400 });
	}

	const detail = await getPeriodDetailForExport(platform.env.DB, locals.user.id, periodId);
	if (!detail) {
		return new Response('Periode Bulan tidak ditemukan.', { status: 404 });
	}

	const pdfBytes = await generatePeriodSummaryPdf(detail, locals.user.name);

	const filename = `takerin-ringkasan-periode-${detail.period.startDate}-${detail.period.endDate}.pdf`;

	return new Response(pdfBytes as unknown as BodyInit, {
		status: 200,
		headers: {
			'Content-Type': 'application/pdf',
			'Content-Disposition': `attachment; filename="${filename}"`
		}
	});
};
