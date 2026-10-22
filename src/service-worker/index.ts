/// <reference types="@sveltejs/kit" />
/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />

import { self } from '$app/service-worker';
import { version } from '$app/env';
import { immutable, assets, prerendered } from '$app/manifest';
import { resolve } from '$app/paths';

const CACHE_NAME = `takerin-${version}`;

const resolveUrl = resolve as (pathname: string) => string;

// Resolve static and build asset paths
const PRECACHE_URLS = [
	...immutable.map((asset) => resolveUrl(asset.path)),
	...assets.map((asset) => resolveUrl(asset.path)),
	...prerendered.map((asset) => resolveUrl(asset.path)),
	resolveUrl('/offline')
];

const PRECACHE_SET = new Set(PRECACHE_URLS);

self.addEventListener('install', (event) => {
	async function initCache() {
		const cache = await caches.open(CACHE_NAME);
		// Precache all immutable assets, static assets, and the offline fallback page
		await cache.addAll(Array.from(PRECACHE_SET));
		await self.skipWaiting();
	}

	event.waitUntil(initCache());
});

self.addEventListener('activate', (event) => {
	async function cleanupOldCaches() {
		const keys = await caches.keys();
		for (const key of keys) {
			if (key !== CACHE_NAME) {
				await caches.delete(key);
			}
		}
		await self.clients.claim();
	}

	event.waitUntil(cleanupOldCaches());
});

self.addEventListener('fetch', (event) => {
	// Only handle GET requests
	if (event.request.method !== 'GET') return;

	const url = new URL(event.request.url);

	// Only handle same-origin requests
	if (url.origin !== self.location.origin) return;

	// Do not intercept authentication or server export endpoints
	if (url.pathname.startsWith('/api/auth') || url.pathname.startsWith('/api/export')) {
		return;
	}

	async function respond(): Promise<Response> {
		const cache = await caches.open(CACHE_NAME);

		// 1. Static and immutable build assets: Cache-First
		if (PRECACHE_SET.has(url.pathname)) {
			const cachedResponse = await cache.match(url.pathname);
			if (cachedResponse) {
				return cachedResponse;
			}
		}

		// 2. Navigation requests (HTML document views e.g. /dashboard)
		if (event.request.mode === 'navigate') {
			try {
				const networkResponse = await fetch(event.request);
				if (networkResponse.status === 200) {
					void cache.put(event.request, networkResponse.clone());
				}
				return networkResponse;
			} catch (err) {
				// Fall back to previously cached page if available
				const cachedPage = await cache.match(event.request);
				if (cachedPage) {
					return cachedPage;
				}

				// Otherwise return the pre-cached offline fallback page
				const offlineFallback = await cache.match(resolveUrl('/offline'));
				if (offlineFallback) {
					return offlineFallback;
				}

				throw err;
			}
		}

		// 3. For SvelteKit data endpoints (__data.json) & other assets: Network-First with cache fallback
		// Note: SvelteKit responses often have cache-control: no-store; we cache them for offline viewing
		try {
			const networkResponse = await fetch(event.request);
			if (networkResponse.status === 200) {
				void cache.put(event.request, networkResponse.clone());
			}
			return networkResponse;
		} catch (err) {
			const cachedResponse = await cache.match(event.request);
			if (cachedResponse) {
				return cachedResponse;
			}
			throw err;
		}
	}

	event.respondWith(respond());
});
