import { posts } from '$lib/posts';

export function load() {
	return {
		posts: posts
	};
}
