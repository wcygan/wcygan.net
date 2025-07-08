// Base metadata shared by all post types
export interface PostMetadata {
	title: string;
	date: string;
	description: string;
	tags?: string[];
	published?: boolean;
}

// Post type for display in lists and cards
export interface Post extends PostMetadata {
	slug: string;
	readingTime?: number;
}

// Full blog post with content
export interface BlogPost extends Post {
	content: string;
	tags: string[]; // Required for blog posts
	published: boolean; // Required for blog posts
	readingTime: number; // Required after content processing
}

// Post file import type
export interface PostFile {
	metadata: PostMetadata;
	default: unknown;
}

// Experience type for About page
export interface Experience {
	id: string;
	company: string;
	title: string;
	period: string;
	summary: string;
	location?: string;
	technologies?: string[];
	achievements?: string[];
}
