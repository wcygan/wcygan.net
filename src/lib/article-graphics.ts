export type ArticleGraphicKind =
  | "canvas"
  | "dom"
  | "image"
  | "map"
  | "mermaid"
  | "svg";

export type ArticleGraphicFrame = "bare" | "plate" | "workbench";

export interface ArticleGraphicMarker {
  element: HTMLElement;
  frame: ArticleGraphicFrame;
  id: string;
  index: number;
  kind: ArticleGraphicKind;
  label: string;
}

const GENERATED_MARKER = "auto";
const GENERATED_ATTRIBUTES = [
  "data-article-graphic",
  "data-graphic-id",
  "data-graphic-index",
  "data-graphic-kind",
  "data-graphic-label",
  "data-graphic-frame",
  "data-graphic-marker",
] as const;
const authoredMetadata = new WeakMap<
  HTMLElement,
  { frame: string | null; kind: string | null; label: string | null }
>();

function normalizedText(value: string | null | undefined): string {
  return value?.trim().replace(/\s+/g, " ") ?? "";
}

function graphicFrame(figure: HTMLElement): ArticleGraphicFrame {
  const frame = normalizedText(figure.dataset.graphicFrame);
  return frame === "plate" || frame === "workbench" ? frame : "bare";
}

function slugify(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

function imageAssetName(figure: HTMLElement): string {
  const source = figure.querySelector("img")?.getAttribute("src");
  if (!source) {
    return "";
  }

  const pathname = source.split(/[?#]/, 1)[0];
  const filename = pathname.split("/").at(-1) ?? "";
  return slugify(filename.replace(/\.[^.]+$/, ""));
}

function semanticClassName(figure: HTMLElement): string {
  const candidates = Array.from(figure.classList)
    .filter((className) => /(?:demo|figure|frame)$/.test(className))
    .sort((left, right) => right.length - left.length);

  return slugify(candidates[0] ?? "");
}

function graphicLabel(figure: HTMLElement, index: number): string {
  const explicitLabel = normalizedText(figure.dataset.graphicLabel);
  if (explicitLabel) {
    return explicitLabel;
  }

  const figureLabel = normalizedText(figure.getAttribute("aria-label"));
  if (figureLabel) {
    return figureLabel;
  }

  const labelledBy = figure.getAttribute("aria-labelledby")?.split(/\s+/) ?? [];
  const root = figure.getRootNode();
  const labelledText = labelledBy
    .map((id) => {
      const findById = (scope: ParentNode | null) =>
        Array.from(scope?.querySelectorAll<HTMLElement>("[id]") ?? []).find(
          (element) => element.id === id,
        );
      const labelledElement =
        figure.ownerDocument.getElementById(id) ??
        findById(figure.parentElement) ??
        findById(
          root instanceof Document || root instanceof DocumentFragment
            ? root
            : null,
        );
      return normalizedText(labelledElement?.textContent);
    })
    .filter(Boolean)
    .join(" ");
  if (labelledText) return labelledText;

  const heading = normalizedText(
    figure.querySelector("h2, h3, h4")?.textContent,
  );
  if (heading) {
    return heading;
  }

  const labelledVisual = figure.querySelector<HTMLElement>(
    "canvas[aria-label], svg[aria-label], [role='img'][aria-label]",
  );
  const visualLabel = normalizedText(
    labelledVisual?.getAttribute("aria-label"),
  );
  if (visualLabel) {
    return visualLabel;
  }

  const caption = normalizedText(
    figure.querySelector("figcaption")?.textContent,
  );
  if (caption) {
    return caption;
  }

  const imageAlt = normalizedText(
    figure.querySelector("img[alt]")?.getAttribute("alt"),
  );
  if (imageAlt) {
    return imageAlt;
  }

  const svgTitle = normalizedText(
    figure.querySelector("svg title")?.textContent,
  );
  return svgTitle || `Graphic ${index}`;
}

function graphicKind(figure: HTMLElement): ArticleGraphicKind {
  const explicitKind = normalizedText(figure.dataset.graphicKind);
  if (
    explicitKind === "canvas" ||
    explicitKind === "dom" ||
    explicitKind === "image" ||
    explicitKind === "map" ||
    explicitKind === "mermaid" ||
    explicitKind === "svg"
  ) {
    return explicitKind;
  }

  if (figure.matches(".static-mermaid-figure")) {
    return "mermaid";
  }

  if (
    figure.matches(".osm-map-frame, .multi-region-map-frame") ||
    figure.querySelector(".leaflet-container, .osm-map, .multi-region-map")
  ) {
    return "map";
  }

  if (figure.querySelector("canvas")) {
    return "canvas";
  }

  if (figure.querySelector("svg")) {
    return "svg";
  }

  const imageSource = figure.querySelector("img")?.getAttribute("src") ?? "";
  if (/\.svg(?:$|[?#])/i.test(imageSource)) {
    return "svg";
  }

  if (figure.querySelector("img")) {
    return "image";
  }

  return "dom";
}

function graphicKey(figure: HTMLElement, label: string, index: number): string {
  const explicitKey = slugify(figure.dataset.graphicKey ?? "");
  if (explicitKey) {
    return explicitKey;
  }

  const elementId = slugify(figure.id);
  if (elementId) {
    return elementId;
  }

  return (
    imageAssetName(figure) ||
    semanticClassName(figure) ||
    slugify(label) ||
    `graphic-${index}`
  );
}

function uniqueKey(baseKey: string, uses: Map<string, number>): string {
  const useCount = (uses.get(baseKey) ?? 0) + 1;
  uses.set(baseKey, useCount);
  return useCount === 1 ? baseKey : `${baseKey}-${useCount}`;
}

export function clearArticleGraphicMarkers(container: HTMLElement): void {
  const generatedMarkers = container.querySelectorAll<HTMLElement>(
    `[data-graphic-marker="${GENERATED_MARKER}"]`,
  );

  for (const marker of generatedMarkers) {
    const authored = authoredMetadata.get(marker);
    for (const attribute of GENERATED_ATTRIBUTES) {
      marker.removeAttribute(attribute);
    }
    if (authored?.kind !== null && authored?.kind !== undefined) {
      marker.setAttribute("data-graphic-kind", authored.kind);
    }
    if (authored?.frame !== null && authored?.frame !== undefined) {
      marker.setAttribute("data-graphic-frame", authored.frame);
    }
    if (authored?.label !== null && authored?.label !== undefined) {
      marker.setAttribute("data-graphic-label", authored.label);
    }
    authoredMetadata.delete(marker);
  }

  container.removeAttribute("data-graphic-count");
  container.removeAttribute("data-inspect-graphics");
}

export function markArticleGraphics(
  container: HTMLElement,
  articleSlug: string,
): ArticleGraphicMarker[] {
  clearArticleGraphicMarkers(container);

  const figures = Array.from(container.querySelectorAll<HTMLElement>("figure"));
  const keyUses = new Map<string, number>();
  const markers = figures.map((figure, offset): ArticleGraphicMarker => {
    authoredMetadata.set(figure, {
      frame: figure.getAttribute("data-graphic-frame"),
      kind: figure.getAttribute("data-graphic-kind"),
      label: figure.getAttribute("data-graphic-label"),
    });
    const index = offset + 1;
    const label = graphicLabel(figure, index);
    const key = uniqueKey(graphicKey(figure, label, index), keyUses);
    const id = `${articleSlug}:${key}`;
    const kind = graphicKind(figure);
    const frame = graphicFrame(figure);

    figure.setAttribute("data-article-graphic", "");
    figure.setAttribute("data-graphic-id", id);
    figure.setAttribute("data-graphic-index", String(index));
    figure.setAttribute("data-graphic-kind", kind);
    figure.setAttribute("data-graphic-frame", frame);
    figure.setAttribute("data-graphic-label", label);
    figure.setAttribute("data-graphic-marker", GENERATED_MARKER);

    return { element: figure, frame, id, index, kind, label };
  });

  container.setAttribute("data-graphic-count", String(markers.length));
  return markers;
}

export function shouldInspectArticleGraphics(search: string): boolean {
  return new URLSearchParams(search).get("inspect") === "graphics";
}
