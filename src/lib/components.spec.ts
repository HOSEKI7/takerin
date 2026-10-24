import { describe, it, expect } from 'vitest';
import * as lib from './index';
import { Sun01Icon, Moon01Icon, CheckmarkCircle02Icon } from '@hugeicons/core-free-icons';

describe('Base UI Components & HugeIcons Seam', () => {
	it('exports all required base UI components from #lib', () => {
		expect(lib.Button).toBeDefined();
		expect(lib.Card).toBeDefined();
		expect(lib.Input).toBeDefined();
		expect(lib.Badge).toBeDefined();
		expect(lib.ProgressBar).toBeDefined();
		expect(lib.ThemeToggle).toBeDefined();
		expect(lib.StatusBadge).toBeDefined();
		expect(lib.BrandLogo).toBeDefined();
		expect(lib.DesktopSidebar).toBeDefined();
		expect(lib.MobileNav).toBeDefined();
		expect(lib.PwaInstallPrompt).toBeDefined();
		expect(lib.OnboardingTutorial).toBeDefined();
	});

	it('successfully imports and verifies HugeIcons definitions', () => {
		expect(Sun01Icon).toBeDefined();
		expect(Moon01Icon).toBeDefined();
		expect(CheckmarkCircle02Icon).toBeDefined();
		// HugeIcon data structure verification
		expect(Array.isArray(Sun01Icon) || typeof Sun01Icon === 'object').toBe(true);
	});
});
