import { useRef, useEffect } from 'react'

interface Props {
  svgContent: string
  isOpen: boolean
  onClose: () => void
}

export function MermaidFullscreen({ svgContent, isOpen, onClose }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    if (isOpen) {
      dialog.showModal()
      if (containerRef.current && svgContent) {
        containerRef.current.innerHTML = svgContent
        const svg = containerRef.current.querySelector('svg')
        if (svg) {
          svg.setAttribute('width', '100%')
          svg.setAttribute('height', '100%')
          svg.style.maxWidth = '90vw'
          svg.style.maxHeight = '90vh'
        }
      }
    } else {
      dialog.close()
    }

    return () => {
      if (dialog.open) {
        dialog.close()
      }
    }
  }, [isOpen, svgContent])

  function handleKeydown(event: React.KeyboardEvent) {
    if (event.key === 'Escape') {
      onClose()
    }
  }

  if (!isOpen) return null

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

        <div ref={containerRef} className="diagram-container" />
      </div>
    </dialog>
  )
}
