import { marked } from 'marked';

export interface BlogPostMeta {
	title: string;
	slug: string;
	excerpt: string;
	date: string;
	author: string;
	targetKeyword?: string;
	keywords?: string[];
	readingTime?: string;
	image?: string;
}

export interface BlogPost extends BlogPostMeta {
	content: string;
	html: string;
}

export type BlogPostSummary = BlogPostMeta;

export function parseFrontmatter(raw: string): { meta: Partial<BlogPostMeta>; body: string } {
	const trimmed = raw.trimStart();
	if (!trimmed.startsWith('---')) {
		return { meta: {}, body: raw };
	}

	const endMarkerIndex = trimmed.indexOf('\n---', 3);
	if (endMarkerIndex === -1) {
		return { meta: {}, body: raw };
	}

	const frontmatterBlock = trimmed.slice(3, endMarkerIndex).trim();
	const body = trimmed.slice(endMarkerIndex + 4).trimStart();

	const meta: Record<string, unknown> = {};
	const lines = frontmatterBlock.split(/\r?\n/);

	for (const line of lines) {
		const colonIndex = line.indexOf(':');
		if (colonIndex === -1) continue;

		const key = line.slice(0, colonIndex).trim();
		let val = line.slice(colonIndex + 1).trim();

		// Handle array format e.g. ["a", "b"]
		if (val.startsWith('[') && val.endsWith(']')) {
			try {
				meta[key] = JSON.parse(val);
				continue;
			} catch {
				const items = val
					.slice(1, -1)
					.split(',')
					.map((item) => item.trim().replace(/^["']|["']$/g, ''))
					.filter(Boolean);
				meta[key] = items;
				continue;
			}
		}

		// Handle quotes
		if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
			val = val.slice(1, -1);
		}

		meta[key] = val;
	}

	return { meta: meta as Partial<BlogPostMeta>, body };
}

export function calculateReadingTime(text: string): string {
	const words = text.trim().split(/\s+/).filter(Boolean).length;
	const minutes = Math.max(1, Math.ceil(words / 200));
	return `${minutes} min baca`;
}

export function parseArticle(raw: string, slugFallback?: string): BlogPost {
	const { meta, body } = parseFrontmatter(raw);
	const renderedHtml = marked.parse(body) as string;

	const title = meta.title ?? 'Artikel Tanpa Judul';
	const slug = meta.slug ?? slugFallback ?? '';
	const excerpt = meta.excerpt ?? '';
	const date = meta.date ?? new Date().toISOString().split('T')[0];
	const author = meta.author ?? 'Tim Takerin';
	const readingTime = meta.readingTime ?? calculateReadingTime(body);

	return {
		title,
		slug,
		excerpt,
		date,
		author,
		targetKeyword: meta.targetKeyword,
		keywords: meta.keywords ?? [],
		readingTime,
		image: meta.image,
		content: body,
		html: renderedHtml
	};
}

// Statically load all markdown files in src/content/blog at compile/bundle time
const rawArticles = import.meta.glob('/src/content/blog/*.md', {
	query: '?raw',
	import: 'default',
	eager: true
}) as Record<string, string>;

export function getAllBlogPosts(): BlogPostSummary[] {
	const posts: BlogPostSummary[] = [];

	for (const [path, rawContent] of Object.entries(rawArticles)) {
		const filenameSlug = path.split('/').pop()?.replace(/\.md$/, '');
		const post = parseArticle(rawContent, filenameSlug);
		posts.push({
			title: post.title,
			slug: post.slug || (filenameSlug ?? ''),
			excerpt: post.excerpt,
			date: post.date,
			author: post.author,
			targetKeyword: post.targetKeyword,
			keywords: post.keywords,
			readingTime: post.readingTime,
			image: post.image
		});
	}

	// Sort posts descending by publication date
	return posts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export function getBlogPostBySlug(slug: string): BlogPost | null {
	for (const [path, rawContent] of Object.entries(rawArticles)) {
		const filenameSlug = path.split('/').pop()?.replace(/\.md$/, '');
		const post = parseArticle(rawContent, filenameSlug);
		if (post.slug === slug || filenameSlug === slug) {
			return post;
		}
	}
	return null;
}
