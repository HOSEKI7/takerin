import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
	t,
	getLocale,
	setLocale,
	initI18n,
	type Locale,
	SUPPORTED_LOCALES,
	LANGUAGE_STORAGE_KEY
} from './index.js';

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

describe('i18n runtime (Seam 1)', () => {
	let mockStorage: ReturnType<typeof createMockStorage>;
	let mockDoc: { cookie: string };
	let eventListeners: Map<string, Function[]>;

	beforeEach(() => {
		vi.restoreAllMocks();
		mockStorage = createMockStorage();
		mockDoc = { cookie: '' };
		eventListeners = new Map();

		vi.stubGlobal('window', {
			localStorage: mockStorage.mock,
			dispatchEvent: vi.fn((event: Event) => {
				const fns = eventListeners.get(event.type) || [];
				fns.forEach((fn) => fn(event));
				return true;
			}),
			addEventListener: vi.fn((type: string, fn: Function) => {
				if (!eventListeners.has(type)) eventListeners.set(type, []);
				eventListeners.get(type)!.push(fn);
			}),
			removeEventListener: vi.fn((type: string, fn: Function) => {
				const list = eventListeners.get(type) || [];
				eventListeners.set(
					type,
					list.filter((f) => f !== fn)
				);
			})
		});
		vi.stubGlobal('document', mockDoc);

		setLocale('id');
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('has default locale as "id" and supports id & en', () => {
		expect(SUPPORTED_LOCALES).toEqual(['id', 'en']);
		expect(getLocale()).toBe('id');
	});

	it('translates common keys in Indonesian by default', () => {
		expect(t('common.save')).toBe('Simpan');
		expect(t('common.cancel')).toBe('Batal');
		expect(t('nav.dashboard')).toBe('Dashboard');
	});

	it('translates keys in English after setLocale("en")', () => {
		setLocale('en');
		expect(getLocale()).toBe('en');
		expect(t('common.save')).toBe('Save');
		expect(t('common.cancel')).toBe('Cancel');
		expect(t('nav.dashboard')).toBe('Dashboard');
	});

	it('interpolates placeholders with curly syntax {{var}}', () => {
		setLocale('id');
		expect(t('onboarding.stepIndicator', { current: 1, total: 3 })).toBe('Langkah 1 dari 3');

		setLocale('en');
		expect(t('onboarding.stepIndicator', { current: 1, total: 3 })).toBe('Step 1 of 3');
	});

	it('falls back to "id" if a translation key is missing in "en"', () => {
		setLocale('en');
		expect(t('common.save')).toBe('Save');
	});

	it('returns the key itself if not found in any locale', () => {
		expect(t('nonexistent.nested.key')).toBe('nonexistent.nested.key');
	});

	it('persists language preference to localStorage and cookies', () => {
		setLocale('en');
		expect(mockStorage.mock.setItem).toHaveBeenCalledWith(LANGUAGE_STORAGE_KEY, 'en');
		expect(mockDoc.cookie).toContain('takerin_lang=en');
	});

	it('dispatches takerin:langchange event when locale changes', () => {
		const listener = vi.fn();
		window.addEventListener('takerin:langchange', listener);

		setLocale('en');
		expect(listener).toHaveBeenCalled();

		window.removeEventListener('takerin:langchange', listener);
	});

	it('initializes locale from localStorage or server fallback', () => {
		mockStorage.mock.getItem.mockReturnValueOnce('en');
		initI18n();
		expect(getLocale()).toBe('en');

		mockStorage.mock.getItem.mockReturnValueOnce('invalid');
		initI18n('id');
		expect(getLocale()).toBe('id');
	});

	it('maintains 100% translation key parity between id.json and en.json', async () => {
		const idDict = (await import('./id.json')).default;
		const enDict = (await import('./en.json')).default;

		function getDeepKeys(obj: Record<string, unknown>, prefix = ''): string[] {
			let keys: string[] = [];
			for (const [k, v] of Object.entries(obj)) {
				const fullKey = prefix ? `${prefix}.${k}` : k;
				if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
					keys = keys.concat(getDeepKeys(v as Record<string, unknown>, fullKey));
				} else {
					keys.push(fullKey);
				}
			}
			return keys;
		}

		const idKeys = new Set(getDeepKeys(idDict));
		const enKeys = new Set(getDeepKeys(enDict));

		const missingInEn = [...idKeys].filter((k) => !enKeys.has(k));
		const missingInId = [...enKeys].filter((k) => !idKeys.has(k));

		expect(missingInEn).toEqual([]);
		expect(missingInId).toEqual([]);
	});

	it('adheres to GLOSSARY.md nomenclature in translation dictionaries', async () => {
		const idStr = JSON.stringify((await import('./id.json')).default);
		const enStr = JSON.stringify((await import('./en.json')).default);

		// ID: forbidden terms "transaksi", standalone "pos" (meaning category)
		expect([...idStr.matchAll(/transaksi/gi)].length).toBe(0);
		expect([...idStr.matchAll(/\bpos\b/gi)].length).toBe(0);

		// EN: forbidden terms "spending" (as noun for expense), "transaction"
		expect([...enStr.matchAll(/\bspending\b/gi)].length).toBe(0);
		expect([...enStr.matchAll(/\btransaction\b/gi)].length).toBe(0);
	});
});
