export interface PublicationMetadata {
  draft?: unknown;
  published?: unknown;
}

function publicationFlag(value: unknown): boolean | undefined {
  if (typeof value === "boolean") return value;
  if (typeof value !== "string") return undefined;

  const normalized = value.trim().toLowerCase();
  if (normalized === "true") return true;
  if (normalized === "false") return false;
  return undefined;
}

export function isPublicPost(metadata: PublicationMetadata): boolean {
  return (
    publicationFlag(metadata.draft) !== true &&
    publicationFlag(metadata.published) !== false
  );
}
