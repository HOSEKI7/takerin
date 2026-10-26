export const prerender = true;

export async function GET() {
	const content = `# Takerin robots.txt
User-agent: *
Allow: /
Allow: /blog
Allow: /auth/login
Allow: /auth/register
Allow: /llms.txt
Allow: /pricing.md
Disallow: /admin/
Disallow: /api/
Disallow: /dashboard
Disallow: /expenses
Disallow: /categories
Disallow: /history
Disallow: /settings
Disallow: /onboarding
Disallow: /offline
Disallow: /auth/reset-password
Disallow: /auth/admin-invite/

# Explicitly permit AI search and discovery bots
User-agent: OAI-SearchBot
User-agent: ChatGPT-User
User-agent: PerplexityBot
User-agent: Claude-SearchBot
User-agent: meta-webindexer
Allow: /
Allow: /blog
Allow: /llms.txt
Allow: /pricing.md
Disallow: /admin/
Disallow: /api/
Disallow: /dashboard
Disallow: /expenses
Disallow: /categories
Disallow: /history
Disallow: /settings
Disallow: /onboarding
Disallow: /offline

Sitemap: https://takerin.my.id/sitemap.xml`;

	return new Response(content.trim(), {
		headers: {
			'Content-Type': 'text/plain; charset=utf-8',
			'Cache-Control': 'max-age=0, s-maxage=3600'
		}
	});
}
