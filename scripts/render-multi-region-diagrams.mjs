import { createServer } from "node:http";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawn } from "node:child_process";
import net from "node:net";

const root = resolve(import.meta.dirname, "..");
const chromePath =
  process.env.PUPPETEER_EXECUTABLE_PATH ??
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

const diagrams = [
  {
    source: "src/diagrams/multi-region-data/single-region-topology.mmd",
    output: "public/multi-region-data/single-region-topology.svg",
  },
  {
    source: "src/diagrams/multi-region-data/single-region-ha-database.mmd",
    output: "public/multi-region-data/single-region-ha-database.svg",
  },
  {
    source: "src/diagrams/multi-region-data/multi-region-topology.mmd",
    output: "public/multi-region-data/multi-region-topology.svg",
  },
];

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
    clusterBkg: "#f9f9f9",
    clusterBorder: "#dedede",
    defaultLinkColor: "#666666",
    titleColor: "#466eaa",
    edgeLabelBackground: "#f9f9f9",
    fontFamily:
      '"Inter", system, -apple-system, "system-ui", "Helvetica Neue", "Lucida Grande", sans-serif',
    fontSize: "16px",
  },
  flowchart: {
    useMaxWidth: true,
    curve: "basis",
    padding: 20,
    subGraphTitleMargin: { top: 8, bottom: 16 },
  },
};

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

  const server = createServer(async (request, response) => {
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

    {
      response.writeHead(404);
      response.end("Not found");
      return;
    }
  });

  return server;
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

async function main() {
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

    for (const diagram of diagrams) {
      const sourcePath = resolve(root, diagram.source);
      const outputPath = resolve(root, diagram.output);
      const source = await readFile(sourcePath, "utf8");
      const id = diagram.output
        .replace(/^public\//, "")
        .replace(/[^a-z0-9]+/gi, "-")
        .replace(/^-|-$/g, "");
      const svg = await evaluate(
        cdp,
        sessionId,
        `window.renderMermaid(${JSON.stringify(id)}, ${JSON.stringify(source)}, ${JSON.stringify(mermaidConfig)})`,
      );

      await writeFile(outputPath, `${makeStableSvg(svg)}\n`);
      console.log(`${diagram.source} -> ${diagram.output}`);
    }

    await cdp.send("Target.closeTarget", { targetId }).catch(() => {});
    cdp.socket.close();
  } finally {
    chrome.kill("SIGTERM");
    await waitForProcessExit(chrome);
    server.close();
    await rm(userDataDir, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
