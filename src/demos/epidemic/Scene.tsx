import { useEffect } from "react";
import { useThree } from "@react-three/fiber";
import { Line } from "@react-three/drei";
import { OrthographicCamera } from "three";
import { SceneCanvas } from "~/demos/shared/SceneCanvas";
import { SIDE, type State } from "./model";

const point = (index: number): [number, number, number] => [
  (index % SIDE) - (SIDE - 1) / 2,
  0,
  Math.floor(index / SIDE) - (SIDE - 1) / 2,
];
function View({ onUnavailable }: { onUnavailable: () => void }) {
  const { camera, size, gl, invalidate } = useThree();
  useEffect(() => {
    camera.position.set(0, 10, 0.001);
    camera.lookAt(0, 0, 0);
    (camera as OrthographicCamera).zoom =
      Math.min(size.width, size.height) / (SIDE + 0.7);
    camera.updateProjectionMatrix();
    invalidate();
  }, [camera, size.width, size.height, invalidate]);
  useEffect(() => {
    const lost = (event: Event) => {
      event.preventDefault();
      onUnavailable();
    };
    gl.domElement.addEventListener("webglcontextlost", lost);
    return () => gl.domElement.removeEventListener("webglcontextlost", lost);
  }, [gl, onUnavailable]);
  return null;
}
export default function Scene({
  state,
  onReady,
  onUnavailable,
}: {
  state: State;
  onReady: () => void;
  onUnavailable: () => void;
}) {
  return (
    <SceneCanvas
      orthographic
      camera={{ position: [0, 10, 0.001], near: 0.1, far: 100 }}
      onReady={onReady}
      onUnavailable={onUnavailable}
      frameloop="demand"
      dpr={[1, 2]}
      gl={{ alpha: true, antialias: true }}
      fallback={null}
    >
      <View onUnavailable={onUnavailable} />
      {Array.from({ length: SIDE }, (_, i) => (
        <group key={i}>
          <Line
            points={[
              [-2.5, -0.15, i - 2.5],
              [2.5, -0.15, i - 2.5],
            ]}
            color="#e4e3de"
            lineWidth={1}
          />
          <Line
            points={[
              [i - 2.5, -0.15, -2.5],
              [i - 2.5, -0.15, 2.5],
            ]}
            color="#e4e3de"
            lineWidth={1}
          />
        </group>
      ))}
      {state.transmissions.map(({ from, to }) => (
        <Line
          key={to}
          points={[point(from), point(to)]}
          color="#15803d"
          lineWidth={3}
        />
      ))}
      {state.infected.map((infected, i) => (
        <group key={i} position={point(i)}>
          <mesh>
            <cylinderGeometry args={[0.29, 0.29, 0.16, 32]} />
            <meshBasicMaterial color={infected ? "#15803d" : "#2563eb"} />
          </mesh>
          {infected && (
            <group position={[0, 0.1, 0]}>
              <mesh>
                <boxGeometry args={[0.25, 0.02, 0.055]} />
                <meshBasicMaterial color="white" />
              </mesh>
              <mesh>
                <boxGeometry args={[0.055, 0.02, 0.25]} />
                <meshBasicMaterial color="white" />
              </mesh>
            </group>
          )}
        </group>
      ))}
    </SceneCanvas>
  );
}
