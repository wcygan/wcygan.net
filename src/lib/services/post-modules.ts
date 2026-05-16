import type { PostMetadata } from "~/lib/types";

export interface MdxModule {
  frontmatter: PostMetadata;
  default: React.ComponentType;
}

export type LazyMdxModule = () => Promise<MdxModule>;
