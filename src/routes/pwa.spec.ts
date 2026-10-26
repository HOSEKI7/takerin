import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';

describe('PWA Manifest, Icons & Offline Fallback', () => {
	it('has a valid manifest.json in static/', () => {
		const manifestPath = path.resolve('static/manifest.json');
		expect(fs.existsSync(manifestPath)).toBe(true);

		const content = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
		expect(content.name).toBe('Takerin - Atur & Catat Pengeluaran');
		expect(content.short_name).toBe('Takerin');
		expect(content.start_url).toBe('/dashboard');
		expect(content.display).toBe('standalone');
		expect(content.theme_color).toBe('#163300');
		expect(content.background_color).toBe('#ffffff');
		expect(Array.isArray(content.icons)).toBe(true);
		expect(content.icons.length).toBeGreaterThanOrEqual(4);

		// Check icons presence
		const sizes = content.icons.map((i: { sizes: string }) => i.sizes);
		expect(sizes).toContain('192x192');
		expect(sizes).toContain('512x512');

		// Check maskable icon purpose
		const purposes = content.icons.map((i: { purpose?: string }) => i.purpose);
		expect(purposes).toContain('maskable');
		expect(purposes).toContain('any');

		// Verify minimal manifest without scope creep
		expect(content.categories).toBeUndefined();
		expect(content.orientation).toBeUndefined();
	});

	it('has all generated PWA and Apple touch icon files in static/icons/', () => {
		const expectedIcons = [
			'static/icons/icon-192.png',
			'static/icons/icon-512.png',
			'static/icons/icon-192-maskable.png',
			'static/icons/icon-512-maskable.png',
			'static/icons/apple-touch-icon.png'
		];

		for (const iconPath of expectedIcons) {
			const resolved = path.resolve(iconPath);
			expect(fs.existsSync(resolved), `Icon should exist at ${iconPath}`).toBe(true);
			const stats = fs.statSync(resolved);
			expect(stats.size).toBeGreaterThan(500); // Non-empty image file
		}
	});

	it('includes PWA manifest, theme color, and apple meta tags in src/app.html', () => {
		const appHtmlPath = path.resolve('src/app.html');
		const appHtml = fs.readFileSync(appHtmlPath, 'utf-8');

		expect(appHtml).toContain('rel="manifest"');
		expect(appHtml).toContain('name="theme-color"');
		expect(appHtml).toContain('#163300');
		expect(appHtml).toContain('name="apple-mobile-web-app-capable"');
		expect(appHtml).toContain('rel="apple-touch-icon"');
		expect(appHtml).toContain('rel="apple-touch-startup-image"');
	});

	it('exports prerender = true for offline fallback page', async () => {
		const offlinePageModule = await import('./offline/+page.js');
		expect(offlinePageModule.prerender).toBe(true);
	});

	it('contains Indonesian offline instructions and link to dashboard in offline/+page.svelte', () => {
		const offlineSveltePath = path.resolve('src/routes/offline/+page.svelte');
		const content = fs.readFileSync(offlineSveltePath, 'utf-8');

		expect(content).toContain('Anda Sedang Offline');
		expect(content).toContain('/dashboard');
		expect(content).toContain('Buka Dashboard');
		expect(content).toContain('Coba Lagi');
		expect(content).toContain('name="robots"');
		expect(content).toContain('noindex, nofollow');
	});

	it('configures service worker with offline caching in src/service-worker/index.ts', () => {
		const swPath = path.resolve('src/service-worker/index.ts');
		const tsconfigPath = path.resolve('src/service-worker/tsconfig.json');

		expect(fs.existsSync(swPath)).toBe(true);
		expect(fs.existsSync(tsconfigPath)).toBe(true);

		const swContent = fs.readFileSync(swPath, 'utf-8');
		expect(swContent).toContain("addEventListener('install'");
		expect(swContent).toContain("addEventListener('activate'");
		expect(swContent).toContain("addEventListener('fetch'");
		expect(swContent).toContain("'/offline'");
		expect(swContent).toContain("request.mode === 'navigate'");
		expect(swContent).toContain("url.pathname.startsWith('/dashboard')");
		expect(swContent).toContain('caches.open');

		const tsconfigContent = JSON.parse(fs.readFileSync(tsconfigPath, 'utf-8'));
		expect(tsconfigContent.extends).toBe('$app/tsconfig/service-worker');
	});

	it('embeds PwaInstallPrompt in root +layout.svelte', () => {
		const layoutPath = path.resolve('src/routes/+layout.svelte');
		const layoutContent = fs.readFileSync(layoutPath, 'utf-8');

		expect(layoutContent).toContain('PwaInstallPrompt');
		expect(layoutContent).toContain('<PwaInstallPrompt');
	});
});
