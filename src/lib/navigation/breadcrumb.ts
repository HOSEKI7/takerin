import { resolve } from '$app/paths';
import type { Locale } from '#lib/i18n/index.js';

export interface BreadcrumbItem {
	label: string;
	href?: string;
	current?: boolean;
}

const SEGMENT_LABELS: Record<string, { id: string; en: string }> = {
	dashboard: { id: 'Dashboard', en: 'Dashboard' },
	expenses: { id: 'Pengeluaran', en: 'Expenses' },
	categories: { id: 'Kategori', en: 'Categories' },
	history: { id: 'Riwayat', en: 'History' },
	settings: { id: 'Pengaturan', en: 'Settings' }
};

interface SubRouteConfig {
	prefix: string;
	parentLabel: { id: string; en: string };
	parentHref: string;
	subRoutes?: Record<string, { id: string; en: string }>;
	defaultDetailLabel: { id: string; en: string };
}

const SUB_ROUTE_CONFIGS: SubRouteConfig[] = [
	{
		prefix: '/expenses',
		parentLabel: { id: 'Pengeluaran', en: 'Expenses' },
		parentHref: resolve('/(app)/expenses'),
		subRoutes: {
			new: { id: 'Catat Baru', en: 'New Expense' }
		},
		defaultDetailLabel: { id: 'Detail Pengeluaran', en: 'Expense Detail' }
	},
	{
		prefix: '/categories',
		parentLabel: { id: 'Kategori', en: 'Categories' },
		parentHref: resolve('/(app)/categories'),
		defaultDetailLabel: { id: 'Detail Kategori', en: 'Category Detail' }
	},
	{
		prefix: '/history',
		parentLabel: { id: 'Riwayat', en: 'History' },
		parentHref: resolve('/(app)/history'),
		defaultDetailLabel: { id: 'Detail Periode', en: 'Period Detail' }
	},
	{
		prefix: '/settings',
		parentLabel: { id: 'Pengaturan', en: 'Settings' },
		parentHref: resolve('/(app)/settings'),
		subRoutes: {
			security: { id: 'Keamanan', en: 'Security' }
		},
		defaultDetailLabel: { id: 'Detail Pengaturan', en: 'Settings Detail' }
	}
];

/**
 * Normalizes pathname by stripping SvelteKit (app) group folder if present
 * and trimming trailing slashes.
 */
export function normalizePath(path: string): string {
	const cleaned = path.replace(/^\/\(app\)/, '').replace(/\/+$/, '');
	return cleaned === '' ? '/' : cleaned;
}

/**
 * Generates dynamic breadcrumb navigation trail for the protected app routes.
 * Follows Wise Design System hierarchy: Keuangan > [Section] > [Detail]
 */
export function getBreadcrumbs(rawPath: string, locale: Locale = 'id'): BreadcrumbItem[] {
	const path = normalizePath(rawPath);
	const dashboardHref = resolve('/(app)/dashboard');
	const rootLabel = locale === 'en' ? 'Finance' : 'Keuangan';

	const items: BreadcrumbItem[] = [
		{
			label: rootLabel,
			href: dashboardHref
		}
	];

	if (path === '/' || path === '/dashboard') {
		return [
			{
				label: 'Dashboard',
				current: true
			}
		];
	}

	// Match against table-driven sub-route configurations
	for (const config of SUB_ROUTE_CONFIGS) {
		const parentLabel = config.parentLabel[locale] || config.parentLabel.id;

		if (path === config.prefix) {
			items.push({
				label: parentLabel,
				href: config.parentHref,
				current: true
			});
			return items;
		}

		if (path.startsWith(`${config.prefix}/`)) {
			items.push({
				label: parentLabel,
				href: config.parentHref
			});

			const subPath = path.slice(config.prefix.length + 1);
			const subRouteObj = config.subRoutes?.[subPath];
			let detailLabel = subRouteObj ? (subRouteObj[locale] || subRouteObj.id) : undefined;

			if (!detailLabel) {
				if (subPath.endsWith('/edit')) {
					detailLabel = `Edit ${parentLabel}`;
				} else {
					detailLabel = config.defaultDetailLabel[locale] || config.defaultDetailLabel.id;
				}
			}

			items.push({
				label: detailLabel,
				href: path,
				current: true
			});
			return items;
		}
	}

	// Dynamic fallback for any other nested sub-route
	const segments = path.split('/').filter(Boolean);
	let accumulated = '';
	for (let i = 0; i < segments.length; i++) {
		const seg = segments[i];
		accumulated += `/${seg}`;
		const isLast = i === segments.length - 1;
		const segObj = SEGMENT_LABELS[seg];
		const label = segObj ? (segObj[locale] || segObj.id) : seg.charAt(0).toUpperCase() + seg.slice(1);

		items.push({
			label,
			href: accumulated,
			...(isLast ? { current: true } : {})
		});
	}

	return items;
}
