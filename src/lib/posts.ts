import { getAllPosts, getRecentPosts } from '$lib/services/blog';

export const posts = getAllPosts();
export { getRecentPosts };
