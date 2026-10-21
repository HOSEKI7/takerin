import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGetCompletedPeriods = vi.fn();
const mockGetCompletedPeriodDetail = vi.fn();
const mockSavePeriodAiSummary = vi.fn();
const mockGenerateAiSummary = vi.fn();

vi.mock('#lib/server/db/history.js', () => ({
	getCompletedPeriods: (...args: unknown[]) => mockGetCompletedPeriods(...args),
	getCompletedPeriodDetail: (...args: unknown[]) => mockGetCompletedPeriodDetail(...args),
	savePeriodAiSummary: (...args: unknown[]) => mockSavePeriodAiSummary(...args)
}));

vi.mock('#lib/server/ai/summary.js', () => ({
	generateAiSummary: (...args: unknown[]) => mockGenerateAiSummary(...args)
}));

import { load as loadHistoryList } from './+page.server.js';
import { load as loadHistoryDetail } from './[periodId]/+page.server.js';
import { POST as postAiSummary } from '../api/periods/[periodId]/ai-summary/+server.js';

describe('History Routes & API Handlers (Seam 3)', () => {
	const mockUser = {
		id: 'user-history-route-test',
		name: 'History Route Tester',
		email: 'history-route@example.com',
		emailVerified: true,
		createdAt: new Date(),
		updatedAt: new Date()
	};

	const mockD1 = {} as D1Database;

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('/history list page', () => {
		it('redirects unauthenticated user to /auth/login', async () => {
			const mockEvent = {
				locals: { user: null },
				platform: { env: { DB: mockD1 } }
			} as unknown as Parameters<typeof loadHistoryList>[0];

			await expect(loadHistoryList(mockEvent)).rejects.toMatchObject({
				status: 303,
				location: '/auth/login'
			});
		});

		it('loads completed periods list for authenticated user', async () => {
			const samplePeriods = [
				{
					id: 'p-1',
					startDate: '2026-01-25',
					endDate: '2026-02-24',
					payDay: 25,
					totalIncome: 10000000,
					totalSpent: 6000000,
					remaining: 4000000,
					spentPercentage: 60,
					aiSummary: 'Bulan ini hemat!',
					createdAt: new Date()
				}
			];
			mockGetCompletedPeriods.mockResolvedValue(samplePeriods);

			const mockEvent = {
				locals: { user: mockUser },
				platform: { env: { DB: mockD1 } }
			} as unknown as Parameters<typeof loadHistoryList>[0];

			const result = (await loadHistoryList(mockEvent)) as { periods: typeof samplePeriods };

			expect(result.periods).toEqual(samplePeriods);
			expect(mockGetCompletedPeriods).toHaveBeenCalledWith(mockD1, mockUser.id);
		});
	});

	describe('/history/[periodId] detail page', () => {
		it('redirects unauthenticated user to /auth/login', async () => {
			const mockEvent = {
				locals: { user: null },
				platform: { env: { DB: mockD1 } },
				params: { periodId: 'p-1' }
			} as unknown as Parameters<typeof loadHistoryDetail>[0];

			await expect(loadHistoryDetail(mockEvent)).rejects.toMatchObject({
				status: 303,
				location: '/auth/login'
			});
		});

		it('throws 404 error if period is not found', async () => {
			mockGetCompletedPeriodDetail.mockResolvedValue(null);

			const mockEvent = {
				locals: { user: mockUser },
				platform: { env: { DB: mockD1 } },
				params: { periodId: 'non-existent' }
			} as unknown as Parameters<typeof loadHistoryDetail>[0];

			await expect(loadHistoryDetail(mockEvent)).rejects.toMatchObject({
				status: 404
			});
		});

		it('loads completed period detail with categories and summary', async () => {
			const sampleDetail = {
				period: {
					id: 'p-1',
					startDate: '2026-01-25',
					endDate: '2026-02-24',
					payDay: 25,
					totalIncome: 10000000,
					status: 'completed',
					aiSummary: 'Hemat pol!'
				},
				summary: {
					totalIncome: 10000000,
					totalSpent: 5000000,
					remaining: 5000000,
					spentPercentage: 50
				},
				categories: [
					{
						id: 'c-1',
						name: 'Kebutuhan',
						percentage: 50,
						allocation: 5000000,
						spent: 4000000,
						balance: 1000000,
						spentPercentage: 80,
						remainingPercentage: 20,
						isSavings: false,
						status: 'active'
					}
				],
				expenses: [],
				aiAggregateData: {
					totalIncome: 10000000,
					totalSpent: 5000000,
					remaining: 5000000,
					spentPercentage: 50,
					categories: []
				}
			};

			mockGetCompletedPeriodDetail.mockResolvedValue(sampleDetail);

			const mockEvent = {
				locals: { user: mockUser },
				platform: { env: { DB: mockD1 } },
				params: { periodId: 'p-1' }
			} as unknown as Parameters<typeof loadHistoryDetail>[0];

			const result = (await loadHistoryDetail(mockEvent)) as typeof sampleDetail;

			expect(result.period.id).toBe('p-1');
			expect(result.categories).toHaveLength(1);
			expect(result.summary.totalSpent).toBe(5000000);
		});
	});

	describe('POST /api/periods/[periodId]/ai-summary', () => {
		it('returns 401 when user is not authenticated', async () => {
			const mockEvent = {
				locals: { user: null },
				platform: { env: { DB: mockD1 } },
				params: { periodId: 'p-1' }
			} as unknown as Parameters<typeof postAiSummary>[0];

			const res = await postAiSummary(mockEvent);
			expect(res.status).toBe(401);
		});

		it('returns cached aiSummary without calling AI if already present in DB', async () => {
			mockGetCompletedPeriodDetail.mockResolvedValue({
				period: {
					id: 'p-1',
					aiSummary: 'Sudah di-cache sebelumnya! ✨'
				},
				aiAggregateData: {}
			});

			const mockEvent = {
				locals: { user: mockUser },
				platform: { env: { DB: mockD1 } },
				params: { periodId: 'p-1' }
			} as unknown as Parameters<typeof postAiSummary>[0];

			const res = await postAiSummary(mockEvent);
			expect(res.status).toBe(200);
			const data = await res.json();
			expect(data).toEqual({
				aiSummary: 'Sudah di-cache sebelumnya! ✨',
				cached: true
			});
			expect(mockGenerateAiSummary).not.toHaveBeenCalled();
			expect(mockSavePeriodAiSummary).not.toHaveBeenCalled();
		});

		it('generates, saves, and returns aiSummary when not cached', async () => {
			mockGetCompletedPeriodDetail.mockResolvedValue({
				period: {
					id: 'p-1',
					aiSummary: null
				},
				aiAggregateData: {
					totalIncome: 10000000,
					totalSpent: 4000000,
					remaining: 6000000,
					spentPercentage: 40,
					categories: []
				}
			});

			mockGenerateAiSummary.mockResolvedValue('Bulan ini kamu hemat banget! 🔥');

			const mockEvent = {
				locals: { user: mockUser },
				platform: {
					env: {
						DB: mockD1,
						GROQ_API_KEY: 'gsk_test',
						GEMINI_API_KEY: 'gemini_test'
					}
				},
				params: { periodId: 'p-1' }
			} as unknown as Parameters<typeof postAiSummary>[0];

			const res = await postAiSummary(mockEvent);
			expect(res.status).toBe(200);
			const data = await res.json();
			expect(data).toEqual({
				aiSummary: 'Bulan ini kamu hemat banget! 🔥',
				cached: false
			});

			expect(mockGenerateAiSummary).toHaveBeenCalled();
			expect(mockSavePeriodAiSummary).toHaveBeenCalledWith(
				mockD1,
				'p-1',
				mockUser.id,
				'Bulan ini kamu hemat banget! 🔥'
			);
		});

		it('returns 502 when AI generation fails and does not save to DB', async () => {
			mockGetCompletedPeriodDetail.mockResolvedValue({
				period: {
					id: 'p-1',
					aiSummary: null
				},
				aiAggregateData: {
					totalIncome: 10000000,
					totalSpent: 4000000,
					remaining: 6000000,
					spentPercentage: 40,
					categories: []
				}
			});

			mockGenerateAiSummary.mockRejectedValue(new Error('AI Service Unavailable'));

			const mockEvent = {
				locals: { user: mockUser },
				platform: {
					env: {
						DB: mockD1,
						GROQ_API_KEY: 'gsk_test'
					}
				},
				params: { periodId: 'p-1' }
			} as unknown as Parameters<typeof postAiSummary>[0];

			const res = await postAiSummary(mockEvent);
			expect(res.status).toBe(502);
			const data = await res.json();
			expect(data).toHaveProperty('error');
			expect(mockSavePeriodAiSummary).not.toHaveBeenCalled();
		});
	});
});
