import type { Post, PostFile } from '$lib/types';
import { calculateReadingTime } from '$lib/utils/readingTime';

// This uses Vite's glob import feature
const postFiles = import.meta.glob<PostFile>('/src/posts/*.md', {
	eager: true
});

let _posts: Post[] | null = null;

function initPosts(): Post[] {
	if (!_posts) {
		_posts = Object.entries(postFiles)
			.map(([filepath, post]) => {
				const slug = filepath.replace('/src/posts/', '').replace('.md', '');

				// Calculate reading time from the post content
				let readingTime = 0;
				try {
					// Get the raw content as string for reading time calculation
					const contentMatch = post.default?.toString() || '';
					readingTime = calculateReadingTime(contentMatch);
				} catch {
					// Fallback if content extraction fails
					readingTime = 1;
				}

				return {
					slug,
					title: post.metadata.title,
					date: post.metadata.date,
					description: post.metadata.description,
					tags: post.metadata.tags || [],
					readingTime
				};
			})
			.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
	}
	return _posts;
}

export function getAllPosts(): Post[] {
	return initPosts();
}

export function getRecentPosts(count: number): Post[] {
	return initPosts().slice(0, count);
}

export function getPostBySlug(slug: string): Post | undefined {
	return initPosts().find((post) => post.slug === slug);
}

export function getPostsByTag(tag: string): Post[] {
	return initPosts().filter((post) => post.tags && post.tags.includes(tag));
}

export function getAllTags(): string[] {
	const allTags = initPosts()
		.flatMap((post) => post.tags || [])
		.filter((tag, index, array) => array.indexOf(tag) === index);
	return allTags.sort();
}
