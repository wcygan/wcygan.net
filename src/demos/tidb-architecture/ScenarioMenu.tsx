import { useEffect, useId, useLayoutEffect, useRef } from "react";

interface Props {
  disabled?: boolean;
  label: string;
  open: boolean;
  onOpen: (open: boolean) => void;
  choices: { label: string; run: () => void }[];
}

/** Hover previews the choices; click, touch, and keyboard open the same menu. */
export function ScenarioMenu({
  label,
  open,
  onOpen,
  choices,
  disabled = false,
}: Props) {
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const pendingFocus = useRef<number | null>(null);

  useLayoutEffect(() => {
    if (!open || pendingFocus.current === null) return;
    menu.current
      ?.querySelectorAll<HTMLButtonElement>("button")
      [pendingFocus.current]?.focus();
    pendingFocus.current = null;
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) onOpen(false);
    };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [open, onOpen]);

  const focusItem = (last = false) => {
    const index = last ? choices.length - 1 : 0;
    if (open)
      menu.current
        ?.querySelectorAll<HTMLButtonElement>("button")
        [index]?.focus();
    else pendingFocus.current = index;
    onOpen(true);
  };

  return (
    <div
      ref={root}
      className="tidb-scenario"
      onPointerEnter={(event) => {
        if (!disabled && event.pointerType === "mouse") onOpen(true);
      }}
      onPointerLeave={() => {
        if (!menu.current?.contains(document.activeElement)) onOpen(false);
      }}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) onOpen(false);
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          event.stopPropagation();
          onOpen(false);
          trigger.current?.focus();
        }
      }}
    >
      <button
        disabled={disabled}
        ref={trigger}
        id={`${id}-trigger`}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={`${id}-menu`}
        onClick={() => focusItem()}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            focusItem(event.key === "ArrowUp");
          }
        }}
      >
        {label} <span aria-hidden="true">▴</span>
      </button>
      <div className="tidb-menu-position" hidden={!open} ref={menu}>
        <div
          id={`${id}-menu`}
          className="tidb-scenario-menu"
          role="menu"
          aria-labelledby={`${id}-trigger`}
          onKeyDown={(event) => {
            const items = [
              ...event.currentTarget.querySelectorAll<HTMLButtonElement>(
                "button",
              ),
            ];
            const index = items.indexOf(
              document.activeElement as HTMLButtonElement,
            );
            let next: number;
            if (event.key === "ArrowDown") next = (index + 1) % items.length;
            else if (event.key === "ArrowUp")
              next = (index - 1 + items.length) % items.length;
            else if (event.key === "Home") next = 0;
            else if (event.key === "End") next = items.length - 1;
            else return;
            event.preventDefault();
            items[next].focus();
          }}
        >
          {choices.map((choice) => (
            <button
              disabled={disabled}
              key={choice.label}
              type="button"
              role="menuitem"
              tabIndex={-1}
              onClick={() => {
                choice.run();
                onOpen(false);
                trigger.current?.focus();
              }}
            >
              {choice.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
