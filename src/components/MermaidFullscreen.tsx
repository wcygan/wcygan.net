import { useRef, useEffect, useState } from "react";

interface Props {
  svgContent: string;
  isOpen: boolean;
  onClose: () => void;
}

// Size SVG to fit the dialog viewport. Injected as inline style on the SVG
// string so React owns the rendered HTML via dangerouslySetInnerHTML — never
// mutate innerHTML via a ref (breaks hydration).
function sizeSvg(svg: string): string {
  return svg.replace(/<svg\b([^>]*)>/, (match, attrs) => {
    const stripped = String(attrs)
      .replace(/\swidth="[^"]*"/g, "")
      .replace(/\sheight="[^"]*"/g, "")
      .replace(/\sstyle="[^"]*"/g, "");
    return `<svg${stripped} width="100%" height="100%" style="max-width:90vw;max-height:90vh">`;
  });
}

export function MermaidFullscreen({ svgContent, isOpen, onClose }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [renderedSvg, setRenderedSvg] = useState("");

  useEffect(() => {
    setRenderedSvg(svgContent ? sizeSvg(svgContent) : "");
  }, [svgContent]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      dialog.showModal();
    } else {
      dialog.close();
    }

    return () => {
      if (dialog.open) dialog.close();
    };
  }, [isOpen]);

  function handleKeydown(event: React.KeyboardEvent) {
    if (event.key === "Escape") onClose();
  }

  if (!isOpen) return null;

  return (
    <dialog
      ref={dialogRef}
      className="mermaid-fullscreen-dialog"
      onKeyDown={handleKeydown}
    >
      <div className="fullscreen-container">
        <button
          className="close-button"
          onClick={onClose}
          aria-label="Close fullscreen view"
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        <div
          className="diagram-container"
          dangerouslySetInnerHTML={{ __html: renderedSvg }}
        />
      </div>
    </dialog>
  );
}
