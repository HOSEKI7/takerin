import { resolve } from '$app/paths';

export interface BreadcrumbItem {
	label: string;
	href?: string;
	current?: boolean;
}

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
		items.push({
			label: 'Dashboard',
			href: dashboardHref,
			current: true
		});
		return items;
	}

	if (path === '/expenses') {
		items.push({
			label: 'Pengeluaran',
			href: resolve('/(app)/expenses'),
			current: true
		});
		return items;
	}

	if (path === '/expenses/new') {
		items.push({
			label: 'Pengeluaran',
			href: resolve('/(app)/expenses')
		});
		items.push({
			label: 'Catat Baru',
			href: resolve('/(app)/expenses/new'),
			current: true
		});
		return items;
	}

	if (path.startsWith('/expenses/') && path.endsWith('/edit')) {
		items.push({
			label: 'Pengeluaran',
			href: resolve('/(app)/expenses')
		});
		items.push({
			label: 'Edit Pengeluaran',
			href: path,
			current: true
		});
		return items;
	}

	if (path.startsWith('/expenses/')) {
		items.push({
			label: 'Pengeluaran',
			href: resolve('/(app)/expenses')
		});
		items.push({
			label: 'Detail Pengeluaran',
			href: path,
			current: true
		});
		return items;
	}

	if (path === '/categories') {
		items.push({
			label: 'Kategori',
			href: resolve('/(app)/categories'),
			current: true
		});
		return items;
	}

	if (path.startsWith('/categories/')) {
		items.push({
			label: 'Kategori',
			href: resolve('/(app)/categories')
		});
		items.push({
			label: 'Detail Kategori',
			href: path,
			current: true
		});
		return items;
	}

	if (path === '/history') {
		items.push({
			label: 'Riwayat',
			href: resolve('/(app)/history'),
			current: true
		});
		return items;
	}

	if (path.startsWith('/history/')) {
		items.push({
			label: 'Riwayat',
			href: resolve('/(app)/history')
		});
		items.push({
			label: 'Detail Periode',
			href: path,
			current: true
		});
		return items;
	}

	if (path === '/settings') {
		items.push({
			label: 'Pengaturan',
			href: resolve('/(app)/settings'),
			current: true
		});
		return items;
	}

	// Dynamic fallback for any other nested sub-route
	const segments = path.split('/').filter(Boolean);
	let accumulated = '';
	for (let i = 0; i < segments.length; i++) {
		const seg = segments[i];
		accumulated += `/${seg}`;
		const isLast = i === segments.length - 1;

		let label = seg.charAt(0).toUpperCase() + seg.slice(1);
		if (seg === 'settings') label = 'Pengaturan';
		else if (seg === 'expenses') label = 'Pengeluaran';
		else if (seg === 'categories') label = 'Kategori';
		else if (seg === 'history') label = 'Riwayat';

		items.push({
			label,
			href: accumulated,
			...(isLast ? { current: true } : {})
		});
	}

	return items;
}
