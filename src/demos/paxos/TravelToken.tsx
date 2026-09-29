import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import type { Group } from "three";
type Point = [number, number, number];
export function TravelToken({
  from,
  to,
  active,
  label,
  color = "#2e8052",
  duration = 2.5,
}: {
  from: Point;
  to: Point;
  active: boolean;
  label: string;
  color?: string;
  duration?: number;
}) {
  const ref = useRef<Group>(null);
  const elapsed = useRef(0);
  useFrame((_, dt) => {
    if (active)
      elapsed.current = Math.min(duration, elapsed.current + Math.min(dt, 0.1));
    const t = elapsed.current / duration;
    if (ref.current) {
      ref.current.position.set(
        from[0] + (to[0] - from[0]) * t,
        from[1] + (to[1] - from[1]) * t + Math.sin(t * Math.PI) * 0.6,
        from[2] + (to[2] - from[2]) * t,
      );
      ref.current.visible = t < 1;
    }
  });
  return (
    <group ref={ref} position={from}>
      <mesh>
        <boxGeometry args={[0.28, 0.28, 0.28]} />
        <meshBasicMaterial color={color} />
      </mesh>
      <Html center position={[0, 0.5, 0]} style={{ pointerEvents: "none" }}>
        <span className="paxos-motion-label">{label}</span>
      </Html>
    </group>
  );
}
