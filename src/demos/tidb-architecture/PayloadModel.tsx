import { Edges } from "@react-three/drei";
import { Box } from "./Models";
const INK = "#56554e";
/** Distinct silhouettes communicate the payload without relying on color. */
export function PayloadModel({
  shape,
  color,
}: {
  shape: "query" | "id" | "row" | "probe";
  color: string;
}) {
  if (shape === "query")
    return (
      <group rotation={[Math.PI / 2, 0, 0]}>
        <mesh>
          <coneGeometry args={[0.22, 0.65, 4]} />
          <meshStandardMaterial color={color} roughness={1} />
          <Edges color={INK} />
        </mesh>
      </group>
    );
  if (shape === "id")
    return (
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.24, 0.24, 0.12, 8]} />
        <meshStandardMaterial color={color} roughness={1} />
        <Edges color={INK} />
      </mesh>
    );
  if (shape === "row")
    return (
      <group>
        <Box
          position={[0, 0, 0]}
          size={[0.75, 0.12, 0.5]}
          color={color}
          selected
        />
        {[-0.14, 0, 0.14].map((z, i) => (
          <Box
            key={z}
            position={[-0.05, 0.07, z]}
            size={[i === 1 ? 0.52 : 0.38, 0.015, 0.035]}
            color={INK}
          />
        ))}
      </group>
    );
  return (
    <mesh>
      <octahedronGeometry args={[0.16]} />
      <meshStandardMaterial color={color} roughness={1} />
      <Edges color={INK} />
    </mesh>
  );
}
