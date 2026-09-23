// @ts-nocheck -- This Deno script uses Deno APIs and is checked with `deno check`.
import { createServer } from "npm:vite@7.2.7";

const DEFAULT_SAMPLES = 3;
const VIEWPORT = { width: 1440, height: 900 };
const TIMING_PREFIX = "3d-demo:";

interface CdpMessage {
  id?: number;
  method?: string;
  params?: Record<string, unknown>;
  result?: Record<string, unknown>;
  error?: { message: string };
}

interface TimingMeasure {
  name: string;
  durationMs: number;
}

interface RouteRun {
  route: string;
  measurements: TimingMeasure[];
  pendingStages: number;
  gpuRenderer: string | null;
}

class CdpConnection {
  readonly #socket: WebSocket;
  #nextId = 0;
  readonly #pending = new Map<
    number,
    {
      resolve: (value: Record<string, unknown>) => void;
      reject: (error: Error) => void;
    }
  >();
  readonly #listeners = new Map<
    string,
    Set<(params: Record<string, unknown>) => void>
  >();

  private constructor(socket: WebSocket) {
    this.#socket = socket;
    socket.addEventListener("message", (event) => {
      const message = JSON.parse(String(event.data)) as CdpMessage;
      if (message.id !== undefined) {
        const pending = this.#pending.get(message.id);
        if (!pending) return;
        this.#pending.delete(message.id);
        if (message.error) pending.reject(new Error(message.error.message));
        else pending.resolve(message.result ?? {});
        return;
      }
      if (!message.method) return;
      for (const listener of this.#listeners.get(message.method) ?? []) {
        listener(message.params ?? {});
      }
    });
    socket.addEventListener("close", () => {
      for (const [id, pending] of this.#pending) {
        this.#pending.delete(id);
        pending.reject(new Error("Chrome DevTools connection closed."));
      }
    });
  }

  static async connect(url: string): Promise<CdpConnection> {
    const socket = new WebSocket(url);
    await new Promise<void>((resolve, reject) => {
      socket.addEventListener("open", () => resolve(), { once: true });
      socket.addEventListener(
        "error",
        () => reject(new Error("Could not connect to Chrome DevTools.")),
        { once: true },
      );
    });
    return new CdpConnection(socket);
  }

  call<T extends Record<string, unknown> = Record<string, unknown>>(
    method: string,
    params: Record<string, unknown> = {},
  ): Promise<T> {
    const id = ++this.#nextId;
    return new Promise<T>((resolve, reject) => {
      this.#pending.set(id, {
        resolve: (value) => resolve(value as T),
        reject,
      });
      this.#socket.send(JSON.stringify({ id, method, params }));
    });
  }

  waitForEvent(method: string, timeoutMs: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const listeners = this.#listeners.get(method) ?? new Set();
      this.#listeners.set(method, listeners);
      const listener = () => {
        clearTimeout(timeout);
        listeners.delete(listener);
        resolve();
      };
      const timeout = setTimeout(() => {
        listeners.delete(listener);
        reject(new Error(`Timed out waiting for Chrome event ${method}.`));
      }, timeoutMs);
      listeners.add(listener);
    });
  }

  async evaluate<T>(expression: string): Promise<T> {
    const response = await this.call<{
      result?: { value?: T; description?: string };
      exceptionDetails?: { text?: string };
    }>("Runtime.evaluate", {
      expression,
      awaitPromise: true,
      returnByValue: true,
      userGesture: true,
    });
    if (response.exceptionDetails) {
      throw new Error(
        response.exceptionDetails.text ?? "Browser evaluation failed.",
      );
    }
    return response.result?.value as T;
  }

  close() {
    this.#socket.close();
  }
}

function samplesFromArgs(args: string[]): number {
  if (args.includes("--help") || args.includes("-h")) {
    console.log(
      "Usage: deno task benchmark:3d [--samples=3]\n" +
        "Runs one unrecorded warmup, then records the requested number of samples.",
    );
    Deno.exit(0);
  }

  let samples = DEFAULT_SAMPLES;
  for (const arg of args) {
    const match = /^--samples=(\d+)$/.exec(arg);
    if (!match) throw new Error(`Unknown argument: ${arg}`);
    samples = Number(match[1]);
  }
  if (!Number.isInteger(samples) || samples < 1 || samples > 10) {
    throw new Error("--samples must be an integer from 1 through 10.");
  }
  return samples;
}

async function findChrome(): Promise<string> {
  const configured = Deno.env.get("CHROME_BIN");
  const candidates = [
    configured,
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
  ].filter((value): value is string => Boolean(value));
  for (const candidate of candidates) {
    try {
      if ((await Deno.stat(candidate)).isFile) return candidate;
    } catch {
      // Try the next supported Chrome location.
    }
  }
  throw new Error(
    "Chrome or Chromium was not found. Set CHROME_BIN to its executable path.",
  );
}

async function articleRoutes(): Promise<string[]> {
  const routes: string[] = [];
  for await (const entry of Deno.readDir("src/posts")) {
    if (!entry.isFile || !entry.name.endsWith(".mdx")) continue;
    const slug = entry.name.replace(/\.draft\.mdx$/, "").replace(/\.mdx$/, "");
    routes.push(`/${slug}`);
  }
  return routes.sort();
}

async function commandOutput(command: string, args: string[]): Promise<string> {
  const result = await new Deno.Command(command, {
    args,
    stdout: "piped",
    stderr: "null",
  }).output();
  if (!result.success) return "unknown";
  return new TextDecoder().decode(result.stdout).trim();
}

async function sourceRevision() {
  const revision = await commandOutput("git", ["rev-parse", "HEAD"]);
  const status = await commandOutput("git", ["status", "--porcelain"]);
  const diff = await new Deno.Command("git", {
    args: ["diff", "HEAD", "--binary"],
    stdout: "piped",
    stderr: "null",
  }).output();
  const untracked = await commandOutput("git", [
    "ls-files",
    "--others",
    "--exclude-standard",
  ]);
  const extraFiles = untracked
    .split("\n")
    .filter((path) => path && !path.startsWith("benchmarks/3d/runs/"));
  const encoder = new TextEncoder();
  const fingerprintChunks: Uint8Array[] = [diff.stdout];
  for (const path of extraFiles) {
    fingerprintChunks.push(encoder.encode(`\n${path}\n`));
    try {
      fingerprintChunks.push(await Deno.readFile(path));
    } catch {
      fingerprintChunks.push(encoder.encode("<unreadable>"));
    }
  }
  const fingerprint = new Uint8Array(
    fingerprintChunks.reduce((total, chunk) => total + chunk.length, 0),
  );
  let offset = 0;
  for (const chunk of fingerprintChunks) {
    fingerprint.set(chunk, offset);
    offset += chunk.length;
  }
  const digest = await crypto.subtle.digest("SHA-256", fingerprint);
  const diffSha256 = [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
  return {
    revision,
    workingTreeDirty: status !== "unknown" && status.length > 0,
    workingTreeSha256: diffSha256,
  };
}

async function findFreePort(): Promise<number> {
  const listener = Deno.listen({ hostname: "127.0.0.1", port: 0 });
  const port = (listener.addr as Deno.NetAddr).port;
  listener.close();
  return port;
}

async function waitForFile(path: string, timeoutMs: number): Promise<string> {
  const end = Date.now() + timeoutMs;
  while (Date.now() < end) {
    try {
      return await Deno.readTextFile(path);
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
  }
  throw new Error(`Timed out waiting for ${path}.`);
}

async function startBrowser(chrome: string, profileDir: string) {
  const browser = new Deno.Command(chrome, {
    args: [
      "--headless=new",
      "--no-first-run",
      "--no-default-browser-check",
      "--disable-background-networking",
      "--disable-background-timer-throttling",
      "--disable-renderer-backgrounding",
      "--disable-backgrounding-occluded-windows",
      "--disable-extensions",
      "--disable-sync",
      "--enable-webgl",
      "--force-device-scale-factor=1",
      "--remote-debugging-port=0",
      `--user-data-dir=${profileDir}`,
      "about:blank",
    ],
    stdin: "null",
    stdout: "null",
    stderr: "null",
  }).spawn();

  try {
    const activePort = await waitForFile(
      `${profileDir}/DevToolsActivePort`,
      15_000,
    );
    const port = Number(activePort.split("\n")[0]);
    const targets = await fetch(`http://127.0.0.1:${port}/json/list`).then(
      (r) =>
        r.json() as Promise<
          Array<{ type: string; webSocketDebuggerUrl: string }>
        >,
    );
    const page = targets.find((target) => target.type === "page");
    if (!page) throw new Error("Chrome started without a page target.");
    return {
      browser,
      port,
      connection: await CdpConnection.connect(page.webSocketDebuggerUrl),
    };
  } catch (error) {
    try {
      browser.kill("SIGTERM");
    } catch {
      // The browser may already have exited.
    }
    throw error;
  }
}

async function navigate(connection: CdpConnection, url: string) {
  const loaded = connection.waitForEvent("Page.loadEventFired", 30_000);
  const result = await connection.call<{ errorText?: string }>(
    "Page.navigate",
    {
      url,
    },
  );
  if (result.errorText) {
    throw new Error(`Navigation failed: ${result.errorText}`);
  }
  await loaded;
}

async function runRoute(
  connection: CdpConnection,
  baseUrl: string,
  route: string,
): Promise<RouteRun> {
  const url = new URL(route, baseUrl).href;
  let result:
    | {
        measurements: TimingMeasure[];
        pendingStages: number;
        gpuRenderer: string | null;
      }
    | undefined;
  for (let attempt = 1; attempt <= 2; attempt++) {
    await navigate(connection, url);
    try {
      const page = await connection.evaluate<{
        title: string | null;
        stageCount: number;
        maxScroll: number;
        scrollStep: number;
      }>(`(async () => {
        const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
        const deadline = performance.now() + 10000;
        let lastChange = performance.now();
        const observer = new MutationObserver(() => { lastChange = performance.now(); });
        observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true });
        while (performance.now() < deadline && performance.now() - lastChange < 800) {
          await pause(100);
        }
        observer.disconnect();
        const articleTitle = document.querySelector("article h1")?.textContent ?? null;
        return {
          title: articleTitle,
          stageCount: document.querySelectorAll("[data-scene-loading]").length,
          maxScroll: Math.max(0, document.documentElement.scrollHeight - window.innerHeight),
          scrollStep: Math.max(420, Math.floor(window.innerHeight * 0.72)),
        };
      })()`);
      if (!page.title) throw new Error("Article route did not render.");

      // Visit each authored scene stage directly. This is resilient to article
      // length, fixed chrome, and the site's global smooth-scroll setting.
      for (let index = 0; index < page.stageCount; index++) {
        await connection.evaluate(
          `(document.querySelectorAll("[data-scene-loading]")[${index}])?.scrollIntoView({ block: "center", behavior: "instant" })`,
        );
        await connection.evaluate(`(async () => {
          const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
          const deadline = performance.now() + 12000;
          while (performance.now() < deadline) {
            const stage = document.querySelectorAll("[data-scene-loading]")[${index}];
            if (!stage || stage.getAttribute("data-scene-loading") !== "true") break;
            await wait(50);
          }
          await wait(100);
        })()`);
      }
      // Sweep the article too. This also catches scenes that do not expose a
      // loading-stage wrapper but still mount on viewport intersection.
      for (let top = 0; top <= page.maxScroll; top += page.scrollStep) {
        await connection.evaluate(
          `window.scrollTo({ top: ${top}, behavior: "instant" })`,
        );
        await connection.evaluate(`(async () => {
          const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
          const deadline = performance.now() + 12000;
          while (performance.now() < deadline) {
            const pending = [...document.querySelectorAll('[data-scene-loading="true"]')].some((element) => {
              const rect = element.getBoundingClientRect();
              return rect.top < window.innerHeight && rect.bottom > 0;
            });
            if (!pending) break;
            await wait(50);
          }
          await wait(100);
        })()`);
      }
      await connection.evaluate(
        'window.scrollTo({ top: 0, behavior: "instant" })',
      );
      result = await connection.evaluate<{
        measurements: TimingMeasure[];
        pendingStages: number;
        gpuRenderer: string | null;
      }>(`(async () => {
    await new Promise((resolve) => setTimeout(resolve, 150));
    const pendingStages = [...document.querySelectorAll('[data-scene-loading="true"]')].length;
    const measurements = performance.getEntriesByType("measure")
      .filter((entry) => entry.name.startsWith(${JSON.stringify(
        TIMING_PREFIX,
      )}))
      .map((entry) => ({ name: entry.name, durationMs: entry.duration }));
    let gpuRenderer = null;
    for (const canvas of document.querySelectorAll("canvas")) {
      const gl = canvas.getContext("webgl2");
      const debugInfo = gl?.getExtension("WEBGL_debug_renderer_info");
      if (debugInfo) {
        gpuRenderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
        break;
      }
    }
    return {
      measurements,
      pendingStages,
      gpuRenderer,
    };
  })()`);
      break;
    } catch (error) {
      if (
        attempt === 2 ||
        !(error instanceof Error) ||
        !error.message.includes("Inspected target navigated or closed")
      ) {
        throw error;
      }
      console.warn(`Retrying ${route} after a dev-server page reload.`);
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }
  if (!result) throw new Error(`${route} did not finish loading.`);
  return { route, ...result };
}

function median(values: number[]): number {
  const ordered = [...values].sort((a, b) => a - b);
  const middle = Math.floor(ordered.length / 2);
  return ordered.length % 2 === 0
    ? (ordered[middle - 1] + ordered[middle]) / 2
    : ordered[middle];
}

async function main() {
  const sampleCount = samplesFromArgs(Deno.args);
  const [chrome, routes, source] = await Promise.all([
    findChrome(),
    articleRoutes(),
    sourceRevision(),
  ]);
  const port = await findFreePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const server = await createServer({
    configFile: "vite.config.ts",
    server: { host: "127.0.0.1", port, strictPort: true },
  });
  let browser: Deno.ChildProcess | undefined;
  let connection: CdpConnection | undefined;
  let profileDir: string | undefined;

  try {
    await server.listen();
    const profile = await Deno.makeTempDir({ prefix: "wcygan-3d-bench-" });
    profileDir = profile;
    const running = await startBrowser(chrome, profile);
    browser = running.browser;
    connection = running.connection;
    await connection.call("Page.enable");
    await connection.call("Runtime.enable");
    await connection.call("Emulation.setDeviceMetricsOverride", {
      ...VIEWPORT,
      deviceScaleFactor: 1,
      mobile: false,
    });

    const browserVersion = await fetch(
      `http://127.0.0.1:${running.port}/json/version`,
    ).then((response) => response.json() as Promise<{ Browser: string }>);

    console.log(`Warmup: scanning ${routes.length} article routes…`);
    const warmup = [];
    for (const route of routes) {
      const result = await runRoute(connection, baseUrl, route);
      warmup.push(result);
    }
    const sceneRoutes = warmup
      .filter((result) => result.measurements.length > 0)
      .map((result) => result.route);
    if (sceneRoutes.length === 0) {
      throw new Error("No SceneCanvas timings were found.");
    }
    for (const result of warmup) {
      if (result.pendingStages > 0) {
        throw new Error(
          `${result.route} ended with ${result.pendingStages} pending demo stages.`,
        );
      }
      const ids = result.measurements.map((measure) => measure.name);
      if (new Set(ids).size !== ids.length) {
        throw new Error(`${result.route} mounted duplicate SceneCanvas ids.`);
      }
    }

    const samples: RouteRun[][] = [];
    for (let sample = 1; sample <= sampleCount; sample++) {
      console.log(
        `Sample ${sample}/${sampleCount}: ${sceneRoutes.length} demo routes…`,
      );
      const results: RouteRun[] = [];
      for (const route of sceneRoutes) {
        const result = await runRoute(connection, baseUrl, route);
        if (result.pendingStages > 0) {
          throw new Error(
            `${route} ended with ${result.pendingStages} pending demo stages.`,
          );
        }
        results.push(result);
      }
      samples.push(results);
    }

    const key = (route: string, measure: TimingMeasure) =>
      `${route}\n${measure.name}`;
    const countsFor = (runs: RouteRun[]) => {
      const counts = new Map<string, number>();
      for (const result of runs) {
        for (const measurement of result.measurements) {
          const id = key(result.route, measurement);
          counts.set(id, (counts.get(id) ?? 0) + 1);
        }
      }
      return counts;
    };
    const expectedCounts = countsFor(warmup);
    for (const [index, sample] of samples.entries()) {
      const observedCounts = countsFor(sample);
      const missing = [...expectedCounts.keys()].filter(
        (item) => !observedCounts.has(item),
      );
      const unexpected = [...observedCounts.keys()].filter(
        (item) => !expectedCounts.has(item),
      );
      const changedCounts = [...expectedCounts.entries()].filter(
        ([item, count]) => observedCounts.get(item) !== count,
      );
      if (missing.length || unexpected.length || changedCounts.length) {
        throw new Error(
          `Sample ${index + 1} changed the discovered scene set. Missing: ${
            missing.join(", ") || "none"
          }; unexpected: ${unexpected.join(", ") || "none"}; changed counts: ${
            changedCounts.map(([item]) => item).join(", ") || "none"
          }.`,
        );
      }
    }

    const observed = new Map<
      string,
      { route: string; name: string; values: number[] }
    >();
    for (const sample of samples) {
      for (const result of sample) {
        for (const measurement of result.measurements) {
          const id = key(result.route, measurement);
          const entry = observed.get(id) ?? {
            route: result.route,
            name: measurement.name,
            values: [],
          };
          entry.values.push(measurement.durationMs);
          observed.set(id, entry);
        }
      }
    }

    const runId = new Date().toISOString().replace(/[:.]/g, "-");
    const outputPath = `benchmarks/3d/runs/${runId}.json`;
    const output = {
      schemaVersion: 1,
      runId,
      recordedAt: new Date().toISOString(),
      scenario: "warm-local-development-first-frame",
      metric: {
        unit: "ms",
        start: "SceneCanvas client effect, before WebGL capability detection",
        stop: "first Fiber frame and following requestAnimationFrame callback",
        includesLazySceneModuleLoad: false,
      },
      environment: {
        browser: browserVersion.Browser,
        viewport: VIEWPORT,
        deviceScaleFactor: 1,
        os: `${Deno.build.os}-${Deno.build.arch}`,
        denoVersion: Deno.version.deno,
        gpuRenderer:
          warmup.find((result) => result.gpuRenderer)?.gpuRenderer ?? null,
        routeCountScanned: routes.length,
        routesWithScenes: sceneRoutes,
        warmupPasses: 1,
        measuredSamples: sampleCount,
      },
      source,
      scenes: [...observed.values()]
        .map((scene) => ({
          route: scene.route,
          id: scene.name.slice(
            TIMING_PREFIX.length,
            scene.name.lastIndexOf(":"),
          ),
          outcome: scene.name.slice(scene.name.lastIndexOf(":") + 1),
          samplesMs: scene.values.map((value) => Number(value.toFixed(2))),
          medianMs: Number(median(scene.values).toFixed(2)),
        }))
        .sort(
          (a, b) => a.id.localeCompare(b.id) || a.route.localeCompare(b.route),
        ),
    };

    await Deno.mkdir("benchmarks/3d/runs", { recursive: true });
    await Deno.writeTextFile(
      outputPath,
      `${JSON.stringify(output, null, 2)}\n`,
    );
    console.table(
      output.scenes.map((scene) => ({
        route: scene.route,
        scene: scene.id,
        medianMs: scene.medianMs,
        samples: scene.samplesMs.join(", "),
      })),
    );
    console.log(`Recorded ${output.scenes.length} scenes to ${outputPath}`);
  } finally {
    connection?.close();
    try {
      browser?.kill("SIGTERM");
      if (browser) {
        const exited = await Promise.race([
          browser.status.then(() => true),
          new Promise<false>((resolve) =>
            setTimeout(() => resolve(false), 2_000),
          ),
        ]);
        if (!exited) {
          browser.kill("SIGKILL");
          await Promise.race([
            browser.status,
            new Promise((resolve) => setTimeout(resolve, 2_000)),
          ]);
        }
      }
    } catch {
      // Chrome may already have exited.
    }
    if (profileDir) {
      await Deno.remove(profileDir, { recursive: true }).catch(() => {});
    }
    server.httpServer?.closeAllConnections();
    await Promise.race([
      server.close(),
      new Promise<void>((resolve) => setTimeout(resolve, 3_000)),
    ]);
  }
}

if (import.meta.main) {
  try {
    await main();
    Deno.exit(0);
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    Deno.exit(1);
  }
}
