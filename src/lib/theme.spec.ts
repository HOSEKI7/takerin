import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
	getThemePreference,
	resolveTheme,
	setTheme,
	toggleTheme,
	THEME_STORAGE_KEY
} from './theme';

function createMockStorage(initialData: Record<string, string> = {}) {
	const storage: Record<string, string> = { ...initialData };
	return {
		storage,
		mock: {
			getItem: vi.fn((key: string) => storage[key] ?? null),
			setItem: vi.fn((key: string, val: string) => {
				storage[key] = val;
			}),
			removeItem: vi.fn((key: string) => {
				delete storage[key];
			})
		}
	};
}

describe('Theme Manager', () => {
	let classList: Set<string>;
	let mockDoc: {
		documentElement: {
			classList: {
				add: ReturnType<typeof vi.fn>;
				remove: ReturnType<typeof vi.fn>;
				contains: ReturnType<typeof vi.fn>;
			};
			style: {
				colorScheme: string;
			};
		};
	};

	beforeEach(() => {
		vi.restoreAllMocks();
		classList = new Set<string>();
		mockDoc = {
			documentElement: {
				classList: {
					add: vi.fn((cls: string) => classList.add(cls)),
					remove: vi.fn((cls: string) => classList.delete(cls)),
					contains: vi.fn((cls: string) => classList.has(cls))
				},
				style: {
					colorScheme: ''
				}
			}
		};

		vi.stubGlobal('document', mockDoc);
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('returns "system" by default when no preference is saved in localStorage', () => {
		const { mock } = createMockStorage();
		vi.stubGlobal('window', { localStorage: mock });

		expect(getThemePreference()).toBe('system');
	});

	it('returns saved theme preference when valid ("light" or "dark")', () => {
		const { mock: mockLight } = createMockStorage({ [THEME_STORAGE_KEY]: 'light' });
		vi.stubGlobal('window', { localStorage: mockLight });
		expect(getThemePreference()).toBe('light');

		const { mock: mockDark } = createMockStorage({ [THEME_STORAGE_KEY]: 'dark' });
		vi.stubGlobal('window', { localStorage: mockDark });
		expect(getThemePreference()).toBe('dark');
	});

	it('falls back to "system" when invalid value is in localStorage', () => {
		const { mock } = createMockStorage({ [THEME_STORAGE_KEY]: 'invalid-theme' });
		vi.stubGlobal('window', { localStorage: mock });

		expect(getThemePreference()).toBe('system');
	});

	it('resolves theme correctly based on theme preference and system prefers-color-scheme', () => {
		expect(resolveTheme('light', false)).toBe('light');
		expect(resolveTheme('light', true)).toBe('light');
		expect(resolveTheme('dark', false)).toBe('dark');
		expect(resolveTheme('dark', true)).toBe('dark');
		expect(resolveTheme('system', false)).toBe('light');
		expect(resolveTheme('system', true)).toBe('dark');
	});

	it('toggles from light to dark, and dark to light', () => {
		expect(toggleTheme('light')).toBe('dark');
		expect(toggleTheme('dark')).toBe('light');
	});

	it('persists theme to storage and applies dark class to document element', () => {
		const { mock } = createMockStorage();
		vi.stubGlobal('window', {
			localStorage: mock,
			matchMedia: vi.fn().mockReturnValue({ matches: false })
		});

		setTheme('dark');

		expect(mock.setItem).toHaveBeenCalledWith(THEME_STORAGE_KEY, 'dark');
		expect(mockDoc.documentElement.classList.add).toHaveBeenCalledWith('dark');
		expect(mockDoc.documentElement.style.colorScheme).toBe('dark');

		setTheme('light');

		expect(mock.setItem).toHaveBeenCalledWith(THEME_STORAGE_KEY, 'light');
		expect(mockDoc.documentElement.classList.remove).toHaveBeenCalledWith('dark');
		expect(mockDoc.documentElement.style.colorScheme).toBe('light');

		// Setting system when system is light
		setTheme('system');

		expect(mock.removeItem).toHaveBeenCalledWith(THEME_STORAGE_KEY);
		expect(mockDoc.documentElement.classList.remove).toHaveBeenCalledWith('dark');
		expect(mockDoc.documentElement.style.colorScheme).toBe('light');
	});
});
