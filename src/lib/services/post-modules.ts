import type { PostMetadata } from "~/lib/types";
import type { TableOfContentsItem } from "~/lib/table-of-contents";

export interface MdxModule {
  frontmatter: PostMetadata;
  toc?: TableOfContentsItem[];
  default: React.ComponentType;
}

export type LazyMdxModule = () => Promise<MdxModule>;
