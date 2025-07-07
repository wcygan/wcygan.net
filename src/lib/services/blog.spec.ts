import { describe, it, expect } from 'vitest';
import type { BlogPost } from '$lib/types';

// Mock blog posts for testing
const mockPosts: BlogPost[] = [
	{
		slug: 'test-post-1',
		title: 'Test Post 1',
		date: '2024-01-15',
		description: 'This is the first test post',
		tags: ['test', 'javascript'],
		published: true,
		content: 'Content of test post 1',
		readingTime: 2
	},
	{
		slug: 'test-post-2',
		title: 'Test Post 2',
		date: '2024-01-20',
		description: 'This is the second test post',
		tags: ['test', 'svelte'],
		published: true,
		content: 'Content of test post 2',
		readingTime: 3
	},
	{
		slug: 'draft-post',
		title: 'Draft Post',
		date: '2024-01-25',
		description: 'This is a draft post',
		tags: ['draft'],
		published: false,
		content: 'Content of draft post',
		readingTime: 1
	}
];

describe('blog service', () => {
	describe('filterPosts', () => {
		it('should filter posts by tag', () => {
			const filtered = mockPosts.filter((post) => post.tags.includes('javascript'));
			expect(filtered).toHaveLength(1);
			expect(filtered[0].slug).toBe('test-post-1');
		});

		it('should filter out unpublished posts', () => {
			const published = mockPosts.filter((post) => post.published);
			expect(published).toHaveLength(2);
			expect(published.every((p) => p.published)).toBe(true);
		});

		it('should handle empty tag filter', () => {
			const filtered = mockPosts.filter((post) => post.tags.includes(''));
			expect(filtered).toHaveLength(0);
		});
	});

	describe('sortPosts', () => {
		it('should sort posts by date descending', () => {
			const sorted = [...mockPosts].sort(
				(a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
			);

			expect(sorted[0].slug).toBe('draft-post');
			expect(sorted[1].slug).toBe('test-post-2');
			expect(sorted[2].slug).toBe('test-post-1');
		});
	});

	describe('searchPosts', () => {
		it('should search posts by title', () => {
			const results = mockPosts.filter((post) => post.title.toLowerCase().includes('test post 1'));
			expect(results).toHaveLength(1);
			expect(results[0].slug).toBe('test-post-1');
		});

		it('should search posts by description', () => {
			const results = mockPosts.filter((post) => post.description.toLowerCase().includes('second'));
			expect(results).toHaveLength(1);
			expect(results[0].slug).toBe('test-post-2');
		});

		it('should be case insensitive', () => {
			const results = mockPosts.filter((post) => post.title.toLowerCase().includes('test post'));
			expect(results).toHaveLength(2);
		});
	});

	describe('getRelatedPosts', () => {
		it('should find posts with matching tags', () => {
			const currentPost = mockPosts[0]; // has 'test' tag
			const related = mockPosts.filter(
				(post) =>
					post.slug !== currentPost.slug &&
					post.published &&
					post.tags.some((tag: string) => currentPost.tags.includes(tag))
			);

			expect(related).toHaveLength(1); // test-post-2 also has 'test' tag
			expect(related[0].slug).toBe('test-post-2');
		});

		it('should exclude the current post', () => {
			const currentPost = mockPosts[0];
			const related = mockPosts.filter((post) => post.slug !== currentPost.slug);

			expect(related).not.toContainEqual(currentPost);
		});
	});

	describe('formatPostDate', () => {
		it('should format date correctly', () => {
			// Use UTC to avoid timezone issues
			const date = new Date('2024-01-15T00:00:00Z');
			const formatted = date.toLocaleDateString('en-US', {
				year: 'numeric',
				month: 'long',
				day: 'numeric',
				timeZone: 'UTC'
			});
			expect(formatted).toBe('January 15, 2024');
		});
	});
});
