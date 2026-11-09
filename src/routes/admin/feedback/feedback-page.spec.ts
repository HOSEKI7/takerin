import { describe, it, expect } from 'vitest';
import type { ComponentProps } from 'svelte';
import { render } from 'svelte/server';
import FeedbackPage from './+page.svelte';
import type { AdminFeedbackRecord, AdminFeedbackMetrics } from '#lib/server/db/feedback.js';

type FeedbackPageProps = ComponentProps<typeof FeedbackPage>;

describe('Admin Feedback Console UI Component (+page.svelte) (Issue #56)', () => {
	const mockMetrics: AdminFeedbackMetrics = {
		averageRating: 4.8,
		totalReviews: 24,
		pendingCount: 7,
		totalFeedback: 12,
		totalAll: 36
	};

	const mockFeedbackList: AdminFeedbackRecord[] = [
		{
			id: 'fb-rev-1',
			userId: 'usr-1',
			userName: 'Budi Santoso',
			userEmail: 'budi@example.com',
			userImage: null,
			type: 'review',
			rating: 5,
			category: null,
			content: 'Aplikasi Takerin sangat menenangkan dan mudah digunakan.',
			currentRoute: '/settings',
			deviceInfo: JSON.stringify({ browser: 'Chrome/120.0 macOS', screen: '1440x900' }),
			status: 'pending',
			isFeatured: false,
			createdAt: new Date('2026-11-01T10:30:00Z'),
			updatedAt: new Date('2026-11-01T10:30:00Z')
		},
		{
			id: 'fb-feed-2',
			userId: 'usr-2',
			userName: 'Siti Rahma',
			userEmail: 'siti@example.com',
			userImage: null,
			type: 'feedback',
			rating: null,
			category: 'bug',
			content: 'Tombol simpan sedikit lambat saat jaringan offline.',
			currentRoute: '/dashboard',
			deviceInfo: JSON.stringify({ browser: 'Safari/17 iOS', screen: '390x844' }),
			status: 'reviewed',
			isFeatured: false,
			createdAt: new Date('2026-11-02T14:15:00Z'),
			updatedAt: new Date('2026-11-02T15:00:00Z')
		}
	];

	it('renders page header with title, subtitle, and badge', () => {
		const { html } = render(FeedbackPage, {
			props: {
				data: {
					feedbackList: mockFeedbackList,
					metrics: mockMetrics
				}
			} as unknown as FeedbackPageProps
		});

		expect(html).toContain('Ulasan &amp; Umpan Balik Pengguna');
		expect(html).toContain('Moderasi &amp; Metrik');
	});

	it('renders summary metric cards with accurate values (AC 2)', () => {
		const { html } = render(FeedbackPage, {
			props: {
				data: {
					feedbackList: mockFeedbackList,
					metrics: mockMetrics
				}
			} as unknown as FeedbackPageProps
		});

		// Average rating card: 4.8 / 5.0
		expect(html).toContain('4.8');
		expect(html).toContain('/ 5.0');

		// Total reviews: 24
		expect(html).toContain('24');

		// Pending count: 7
		expect(html).toContain('7');
	});

	it('renders data table with entries, users, types, routes, and statuses (AC 3)', () => {
		const { html } = render(FeedbackPage, {
			props: {
				data: {
					feedbackList: mockFeedbackList,
					metrics: mockMetrics
				}
			} as unknown as FeedbackPageProps
		});

		// Users
		expect(html).toContain('Budi Santoso');
		expect(html).toContain('budi@example.com');
		expect(html).toContain('Siti Rahma');
		expect(html).toContain('siti@example.com');

		// Content
		expect(html).toContain('Aplikasi Takerin sangat menenangkan dan mudah digunakan.');
		expect(html).toContain('Tombol simpan sedikit lambat saat jaringan offline.');

		// Routes
		expect(html).toContain('/settings');
		expect(html).toContain('/dashboard');

		// Status badges
		expect(html).toContain('Menunggu');
		expect(html).toContain('Ditinjau');
	});

	it('renders search and filter controls for Type, Category, Rating, and Status', () => {
		const { html } = render(FeedbackPage, {
			props: {
				data: {
					feedbackList: mockFeedbackList,
					metrics: mockMetrics
				}
			} as unknown as FeedbackPageProps
		});

		// Search input
		expect(html).toContain('id="feedback-search"');

		// Filter selects
		expect(html).toContain('id="filter-type"');
		expect(html).toContain('id="filter-category"');
		expect(html).toContain('id="filter-rating"');
		expect(html).toContain('id="filter-status"');
	});

	it('renders empty feedback state when list is empty', () => {
		const { html } = render(FeedbackPage, {
			props: {
				data: {
					feedbackList: [],
					metrics: {
						averageRating: 0,
						totalReviews: 0,
						pendingCount: 0,
						totalFeedback: 0,
						totalAll: 0
					}
				}
			} as unknown as FeedbackPageProps
		});

		expect(html).toContain('Belum ada ulasan atau umpan balik yang tercatat.');
	});
});
