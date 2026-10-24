import { useCallback, useEffect, useRef, useState } from "react";

const vendorPath = "/vendor/planetscale/btrees-and-database-indexes";

function BPlusTreeFigure({
  graphicKey,
  hash,
  title,
  frameTitle,
}: {
  graphicKey: string;
  hash: string;
  title: string;
  frameTitle: string;
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
    >
      <header className="big-db-btree-header">
        <p className="article-graphic-title" id={`${graphicKey}-title`}>
          {title}
        </p>
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
    </figure>
  );
}

export function BigDatabaseBPlusTreeSearchDemo() {
  return (
    <BPlusTreeFigure
      graphicKey="big-db-bplus-search"
      hash="bplustree-search"
      title="A B+tree search follows routing keys"
      frameTitle="Interactive B+tree search"
    />
  );
}

export function BigDatabaseBPlusTreeDepthDemo() {
  return (
    <BPlusTreeFigure
      graphicKey="big-db-bplus-depth"
      hash="bplustree-depth-line"
      title="More rows add tree levels slowly"
      frameTitle="Interactive B+tree depth by record count"
    />
  );
}
