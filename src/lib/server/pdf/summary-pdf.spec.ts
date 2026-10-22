import { describe, it, expect } from 'vitest';
import { generatePeriodSummaryPdf } from './summary-pdf.js';
import type { CompletedPeriodDetail } from '#lib/server/db/history.js';

describe('PDF Generation Service (Seam 3)', () => {
	const samplePeriodDetail: CompletedPeriodDetail = {
		period: {
			id: 'period-test-123',
			startDate: '2026-09-25',
			endDate: '2026-10-24',
			payDay: 25,
			totalIncome: 10000000,
			status: 'completed',
			aiSummary:
				'Pengeluaran bulan ini sangat sehat! Anda berhasil menabung sesuai rencana dan menjaga pos makanan tetap terkendali.'
		},
		summary: {
			totalIncome: 10000000,
			totalSpent: 6500000,
			remaining: 3500000,
			spentPercentage: 65
		},
		categories: [
			{
				id: 'cat-1',
				name: 'Kebutuhan Pokok',
				percentage: 50,
				allocation: 5000000,
				spent: 4200000,
				balance: 800000,
				spentPercentage: 84,
				isSavings: false,
				status: 'active'
			},
			{
				id: 'cat-2',
				name: 'Tabungan Masa Depan',
				percentage: 20,
				allocation: 2000000,
				spent: 2000000,
				balance: 0,
				spentPercentage: 100,
				isSavings: true,
				status: 'active'
			},
			{
				id: 'cat-3',
				name: 'Langganan Lama',
				percentage: 10,
				allocation: 1000000,
				spent: 300000,
				balance: 700000,
				spentPercentage: 30,
				isSavings: false,
				status: 'frozen'
			}
		],
		aiAggregateData: {
			totalIncome: 10000000,
			totalSpent: 6500000,
			remaining: 3500000,
			spentPercentage: 65,
			categories: []
		}
	};

	it('generates a valid PDF Uint8Array for a completed period', async () => {
		const pdfBytes = await generatePeriodSummaryPdf(samplePeriodDetail, 'Budi Santoso');

		expect(pdfBytes).toBeInstanceOf(Uint8Array);
		expect(pdfBytes.length).toBeGreaterThan(500);

		// Check PDF header signature
		const header = new TextDecoder().decode(pdfBytes.slice(0, 5));
		expect(header).toBe('%PDF-');

		// Check PDF EOF marker near the end
		const tail = new TextDecoder().decode(pdfBytes.slice(-30));
		expect(tail).toContain('%%EOF');
	});

	it('generates valid PDF even without AI summary or user name', async () => {
		const minimalDetail: CompletedPeriodDetail = {
			...samplePeriodDetail,
			period: {
				...samplePeriodDetail.period,
				aiSummary: null
			}
		};

		const pdfBytes = await generatePeriodSummaryPdf(minimalDetail);
		expect(pdfBytes).toBeInstanceOf(Uint8Array);
		expect(pdfBytes.length).toBeGreaterThan(500);
	});
});
