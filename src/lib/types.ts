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
