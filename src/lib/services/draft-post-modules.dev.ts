import type { LazyMdxModule, MdxModule } from "./post-modules";

export const includeDraftPosts = true;

// Draft routes stay addressable in development, but their MDX is loaded only
// when that route is opened.
export const draftPostFiles: Record<string, MdxModule> = {};

export const draftPostModules: Record<string, LazyMdxModule> =
  import.meta.glob<MdxModule>("/src/posts/*.draft.mdx");
