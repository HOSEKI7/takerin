import { describe, it, expect, beforeAll } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';

describe('Landing Page & SEO (+page.svelte & routes)', () => {
	let pageContent: string;

	beforeAll(() => {
		const pagePath = path.resolve('src/routes/+page.svelte');
		pageContent = fs.readFileSync(pagePath, 'utf-8');
	});

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
		// SEO Meta Tags
		expect(pageContent).toMatch(/<meta[^>]*name="description"/);
		expect(pageContent).toMatch(/<meta[^>]*name="keywords"/);
		expect(pageContent).toContain('atur pengeluaran');
		expect(pageContent).toContain('catat keuangan');
		expect(pageContent).toContain('atur gaji');
		expect(pageContent).toContain('aplikasi keuangan gratis');
		expect(pageContent).toMatch(/<link[^>]*rel="canonical"/);

		// Open Graph
		expect(pageContent).toMatch(/property="og:title"/);
		expect(pageContent).toMatch(/property="og:description"/);
		expect(pageContent).toMatch(/property="og:url"/);
		expect(pageContent).toMatch(/property="og:image"/);
		expect(pageContent).toMatch(/property="og:type"/);

		// Twitter Cards
		expect(pageContent).toMatch(/name="twitter:card"/);
		expect(pageContent).toMatch(/name="twitter:title"/);
		expect(pageContent).toMatch(/name="twitter:description"/);
		expect(pageContent).toMatch(/name="twitter:image"/);

		// JSON-LD SoftwareApplication
		expect(pageContent).toContain('application/ld+json');
		expect(pageContent).toContain("'SoftwareApplication'");
		expect(pageContent).toContain("'FinanceApplication'");
		expect(pageContent).toContain("'0'");
	});

	it('renders all required landing page sections and copy', () => {
		// Hero Section
		expect(pageContent).toContain('Takerin gajimu, tenangin bulanmu');
		expect(pageContent).toContain('Mulai Gratis');
		expect(pageContent).toContain('/auth/register');

		// Problem Statement
		expect(pageContent).toContain('Gaji habis sebelum akhir bulan?');

		// Features Showcase (3 main features)
		expect(pageContent).toContain('Bagi Jatah di Awal');
		expect(pageContent).toContain('Pencatatan Cepat & Sederhana');
		expect(pageContent).toContain('Pengingat Ramah');

		// How it Works (3 steps)
		expect(pageContent).toContain('Set Pemasukan');
		expect(pageContent).toContain('Atur Kategori');
		expect(pageContent).toContain('Catat Pengeluaran');

		// FAQ Section
		expect(pageContent).toContain('Mengapa dinamakan Takerin?');
		expect(pageContent).toContain('Apa bedanya Takerin dengan aplikasi');

		// Bottom CTA
		expect(pageContent).toMatch(/Mulai atur keuanganmu sekarang (—|-) gratis selamanya/);

		// Footer
		expect(pageContent).toContain('https://github.com/HOSEKI7/takerin');

		// Dark Mode Support
		expect(pageContent).toContain('dark:bg-dark-canvas');
		expect(pageContent).toContain('dark:text-paper');
	});
});
