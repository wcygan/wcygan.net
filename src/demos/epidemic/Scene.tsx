import { useEffect } from "react";
import { useThree } from "@react-three/fiber";
import { Edges, Line, OrbitControls } from "@react-three/drei";
import { OrthographicCamera } from "three";
import { SceneCanvas } from "~/demos/shared/SceneCanvas";
import { SIDE, type State } from "./model";

type Point = [number, number, number];

const point = (index: number, height = 0): Point => [
  (index % SIDE) - (SIDE - 1) / 2,
  height,
  Math.floor(index / SIDE) - (SIDE - 1) / 2,
];

function Camera({ onUnavailable }: { onUnavailable: () => void }) {
  const { camera, size, gl, invalidate } = useThree();

  useEffect(() => {
    camera.position.set(6.8, 7.5, 8.5);
    camera.lookAt(0, 0, 0);
    (camera as OrthographicCamera).zoom = Math.min(
      size.width / 9.6,
      size.height / 7.2,
    );
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

  return <OrbitControls enablePan={false} enableDamping={false} />;
}

function Transmission({ from, to }: { from: number; to: number }) {
  // Connect at the block centers so each path visibly leaves through a side.
  const start = point(from, 0.26);
  const end = point(to, 0.26);
  return <Line points={[start, end]} color="#27b648" lineWidth={2.5} />;
}

function Node({ infected, index }: { infected: boolean; index: number }) {
  return (
    <group position={point(index, 0.26)}>
      <mesh>
        <boxGeometry args={[0.58, 0.52, 0.58]} />
        <meshStandardMaterial
          color={infected ? "#27b648" : "#0e73cc"}
          roughness={0.78}
        />
        <Edges color={infected ? "#168336" : "#075b9f"} threshold={15} />
      </mesh>
      {infected && (
        <group position={[0, 0.29, 0]}>
          <mesh>
            <boxGeometry args={[0.29, 0.04, 0.07]} />
            <meshBasicMaterial color="#ffffff" />
          </mesh>
          <mesh>
            <boxGeometry args={[0.07, 0.04, 0.29]} />
            <meshBasicMaterial color="#ffffff" />
          </mesh>
        </group>
      )}
    </group>
  );
}

function Board({ state }: { state: State }) {
  const grid = Array.from({ length: SIDE + 1 }, (_, i) => i - SIDE / 2);
  return (
    <>
      <mesh position={[0, -0.06, 0]}>
        <boxGeometry args={[6.55, 0.12, 6.55]} />
        <meshStandardMaterial color="#f7f6f3" roughness={1} />
      </mesh>
      {grid.map((coordinate) => (
        <group key={coordinate}>
          <Line
            points={[
              [-3, 0.01, coordinate],
              [3, 0.01, coordinate],
            ]}
            color="#d5d3cc"
            lineWidth={0.8}
          />
          <Line
            points={[
              [coordinate, 0.01, -3],
              [coordinate, 0.01, 3],
            ]}
            color="#d5d3cc"
            lineWidth={0.8}
          />
        </group>
      ))}
      {state.transmissions.map(({ from, to }) => (
        <Transmission key={`${from}-${to}`} from={from} to={to} />
      ))}
      {state.infected.map((infected, index) => (
        <Node key={index} infected={infected} index={index} />
      ))}
    </>
  );
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
      sceneId="epidemic-spread"
      orthographic
      camera={{ position: [6.8, 7.5, 8.5], near: 0.1, far: 100 }}
      onReady={onReady}
      onUnavailable={onUnavailable}
      frameloop="demand"
      dpr={[1, 2]}
      gl={{ alpha: true, antialias: true }}
      fallback={null}
    >
      <Camera onUnavailable={onUnavailable} />
      <ambientLight intensity={1.45} />
      <directionalLight position={[-4, 8, 5]} intensity={1.75} />
      <Board state={state} />
    </SceneCanvas>
  );
}
