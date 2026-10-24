import { describe, it, expect, vi } from 'vitest';
import { load } from './+layout.server.js';
import * as dbModule from '#lib/server/db/index.js';

describe('Root Layout Server Load (Seam 2)', () => {
	it('returns default language "id" when user is null and no cookie is set', async () => {
		const result = await load({
			locals: { user: null },
			platform: undefined,
			cookies: { get: vi.fn(() => undefined) }
		} as unknown as Parameters<typeof load>[0]);

		expect(result).toEqual({
			user: null,
			language: 'id'
		});
	});

	it('returns language from cookie when user is null', async () => {
		const result = await load({
			locals: { user: null },
			platform: undefined,
			cookies: { get: vi.fn((key: string) => (key === 'takerin_lang' ? 'en' : undefined)) }
		} as unknown as Parameters<typeof load>[0]);

		expect(result).toEqual({
			user: null,
			language: 'en'
		});
	});

	it('returns language from user_settings table when authenticated', async () => {
		const mockDb = {
			select: vi.fn().mockReturnValue({
				from: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						limit: vi.fn().mockResolvedValue([{ language: 'en' }])
					})
				})
			})
		};
		vi.spyOn(dbModule, 'getDb').mockReturnValue(
			mockDb as unknown as ReturnType<typeof dbModule.getDb>
		);

		const result = await load({
			locals: { user: { id: 'u1', name: 'User' } },
			platform: { env: { DB: {} as D1Database } },
			cookies: { get: vi.fn(() => undefined) }
		} as unknown as Parameters<typeof load>[0]);

		expect(result).toBeDefined();
		if (!result) throw new Error('Result expected');
		expect(result.language).toBe('en');
		expect(result.user).toEqual({ id: 'u1', name: 'User' });
	});
});
