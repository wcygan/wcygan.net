// Base metadata shared by all post types
export interface PostMetadata {
  title: string;
  date: string;
  description: string;
  /** Optional hero image, 16:9. Path served from `public/`, e.g. `/batching/muffins.jpg`. */
  image?: string;
  imageAlt?: string;
  imageCaption?: string;
  relatedReading?: string;
  tags?: string[];
  draft?: boolean;
  published?: boolean;
  /** Available by its URL, but omitted from public post listings and indexes. */
  unlisted?: boolean;
}

// Post type for display in lists and cards
export interface Post extends PostMetadata {
  slug: string;
  readingTime?: number;
}
