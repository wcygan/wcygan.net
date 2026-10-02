import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtemp, mkdir, writeFile, symlink, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { staticResponse } from "./preview-static";
let directory: string;
beforeEach(async () => {
  directory = await mkdtemp(join(tmpdir(), "static-preview-test-"));
  await mkdir(join(directory, "site/post"), { recursive: true });
  await writeFile(join(directory, "site/index.html"), "home");
  await writeFile(join(directory, "site/post/index.html"), "post");
  await writeFile(join(directory, "site/style.css"), "body {}");
  await writeFile(join(directory, "secret.txt"), "secret");
  await symlink(
    join(directory, "secret.txt"),
    join(directory, "site/link.txt"),
  );
});
afterEach(() => rm(directory, { recursive: true, force: true }));
const request = (path: string, method = "GET") =>
  staticResponse(
    new Request(`http://localhost${path}`, { method }),
    join(directory, "site"),
  );
describe("static preview", () => {
  it("serves root and article indexes", async () => {
    expect(await (await request("/")).text()).toBe("home");
    expect(await (await request("/post/")).text()).toBe("post");
  });
  it("sets asset content types and supports HEAD", async () => {
    expect((await request("/style.css")).headers.get("content-type")).toContain(
      "text/css",
    );
    expect(await (await request("/post/", "HEAD")).text()).toBe("");
  });
  it("returns 404 for missing files and blocks escape paths", async () => {
    expect((await request("/missing")).status).toBe(404);
    expect((await request("/..%2fsecret.txt")).status).toBe(403);
    expect((await request("/link.txt")).status).toBe(403);
  });
});
