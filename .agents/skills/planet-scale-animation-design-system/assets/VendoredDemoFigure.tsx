import {
  type CSSProperties,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

type VendoredDemoFigureProps = {
  /** Stable route-local graphic identity. */
  graphicKey: string;
  title: string;
  description: string;
  /** Fragment forwarded to the vendored shell (hash-routed demos). */
  hash?: string;
  /** Path under /public holding the vendored index.html. */
  vendorPath: string;
  /** CSS aspect-ratio value for the wide (>=801px) layout. */
  wideAspect: string;
  /** CSS aspect-ratio value for the compact (<801px) layout. */
  compactAspect: string;
  /** Accessible iframe title; should restate the demo's lesson. */
  frameTitle: string;
  caption: React.ReactNode;
};

/**
 * Editorial figure shell around a vendored third-party demo bundle served
 * from /public. The iframe carries the demo's own stage and controls; this
 * wrapper owns the article header, Replay, and aspect-ratio switching from
 * measured stage width.
 */
export function VendoredDemoFigure({
  graphicKey,
  title,
  description,
  hash,
  vendorPath,
  wideAspect,
  compactAspect,
  frameTitle,
  caption,
}: VendoredDemoFigureProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const [compact, setCompact] = useState(true);
  const [contentHeight, setContentHeight] = useState<number | null>(null);

  const replay = useCallback(() => {
    const frame = stageRef.current?.querySelector("iframe");
    if (frame) {
      const src = frame.src;
      frame.src = "";
      frame.src = src;
    }
  }, []);

  const src = `${vendorPath}/index.html${hash ?? ""}`;

  // Same-origin iframe: prefer the demo's own laid-out height over a guessed
  // aspect ratio; the aspect only covers pre-load and cross-origin cases.
  const measureFrame = useCallback(() => {
    const frame = stageRef.current?.querySelector("iframe");
    const app = frame?.contentDocument?.querySelector(".dmwl, #app > *");
    if (!app) return;
    const appTop = app.getBoundingClientRect().top;
    const visible = Array.from(app.querySelectorAll<HTMLElement>("*")).filter(
      (el) => el.offsetParent !== null || el === app,
    );
    const bottom = Math.max(
      ...visible.map((el) => el.getBoundingClientRect().bottom),
    );
    if (Number.isFinite(bottom)) {
      setContentHeight(Math.ceil(bottom - appTop) + 1);
    }
  }, []);

  const handleLoad = useCallback(() => {
    measureFrame();
  }, [measureFrame]);

  // Track stage width for aspect switching and re-measure the frame whenever
  // the layout may have changed.
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    const measure = () => {
      setCompact(stage.clientWidth < 801);
      handleLoad();
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(stage);

    return () => observer.disconnect();
  }, [handleLoad]);

  return (
    <figure
      className="lock-queue"
      data-graphic-frame="workbench"
      data-graphic-key={graphicKey}
      data-graphic-kind="embed"
      aria-labelledby={`${graphicKey}-title`}
      aria-describedby={`${graphicKey}-description ${graphicKey}-caption`}
    >
      <header className="lock-queue-header">
        <div>
          <p className="article-graphic-title" id={`${graphicKey}-title`}>
            {title}
          </p>
          <p id={`${graphicKey}-description`}>{description}</p>
        </div>
        <button
          type="button"
          className="lock-queue-replay"
          onClick={replay}
          aria-label={`Replay ${title}`}
        >
          Replay
        </button>
      </header>

      <div
        className="lock-queue-stage"
        data-graphic-stage="flush"
        ref={stageRef}
      >
        <iframe
          src={src}
          title={frameTitle}
          className="lock-queue-frame"
          data-compact={compact ? "true" : "false"}
          onLoad={handleLoad}
          style={
            {
              aspectRatio: compact ? compactAspect : wideAspect,
              height: contentHeight ? `${contentHeight}px` : undefined,
            } as CSSProperties
          }
        />
      </div>

      <figcaption id={`${graphicKey}-caption`}>{caption}</figcaption>
    </figure>
  );
}
