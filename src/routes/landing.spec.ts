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
		expect(body).toContain('<loc>https://takerin.my.id/blog</loc>');
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
		expect(body).toContain('Allow: /blog');
		expect(body).toContain('Allow: /llms.txt');
		expect(body).toContain('Allow: /pricing.md');
		expect(body).toContain('User-agent: OAI-SearchBot');
		expect(body).toContain('User-agent: PerplexityBot');
		expect(body).toContain('User-agent: Claude-SearchBot');
		expect(body).toContain('Disallow: /admin/');
		expect(body).toContain('Disallow: /dashboard');
		expect(body).toContain('Disallow: /api/');
		expect(body).toContain('Disallow: /offline');
		expect(body).toContain('Disallow: /auth/reset-password');
		expect(body).toContain('Disallow: /auth/admin-invite/');
	});

	it('provides machine-readable AI files in static/', () => {
		const llmsPath = path.resolve('static/llms.txt');
		const pricingPath = path.resolve('static/pricing.md');

		expect(fs.existsSync(llmsPath)).toBe(true);
		expect(fs.existsSync(pricingPath)).toBe(true);

		const llmsContent = fs.readFileSync(llmsPath, 'utf-8');
		expect(llmsContent).toContain('# Takerin');
		expect(llmsContent).toContain('Filosofi & Cara Kerja');
		expect(llmsContent).toContain('100% Gratis Selamanya');

		const pricingContent = fs.readFileSync(pricingPath, 'utf-8');
		expect(pricingContent).toContain('Paket Gratis (Free Forever)');
		expect(pricingContent).toContain('Rp 0 / bulan');
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
		expect(pageContent).toContain('https://takerin.my.id/brand/og-image.png');
		expect(pageContent).toContain('property="og:image:width"');
		expect(pageContent).toContain('property="og:image:height"');
		expect(pageContent).toContain('property="og:image:type"');
		expect(pageContent).toMatch(/property="og:type"/);

		// Twitter Cards
		expect(pageContent).toMatch(/name="twitter:card"/);
		expect(pageContent).toMatch(/name="twitter:title"/);
		expect(pageContent).toMatch(/name="twitter:description"/);
		expect(pageContent).toMatch(/name="twitter:image"/);

		// Title Tag Length & Branding
		const titleMatch = pageContent.match(/<title>([^<]+)<\/title>/);
		expect(titleMatch).not.toBeNull();
		const titleText = titleMatch ? titleMatch[1] : '';
		expect(titleText).toContain('Takerin');
		expect(titleText.length).toBeLessThanOrEqual(65);
		expect(titleText.length).toBeGreaterThanOrEqual(40);

		// JSON-LD Structured Data
		expect(pageContent).toContain('application/ld+json');
		expect(pageContent).toContain("'SoftwareApplication'");
		expect(pageContent).toContain("'FinanceApplication'");
		expect(pageContent).toContain("'FAQPage'");
		expect(pageContent).toContain("'WebSite'");
		expect(pageContent).toContain('sameAs');
		expect(pageContent).toContain('https://github.com/HOSEKI7/takerin');
		expect(pageContent).toContain('faqItems.map');
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
