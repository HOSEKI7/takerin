import { getBlogPostBySlug, getAllBlogPosts } from '#lib';
import { error } from '@sveltejs/kit';
import type { PageLoad, EntryGenerator } from './$types';

export const prerender = true;

export const entries: EntryGenerator = () => {
	const posts = getAllBlogPosts();
	return posts.map((post) => ({
		slug: post.slug
	}));
};

export const load: PageLoad = ({ params }) => {
	const post = getBlogPostBySlug(params.slug);
	if (!post) {
		error(404, 'Artikel blog tidak ditemukan');
	}

	return {
		post
	};
};
