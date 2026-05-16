import type { LazyMdxModule, MdxModule } from "./post-modules";

export const includeDraftPosts = false;

export const draftPostFiles: Record<string, MdxModule> = {};

export const draftPostModules: Record<string, LazyMdxModule> = {};
