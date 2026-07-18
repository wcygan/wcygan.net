// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import {
  clearArticleGraphicMarkers,
  markArticleGraphics,
  shouldInspectArticleGraphics,
} from "./article-graphics";

function articleContent(markup: string): HTMLElement {
  const container = document.createElement("div");
  container.innerHTML = markup;
  return container;
}

describe("article graphic markers", () => {
  it("marks nested figures once with readable metadata", () => {
    const container = articleContent(`
      <section>
        <figure class="query-race" data-graphic-key="query-race">
          <h3>N+1 round trips</h3>
          <svg role="img"></svg>
        </figure>
      </section>
      <figure class="static-mermaid-figure">
        <img src="/diagrams/flow-chart.svg" alt="A request flow" />
        <figcaption>Request flow</figcaption>
      </figure>
    `);

    const markers = markArticleGraphics(container, "example-post");

    expect(markers).toMatchObject([
      {
        frame: "bare",
        id: "example-post:query-race",
        index: 1,
        kind: "svg",
        label: "N+1 round trips",
      },
      {
        id: "example-post:flow-chart",
        index: 2,
        kind: "mermaid",
        label: "Request flow",
      },
    ]);
    expect(container.dataset.graphicCount).toBe("2");
    expect(container.querySelectorAll("[data-article-graphic]")).toHaveLength(
      2,
    );
  });

  it("classifies maps, canvases, images, and DOM figures", () => {
    const container = articleContent(`
      <figure class="osm-map-frame"><div class="osm-map"></div></figure>
      <figure class="packet-demo"><canvas aria-label="Packet flow"></canvas></figure>
      <figure><img src="/photo.jpg" alt="A server rack" /></figure>
      <figure data-graphic-key="shard controls"><button>Rebalance</button></figure>
    `);

    const markers = markArticleGraphics(container, "systems");

    expect(markers.map(({ kind }) => kind)).toEqual([
      "map",
      "canvas",
      "image",
      "dom",
    ]);
    expect(markers[3].id).toBe("systems:shard-controls");
  });

  it("deduplicates repeated assets and honors authored overrides", () => {
    const container = articleContent(`
      <figure><img src="/diagrams/flow.svg" alt="First flow" /></figure>
      <figure><img src="/diagrams/flow.svg" alt="Second flow" /></figure>
      <p id="topology-title">A labelled topology</p>
      <figure data-graphic-key="topology" data-graphic-kind="dom" aria-labelledby="topology-title" data-graphic-frame="workbench">
        <svg></svg>
      </figure>
    `);

    const markers = markArticleGraphics(container, "diagrams");

    expect(markers.map(({ id }) => id)).toEqual([
      "diagrams:flow",
      "diagrams:flow-2",
      "diagrams:topology",
    ]);
    expect(markers[2]).toMatchObject({
      kind: "dom",
      label: "A labelled topology",
    });
    expect(markers[2]?.element.dataset.graphicFrame).toBe("workbench");
  });

  it("clears only generated marker metadata", () => {
    const container = articleContent(`
      <figure
        data-graphic-key="stable-key"
        data-graphic-kind="dom"
        data-graphic-label="Authored label"
        data-graphic-frame="plate"
      ><canvas data-graphic-stage="flush"></canvas></figure>
    `);

    markArticleGraphics(container, "example");
    clearArticleGraphicMarkers(container);

    const figure = container.querySelector("figure");
    expect(figure?.hasAttribute("data-article-graphic")).toBe(false);
    expect(figure?.getAttribute("data-graphic-key")).toBe("stable-key");
    expect(figure?.getAttribute("data-graphic-kind")).toBe("dom");
    expect(figure?.getAttribute("data-graphic-label")).toBe("Authored label");
    expect(figure?.getAttribute("data-graphic-frame")).toBe("plate");
    expect(
      figure?.querySelector("canvas")?.getAttribute("data-graphic-stage"),
    ).toBe("flush");
    expect(container.hasAttribute("data-graphic-count")).toBe(false);
  });

  it("normalizes an invalid frame to the conservative bare default", () => {
    const container = articleContent(
      '<figure data-graphic-frame="card"><canvas></canvas></figure>',
    );
    const [marker] = markArticleGraphics(container, "example");
    expect(marker?.frame).toBe("bare");
    expect(marker?.element.dataset.graphicFrame).toBe("bare");
  });

  it("keeps an authored workbench stage and never promotes its controls", () => {
    const container = articleContent(`
      <figure data-graphic-frame="workbench">
        <div role="tablist"><button role="tab">By range</button></div>
        <div class="visualization" data-graphic-stage="padded">Shard layout</div>
      </figure>
    `);

    markArticleGraphics(container, "example");

    const figure = container.querySelector("figure");
    expect(figure?.querySelectorAll("[data-graphic-stage]")).toHaveLength(1);
    expect(
      figure
        ?.querySelector(".visualization")
        ?.getAttribute("data-graphic-stage"),
    ).toBe("padded");
    expect(
      figure
        ?.querySelector("[role=tablist]")
        ?.hasAttribute("data-graphic-stage"),
    ).toBe(false);
    expect(
      figure?.querySelector("button")?.hasAttribute("data-graphic-stage"),
    ).toBe(false);
  });

  it("enables inspection only for the explicit query value", () => {
    expect(shouldInspectArticleGraphics("?inspect=graphics")).toBe(true);
    expect(shouldInspectArticleGraphics("?inspect=graphics&draft=1")).toBe(
      true,
    );
    expect(shouldInspectArticleGraphics("?inspect=motion")).toBe(false);
    expect(shouldInspectArticleGraphics("?graphics=1")).toBe(false);
  });
});
