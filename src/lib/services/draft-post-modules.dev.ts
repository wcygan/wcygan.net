import type { LazyMdxModule, MdxModule } from "./post-modules";

export const includeDraftPosts = true;

export const draftPostFiles = import.meta.glob<MdxModule>(
  "/src/posts/*.draft.mdx",
  { eager: true },
);

export const draftPostModules: Record<string, LazyMdxModule> =
  import.meta.glob<MdxModule>("/src/posts/*.draft.mdx");
