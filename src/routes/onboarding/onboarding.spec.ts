import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSaveOnboarding = vi.fn();
const mockGetUserSettings = vi.fn();
const mockGetIncomeSources = vi.fn();
const mockGetCategoryTemplates = vi.fn();
const mockCompleteOnboarding = vi.fn();

vi.mock('#lib/server/db/onboarding.js', () => ({
	saveOnboardingStep1And2: (...args: unknown[]) => mockSaveOnboarding(...args),
	getUserSettings: (...args: unknown[]) => mockGetUserSettings(...args),
	getIncomeSources: (...args: unknown[]) => mockGetIncomeSources(...args),
	getCategoryTemplates: (...args: unknown[]) => mockGetCategoryTemplates(...args),
	completeOnboarding: (...args: unknown[]) => mockCompleteOnboarding(...args)
}));

import { load, actions } from './+page.server';

describe('Onboarding Route Server (+page.server.ts)', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('loads existing user settings, income sources, and category templates', async () => {
		mockGetUserSettings.mockResolvedValue({ payDay: 25, language: 'id', theme: 'light' });
		mockGetIncomeSources.mockResolvedValue([{ id: 'inc_1', name: 'Gaji', amount: 5000000 }]);
		mockGetCategoryTemplates.mockResolvedValue([
			{
				id: 't1',
				name: '50/30/20',
				description: 'Desc',
				categories: [{ name: 'Kebutuhan', percentage: 50, isSavings: false }],
				isSystem: true
			}
		]);

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
			categoryTemplates: Array<{ id: string; name: string }>;
		};

		expect(result).toHaveProperty('user');
		expect(result).toHaveProperty('userSettings');
		expect(result).toHaveProperty('incomeSources');
		expect(result).toHaveProperty('categoryTemplates');
		expect(result.userSettings?.payDay).toBe(25);
		expect(result.incomeSources).toHaveLength(1);
		expect(result.categoryTemplates).toHaveLength(1);
		expect(result.categoryTemplates[0].name).toBe('50/30/20');
	});

	it('loads admin-created custom category templates for Onboarding step 3 selection', async () => {
		mockGetCategoryTemplates.mockResolvedValueOnce([
			{
				id: 'tpl_50_30_20',
				name: '50/30/20',
				description: 'Klasik',
				categories: [{ name: 'Kebutuhan', percentage: 50, isSavings: false }],
				isSystem: true,
				createdAt: new Date(),
				updatedAt: new Date()
			},
			{
				id: 'tpl_custom_admin_1',
				name: '80/20 Minimalis',
				description: 'Template kustom dari Admin',
				categories: [
					{ name: 'Living', percentage: 80, isSavings: false },
					{ name: 'Savings', percentage: 20, isSavings: true }
				],
				isSystem: false,
				createdAt: new Date(),
				updatedAt: new Date()
			}
		]);

		const mockEvent = {
			locals: {
				user: { id: 'u1', name: 'User 1', email: 'u1@test.com', onboardingCompleted: false }
			},
			platform: { env: { DB: {} as unknown as D1Database } }
		} as unknown as Parameters<typeof load>[0];

		const result = (await load(mockEvent)) as {
			categoryTemplates: Array<{ id: string; name: string; isSystem: boolean }>;
		};

		expect(result.categoryTemplates).toHaveLength(2);
		expect(result.categoryTemplates[1].name).toBe('80/20 Minimalis');
		expect(result.categoryTemplates[1].isSystem).toBe(false);
	});

	it('validates and rejects invalid payDay in form action', async () => {
		const formData = new FormData();
		formData.append('payDay', '35'); // Invalid > 31
		formData.append('incomeSources', JSON.stringify([{ name: 'Gaji', amount: 5000000 }]));
		formData.append(
			'categories',
			JSON.stringify([{ name: 'Kebutuhan', percentage: 100, isSavings: false }])
		);

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
		expect(mockCompleteOnboarding).not.toHaveBeenCalled();
	});

	it('validates and rejects empty income sources in form action', async () => {
		const formData = new FormData();
		formData.append('payDay', '25');
		formData.append('incomeSources', JSON.stringify([]));
		formData.append(
			'categories',
			JSON.stringify([{ name: 'Kebutuhan', percentage: 100, isSavings: false }])
		);

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
		expect(mockCompleteOnboarding).not.toHaveBeenCalled();
	});

	it('validates and rejects categories with total percentage not 100%', async () => {
		const formData = new FormData();
		formData.append('payDay', '25');
		formData.append('incomeSources', JSON.stringify([{ name: 'Gaji', amount: 5000000 }]));
		formData.append(
			'categories',
			JSON.stringify([
				{ name: 'Kebutuhan', percentage: 50, isSavings: false },
				{ name: 'Keinginan', percentage: 30, isSavings: false }
			])
		);

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
		expect(actionResult?.data?.errorMessage).toContain('Total persentase harus tepat 100%');
		expect(mockCompleteOnboarding).not.toHaveBeenCalled();
	});

	it('saves valid payDay, income sources, and categories via completeOnboarding and redirects to /dashboard', async () => {
		const formData = new FormData();
		formData.append('payDay', '25');
		formData.append(
			'incomeSources',
			JSON.stringify([
				{ name: 'Gaji Pokok', amount: 10000000 },
				{ name: 'Freelance', amount: 3000000 }
			])
		);
		formData.append(
			'categories',
			JSON.stringify([
				{ name: 'Kebutuhan', percentage: 50, isSavings: false },
				{ name: 'Keinginan', percentage: 30, isSavings: false },
				{ name: 'Tabungan & Investasi', percentage: 20, isSavings: true }
			])
		);

		mockCompleteOnboarding.mockResolvedValue({ success: true, periodId: 'p-1' });

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

		expect(mockCompleteOnboarding).toHaveBeenCalledWith(
			expect.anything(),
			'u1',
			expect.objectContaining({
				payDay: 25,
				incomeSources: [
					{ name: 'Gaji Pokok', amount: 10000000 },
					{ name: 'Freelance', amount: 3000000 }
				],
				categories: [
					{ name: 'Kebutuhan', percentage: 50, isSavings: false },
					{ name: 'Keinginan', percentage: 30, isSavings: false },
					{ name: 'Tabungan & Investasi', percentage: 20, isSavings: true }
				]
			})
		);
	});

	it('handles onboarding load gracefully when platform is undefined', async () => {
		const mockEvent = {
			locals: {
				user: { id: 'u1', name: 'User 1', email: 'u1@test.com', onboardingCompleted: false }
			},
			platform: undefined
		} as unknown as Parameters<typeof load>[0];

		const result = (await load(mockEvent)) as {
			user: unknown;
			userSettings: unknown;
			incomeSources: unknown[];
			categoryTemplates: unknown[];
		};

		expect(result.user).toBeDefined();
		expect(result.userSettings).toBeNull();
		expect(result.incomeSources).toEqual([]);
		expect(result.categoryTemplates).toEqual([]);
	});

	it('returns 500 fail when database is missing upon submitting actions.default', async () => {
		const formData = new FormData();
		formData.append('payDay', '25');
		formData.append('incomeSources', JSON.stringify([{ name: 'Gaji Pokok', amount: 10000000 }]));
		formData.append(
			'categories',
			JSON.stringify([{ name: 'Kebutuhan', percentage: 100, isSavings: false }])
		);

		const mockEvent = {
			locals: {
				user: { id: 'u1', name: 'User 1', email: 'u1@test.com', onboardingCompleted: false }
			},
			request: {
				formData: vi.fn().mockResolvedValue(formData)
			},
			platform: undefined
		} as unknown as Parameters<NonNullable<typeof actions.default>>[0];

		const result = (await actions.default(mockEvent)) as {
			status: number;
			data: { errorMessage: string };
		};

		expect(result?.status).toBe(500);
		expect(result?.data?.errorMessage).toBe(
			'Database tidak tersedia. Silakan hubungi administrator.'
		);
	});
});
