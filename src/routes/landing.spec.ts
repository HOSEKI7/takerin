import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';

describe('Landing Page & SEO (+page.svelte & routes)', () => {
	it('exports prerender = true in +page.ts', async () => {
		const pageModule = await import('./+page.js');
		expect(pageModule.prerender).toBe(true);
	});

	it('generates valid sitemap.xml route', async () => {
		const sitemapModule = await import('./sitemap.xml/+server.js');
		expect(sitemapModule.prerender).toBe(true);
		const response = await sitemapModule.GET();
		expect(response.status).toBe(200);
		expect(response.headers.get('Content-Type')).toContain('application/xml');
		const body = await response.text();
		expect(body).toContain('<loc>https://takerin.my.id/</loc>');
		expect(body).toContain('<loc>https://takerin.my.id/auth/register</loc>');
		expect(body).toContain('<loc>https://takerin.my.id/auth/login</loc>');
	});

	it('generates valid robots.txt route', async () => {
		const robotsModule = await import('./robots.txt/+server.js');
		expect(robotsModule.prerender).toBe(true);
		const response = await robotsModule.GET();
		expect(response.status).toBe(200);
		expect(response.headers.get('Content-Type')).toContain('text/plain');
		const body = await response.text();
		expect(body).toContain('User-agent: *');
		expect(body).toContain('Sitemap: https://takerin.my.id/sitemap.xml');
		expect(body).toContain('Disallow: /admin/');
		expect(body).toContain('Disallow: /dashboard');
		expect(body).toContain('Disallow: /api/');
	});

	it('contains required SEO meta tags, Open Graph, Twitter Cards, and JSON-LD SoftwareApplication in +page.svelte', () => {
		const pagePath = path.resolve('src/routes/+page.svelte');
		const content = fs.readFileSync(pagePath, 'utf-8');

		// SEO Meta Tags
		expect(content).toMatch(/<meta[^>]*name="description"/);
		expect(content).toMatch(/<meta[^>]*name="keywords"/);
		expect(content).toContain('atur pengeluaran');
		expect(content).toContain('catat keuangan');
		expect(content).toContain('atur gaji');
		expect(content).toContain('aplikasi keuangan gratis');
		expect(content).toMatch(/<link[^>]*rel="canonical"/);

		// Open Graph
		expect(content).toMatch(/property="og:title"/);
		expect(content).toMatch(/property="og:description"/);
		expect(content).toMatch(/property="og:url"/);
		expect(content).toMatch(/property="og:image"/);
		expect(content).toMatch(/property="og:type"/);

		// Twitter Cards
		expect(content).toMatch(/name="twitter:card"/);
		expect(content).toMatch(/name="twitter:title"/);
		expect(content).toMatch(/name="twitter:description"/);
		expect(content).toMatch(/name="twitter:image"/);

		// JSON-LD SoftwareApplication
		expect(content).toContain('application/ld+json');
		expect(content).toContain("'SoftwareApplication'");
		expect(content).toContain("'FinanceApplication'");
		expect(content).toContain("'0'");
	});

	it('renders all required landing page sections and copy', () => {
		const pagePath = path.resolve('src/routes/+page.svelte');
		const content = fs.readFileSync(pagePath, 'utf-8');

		// Hero Section
		expect(content).toContain('Atur Pengeluaran & Jatah Gaji');
		expect(content).toContain('Takerin gajimu, tenangin bulanmu');
		expect(content).toContain('Mulai Gratis');
		expect(content).toContain('/auth/register');

		// Problem Statement
		expect(content).toContain('Gaji habis sebelum akhir bulan?');

		// Features Showcase (3 main features)
		expect(content).toContain('Bagi Jatah di Awal');
		expect(content).toContain('Pencatatan Cepat & Sederhana');
		expect(content).toContain('Pengingat Ramah');

		// How it Works (3 steps)
		expect(content).toContain('Set Pemasukan');
		expect(content).toContain('Atur Kategori');
		expect(content).toContain('Catat Pengeluaran');

		// FAQ Section
		expect(content).toContain('Mengapa dinamakan Takerin?');
		expect(content).toContain('Apa bedanya Takerin dengan aplikasi');

		// Bottom CTA
		expect(content).toMatch(/Mulai atur keuanganmu sekarang (—|-) gratis selamanya/);

		// Footer
		expect(content).toContain('https://github.com/HOSEKI7/takerin');

		// Dark Mode Support
		expect(content).toContain('dark:bg-dark-canvas');
		expect(content).toContain('dark:text-paper');
	});
});
