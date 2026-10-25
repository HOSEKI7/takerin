import { describe, it, expect } from 'vitest';
import PublicNavbar from './PublicNavbar.svelte';
import { render } from 'svelte/server';

describe('PublicNavbar Component', () => {
	it('exports PublicNavbar component', () => {
		expect(PublicNavbar).toBeDefined();
	});

	it('renders landing page navigation links when on root path ("/")', () => {
		const { html } = render(PublicNavbar, {
			props: {
				currentPath: '/'
			}
		});

		// Header element with sticky styling
		expect(html).toContain('<header');
		expect(html).toContain('sticky');

		// Check BrandLogo
		expect(html).toContain('href="/"');

		// Landing page navigation items
		expect(html).toContain('href="#masalah"');
		expect(html).toContain('Masalah');
		expect(html).toContain('href="#fitur"');
		expect(html).toContain('Fitur');
		expect(html).toContain('href="#cara-kerja"');
		expect(html).toContain('Cara Kerja');
		expect(html).toContain('href="/blog"');
		expect(html).toContain('Blog');
		expect(html).toContain('href="#faq"');
		expect(html).toContain('Tanya Jawab');

		// In landing mode, 'Beranda' should not be present as an anchor link
		expect(html).not.toContain('>Beranda<');

		// Auth CTAs
		expect(html).toContain('href="/auth/login"');
		expect(html).toContain('Masuk');
		expect(html).toContain('href="/auth/register"');
		expect(html).toContain('Mulai Gratis');

		// Mobile menu button
		expect(html).toContain('aria-label="Buka menu"');
		expect(html).toContain('aria-expanded="false"');
	});

	it('renders blog-specific navigation links when on blog path ("/blog")', () => {
		const { html } = render(PublicNavbar, {
			props: {
				currentPath: '/blog'
			}
		});

		// Opsi kembali ke Beranda dan direktori Blog
		expect(html).toContain('href="/"');
		expect(html).toContain('Beranda');
		expect(html).toContain('href="/blog"');
		expect(html).toContain('Blog');

		// Pastikan section landing page SPA TIDAK ADA
		expect(html).not.toContain('href="#masalah"');
		expect(html).not.toContain('href="#fitur"');
		expect(html).not.toContain('href="#cara-kerja"');
		expect(html).not.toContain('href="#faq"');
		expect(html).not.toContain('href="/#fitur"');
		expect(html).not.toContain('href="/#cara-kerja"');

		// Active page indicator for Blog
		expect(html).toContain('aria-current="page"');
	});

	it('renders blog navigation when inside an article ("/blog/[slug]")', () => {
		const { html } = render(PublicNavbar, {
			props: {
				currentPath: '/blog/tips-hemat-anak-kos'
			}
		});

		// Links should only be Beranda and Blog
		expect(html).toContain('href="/"');
		expect(html).toContain('Beranda');
		expect(html).toContain('href="/blog"');
		expect(html).toContain('Blog');

		// No landing page sections
		expect(html).not.toContain('href="#fitur"');
		expect(html).not.toContain('href="#cara-kerja"');
		expect(html).not.toContain('href="#faq"');
	});

	it('renders mobile dropdown menu with navigation links when mobileMenuOpen is true', () => {
		const { html: landingMobileHtml } = render(PublicNavbar, {
			props: {
				currentPath: '/',
				mobileMenuOpen: true
			}
		});

		// Check mobile menu expanded
		expect(landingMobileHtml).toContain('aria-expanded="true"');
		expect(landingMobileHtml).toContain('aria-label="Tutup menu"');
		expect(landingMobileHtml).toContain('aria-label="Navigasi Mobile"');
		expect(landingMobileHtml).toContain('href="#masalah"');
		expect(landingMobileHtml).toContain('href="#fitur"');

		// When on blog, mobile menu also contains only Beranda and Blog
		const { html: blogMobileHtml } = render(PublicNavbar, {
			props: {
				currentPath: '/blog',
				mobileMenuOpen: true
			}
		});

		expect(blogMobileHtml).toContain('aria-label="Navigasi Mobile"');
		expect(blogMobileHtml).toContain('Beranda');
		expect(blogMobileHtml).toContain('Blog');
		expect(blogMobileHtml).not.toContain('href="#fitur"');
		expect(blogMobileHtml).not.toContain('href="#cara-kerja"');
	});
});
