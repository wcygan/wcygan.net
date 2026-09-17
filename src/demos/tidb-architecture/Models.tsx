import { Edges } from "@react-three/drei";
import { DoubleSide } from "three";
import type { Point } from "./model";
const INK = "#56554e";
const MISSED_INK = "#993d35";
export function Box({
  position,
  size,
  color = "#dfddd4",
  selected = false,
  dim = false,
  behind = false,
}: {
  position: Point;
  size: Point;
  color?: string;
  selected?: boolean;
  dim?: boolean;
  behind?: boolean;
}) {
  return (
    <mesh position={position}>
      <boxGeometry args={size} />
      <meshStandardMaterial
        color={behind ? "#f1eeea" : dim ? "#eeede8" : color}
        roughness={1}
      />
      <Edges
        color={
          behind ? MISSED_INK : dim ? "#cbc9c0" : selected ? "#21201c" : INK
        }
        lineWidth={selected ? 1.8 : 1}
      />
    </mesh>
  );
}

export function Application({ selected }: { selected: boolean }) {
  return (
    <>
      <Box
        position={[0, 0.62, 0]}
        size={[1.45, 1, 0.24]}
        color="#e9e7df"
        selected={selected}
      />
      <Box
        position={[0, 0.63, 0.14]}
        size={[1.18, 0.7, 0.03]}
        color="#474842"
      />
      <Box position={[0, 0.13, 0.27]} size={[1.6, 0.12, 0.8]} color="#d4d1c7" />
    </>
  );
}

export function StorageShell({
  dim = false,
  focused = false,
}: {
  dim?: boolean;
  focused?: boolean;
}) {
  const edge = focused ? "#21201c" : dim ? "#c7c5bd" : INK;
  return (
    <>
      <mesh position={[0, 0.85, 0]}>
        <cylinderGeometry
          args={[0.68, 0.68, 1.4, 32, 1, true, Math.PI / 2, Math.PI]}
        />
        <meshStandardMaterial
          color={dim ? "#eeede8" : "#d6d5cd"}
          side={DoubleSide}
          roughness={1}
        />
        <Edges color={edge} threshold={25} />
      </mesh>
      {[0.15, 1.58].map((height) => (
        <mesh key={height} position={[0, height, 0]}>
          <cylinderGeometry
            args={[
              0.72,
              0.72,
              0.12,
              32,
              1,
              false,
              height > 1 ? Math.PI / 2 : 0,
              height > 1 ? Math.PI : Math.PI * 2,
            ]}
          />
          <meshStandardMaterial
            color={dim ? "#f0efe9" : "#e4e2d8"}
            roughness={1}
          />
          <Edges color={edge} threshold={25} />
        </mesh>
      ))}
    </>
  );
}
