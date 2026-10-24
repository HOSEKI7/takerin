/**
 * Helper to determine whether a route is active given the current path and target URL.
 * Supports exact match (e.g. root routes) and prefix match (e.g. sub-routes).
 */
export function isRouteActive(currentPath: string, targetHref: string, exact: boolean): boolean {
	if (exact) {
		return currentPath === targetHref;
	}
	return currentPath === targetHref || currentPath.startsWith(`${targetHref}/`);
}
