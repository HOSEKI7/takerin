import { describe, it, expect } from 'vitest';
import {
	parseFrontmatter,
	parseArticle,
	getAllBlogPosts,
	getBlogPostBySlug,
	formatBlogDate
} from './index.js';

describe('Blog Content & Markdown Parsing (Seam 1)', () => {
	const sampleMarkdown = `---
title: "Cara Atur Gaji Bulanan Biar Nggak Boncos"
slug: "cara-atur-gaji-bulanan-biar-nggak-boncos"
excerpt: "Panduan praktis cara atur gaji bulanan agar tidak boncos sebelum akhir bulan dengan metode takaran jatah."
date: "2026-10-22"
author: "Tim Finansial Takerin"
targetKeyword: "cara atur gaji bulanan"
keywords: ["cara atur gaji bulanan", "tips keuangan", "budgeting gaji"]
readingTime: "5 min baca"
---

# Cara Atur Gaji Bulanan Biar Nggak Boncos

Pernahkah kamu merasa gaji baru saja masuk rekening, tapi beberapa hari kemudian sudah menipis?

## 1. Bagi Jatah di Awal Bulan

Kunci utama pengelolaan keuangan adalah membagi pos pengeluaran di awal bulan.

- Pos Kebutuhan Pokok (50%)
- Pos Tabungan & Investasi (20%)
- Pos Keinginan (30%)

Coba aplikasi [Takerin](/) untuk memudahkan penakaran jatah gajimu!
`;

	it('parses frontmatter and markdown body correctly', () => {
		const { meta, body } = parseFrontmatter(sampleMarkdown);
		expect(meta.title).toBe('Cara Atur Gaji Bulanan Biar Nggak Boncos');
		expect(meta.slug).toBe('cara-atur-gaji-bulanan-biar-nggak-boncos');
		expect(meta.date).toBe('2026-10-22');
		expect(meta.author).toBe('Tim Finansial Takerin');
		expect(meta.targetKeyword).toBe('cara atur gaji bulanan');
		expect(meta.keywords).toContain('cara atur gaji bulanan');
		expect(meta.readingTime).toBe('5 min baca');
		expect(body).toContain('# Cara Atur Gaji Bulanan Biar Nggak Boncos');
	});

	it('parses complete article into html and metadata', () => {
		const article = parseArticle(sampleMarkdown);
		expect(article.title).toBe('Cara Atur Gaji Bulanan Biar Nggak Boncos');
		expect(article.slug).toBe('cara-atur-gaji-bulanan-biar-nggak-boncos');
		expect(article.html).toContain('<h1>Cara Atur Gaji Bulanan Biar Nggak Boncos</h1>');
		expect(article.html).toContain('<h2>1. Bagi Jatah di Awal Bulan</h2>');
		expect(article.html).toContain('<a href="/">Takerin</a>');
		expect(article.readingTime).toBe('5 min baca');
	});

	it('derives reading time if not explicitly provided in frontmatter', () => {
		const mdWithoutReadingTime = `---
title: "Artikel Singkat"
slug: "artikel-singkat"
excerpt: "Ringkasan"
date: "2026-10-22"
author: "Takerin"
---

Satu dua tiga empat lima enam tujuh delapan sembilan sepuluh.
`;
		const article = parseArticle(mdWithoutReadingTime);
		expect(article.readingTime).toBeDefined();
		expect(article.readingTime).toContain('min baca');
	});

	it('reads all published blog posts sorted by date descending', () => {
		const posts = getAllBlogPosts();
		expect(Array.isArray(posts)).toBe(true);
		expect(posts.length).toBeGreaterThanOrEqual(3);

		// Verify sorted descending
		for (let i = 0; i < posts.length - 1; i++) {
			expect(new Date(posts[i].date).getTime()).toBeGreaterThanOrEqual(
				new Date(posts[i + 1].date).getTime()
			);
		}

		// Verify fields in summary
		const first = posts[0];
		expect(first.title).toBeDefined();
		expect(first.slug).toBeDefined();
		expect(first.excerpt).toBeDefined();
		expect(first.date).toBeDefined();
	});

	it('finds an article by its slug and returns null for unknown slug', () => {
		const post = getBlogPostBySlug('cara-atur-gaji-bulanan-biar-nggak-boncos');
		expect(post).not.toBeNull();
		expect(post?.title).toBe('Cara Atur Gaji Bulanan Biar Nggak Boncos');
		expect(post?.html).toBeDefined();

		const notFound = getBlogPostBySlug('artikel-yang-tidak-pernah-ada');
		expect(notFound).toBeNull();
	});

	it('formats ISO date to Indonesian readable format', () => {
		const formatted = formatBlogDate('2026-10-22');
		expect(formatted).toContain('Oktober 2026');
	});
});
