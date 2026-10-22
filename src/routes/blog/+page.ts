import { getAllBlogPosts } from '#lib';
import type { PageLoad } from './$types';

export const prerender = true;

export const load: PageLoad = () => {
	const posts = getAllBlogPosts();
	return {
		posts
	};
};
