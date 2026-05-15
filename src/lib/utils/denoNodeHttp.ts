import { ServerResponse } from "node:http";

const WRITE_HEAD_PATCH = Symbol.for("wcygan.deno-write-head-header-pairs");

type PatchedServerResponsePrototype = ServerResponse & {
  [WRITE_HEAD_PATCH]?: boolean;
};

type WriteHead = (this: ServerResponse, ...args: unknown[]) => ServerResponse;

export function normalizeHeaderPairsForDenoWriteHead(
  headers: unknown,
): unknown {
  if (!Array.isArray(headers)) return headers;

  const isHeaderPairList = headers.every(
    (entry) => Array.isArray(entry) && entry.length >= 2,
  );
  if (!isHeaderPairList) return headers;

  return headers.flatMap(([name, value]) => {
    if (Array.isArray(value)) {
      return value.flatMap((item) => [String(name), String(item)]);
    }

    return [String(name), String(value)];
  });
}

export function installDenoWriteHeadHeaderPairsPatch(): void {
  if (!("Deno" in globalThis)) return;

  const prototype = ServerResponse.prototype as PatchedServerResponsePrototype;
  if (prototype[WRITE_HEAD_PATCH]) return;

  const writeHead = prototype.writeHead as WriteHead;

  prototype.writeHead = function patchedWriteHead(
    this: ServerResponse,
    statusCode: number,
    statusMessageOrHeaders?: string | unknown,
    headers?: unknown,
  ) {
    if (Array.isArray(statusMessageOrHeaders)) {
      return writeHead.call(
        this,
        statusCode,
        normalizeHeaderPairsForDenoWriteHead(statusMessageOrHeaders),
      );
    }

    return writeHead.call(
      this,
      statusCode,
      statusMessageOrHeaders as string | undefined,
      normalizeHeaderPairsForDenoWriteHead(headers),
    );
  } as typeof prototype.writeHead;

  prototype[WRITE_HEAD_PATCH] = true;
}
