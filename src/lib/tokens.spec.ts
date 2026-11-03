import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('Design Tokens, Typography & App Shell Assets', () => {
	const cssPath = path.resolve(process.cwd(), 'src/routes/layout.css');
	const tokensPath = path.resolve(process.cwd(), 'tokens.json');
	const appHtmlPath = path.resolve(process.cwd(), 'src/app.html');

	const cssContent = fs.readFileSync(cssPath, 'utf-8');
	const tokens = JSON.parse(fs.readFileSync(tokensPath, 'utf-8'));
	const appHtml = fs.readFileSync(appHtmlPath, 'utf-8');

	it('configures custom dark variant for class-based toggling', () => {
		expect(cssContent).toMatch(/@custom-variant\s+dark\s+\(&:where\(\.dark,\s*\.dark\s+\*\)\);/);
	});

	it('includes all 12 color tokens from tokens.json inside @theme', () => {
		const colorKeys = Object.keys(tokens.color);
		expect(colorKeys.length).toBe(12);

		for (const key of colorKeys) {
			const expectedVal = tokens.color[key].$value.toLowerCase();
			// Look for --color-<key>: <expectedVal>
			const regex = new RegExp(`--color-${key}:\\s*${expectedVal}`, 'i');
			expect(
				regex.test(cssContent),
				`Expected layout.css to define --color-${key}: ${expectedVal}`
			).toBe(true);
		}
	});

	it('configures Manrope for display and Inter for body/sans fonts inside @theme', () => {
		expect(cssContent).toMatch(/--font-display:\s*['"]?Manrope Variable['"]?,\s*['"]?Manrope['"]?/);
		expect(cssContent).toMatch(/--font-body:\s*['"]?Inter Variable['"]?,\s*['"]?Inter['"]?/);
		expect(cssContent).toMatch(/--font-sans:\s*['"]?Inter Variable['"]?,\s*['"]?Inter['"]?/);
	});

	it('self-hosts variable fonts via @fontsource-variable imports in layout.css', () => {
		expect(cssContent).toMatch(/@import\s+['"]@fontsource-variable\/inter['"];/);
		expect(cssContent).toMatch(/@import\s+['"]@fontsource-variable\/manrope['"];/);
	});

	it('removes external Google Fonts links and configures preload tap in app.html', () => {
		expect(appHtml).not.toContain('fonts.googleapis.com');
		expect(appHtml).not.toContain('fonts.gstatic.com');
		expect(appHtml).toContain('data-sveltekit-preload-data="tap"');
		expect(appHtml).not.toContain('data-sveltekit-preload-data="hover"');
	});

	it('configures key border radius tokens (10px cards/inputs, 9999px pills)', () => {
		expect(cssContent).toMatch(/--radius-lg:\s*10px/);
		expect(cssContent).toMatch(/--radius-full:\s*9999px/);
	});

	it('configures shadow tokens from tokens.json', () => {
		expect(cssContent).toMatch(/--shadow-subtle:/);
		expect(cssContent).toMatch(/--shadow-lg:/);
		expect(cssContent).toMatch(/--shadow-xl:/);
	});
});
