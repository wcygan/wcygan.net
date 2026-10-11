import { useCallback, useEffect, useRef, useState } from "react";

const vendorPath = "/vendor/planetscale/btrees-and-database-indexes";

function BPlusTreeFigure({
  graphicKey,
  hash,
  title,
  description,
  frameTitle,
  caption,
}: {
  graphicKey: string;
  hash: string;
  title: string;
  description: string;
  frameTitle: string;
  caption: string;
}) {
  const stageRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number>();

  const measure = useCallback(() => {
    const stage = stageRef.current;
    const frame = stage?.querySelector("iframe");
    const document = frame?.contentDocument;
    if (!stage) return;
    if (!document) return;

    if (!document.querySelector("#big-db-demo-a11y")) {
      const style = document.createElement("style");
      style.id = "big-db-demo-a11y";
      style.textContent = `
        button, input { min-height: 44px; }
        button { min-width: 44px; }
        button:focus-visible, input:focus-visible {
          outline: 2px solid #466eaa;
          outline-offset: 2px;
        }
      `;
      document.head.append(style);
    }

    document.querySelectorAll("button").forEach((button) => {
      if (button.getAttribute("aria-label")) return;
      const label = button.textContent?.trim();
      if (label === "+") button.setAttribute("aria-label", "Add a key");
      if (label === "-") button.setAttribute("aria-label", "Remove a key");
    });
    document.querySelectorAll("input").forEach((input) => {
      if (input.labels?.length || input.getAttribute("aria-label")) return;
      if (input.type === "range") {
        const text = input.parentElement?.textContent?.trim();
        if (text)
          input.setAttribute("aria-label", text.replace(/:\s*[-\d.]+\s*$/, ""));
      } else if (input.type === "text") {
        input.setAttribute("aria-label", "Number of keys in the tree");
      }
    });
    setHeight(document.documentElement.scrollHeight);
  }, []);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const observer = new ResizeObserver(measure);
    observer.observe(stage);
    measure();
    return () => observer.disconnect();
  }, [measure]);

  const replay = () => {
    const frame = stageRef.current?.querySelector("iframe");
    if (!frame) return;
    const src = frame.src;
    frame.src = "";
    frame.src = src;
  };

  return (
    <figure
      className="big-db-btree-demo"
      data-graphic-frame="workbench"
      data-graphic-kind="embed"
      data-graphic-key={graphicKey}
      aria-labelledby={`${graphicKey}-title`}
      aria-describedby={`${graphicKey}-description ${graphicKey}-caption`}
    >
      <header className="big-db-btree-header">
        <div>
          <p className="article-graphic-title" id={`${graphicKey}-title`}>
            {title}
          </p>
          <p id={`${graphicKey}-description`}>{description}</p>
        </div>
        <button type="button" onClick={replay} aria-label={`Replay ${title}`}>
          Replay
        </button>
      </header>
      <div
        ref={stageRef}
        className="big-db-btree-stage"
        data-graphic-stage="flush"
      >
        <iframe
          src={`${vendorPath}/index.html#${hash}`}
          title={frameTitle}
          loading="lazy"
          style={{ height: height ? `${height}px` : undefined }}
          onLoad={measure}
        />
      </div>
      <figcaption id={`${graphicKey}-caption`}>
        {caption} Read more in the{" "}
        <a href="https://planetscale.com/blog/btrees-and-database-indexes">
          PlanetScale B+tree article
        </a>
        .
      </figcaption>
    </figure>
  );
}

export function BigDatabaseBPlusTreeSearchDemo() {
  return (
    <BPlusTreeFigure
      graphicKey="big-db-bplus-search"
      hash="bplustree-search"
      title="A B+tree search follows routing keys"
      description="Follow the keys to a leaf; in the primary-key tree, that leaf contains the row."
      frameTitle="Interactive B+tree search"
      caption="Interactive B+tree model from PlanetScale. It demonstrates routing and leaf traversal; its compact nodes are illustrative, not literal InnoDB page contents or fanout."
    />
  );
}

export function BigDatabaseBPlusTreeDepthDemo() {
  return (
    <BPlusTreeFigure
      graphicKey="big-db-bplus-depth"
      hash="bplustree-depth-line"
      title="More rows add tree levels slowly"
      description="Explore how index depth changes as the number of entries grows."
      frameTitle="Interactive B+tree depth by record count"
      caption="Illustrative depth model. Actual index depth depends on page size, key width, record size, and page fill. Each table and secondary index has its own B+tree."
    />
  );
}
