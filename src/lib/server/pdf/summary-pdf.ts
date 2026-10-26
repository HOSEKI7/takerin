import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import type { CompletedPeriodDetail } from '#lib/server/db/history.js';
import { formatRupiah, formatDate, formatDateISO } from '#lib/validation/onboarding.js';

/**
 * Wraps text into lines that fit within a maximum width given a font and size.
 */
function wrapText(
	text: string,
	maxWidth: number,
	font: { widthOfTextAtSize: (t: string, s: number) => number },
	fontSize: number
): string[] {
	const words = text.split(/\s+/);
	const lines: string[] = [];
	let currentLine = '';

	for (const word of words) {
		const testLine = currentLine ? `${currentLine} ${word}` : word;
		const width = font.widthOfTextAtSize(testLine, fontSize);
		if (width <= maxWidth) {
			currentLine = testLine;
		} else {
			if (currentLine) lines.push(currentLine);
			currentLine = word;
		}
	}
	if (currentLine) {
		lines.push(currentLine);
	}
	return lines;
}

/**
 * Generates an official PDF report summarizing a monthly period.
 */
export async function generatePeriodSummaryPdf(
	periodDetail: CompletedPeriodDetail,
	userName: string = 'Pengguna',
	locale: 'id' | 'en' = 'id'
): Promise<Uint8Array> {
	const doc = await PDFDocument.create();
	const fontRegular = await doc.embedFont(StandardFonts.Helvetica);
	const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

	// A4 Dimensions: 595.28 x 841.89 points
	const pageWidth = 595.28;
	const pageHeight = 841.89;
	const margin = 40;
	const contentWidth = pageWidth - margin * 2;

	let page = doc.addPage([pageWidth, pageHeight]);
	let y = pageHeight - margin;

	// Brand Colors (from tokens.json: forest-ink #163300)
	const primaryColor = rgb(0.086, 0.2, 0.0);
	const grayText = rgb(0.35, 0.4, 0.38);
	const lightBg = rgb(0.95, 0.96, 0.94);
	const borderColor = rgb(0.85, 0.88, 0.85);

	// 1. Header
	page.drawText('TAKERIN', {
		x: margin,
		y,
		size: 20,
		font: fontBold,
		color: primaryColor
	});

	page.drawText(
		locale === 'en' ? 'Monthly Period Financial Summary' : 'Ringkasan Finansial Periode Bulan',
		{
			x: margin,
			y: y - 18,
			size: 11,
			font: fontRegular,
			color: grayText
		}
	);

	y -= 32;

	// Horizontal Rule
	page.drawLine({
		start: { x: margin, y },
		end: { x: margin + contentWidth, y },
		thickness: 1,
		color: borderColor
	});

	y -= 20;

	// 2. Info Meta
	const startDateFormatted = formatDate(periodDetail.period.startDate, locale);
	const endDateFormatted = formatDate(periodDetail.period.endDate, locale);
	const resolvedUserName = userName || (locale === 'en' ? 'User' : 'Pengguna');

	page.drawText(
		locale === 'en' ? `User Name : ${resolvedUserName}` : `Nama Pengguna : ${resolvedUserName}`,
		{
			x: margin,
			y,
			size: 10,
			font: fontBold,
			color: primaryColor
		}
	);

	y -= 14;

	page.drawText(
		locale === 'en'
			? `Monthly Period : ${startDateFormatted} to ${endDateFormatted}`
			: `Periode Bulan    : ${startDateFormatted} s/d ${endDateFormatted}`,
		{
			x: margin,
			y,
			size: 10,
			font: fontRegular,
			color: primaryColor
		}
	);

	y -= 14;

	const statusLabel =
		periodDetail.period.status === 'active'
			? locale === 'en'
				? 'Active'
				: 'Aktif'
			: locale === 'en'
				? 'Completed'
				: 'Selesai';

	page.drawText(
		locale === 'en'
			? `Pay Day : ${periodDetail.period.payDay} | Status: ${statusLabel}`
			: `Tanggal Gajian   : ${periodDetail.period.payDay} | Status: ${statusLabel}`,
		{
			x: margin,
			y,
			size: 10,
			font: fontRegular,
			color: grayText
		}
	);

	y -= 24;

	// 3. Financial Overview Summary Box
	const boxHeight = 60;
	page.drawRectangle({
		x: margin,
		y: y - boxHeight,
		width: contentWidth,
		height: boxHeight,
		color: lightBg,
		borderColor,
		borderWidth: 1
	});

	const colWidth = contentWidth / 3;

	// Col 1: Pemasukan
	page.drawText(locale === 'en' ? 'Total Income' : 'Total Pemasukan', {
		x: margin + 12,
		y: y - 18,
		size: 9,
		font: fontRegular,
		color: grayText
	});
	page.drawText(formatRupiah(periodDetail.summary.totalIncome), {
		x: margin + 12,
		y: y - 36,
		size: 13,
		font: fontBold,
		color: primaryColor
	});

	// Col 2: Pengeluaran
	page.drawText(
		locale === 'en'
			? `Total Spent (${periodDetail.summary.spentPercentage}%)`
			: `Total Terpakai (${periodDetail.summary.spentPercentage}%)`,
		{
			x: margin + colWidth + 12,
			y: y - 18,
			size: 9,
			font: fontRegular,
			color: grayText
		}
	);
	page.drawText(formatRupiah(periodDetail.summary.totalSpent), {
		x: margin + colWidth + 12,
		y: y - 36,
		size: 13,
		font: fontBold,
		color: rgb(0.75, 0.15, 0.15)
	});

	// Col 3: Sisa Saldo
	page.drawText(locale === 'en' ? 'Remaining Balance' : 'Sisa Saldo', {
		x: margin + colWidth * 2 + 12,
		y: y - 18,
		size: 9,
		font: fontRegular,
		color: grayText
	});
	page.drawText(formatRupiah(periodDetail.summary.remaining), {
		x: margin + colWidth * 2 + 12,
		y: y - 36,
		size: 13,
		font: fontBold,
		color: periodDetail.summary.remaining >= 0 ? primaryColor : rgb(0.85, 0.1, 0.1)
	});

	y -= boxHeight + 28;

	// 4. Category Breakdown Table
	page.drawText(
		locale === 'en' ? 'Budget Category Breakdown' : 'Rincian Kategori Budget',
		{
			x: margin,
			y,
			size: 12,
			font: fontBold,
			color: primaryColor
		}
	);

	y -= 14;

	// Table Header
	page.drawRectangle({
		x: margin,
		y: y - 18,
		width: contentWidth,
		height: 20,
		color: rgb(0.9, 0.93, 0.9)
	});

	const colX = {
		name: margin + 6,
		persen: margin + 150,
		alokasi: margin + 210,
		terpakai: margin + 300,
		sisa: margin + 390,
		status: margin + 465
	};

	page.drawText(locale === 'en' ? 'Category' : 'Kategori', {
		x: colX.name,
		y: y - 14,
		size: 8,
		font: fontBold,
		color: primaryColor
	});
	page.drawText(locale === 'en' ? 'Percent' : 'Persen', {
		x: colX.persen,
		y: y - 14,
		size: 8,
		font: fontBold,
		color: primaryColor
	});
	page.drawText(locale === 'en' ? 'Allocation' : 'Alokasi', {
		x: colX.alokasi,
		y: y - 14,
		size: 8,
		font: fontBold,
		color: primaryColor
	});
	page.drawText(locale === 'en' ? 'Spent' : 'Terpakai', {
		x: colX.terpakai,
		y: y - 14,
		size: 8,
		font: fontBold,
		color: primaryColor
	});
	page.drawText(locale === 'en' ? 'Remaining' : 'Sisa Saldo', {
		x: colX.sisa,
		y: y - 14,
		size: 8,
		font: fontBold,
		color: primaryColor
	});
	page.drawText(locale === 'en' ? 'Status' : 'Status', {
		x: colX.status,
		y: y - 14,
		size: 8,
		font: fontBold,
		color: primaryColor
	});

	y -= 22;

	// Table Rows
	for (const cat of periodDetail.categories) {
		if (y < 80) {
			page = doc.addPage([pageWidth, pageHeight]);
			y = pageHeight - margin;
		}

		const isEven = periodDetail.categories.indexOf(cat) % 2 === 0;
		if (isEven) {
			page.drawRectangle({
				x: margin,
				y: y - 14,
				width: contentWidth,
				height: 18,
				color: rgb(0.98, 0.98, 0.98)
			});
		}

		page.drawText(cat.name.slice(0, 26), {
			x: colX.name,
			y: y - 10,
			size: 8,
			font: fontRegular,
			color: primaryColor
		});
		page.drawText(`${cat.percentage}%`, {
			x: colX.persen,
			y: y - 10,
			size: 8,
			font: fontRegular,
			color: grayText
		});
		page.drawText(formatRupiah(cat.allocation), {
			x: colX.alokasi,
			y: y - 10,
			size: 8,
			font: fontRegular,
			color: primaryColor
		});
		page.drawText(formatRupiah(cat.spent), {
			x: colX.terpakai,
			y: y - 10,
			size: 8,
			font: fontRegular,
			color: primaryColor
		});
		page.drawText(formatRupiah(cat.balance), {
			x: colX.sisa,
			y: y - 10,
			size: 8,
			font: fontRegular,
			color: cat.balance >= 0 ? primaryColor : rgb(0.8, 0.1, 0.1)
		});

		const statusText =
			cat.status === 'frozen'
				? locale === 'en'
					? 'Frozen'
					: 'Dibekukan'
				: cat.isSavings
					? locale === 'en'
						? 'Savings'
						: 'Tabungan'
					: locale === 'en'
						? 'Active'
						: 'Aktif';
		page.drawText(statusText, {
			x: colX.status,
			y: y - 10,
			size: 8,
			font: fontRegular,
			color: cat.status === 'frozen' ? rgb(0.5, 0.5, 0.5) : primaryColor
		});

		y -= 18;
	}

	y -= 20;

	// 5. AI Summary Section
	if (periodDetail.period.aiSummary) {
		if (y < 120) {
			page = doc.addPage([pageWidth, pageHeight]);
			y = pageHeight - margin;
		}

		page.drawText(
			locale === 'en'
				? 'Financial Notes & Expense Analysis'
				: 'Catatan Finansial & Analisis Pengeluaran',
			{
				x: margin,
				y,
				size: 11,
				font: fontBold,
				color: primaryColor
			}
		);

		y -= 14;

		let resolvedAiSummary = periodDetail.period.aiSummary.trim();
		if (resolvedAiSummary.startsWith('{') && resolvedAiSummary.endsWith('}')) {
			try {
				const parsed = JSON.parse(resolvedAiSummary);
				if (parsed && typeof parsed === 'object') {
					if (locale === 'en' && typeof parsed.en === 'string' && parsed.en) {
						resolvedAiSummary = parsed.en;
					} else if (typeof parsed.id === 'string' && parsed.id) {
						resolvedAiSummary = parsed.id;
					}
				}
			} catch {
				// use raw text
			}
		}

		const summaryLines = wrapText(resolvedAiSummary, contentWidth - 24, fontRegular, 9);
		const summaryBoxHeight = summaryLines.length * 14 + 18;

		page.drawRectangle({
			x: margin,
			y: y - summaryBoxHeight,
			width: contentWidth,
			height: summaryBoxHeight,
			color: lightBg,
			borderColor,
			borderWidth: 1
		});

		let lineY = y - 16;
		for (const line of summaryLines) {
			page.drawText(line, {
				x: margin + 12,
				y: lineY,
				size: 9,
				font: fontRegular,
				color: primaryColor
			});
			lineY -= 14;
		}
	}

	// Footer on every page
	const pageCount = doc.getPageCount();
	for (let i = 0; i < pageCount; i++) {
		const p = doc.getPage(i);
		const dateStr = formatDate(formatDateISO(new Date()), locale);
		const footerText =
			locale === 'en'
				? `Takerin | Printed on: ${dateStr} | Page ${i + 1} of ${pageCount}`
				: `Takerin | Dicetak pada: ${dateStr} | Halaman ${i + 1} dari ${pageCount}`;
		p.drawText(footerText, {
			x: margin,
			y: 25,
			size: 8,
			font: fontRegular,
			color: grayText
		});
	}

	return doc.save();
}
