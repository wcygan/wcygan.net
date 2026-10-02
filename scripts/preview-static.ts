import { realpath, stat } from "node:fs/promises";
import { resolve, sep } from "node:path";

export async function staticResponse(
  request: Request,
  directory: string,
): Promise<Response> {
  if (!["GET", "HEAD"].includes(request.method))
    return new Response("Method not allowed", { status: 405 });
  const root = await realpath(directory);
  try {
    const path = decodeURIComponent(new URL(request.url).pathname);
    let target = resolve(root, `.${path}`);
    if (target !== root && !target.startsWith(root + sep))
      return new Response("Forbidden", { status: 403 });
    if ((await stat(target)).isDirectory())
      target = resolve(target, "index.html");
    target = await realpath(target);
    if (!target.startsWith(root + sep))
      return new Response("Forbidden", { status: 403 });
    if (!(await stat(target)).isFile())
      return new Response("Not found", { status: 404 });
    const file = Bun.file(target);
    return new Response(request.method === "HEAD" ? null : file, {
      headers: {
        "Content-Type": file.type,
        "Content-Length": String(file.size),
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
if (import.meta.main) {
  const directory = resolve(".output/public");
  await realpath(directory);
  const server = Bun.serve({
    hostname: "127.0.0.1",
    port: Number(process.env.PORT || 4173),
    fetch: (request) => staticResponse(request, directory),
  });
  console.log(`Static preview: ${server.url}`);
}
