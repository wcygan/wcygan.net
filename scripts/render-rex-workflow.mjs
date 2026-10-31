import { readFile, writeFile, mkdtemp, rm } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Official icons: Rex documentation, Tailscale media kit, and the installed ChatGPT app.
const assets = new URL("../public/rex-workflow/", import.meta.url);
const icons = {};
for (const [name, type] of [
  ["chatgpt", "png"],
  ["rex", "png"],
  ["tailscale", "svg"],
]) {
  const bytes = await readFile(new URL(`${name}.${type}`, assets));
  icons[name] =
    `data:image/${type === "svg" ? "svg+xml" : type};base64,${bytes.toString("base64")}`;
}
const device =
  '<rect x="1" y="0" width="16" height="28" rx="3"/><path d="M7 23h4M23 3h27v20H23zM20 27h33"/>';
const session =
  '<rect x="1" y="3" width="42" height="34" rx="4"/><path d="M1 11h42M23 11v26M6 18l4 4-4 4M13 27h5M28 18h10M28 24h10M28 30h6"/>';
function diagram(width) {
  const compact = width === 360;
  const middle = width / 2;
  const nodeWidth = (width - 68) / 2;
  const columns = [24, width - 24 - nodeWidth];
  const centers = columns.map((x) => x + nodeWidth / 2);
  const nodes = [];
  const flow = [];
  const regions = [
    [2, 250, "Client device"],
    [276, 144, "Cloud / networking"],
    [444, 282, "Self-hosted device"],
  ].map(
    ([y, height, label]) => `<g class="region">
<rect x="4" y="${y}" width="${width - 8}" height="${height}" rx="12"/>
<text class="region-label" x="${middle}" y="${y + 20}" text-anchor="middle">${label}</text>
</g>`,
  );
  function path(d) {
    flow.push(`<path class="flow" d="${d}"/>`);
  }
  function arrow(x, y) {
    path(`M${x - 4} ${y - 5}l4 5 4-5`);
  }
  function connect(x, from, to) {
    path(`M${x} ${from}V${to - 2}`);
    arrow(x, to - 2);
  }
  function node({
    x,
    y,
    w = nodeWidth,
    h = 96,
    icon,
    title,
    detail,
    family = "",
  }) {
    const small = compact && w !== 284;
    const iconSize = small ? 28 : 40;
    const image = icons[icon]
      ? `<image width="${iconSize}" height="${iconSize}" href="${icons[icon]}"/>`
      : `<g class="line-icon">${icon === "device" ? device : session}</g>`;
    const labels = small ? title : [title.join(" ")];
    const text =
      labels
        .map(
          (label, i) =>
            `<text class="label" x="0" y="${i * 18}">${label}</text>`,
        )
        .join("") +
      (!small && detail
        ? `<text class="detail" x="0" y="23">${detail}</text>`
        : "");
    nodes.push(`<g class="node ${family}" data-x="${x}" data-y="${y}" data-w="${w}" data-h="${h}">
<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="7"/>
<g class="content"><g class="node-icon">${image}</g><g class="node-text"${small ? ' font-size="13"' : ""}>${text}</g></g></g>`);
  }
  node({
    x: middle - 142,
    y: 32,
    w: 284,
    h: 82,
    icon: "device",
    title: ["Your device"],
    detail: "Phone · laptop",
  });
  path(`M${middle} 114V128M${centers[0]} 146V128H${centers[1]}V146`);
  centers.forEach((x) => arrow(x, 146));
  columns.forEach((x, i) => {
    const rex = i === 1;
    node({
      x,
      y: 148,
      h: 88,
      icon: rex ? "rex" : "chatgpt",
      title: rex ? ["Rex client"] : ["ChatGPT", "client"],
    });
    connect(centers[i], 236, 308);
    node({
      x,
      y: 308,
      icon: rex ? "tailscale" : "chatgpt",
      title: rex ? ["Tailscale"] : ["ChatGPT", "server"],
      detail: rex ? "Private device network" : "Cloud-hosted dot",
      family: rex ? "transport" : "cloud",
    });
    connect(centers[i], 404, 476);
    node({
      x,
      y: 476,
      icon: rex ? "rex" : "chatgpt",
      title: rex ? ["Rex server"] : ["ChatGPT", "desktop app"],
      detail: "On your project machine",
    });
  });
  path(`M${centers[0]} 572V596H${centers[1]}V572M${middle} 596V622`);
  arrow(middle, 622);
  node({
    x: middle - 142,
    y: 624,
    w: 284,
    h: 82,
    icon: "session",
    title: ["Project session"],
    detail: "Terminals · agents · tests",
    family: "session",
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} 742" role="img" aria-labelledby="title desc">
<title id="title">Two paths to your project session</title>
<desc id="desc">Your device runs a ChatGPT client or a Rex client. The ChatGPT client reaches a cloud-hosted dot, which accesses ChatGPT desktop on your project machine. The Rex client reaches a Rex server over Tailscale. Both paths lead to your project session. Dashed rectangles enclose the client device, cloud and networking, and self-hosted device regions.</desc>
<style>text{font-family:Arial,sans-serif;fill:#21201c}.region-label{font-size:12px;font-weight:600;fill:#595954}.region>rect{fill:none;stroke:#777770;stroke-width:1.2;stroke-dasharray:6 5}.label{font-size:15px;font-weight:600}.detail{font-size:12.5px;fill:#595954}.node-text[font-size] .label{font-size:13px}.node>rect{fill:#fff;stroke:#777770;stroke-width:1.4}.cloud>rect{fill:#f2eafa;stroke:#6533a0}.transport>rect{fill:#f0f7f4;stroke:#006b63}.session>rect{fill:#f7f6f3}.line-icon{fill:none;stroke:#595954;stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round}.flow{fill:none;stroke:#006b63;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round}</style>
${regions.join("\n")}${flow.join("\n")}${nodes.join("\n")}</svg>`;
}
const temporary = await mkdtemp(join(tmpdir(), "rex-diagram-"));
try {
  const html = `<html><body>${diagram(620)}${diagram(360)}<script>
for (const node of document.querySelectorAll('.node')) {
  const icon = node.querySelector('.node-icon');
  const text = node.querySelector('.node-text');
  const content = node.querySelector('.content');
  const ib = icon.getBBox();
  const tb = text.getBBox();
  const gap = Number(node.dataset.w) < 200 ? 10 : 16;
  const height = Math.max(ib.height, tb.height);
  icon.setAttribute('transform', 'translate(' + -ib.x + ' ' + ((height-ib.height)/2-ib.y) + ')');
  text.setAttribute('transform', 'translate(' + (ib.width+gap-tb.x) + ' ' + ((height-tb.height)/2-tb.y) + ')');
  const box = content.getBBox();
  if (box.width > Number(node.dataset.w)-16 || box.height > Number(node.dataset.h)-16) throw new Error('Node content overflows');
  content.setAttribute('transform','translate(' + (Number(node.dataset.x)+(Number(node.dataset.w)-box.width)/2-box.x) + ' ' + (Number(node.dataset.y)+(Number(node.dataset.h)-box.height)/2-box.y) + ')');
}
const output = [...document.querySelectorAll('svg')].map(svg => new XMLSerializer().serializeToString(svg));
document.body.textContent = 'RESULT:' + btoa(unescape(encodeURIComponent(JSON.stringify(output))));
</script></body></html>`;
  const page = join(temporary, "render.html");
  await writeFile(page, html);
  const chrome =
    process.env.PUPPETEER_EXECUTABLE_PATH ||
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
  const output = execFileSync(
    chrome,
    [
      "--headless=new",
      "--disable-gpu",
      `--user-data-dir=${join(temporary, "profile")}`,
      "--dump-dom",
      `file://${page}`,
    ],
    {
      encoding: "utf8",
      maxBuffer: 10 * 1024 * 1024,
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  const encoded = output.match(/RESULT:([A-Za-z0-9+/=]+)/)?.[1];
  if (!encoded) throw new Error("Diagram layout failed");
  const diagrams = JSON.parse(Buffer.from(encoded, "base64").toString());
  for (const [index, name] of [
    "comparison.svg",
    "comparison-mobile.svg",
  ].entries()) {
    await writeFile(new URL(name, assets), diagrams[index] + "\n");
    console.log(`Rendered ${name}`);
  }
} finally {
  await rm(temporary, { recursive: true, force: true });
}
