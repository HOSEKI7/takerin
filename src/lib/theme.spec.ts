import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
	getThemePreference,
	resolveTheme,
	setTheme,
	toggleTheme,
	THEME_STORAGE_KEY
} from './theme';

describe('Theme Manager', () => {
	beforeEach(() => {
		// Clear mock storage
		vi.restoreAllMocks();
	});

	it('returns "system" by default when no preference is saved in localStorage', () => {
		const storage: Record<string, string> = {};
		const mockStorage = {
			getItem: vi.fn((key: string) => storage[key] ?? null),
			setItem: vi.fn((key: string, val: string) => {
				storage[key] = val;
			}),
			removeItem: vi.fn((key: string) => {
				delete storage[key];
			})
		};

		const preference = getThemePreference(mockStorage as unknown as Storage);
		expect(preference).toBe('system');
	});

	it('returns saved theme preference when valid ("light" or "dark")', () => {
		const mockStorageLight = {
			getItem: vi.fn(() => 'light')
		};
		expect(getThemePreference(mockStorageLight as unknown as Storage)).toBe('light');

		const mockStorageDark = {
			getItem: vi.fn(() => 'dark')
		};
		expect(getThemePreference(mockStorageDark as unknown as Storage)).toBe('dark');
	});

	it('falls back to "system" when invalid value is in localStorage', () => {
		const mockStorageInvalid = {
			getItem: vi.fn(() => 'unknown-mode')
		};
		expect(getThemePreference(mockStorageInvalid as unknown as Storage)).toBe('system');
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
		const storage: Record<string, string> = {};
		const mockStorage = {
			getItem: vi.fn((key: string) => storage[key] ?? null),
			setItem: vi.fn((key: string, val: string) => {
				storage[key] = val;
			}),
			removeItem: vi.fn((key: string) => {
				delete storage[key];
			})
		};

		const classList = new Set<string>();
		const mockDoc = {
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

		setTheme('dark', {
			storage: mockStorage as unknown as Storage,
			document: mockDoc as unknown as Document,
			systemPrefersDark: false
		});

		expect(mockStorage.setItem).toHaveBeenCalledWith(THEME_STORAGE_KEY, 'dark');
		expect(mockDoc.documentElement.classList.add).toHaveBeenCalledWith('dark');
		expect(mockDoc.documentElement.style.colorScheme).toBe('dark');

		setTheme('light', {
			storage: mockStorage as unknown as Storage,
			document: mockDoc as unknown as Document,
			systemPrefersDark: false
		});

		expect(mockStorage.setItem).toHaveBeenCalledWith(THEME_STORAGE_KEY, 'light');
		expect(mockDoc.documentElement.classList.remove).toHaveBeenCalledWith('dark');
		expect(mockDoc.documentElement.style.colorScheme).toBe('light');

		// Setting system when system is light
		setTheme('system', {
			storage: mockStorage as unknown as Storage,
			document: mockDoc as unknown as Document,
			systemPrefersDark: false
		});

		expect(mockStorage.removeItem).toHaveBeenCalledWith(THEME_STORAGE_KEY);
		expect(mockDoc.documentElement.classList.remove).toHaveBeenCalledWith('dark');
		expect(mockDoc.documentElement.style.colorScheme).toBe('light');
	});
});
