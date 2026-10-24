import { resolve } from '$app/paths';

export interface BreadcrumbItem {
	label: string;
	href?: string;
	current?: boolean;
}

const SEGMENT_LABELS: Record<string, string> = {
	dashboard: 'Dashboard',
	expenses: 'Pengeluaran',
	categories: 'Kategori',
	history: 'Riwayat',
	settings: 'Pengaturan'
};

interface SubRouteConfig {
	prefix: string;
	parentLabel: string;
	parentHref: string;
	subRoutes?: Record<string, string>;
	defaultDetailLabel: string;
}

const SUB_ROUTE_CONFIGS: SubRouteConfig[] = [
	{
		prefix: '/expenses',
		parentLabel: 'Pengeluaran',
		parentHref: resolve('/(app)/expenses'),
		subRoutes: {
			new: 'Catat Baru'
		},
		defaultDetailLabel: 'Detail Pengeluaran'
	},
	{
		prefix: '/categories',
		parentLabel: 'Kategori',
		parentHref: resolve('/(app)/categories'),
		defaultDetailLabel: 'Detail Kategori'
	},
	{
		prefix: '/history',
		parentLabel: 'Riwayat',
		parentHref: resolve('/(app)/history'),
		defaultDetailLabel: 'Detail Periode'
	},
	{
		prefix: '/settings',
		parentLabel: 'Pengaturan',
		parentHref: resolve('/(app)/settings'),
		subRoutes: {
			security: 'Keamanan'
		},
		defaultDetailLabel: 'Detail Pengaturan'
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
export function getBreadcrumbs(rawPath: string): BreadcrumbItem[] {
	const path = normalizePath(rawPath);
	const dashboardHref = resolve('/(app)/dashboard');

	const items: BreadcrumbItem[] = [
		{
			label: 'Keuangan',
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
		if (path === config.prefix) {
			items.push({
				label: config.parentLabel,
				href: config.parentHref,
				current: true
			});
			return items;
		}

		if (path.startsWith(`${config.prefix}/`)) {
			items.push({
				label: config.parentLabel,
				href: config.parentHref
			});

			const subPath = path.slice(config.prefix.length + 1);
			let detailLabel = config.subRoutes?.[subPath];

			if (!detailLabel) {
				if (subPath.endsWith('/edit')) {
					detailLabel = `Edit ${config.parentLabel}`;
				} else {
					detailLabel = config.defaultDetailLabel;
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
		const label = SEGMENT_LABELS[seg] ?? seg.charAt(0).toUpperCase() + seg.slice(1);

		items.push({
			label,
			href: accumulated,
			...(isLast ? { current: true } : {})
		});
	}

	return items;
}
