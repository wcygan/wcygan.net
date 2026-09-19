import { Edges } from "@react-three/drei";
import { DatabaseSideLabel, LogSideLabels } from "./EtchedLabel";

/** Model-local geometry shared by the log replication explanations. */
export function DatabaseCylinderGeometry({
  name,
  color,
  edgeColor,
}: {
  name: string;
  color: string;
  edgeColor: string;
}) {
  return (
    <>
      <mesh>
        <cylinderGeometry args={[0.9, 0.9, 1.55, 40]} />
        <meshStandardMaterial color={color} roughness={0.86} />
        <Edges color={edgeColor} threshold={15} />
      </mesh>
      {[-0.76, -0.26, 0.26, 0.76].map((y) => (
        <mesh key={y} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.84, 0.085, 12, 48]} />
          <meshStandardMaterial color={edgeColor} roughness={0.78} />
        </mesh>
      ))}
      <DatabaseSideLabel>{name}</DatabaseSideLabel>
    </>
  );
}

export function LogTrayGeometry({ label }: { label: string }) {
  return (
    <>
      <mesh>
        <boxGeometry args={[5.25, 0.8, 1.25]} />
        <meshStandardMaterial color="#e4e1d8" roughness={1} />
        <Edges color="#8f8c83" threshold={15} />
      </mesh>
      <LogSideLabels>{label}</LogSideLabels>
    </>
  );
}
