import { useState, useRef, useEffect, useCallback } from "react";
import { MermaidFullscreen } from "./MermaidFullscreen";
import { getCachedSVG, setCachedSVG } from "~/lib/utils/mermaid-cache";

interface Props {
  height?: number;
  diagram?: string;
  useLazyLoading?: boolean;
  rootMargin?: string;
}

let mermaidInstance: typeof import("mermaid").default | null = null;

const MERMAID_THEME = {
  theme: "base" as const,
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
    clusterBkg: "#f9f9f9",
    clusterBorder: "#dedede",
    defaultLinkColor: "#666666",
    titleColor: "#466eaa",
    edgeLabelBackground: "#ffffff",
    errorBkgColor: "#f9f9f9",
    errorTextColor: "#D55E00",
    fontFamily:
      'system, -apple-system, "system-ui", "Helvetica Neue", "Lucida Grande", sans-serif',
    fontSize: "16px",
  },
};

async function loadMermaid() {
  if (mermaidInstance) return mermaidInstance;
  const mod = await import("mermaid");
  mermaidInstance = mod.default || mod;
  return mermaidInstance;
}

export function MermaidDiagram({
  height = 400,
  diagram = "",
  useLazyLoading = false,
  rootMargin = "100px",
}: Props) {
  const outerRef = useRef<HTMLDivElement>(null);
  const [svgHtml, setSvgHtml] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState("initializing");
  const [showFullscreen, setShowFullscreen] = useState(false);
  const [isInViewport, setIsInViewport] = useState(!useLazyLoading);
  const [isMobile, setIsMobile] = useState(false);
  const renderingRef = useRef(false);

  const rendered = svgHtml !== null || error !== null;

  const renderDiagram = useCallback(async () => {
    if (!diagram?.trim() || renderingRef.current) return;
    renderingRef.current = true;

    try {
      const cachedSVG = getCachedSVG(diagram);
      if (cachedSVG) {
        setSvgHtml(cachedSVG);
        setStatus("complete");
        renderingRef.current = false;
        return;
      }

      setStatus("loading module");
      const mermaid = await loadMermaid();

      if (!mermaid || typeof mermaid.initialize !== "function") {
        throw new Error("Mermaid loaded but missing expected methods");
      }

      setStatus("initializing");
      const mobile = typeof window !== "undefined" && window.innerWidth <= 768;

      mermaid.initialize({
        startOnLoad: false,
        securityLevel: "loose",
        logLevel: "error",
        ...MERMAID_THEME,
        flowchart: {
          useMaxWidth: true,
          htmlLabels: true,
          curve: "basis",
          padding: 20,
        },
        sequence: {
          useMaxWidth: true,
          wrap: mobile,
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
        class: { useMaxWidth: true },
        pie: { useMaxWidth: true, textPosition: 0.75 },
        gantt: {
          useMaxWidth: true,
          leftPadding: 75,
          gridLineStartPadding: 35,
          fontSize: 11,
          sectionFontSize: 24,
          numberSectionStyles: 4,
        },
      });

      const id = `mermaid-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      setStatus("rendering");

      const renderResult = await mermaid.render(id, diagram.trim());
      if (!renderResult?.svg) {
        throw new Error("No SVG returned from render");
      }

      setCachedSVG(diagram, renderResult.svg);
      setSvgHtml(renderResult.svg);
      setStatus("complete");

      // Mermaid leaves an orphan element at id `d${id}` when it renders into
      // a detached container. Remove only that specific node (not a prefix
      // query) so Strict Mode's double-invocation can't delete a sibling
      // diagram's orphan between its render and its own cleanup.
      setTimeout(() => {
        document.getElementById(`d${id}`)?.remove();
      }, 100);
    } catch (e) {
      console.error("[MermaidDiagram] Error:", e);
      setError(e instanceof Error ? e.message : String(e));
      setStatus("error");
    } finally {
      renderingRef.current = false;
    }
  }, [diagram]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const check = () => setIsMobile(window.innerWidth <= 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    if (!useLazyLoading || isInViewport || !outerRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInViewport(true);
            observer.disconnect();
          }
        });
      },
      { rootMargin },
    );
    observer.observe(outerRef.current);
    return () => observer.disconnect();
  }, [useLazyLoading, isInViewport, rootMargin]);

  useEffect(() => {
    if (isInViewport && diagram && !rendered && !error) {
      renderDiagram();
    }
  }, [isInViewport, diagram, rendered, error, renderDiagram]);

  return (
    <>
      <div
        ref={outerRef}
        className="mermaid-container relative my-6 flex justify-center overflow-x-auto rounded-lg p-4"
        style={{ minHeight: `${height}px` }}
      >
        {/* Loading state */}
        {!rendered && isInViewport && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600" />
              <p className="mt-2 text-sm text-zinc-400">{status}</p>
            </div>
          </div>
        )}

        {/* Error state */}
        {error && (
          <div
            className="flex flex-col items-center justify-center text-red-400"
            style={{ height: `${height}px` }}
          >
            <p className="font-bold">Error rendering diagram</p>
            <p className="mt-2 text-sm">{error}</p>
            <details className="mt-4 w-full max-w-2xl">
              <summary className="cursor-pointer text-sm hover:underline">
                View Diagram Source
              </summary>
              <pre className="mt-2 overflow-x-auto rounded bg-zinc-800 p-2 text-xs">
                {diagram}
              </pre>
            </details>
          </div>
        )}

        {/* Rendered SVG — using dangerouslySetInnerHTML so React owns the DOM */}
        {svgHtml && (
          <div
            className="mermaid-render-container flex w-full justify-center"
            dangerouslySetInnerHTML={{ __html: svgHtml }}
          />
        )}

        {/* Fullscreen button (mobile only) */}
        {rendered && !error && isMobile && (
          <button
            className="fullscreen-button"
            onClick={() => setShowFullscreen(true)}
            aria-label="View diagram in fullscreen"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
            </svg>
          </button>
        )}

        {/* Placeholder for lazy loading */}
        {!isInViewport && useLazyLoading && (
          <div
            className="flex items-center justify-center"
            style={{ height: `${height}px` }}
          >
            <p className="text-zinc-400">Diagram will load when visible</p>
          </div>
        )}
      </div>

      {showFullscreen && (
        <MermaidFullscreen
          svgContent={svgHtml || ""}
          isOpen={showFullscreen}
          onClose={() => setShowFullscreen(false)}
        />
      )}
    </>
  );
}
