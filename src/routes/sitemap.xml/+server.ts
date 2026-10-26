import { getAllBlogPosts } from '#lib';

export const prerender = true;

export async function GET() {
	const posts = getAllBlogPosts();
	const today = new Date().toISOString().split('T')[0];

	const blogUrls = posts
		.map(
			(post) => `\t<url>
\t\t<loc>https://takerin.my.id/blog/${post.slug}</loc>
\t\t<lastmod>${post.date || today}</lastmod>
\t\t<changefreq>monthly</changefreq>
\t\t<priority>0.8</priority>
\t</url>`
		)
		.join('\n');

	const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
\t<url>
\t\t<loc>https://takerin.my.id/</loc>
\t\t<lastmod>${today}</lastmod>
\t\t<changefreq>weekly</changefreq>
\t\t<priority>1.0</priority>
\t</url>
\t<url>
\t\t<loc>https://takerin.my.id/blog</loc>
\t\t<lastmod>${today}</lastmod>
\t\t<changefreq>daily</changefreq>
\t\t<priority>0.9</priority>
\t</url>
${blogUrls}
\t<url>
\t\t<loc>https://takerin.my.id/auth/register</loc>
\t\t<lastmod>${today}</lastmod>
\t\t<changefreq>monthly</changefreq>
\t\t<priority>0.8</priority>
\t</url>
\t<url>
\t\t<loc>https://takerin.my.id/auth/login</loc>
\t\t<lastmod>${today}</lastmod>
\t\t<changefreq>monthly</changefreq>
\t\t<priority>0.5</priority>
\t</url>
</urlset>`;

	return new Response(xml.trim(), {
		headers: {
			'Content-Type': 'application/xml; charset=utf-8',
			'Cache-Control': 'max-age=0, s-maxage=3600'
		}
	});
}
