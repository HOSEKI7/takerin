import { describe, it, expect } from 'vitest';
import type { BlogPost, BlogPostSummary } from '#lib';
import { load as blogIndexLoad, prerender as blogIndexPrerender } from './+page.js';
import {
	load as blogSlugLoad,
	entries as blogSlugEntries,
	prerender as blogSlugPrerender
} from './[slug]/+page.js';
import * as sitemapModule from '../sitemap.xml/+server.js';
import * as fs from 'node:fs';
import * as path from 'node:path';

describe('Blog Routes, Prerendering & SEO (Seams 2 & 3)', () => {
	it('exports prerender = true in /blog/+page.ts and loads posts', async () => {
		expect(blogIndexPrerender).toBe(true);
		const data = (await blogIndexLoad(
			{} as unknown as Parameters<typeof blogIndexLoad>[0]
		)) as { posts: BlogPostSummary[] };
		expect(data).toHaveProperty('posts');
		expect(Array.isArray(data.posts)).toBe(true);
		expect(data.posts.length).toBeGreaterThanOrEqual(3);
	});

	it('exports prerender = true, generates entries, and loads post by slug in /blog/[slug]/+page.ts', async () => {
		expect(blogSlugPrerender).toBe(true);

		// Test entries generator for prerendering
		const entries = await blogSlugEntries();
		expect(Array.isArray(entries)).toBe(true);
		expect(entries.length).toBeGreaterThanOrEqual(3);
		expect(entries).toContainEqual({ slug: 'cara-atur-gaji-bulanan-biar-nggak-boncos' });
		expect(entries).toContainEqual({ slug: 'tips-hemat-anak-kos' });
		expect(entries).toContainEqual({ slug: 'kenapa-mencatat-pengeluaran-saja-nggak-cukup' });

		// Test loading valid post
		const validData = (await blogSlugLoad({
			params: { slug: 'cara-atur-gaji-bulanan-biar-nggak-boncos' }
		} as unknown as Parameters<typeof blogSlugLoad>[0])) as { post: BlogPost };
		expect(validData).toHaveProperty('post');
		expect(validData.post.title).toBe('Cara Atur Gaji Bulanan Biar Nggak Boncos');
		expect(validData.post.html).toContain('<h2>Kenapa Cara Lama Sering Gagal?</h2>');

		// Test 404 error for invalid slug
		let thrownError: { status?: number } | null = null;
		try {
			await blogSlugLoad({
				params: { slug: 'slug-yang-tidak-ada' }
			} as unknown as Parameters<typeof blogSlugLoad>[0]);
		} catch (err: unknown) {
			thrownError = err as { status?: number };
		}
		expect(thrownError).not.toBeNull();
		expect(thrownError?.status).toBe(404);
	});

	it('includes blog index and all article URLs in sitemap.xml', async () => {
		const response = await sitemapModule.GET();
		expect(response.status).toBe(200);
		const xml = await response.text();

		expect(xml).toContain('<loc>https://takerin.my.id/blog</loc>');
		expect(xml).toContain(
			'<loc>https://takerin.my.id/blog/cara-atur-gaji-bulanan-biar-nggak-boncos</loc>'
		);
		expect(xml).toContain('<loc>https://takerin.my.id/blog/tips-hemat-anak-kos</loc>');
		expect(xml).toContain(
			'<loc>https://takerin.my.id/blog/kenapa-mencatat-pengeluaran-saja-nggak-cukup</loc>'
		);
	});

	it('contains required SEO meta tags and Article structured data in +page.svelte files', () => {
		const blogIndexPath = path.resolve('src/routes/blog/+page.svelte');
		const blogIndexContent = fs.readFileSync(blogIndexPath, 'utf-8');

		expect(blogIndexContent).toMatch(/<title>[^<]*Blog[^<]*<\/title>/);
		expect(blogIndexContent).toMatch(/<meta[^>]*name="description"/);
		expect(blogIndexContent).toMatch(/property="og:title"/);

		const blogSlugPath = path.resolve('src/routes/blog/[slug]/+page.svelte');
		const blogSlugContent = fs.readFileSync(blogSlugPath, 'utf-8');

		expect(blogSlugContent).toContain("'@type': 'Article'");
		expect(blogSlugContent).toContain('headline: data.post.title');
		expect(blogSlugContent).toMatch(/property="og:type"[^>]*content="article"/);
		expect(blogSlugContent).toMatch(/<link[^>]*rel="canonical"/);
		expect(blogSlugContent).toContain('/auth/register');
		expect(blogSlugContent).toContain('href="/"');
	});
});
