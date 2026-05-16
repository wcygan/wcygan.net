function postFilename(filepath: string): string {
  return filepath.split("/").at(-1) ?? filepath;
}

export function isDraftPostFile(filepath: string): boolean {
  return postFilename(filepath).endsWith(".draft.mdx");
}

export function slugFromPostFilepath(filepath: string): string {
  return postFilename(filepath)
    .replace(/\.draft\.mdx$/, "")
    .replace(/\.mdx$/, "");
}
