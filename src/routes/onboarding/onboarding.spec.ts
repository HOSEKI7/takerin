import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSaveOnboarding = vi.fn();
const mockGetUserSettings = vi.fn();
const mockGetIncomeSources = vi.fn();

vi.mock('#lib/server/db/onboarding.js', () => ({
	saveOnboardingStep1And2: (...args: unknown[]) => mockSaveOnboarding(...args),
	getUserSettings: (...args: unknown[]) => mockGetUserSettings(...args),
	getIncomeSources: (...args: unknown[]) => mockGetIncomeSources(...args)
}));

import { load, actions } from './+page.server';

describe('Onboarding Route Server (+page.server.ts)', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('loads existing user settings and income sources if available', async () => {
		mockGetUserSettings.mockResolvedValue({ payDay: 25, language: 'id', theme: 'light' });
		mockGetIncomeSources.mockResolvedValue([{ id: 'inc_1', name: 'Gaji', amount: 5000000 }]);

		const mockEvent = {
			locals: {
				user: { id: 'u1', name: 'User 1', email: 'u1@test.com', onboardingCompleted: false }
			},
			platform: { env: { DB: {} as unknown as D1Database } }
		} as unknown as Parameters<typeof load>[0];

		const result = (await load(mockEvent)) as {
			user: unknown;
			userSettings: { payDay: number; language: string; theme: string } | null;
			incomeSources: Array<{ id: string; name: string; amount: number }>;
		};

		expect(result).toHaveProperty('user');
		expect(result).toHaveProperty('userSettings');
		expect(result).toHaveProperty('incomeSources');
		expect(result.userSettings?.payDay).toBe(25);
		expect(result.incomeSources).toHaveLength(1);
	});

	it('validates and rejects invalid payDay in form action', async () => {
		const formData = new FormData();
		formData.append('payDay', '35'); // Invalid > 31
		formData.append('incomeSources', JSON.stringify([{ name: 'Gaji', amount: 5000000 }]));

		const mockEvent = {
			locals: {
				user: { id: 'u1', name: 'User 1', email: 'u1@test.com', onboardingCompleted: false }
			},
			request: {
				formData: vi.fn().mockResolvedValue(formData)
			},
			platform: { env: { DB: {} as unknown as D1Database } }
		} as unknown as Parameters<NonNullable<typeof actions.default>>[0];

		const actionResult = (await actions.default(mockEvent)) as {
			status: number;
			data: { errorMessage: string };
		};
		expect(actionResult?.status).toBe(400);
		expect(actionResult?.data).toHaveProperty('errorMessage');
		expect(mockSaveOnboarding).not.toHaveBeenCalled();
	});

	it('validates and rejects empty income sources in form action', async () => {
		const formData = new FormData();
		formData.append('payDay', '25');
		formData.append('incomeSources', JSON.stringify([]));

		const mockEvent = {
			locals: {
				user: { id: 'u1', name: 'User 1', email: 'u1@test.com', onboardingCompleted: false }
			},
			request: {
				formData: vi.fn().mockResolvedValue(formData)
			},
			platform: { env: { DB: {} as unknown as D1Database } }
		} as unknown as Parameters<NonNullable<typeof actions.default>>[0];

		const actionResult = (await actions.default(mockEvent)) as {
			status: number;
			data: { errorMessage: string };
		};
		expect(actionResult?.status).toBe(400);
		expect(actionResult?.data?.errorMessage).toContain(
			'Minimal harus menambahkan satu sumber pemasukan'
		);
		expect(mockSaveOnboarding).not.toHaveBeenCalled();
	});

	it('saves valid payDay and income sources and redirects to /dashboard', async () => {
		const formData = new FormData();
		formData.append('payDay', '25');
		formData.append(
			'incomeSources',
			JSON.stringify([
				{ name: 'Gaji Pokok', amount: 10000000 },
				{ name: 'Freelance', amount: 3000000 }
			])
		);

		mockSaveOnboarding.mockResolvedValue({ success: true });

		const mockEvent = {
			locals: {
				user: { id: 'u1', name: 'User 1', email: 'u1@test.com', onboardingCompleted: false }
			},
			request: {
				formData: vi.fn().mockResolvedValue(formData)
			},
			platform: { env: { DB: {} as unknown as D1Database } }
		} as unknown as Parameters<NonNullable<typeof actions.default>>[0];

		await expect(actions.default(mockEvent)).rejects.toMatchObject({
			status: 303,
			location: '/dashboard'
		});

		expect(mockSaveOnboarding).toHaveBeenCalledWith(
			expect.anything(),
			'u1',
			expect.objectContaining({
				payDay: 25,
				incomeSources: [
					{ name: 'Gaji Pokok', amount: 10000000 },
					{ name: 'Freelance', amount: 3000000 }
				]
			})
		);
	});
});
