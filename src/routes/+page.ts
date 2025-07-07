import { getRecentPosts } from '$lib/posts';

export function load() {
	return {
		posts: getRecentPosts(5)
	};
}
