import { createServer } from "node:http";
import {
  access,
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve } from "node:path";
import { spawn } from "node:child_process";
import net from "node:net";

const root = resolve(import.meta.dirname, "..");
const diagramsDir = resolve(root, "src/diagrams");
const publicDir = resolve(root, "public");
// Freshness is keyed on this script too, so theme/config edits force a re-render.
const selfPath = resolve(import.meta.filename);

// Local Chrome is required to render. The script is best-effort: when no Chrome
// binary is found (e.g. the Cloudflare build container) it logs and exits 0 so
// the build keeps using the committed SVGs.
const CHROME_CANDIDATES = [
  process.env.PUPPETEER_EXECUTABLE_PATH,
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
].filter(Boolean);

// Shared theme + per-diagram-type config. This script is the sole owner of the
// diagram theme (it replaced a runtime React component). htmlLabels stays false
// so SVG <text> measures correctly at build time, which avoids the foreignObject
// padding hack the runtime renderer needed.
const mermaidConfig = {
  startOnLoad: false,
  securityLevel: "loose",
  logLevel: "error",
  htmlLabels: false,
  theme: "base",
  themeVariables: {
    background: "#ffffff",
    primaryColor: "#f9f9f9",
    primaryBorderColor: "#466eaa",
    primaryTextColor: "#000000",
    secondaryColor: "#f9f9f9",
    tertiaryColor: "#ffffff",
    nodeBkg: "#f9f9f9",
    nodeBorder: "#466eaa",
    nodeTextColor: "#000000",
    lineColor: "#666666",
    textColor: "#000000",
    mainBkg: "#f9f9f9",
    secondBkg: "#ffffff",
    actorBkg: "#f9f9f9",
    actorBorder: "#466eaa",
    actorTextColor: "#000000",
    actorLineColor: "#666666",
    signalColor: "#666666",
    signalTextColor: "#000000",
    labelBoxBkgColor: "#f9f9f9",
    labelBoxBorderColor: "#466eaa",
    labelTextColor: "#000000",
    loopTextColor: "#000000",
    noteBorderColor: "#466eaa",
    noteBkgColor: "#f9f9f9",
    noteTextColor: "#000000",
    activationBorderColor: "#466eaa",
    activationBkgColor: "#f9f9f9",
    sequenceNumberColor: "#000000",
    specialStateColor: "#466eaa",
    innerEndBackground: "#f9f9f9",
    compositeBackground: "#f9f9f9",
    compositeTitleBackground: "#ffffff",
    classText: "#000000",
    git0: "#466eaa",
    git1: "#1e468c",
    git2: "#E69F00",
    git3: "#0072B2",
    git4: "#CC79A7",
    git5: "#009E73",
    git6: "#D55E00",
    git7: "#F0E442",
    gitBranchLabel0: "#000000",
    gitBranchLabel1: "#000000",
    gitBranchLabel2: "#000000",
    gitBranchLabel3: "#000000",
    gitBranchLabel4: "#000000",
    gitBranchLabel5: "#000000",
    gitBranchLabel6: "#000000",
    gitBranchLabel7: "#000000",
    gitInnerCommitLabel: "#000000",
    gitBranchLabelColor: "#000000",
    gitLabelColor: "#000000",
    commitLabelFontSize: "16px",
    commitLabelColor: "#000000",
    pie1: "#466eaa",
    pie2: "#1e468c",
    pie3: "#E69F00",
    pie4: "#0072B2",
    pie5: "#CC79A7",
    pie6: "#009E73",
    pie7: "#D55E00",
    pie8: "#F0E442",
    pie9: "#666666",
    pie10: "#aaaaaa",
    pie11: "#dedede",
    pie12: "#000000",
    section0: "#466eaa",
    section1: "#1e468c",
    section2: "#E69F00",
    section3: "#0072B2",
    clusterBkg: "#f9f9f9",
    clusterBorder: "#dedede",
    defaultLinkColor: "#666666",
    titleColor: "#466eaa",
    edgeLabelBackground: "#f9f9f9",
    errorBkgColor: "#f9f9f9",
    errorTextColor: "#D55E00",
    fontFamily:
      '"Inter", system, -apple-system, "system-ui", "Helvetica Neue", "Lucida Grande", sans-serif',
    fontSize: "16px",
  },
  flowchart: {
    useMaxWidth: true,
    htmlLabels: false,
    curve: "basis",
    padding: 20,
    subGraphTitleMargin: { top: 8, bottom: 16 },
  },
  sequence: {
    useMaxWidth: true,
    actorMargin: 50,
    width: 150,
    height: 65,
    boxMargin: 10,
    boxTextMargin: 5,
    noteMargin: 10,
    messageMargin: 35,
  },
  state: { useMaxWidth: true },
  gitGraph: {
    useMaxWidth: true,
    mainBranchName: "main",
    showBranches: true,
    showCommitLabel: true,
  },
  pie: { useMaxWidth: true, textPosition: 0.75 },
};

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function findChrome() {
  for (const candidate of CHROME_CANDIDATES) {
    if (await exists(candidate)) return candidate;
  }
  return null;
}

// Discover every `.mmd` under src/diagrams and mirror its path into public/.
// A sibling `<name>.css` becomes an inlined <style> in the SVG so charts that
// rely on styling stay self-contained when embedded via <img>.
async function collectDiagrams() {
  const diagrams = [];

  async function walk(dir) {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(fullPath);
        continue;
      }
      if (!entry.name.endsWith(".mmd")) continue;

      const relativePath = relative(diagramsDir, fullPath);
      const outputPath = resolve(
        publicDir,
        relativePath.replace(/\.mmd$/, ".svg"),
      );
      const cssPath = fullPath.replace(/\.mmd$/, ".css");
      diagrams.push({
        sourcePath: fullPath,
        outputPath,
        cssPath: (await exists(cssPath)) ? cssPath : null,
        id: relativePath.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, ""),
      });
    }
  }

  await walk(diagramsDir);
  return diagrams.sort((a, b) => a.sourcePath.localeCompare(b.sourcePath));
}

// Skip rendering when the SVG is newer than both its source and its sidecar CSS.
async function isUpToDate(diagram) {
  if (!(await exists(diagram.outputPath))) return false;
  const outputTime = (await stat(diagram.outputPath)).mtimeMs;
  const inputs = [diagram.sourcePath, diagram.cssPath, selfPath].filter(
    Boolean,
  );
  for (const input of inputs) {
    if ((await stat(input)).mtimeMs > outputTime) return false;
  }
  return true;
}

function getFreePort() {
  return new Promise((resolvePort, reject) => {
    const server = net.createServer();
    server.unref();
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      server.close(() => resolvePort(address.port));
    });
  });
}

function createRendererServer() {
  const html = `<!doctype html>
<meta charset="utf-8">
<div id="target"></div>
<script type="module">
  import mermaid from "/node_modules/mermaid/dist/mermaid.esm.mjs";

  window.renderMermaid = async (id, diagram, config) => {
    mermaid.initialize(config);
    const result = await mermaid.render(id, diagram.trim());
    return result.svg;
  };

  window.__ready = true;
</script>`;

  return createServer(async (request, response) => {
    if (request.url === "/") {
      response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      response.end(html);
      return;
    }

    if (request.url?.startsWith("/node_modules/")) {
      const filePath = resolve(root, `.${request.url}`);
      if (!filePath.startsWith(resolve(root, "node_modules"))) {
        response.writeHead(403);
        response.end("Forbidden");
        return;
      }

      try {
        const body = await readFile(filePath);
        response.writeHead(200, {
          "Content-Type": filePath.endsWith(".css")
            ? "text/css"
            : "text/javascript",
        });
        response.end(body);
        return;
      } catch {
        response.writeHead(404);
        response.end("Not found");
        return;
      }
    }

    response.writeHead(404);
    response.end("Not found");
  });
}

async function listen(server, port) {
  await new Promise((resolveListen, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", resolveListen);
  });
}

async function waitForBrowser(debugPort) {
  const url = `http://127.0.0.1:${debugPort}/json/version`;
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try {
      const response = await fetch(url);
      if (response.ok) return await response.json();
    } catch {
      await new Promise((resolveWait) => setTimeout(resolveWait, 100));
    }
  }

  throw new Error("Timed out waiting for Chrome DevTools Protocol");
}

async function createCdpSession(webSocketDebuggerUrl) {
  const socket = new WebSocket(webSocketDebuggerUrl);
  await new Promise((resolveOpen, reject) => {
    socket.addEventListener("open", resolveOpen, { once: true });
    socket.addEventListener("error", reject, { once: true });
  });

  let id = 1;
  const pending = new Map();

  socket.addEventListener("message", (event) => {
    const message = JSON.parse(String(event.data));
    if (!message.id || !pending.has(message.id)) return;

    const { resolve: resolveMessage, reject } = pending.get(message.id);
    pending.delete(message.id);

    if (message.error) reject(new Error(JSON.stringify(message.error)));
    else resolveMessage(message.result);
  });

  // Reject everything in flight if Chrome goes away mid-render, otherwise a
  // crashed browser leaves send() promises hanging and the build never returns.
  const failPending = (reason) => {
    for (const { reject } of pending.values()) reject(new Error(reason));
    pending.clear();
  };
  socket.addEventListener("close", () => failPending("CDP socket closed"), {
    once: true,
  });
  socket.addEventListener("error", () => failPending("CDP socket error"), {
    once: true,
  });

  function send(method, params = {}, sessionId) {
    return new Promise((resolveMessage, reject) => {
      const requestId = id;
      id += 1;
      pending.set(requestId, { resolve: resolveMessage, reject });
      socket.send(
        JSON.stringify({
          id: requestId,
          method,
          params,
          ...(sessionId ? { sessionId } : {}),
        }),
      );
    });
  }

  return { socket, send };
}

async function evaluate(cdp, sessionId, expression) {
  const result = await cdp.send(
    "Runtime.evaluate",
    { expression, awaitPromise: true, returnByValue: true },
    sessionId,
  );

  if (result.exceptionDetails) {
    throw new Error(JSON.stringify(result.exceptionDetails));
  }

  return result.result.value;
}

async function waitForReady(cdp, sessionId) {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    if (await evaluate(cdp, sessionId, "window.__ready === true")) return;
    await new Promise((resolveWait) => setTimeout(resolveWait, 100));
  }

  throw new Error("Timed out waiting for Mermaid renderer page");
}

async function waitForProcessExit(child) {
  if (child.exitCode !== null || child.signalCode !== null) return;
  await new Promise((resolveExit) => child.once("exit", resolveExit));
}

// Bake the viewBox dimensions into width/height so the SVG has a stable
// intrinsic size, and drop max-width so CSS owns responsive sizing.
function makeStableSvg(svg) {
  return svg
    .replace(/\s*style="max-width: [^"]+"/, "")
    .replace(/<svg\b([^>]*)>/, (match, attributes) => {
      const viewBox = attributes.match(/\bviewBox="([^"]+)"/)?.[1];
      if (!viewBox) return match;

      const [, , width, height] = viewBox.split(/\s+/).map(Number);
      if (!Number.isFinite(width) || !Number.isFinite(height)) return match;

      const withoutSize = attributes
        .replace(/\swidth="[^"]*"/, "")
        .replace(/\sheight="[^"]*"/, "");

      return `<svg${withoutSize} width="${width}" height="${height}">`;
    });
}

function injectStyle(svg, css) {
  return svg.replace(
    /(<svg\b[^>]*>)/,
    (match) => `${match}<style>\n${css.trim()}\n</style>`,
  );
}

function readSvgSize(svg) {
  const width = svg.match(/<svg\b[^>]*\swidth="([^"]+)"/)?.[1];
  const height = svg.match(/<svg\b[^>]*\sheight="([^"]+)"/)?.[1];
  return { width, height };
}

async function renderAll(diagrams) {
  const chromePath = await findChrome();
  if (!chromePath) {
    console.log(
      "[render-diagrams] No Chrome binary found; keeping committed SVGs.",
    );
    return;
  }

  const serverPort = await getFreePort();
  const debugPort = await getFreePort();
  const userDataDir = await mkdtemp(join(tmpdir(), "wcygan-mermaid-render-"));
  const server = createRendererServer();

  await listen(server, serverPort);

  const chrome = spawn(chromePath, [
    "--headless=new",
    `--remote-debugging-port=${debugPort}`,
    `--user-data-dir=${userDataDir}`,
    "--disable-gpu",
    "--no-first-run",
    "--no-default-browser-check",
    "about:blank",
  ]);
  // Prevent an async spawn failure (e.g. the binary lost its exec bit between
  // the access() check and here) from crashing the process as an unhandled
  // 'error' event. The CDP wait below then times out and we skip gracefully.
  chrome.once("error", () => {});

  try {
    const { webSocketDebuggerUrl } = await waitForBrowser(debugPort);
    const cdp = await createCdpSession(webSocketDebuggerUrl);
    const { targetId } = await cdp.send("Target.createTarget", {
      url: `http://127.0.0.1:${serverPort}/`,
    });
    const { sessionId } = await cdp.send("Target.attachToTarget", {
      targetId,
      flatten: true,
    });

    await cdp.send("Runtime.enable", {}, sessionId);
    await waitForReady(cdp, sessionId);

    // Render each diagram in isolation: a syntax error in one .mmd must not
    // skip the others (they would silently keep stale committed SVGs).
    const failures = [];
    for (const diagram of diagrams) {
      try {
        const source = await readFile(diagram.sourcePath, "utf8");
        let svg = await evaluate(
          cdp,
          sessionId,
          `window.renderMermaid(${JSON.stringify(diagram.id)}, ${JSON.stringify(source)}, ${JSON.stringify(mermaidConfig)})`,
        );

        svg = makeStableSvg(svg);
        if (diagram.cssPath) {
          svg = injectStyle(svg, await readFile(diagram.cssPath, "utf8"));
        }

        await mkdir(dirname(diagram.outputPath), { recursive: true });
        await writeFile(diagram.outputPath, `${svg}\n`);

        const { width, height } = readSvgSize(svg);
        console.log(
          `${relative(root, diagram.sourcePath)} -> ${relative(root, diagram.outputPath)}  (${width} x ${height})`,
        );
      } catch (error) {
        failures.push(relative(root, diagram.sourcePath));
        console.error(
          `[render-diagrams] Failed: ${relative(root, diagram.sourcePath)}: ${error?.message ?? error}`,
        );
      }
    }

    await cdp.send("Target.closeTarget", { targetId }).catch(() => {});
    cdp.socket.close();

    if (failures.length > 0) {
      throw new Error(`Failed to render ${failures.length} diagram(s)`);
    }
  } finally {
    chrome.kill("SIGTERM");
    await waitForProcessExit(chrome);
    server.close();
    await rm(userDataDir, { recursive: true, force: true });
  }
}

export async function renderDiagrams({ force = false } = {}) {
  const all = await collectDiagrams();
  if (all.length === 0) {
    console.log("[render-diagrams] No .mmd sources found.");
    return;
  }

  const pending = [];
  for (const diagram of all) {
    if (force || !(await isUpToDate(diagram))) pending.push(diagram);
  }

  if (pending.length === 0) {
    console.log("[render-diagrams] All SVGs up to date.");
    return;
  }

  await renderAll(pending);
}

const invokedDirectly =
  process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename);

if (invokedDirectly) {
  renderDiagrams({ force: process.argv.includes("--force") }).catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
