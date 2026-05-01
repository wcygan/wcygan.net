import { useEffect, useRef, useState } from "react";
import frames from "~/data/penguin-frames.json";

const FRAME_LIST = Object.values(frames as Record<string, string[]>);
const FRAME_MS = 50;

export function RotatingPenguin() {
  const [i, setI] = useState(0);
  const lastRef = useRef(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    const tick = (t: number) => {
      if (t - lastRef.current >= FRAME_MS) {
        setI((j) => (j + 1) % FRAME_LIST.length);
        lastRef.current = t;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const lines = FRAME_LIST[i];

  return (
    <div className="rotating-penguin">
      <pre aria-hidden="true">
        {lines.map((line, k) => (
          <div key={k} dangerouslySetInnerHTML={{ __html: line || "&nbsp;" }} />
        ))}
      </pre>
    </div>
  );
}
