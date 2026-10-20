import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('Design Tokens & Theme in layout.css', () => {
	const cssPath = path.resolve(process.cwd(), 'src/routes/layout.css');
	const tokensPath = path.resolve(process.cwd(), 'tokens.json');

	const cssContent = fs.readFileSync(cssPath, 'utf-8');
	const tokens = JSON.parse(fs.readFileSync(tokensPath, 'utf-8'));

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
		expect(cssContent).toMatch(/--font-display:\s*['"]?Manrope['"]?/);
		expect(cssContent).toMatch(/--font-body:\s*['"]?Inter['"]?/);
		expect(cssContent).toMatch(/--font-sans:\s*['"]?Inter['"]?/);
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
