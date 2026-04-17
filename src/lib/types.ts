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
