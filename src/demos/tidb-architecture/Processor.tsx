import { Edges } from "@react-three/drei";
function Box({
  position,
  size,
  color,
  selected = false,
}: {
  position: [number, number, number];
  size: [number, number, number];
  color: string;
  selected?: boolean;
}) {
  return (
    <mesh position={position}>
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} roughness={1} />
      <Edges
        color={selected ? "#21201c" : "#56554e"}
        lineWidth={selected ? 1.8 : 1}
      />
    </mesh>
  );
}
export function Processor({ selected }: { selected: boolean }) {
  return (
    <>
      {[-0.4, -0.13, 0.13, 0.4].flatMap((offset, index) => [
        <Box
          key={`l${index}`}
          position={[-0.66, 0.22, offset]}
          size={[0.2, 0.08, 0.1]}
          color="#bdbbb1"
        />,
        <Box
          key={`r${index}`}
          position={[0.66, 0.22, offset]}
          size={[0.2, 0.08, 0.1]}
          color="#bdbbb1"
        />,
        <Box
          key={`f${index}`}
          position={[offset, 0.22, 0.66]}
          size={[0.1, 0.08, 0.2]}
          color="#bdbbb1"
        />,
        <Box
          key={`b${index}`}
          position={[offset, 0.22, -0.66]}
          size={[0.1, 0.08, 0.2]}
          color="#bdbbb1"
        />,
      ])}
      <Box
        position={[0, 0.3, 0]}
        size={[1.12, 0.4, 1.12]}
        color="#d6d5ca"
        selected={selected}
      />
      <Box
        position={[0, 0.53, 0]}
        size={[0.82, 0.08, 0.82]}
        color={"#dce6ec"}
      />
    </>
  );
}
