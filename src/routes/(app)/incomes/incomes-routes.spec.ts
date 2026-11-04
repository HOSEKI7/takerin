import { describe, it, expect, vi } from 'vitest';
import { load, actions } from './+page.server.js';
import * as periodDb from '#lib/server/db/period.js';
import * as onboardingDb from '#lib/server/db/onboarding.js';
import * as incomeValidation from '#lib/validation/income.js';

describe('Incomes Route Server Logic (Seam 3)', () => {
	describe('load', () => {
		it('redirects to login when unauthenticated', async () => {
			await expect(
				load({
					locals: { user: null },
					platform: { env: { DB: {} as unknown as D1Database } }
				} as unknown as Parameters<typeof load>[0])
			).rejects.toMatchObject({
				status: 303,
				location: '/auth/login'
			});
		});

		it('returns empty and locked state when user has no active period', async () => {
			const result = await load({
				locals: { user: { id: 'u1' }, activePeriod: null },
				platform: { env: { DB: {} as unknown as D1Database } }
			} as unknown as Parameters<typeof load>[0]);

			expect(result).toMatchObject({
				activePeriod: null,
				incomeSources: [],
				isLocked: true,
				lockReason: 'no_active_period'
			});
		});

		it('loads income sources and evaluates unlocked state when H-1 has not passed', async () => {
			vi.spyOn(onboardingDb, 'getIncomeSources').mockResolvedValueOnce([
				{
					id: 's1',
					userId: 'u1',
					periodId: 'p1',
					name: 'Gaji Pokok',
					amount: 10000000,
					createdAt: new Date(),
					updatedAt: new Date()
				}
			]);

			const activePeriod = {
				id: 'p1',
				userId: 'u1',
				startDate: '2026-10-01',
				endDate: '2099-10-31', // Future date
				payDay: 1,
				totalIncome: 10000000,
				status: 'active' as const,
				aiSummary: null,
				incomeConfirmedAt: new Date(),
				createdAt: new Date()
			};

			const result = (await load({
				locals: { user: { id: 'u1' }, activePeriod },
				platform: { env: { DB: {} as unknown as D1Database } }
			} as unknown as Parameters<typeof load>[0]))!;

			expect(result.activePeriod).toEqual(activePeriod);
			expect(result.incomeSources).toHaveLength(1);
			expect(result.incomeSources[0]).toMatchObject({ id: 's1', name: 'Gaji Pokok', amount: 10000000 });
			expect(result.isLocked).toBe(false);
		});

		it('evaluates locked state when H-1 cutoff has passed', async () => {
			vi.spyOn(onboardingDb, 'getIncomeSources').mockResolvedValueOnce([
				{
					id: 's1',
					userId: 'u1',
					periodId: 'p1',
					name: 'Gaji Pokok',
					amount: 5000000,
					createdAt: new Date(),
					updatedAt: new Date()
				}
			]);

			const activePeriod = {
				id: 'p1',
				userId: 'u1',
				startDate: '2026-09-01',
				endDate: '2026-09-30', // Past date
				payDay: 1,
				totalIncome: 5000000,
				status: 'active' as const,
				aiSummary: null,
				incomeConfirmedAt: new Date(),
				createdAt: new Date()
			};

			const result = (await load({
				locals: { user: { id: 'u1' }, activePeriod },
				platform: { env: { DB: {} as unknown as D1Database } }
			} as unknown as Parameters<typeof load>[0]))!;

			expect(result.isLocked).toBe(true);
			expect(result.lockReason).toBe('h_minus_1_passed');
		});
	});

	describe('actions.saveIncomes', () => {
		it('redirects to login when unauthenticated', async () => {
			const request = new Request('http://localhost', { method: 'POST' });
			await expect(
				actions.saveIncomes({
					locals: { user: null },
					platform: { env: { DB: {} as unknown as D1Database } },
					request
				} as unknown as Parameters<typeof actions.saveIncomes>[0])
			).rejects.toMatchObject({
				status: 303,
				location: '/auth/login'
			});
		});

		it('returns 500 when database is unavailable (supporting bilingual messages)', async () => {
			const formData = new FormData();
			formData.append('sources', JSON.stringify([{ name: 'Gaji', amount: 5000000 }]));
			const request = new Request('http://localhost', { method: 'POST', body: formData });

			const resultId = await actions.saveIncomes({
				locals: { user: { id: 'u1' } },
				platform: { env: { DB: null as unknown as D1Database } },
				request,
				cookies: { get: () => 'id' }
			} as unknown as Parameters<typeof actions.saveIncomes>[0]);

			expect(resultId).toMatchObject({
				status: 500,
				data: { error: 'Database tidak tersedia.' }
			});

			const resultEn = await actions.saveIncomes({
				locals: { user: { id: 'u1' } },
				platform: { env: { DB: null as unknown as D1Database } },
				request,
				cookies: { get: () => 'en' }
			} as unknown as Parameters<typeof actions.saveIncomes>[0]);

			expect(resultEn).toMatchObject({
				status: 500,
				data: { error: 'Database is unavailable.' }
			});
		});

		it('returns 400 when there is no active period (supporting bilingual messages)', async () => {
			const formData = new FormData();
			formData.append('sources', JSON.stringify([{ name: 'Gaji', amount: 5000000 }]));
			const request = new Request('http://localhost', { method: 'POST', body: formData });

			const resultId = await actions.saveIncomes({
				locals: { user: { id: 'u1' }, activePeriod: null },
				platform: { env: { DB: {} as unknown as D1Database } },
				request,
				cookies: { get: () => 'id' }
			} as unknown as Parameters<typeof actions.saveIncomes>[0]);

			expect(resultId).toMatchObject({
				status: 400,
				data: { error: 'Periode Bulan tidak aktif atau tidak ditemukan.' }
			});

			const resultEn = await actions.saveIncomes({
				locals: { user: { id: 'u1' }, activePeriod: null },
				platform: { env: { DB: {} as unknown as D1Database } },
				request,
				cookies: { get: () => 'en' }
			} as unknown as Parameters<typeof actions.saveIncomes>[0]);

			expect(resultEn).toMatchObject({
				status: 400,
				data: { error: 'Active Monthly Period not found or inactive.' }
			});
		});

		it('returns 400 when period is locked due to H-1 cutoff', async () => {
			const activePeriod = {
				id: 'p1',
				userId: 'u1',
				startDate: '2026-09-01',
				endDate: '2026-09-30', // Past H-1 date
				payDay: 1,
				totalIncome: 5000000,
				status: 'active' as const,
				aiSummary: null,
				incomeConfirmedAt: new Date(),
				createdAt: new Date()
			};

			const formData = new FormData();
			formData.append('sources', JSON.stringify([{ name: 'Gaji', amount: 6000000 }]));
			const request = new Request('http://localhost', { method: 'POST', body: formData });

			const result = await actions.saveIncomes({
				locals: { user: { id: 'u1' }, activePeriod },
				platform: { env: { DB: {} as unknown as D1Database } },
				request,
				cookies: { get: () => 'id' }
			} as unknown as Parameters<typeof actions.saveIncomes>[0]);

			expect(result).toMatchObject({
				status: 400,
				data: expect.objectContaining({
					error: 'Sumber Pemasukan hanya boleh diubah sebelum 1 hari sebelum Tanggal Gajian berikutnya.'
				})
			});

			const resultEn = await actions.saveIncomes({
				locals: { user: { id: 'u1' }, activePeriod },
				platform: { env: { DB: {} as unknown as D1Database } },
				request,
				cookies: { get: () => 'en' }
			} as unknown as Parameters<typeof actions.saveIncomes>[0]);

			expect(resultEn).toMatchObject({
				status: 400,
				data: expect.objectContaining({
					error: 'Income sources can only be changed before 1 day prior to the next payday.'
				})
			});
		});

		it('returns 400 when sources data is malformed JSON or empty', async () => {
			const activePeriod = {
				id: 'p1',
				userId: 'u1',
				startDate: '2026-10-01',
				endDate: '2099-10-31',
				payDay: 1,
				totalIncome: 5000000,
				status: 'active' as const,
				aiSummary: null,
				incomeConfirmedAt: new Date(),
				createdAt: new Date()
			};

			const createRequest = () => {
				const formData = new FormData();
				formData.append('sources', 'not-valid-json');
				return new Request('http://localhost', { method: 'POST', body: formData });
			};

			const result = await actions.saveIncomes({
				locals: { user: { id: 'u1' }, activePeriod },
				platform: { env: { DB: {} as unknown as D1Database } },
				request: createRequest(),
				cookies: { get: () => 'id' }
			} as unknown as Parameters<typeof actions.saveIncomes>[0]);

			expect(result).toMatchObject({
				status: 400,
				data: expect.objectContaining({ error: 'Format data Sumber Pemasukan tidak valid.' })
			});

			const resultEn = await actions.saveIncomes({
				locals: { user: { id: 'u1' }, activePeriod },
				platform: { env: { DB: {} as unknown as D1Database } },
				request: createRequest(),
				cookies: { get: () => 'en' }
			} as unknown as Parameters<typeof actions.saveIncomes>[0]);

			expect(resultEn).toMatchObject({
				status: 400,
				data: expect.objectContaining({ error: 'Invalid income sources data format.' })
			});
		});

		it('returns 400 when validation fails (e.g. empty name)', async () => {
			const activePeriod = {
				id: 'p1',
				userId: 'u1',
				startDate: '2026-10-01',
				endDate: '2099-10-31',
				payDay: 1,
				totalIncome: 5000000,
				status: 'active' as const,
				aiSummary: null,
				incomeConfirmedAt: new Date(),
				createdAt: new Date()
			};

			const createRequest = () => {
				const formData = new FormData();
				formData.append('sources', JSON.stringify([{ name: '   ', amount: 5000000 }]));
				return new Request('http://localhost', { method: 'POST', body: formData });
			};

			const result = await actions.saveIncomes({
				locals: { user: { id: 'u1' }, activePeriod },
				platform: { env: { DB: {} as unknown as D1Database } },
				request: createRequest(),
				cookies: { get: () => 'id' }
			} as unknown as Parameters<typeof actions.saveIncomes>[0]);

			expect(result).toMatchObject({
				status: 400,
				data: expect.objectContaining({ error: 'Nama Sumber Pemasukan tidak boleh kosong.' })
			});

			const resultEn = await actions.saveIncomes({
				locals: { user: { id: 'u1' }, activePeriod },
				platform: { env: { DB: {} as unknown as D1Database } },
				request: createRequest(),
				cookies: { get: () => 'en' }
			} as unknown as Parameters<typeof actions.saveIncomes>[0]);

			expect(resultEn).toMatchObject({
				status: 400,
				data: expect.objectContaining({ error: 'Income source name cannot be empty.' })
			});
		});

		it('atomically saves valid sources and returns success with updated totalIncome', async () => {
			const activePeriod = {
				id: 'p1',
				userId: 'u1',
				startDate: '2026-10-01',
				endDate: '2099-10-31',
				payDay: 1,
				totalIncome: 5000000,
				status: 'active' as const,
				aiSummary: null,
				incomeConfirmedAt: new Date(),
				createdAt: new Date()
			};

			const confirmSpy = vi.spyOn(periodDb, 'confirmPeriodIncome').mockResolvedValueOnce({
				success: true,
				totalIncome: 12000000,
				incomeConfirmedAt: new Date()
			});

			const formData = new FormData();
			formData.append(
				'sources',
				JSON.stringify([
					{ name: 'Gaji Pokok', amount: 10000000 },
					{ name: 'Bonus', amount: 2000000 }
				])
			);
			const request = new Request('http://localhost', { method: 'POST', body: formData });

			const result = await actions.saveIncomes({
				locals: { user: { id: 'u1' }, activePeriod },
				platform: { env: { DB: {} as unknown as D1Database } },
				request,
				cookies: { get: () => 'id' }
			} as unknown as Parameters<typeof actions.saveIncomes>[0]);

			expect(confirmSpy).toHaveBeenCalledWith(
				expect.anything(),
				'u1',
				'p1',
				[
					{ name: 'Gaji Pokok', amount: 10000000 },
					{ name: 'Bonus', amount: 2000000 }
				]
			);
			expect(result).toEqual({ success: true, totalIncome: 12000000 });
		});
	});
});
