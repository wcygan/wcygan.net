import { Line } from "@react-three/drei";
import { useMemo } from "react";
import { CELLD_COLORS } from "../palette";
import type { Point } from "./model";
import {
  NAMED_CELL_IDS,
  type NamedCellId,
  type NamedState,
} from "./named-state-model";
import { Box, Database, Labels, Runtime, SurfaceId } from "./primitives";

const CELL_X: Record<NamedCellId, number> = {
  blue: -2.6,
  green: 0,
  agent: 2.6,
};
const RUNTIME_Y = 0.55;
const RUNTIME_Z = -0.55;
const RUNTIME_SIZE = 0.95;
const DATABASE_Y = -0.45;
const DATABASE_Z = 0.5;
const DATABASE_RADIUS = 0.52;
const DATABASE_HEIGHT = 0.8;

/** Both endpoints use the same object centers and dimensions as the meshes. */
function commitRoute(x: number): Point[] {
  return [
    [x, RUNTIME_Y - (RUNTIME_SIZE * 0.72) / 2, RUNTIME_Z],
    [x, DATABASE_Y, RUNTIME_Z],
    [x, DATABASE_Y, DATABASE_Z - DATABASE_RADIUS],
  ];
}

export function NamedStateWorld({ state }: { state: NamedState }) {
  const labels = useMemo(
    () =>
      NAMED_CELL_IDS.map((id) => ({
        id: `named-cell-${id}`,
        text: `${state.cells[id].name} · saved ${state.cells[id].committedCount}`,
        position: [CELL_X[id], -1.01, 1.16] as Point,
        tone: state.selected === id ? ("orange" as const) : undefined,
      })),
    [state.cells, state.selected],
  );

  return (
    <>
      {NAMED_CELL_IDS.map((id) => {
        const cell = state.cells[id];
        const x = CELL_X[id];
        const selected = state.selected === id;
        const routeColor = selected
          ? CELLD_COLORS.orange
          : CELLD_COLORS.connector;
        return (
          <group key={id}>
            <Box
              position={[x, -1.08, 0]}
              size={[2.18, 0.12, 2.56]}
              color={CELLD_COLORS.panel}
              outline={selected ? CELLD_COLORS.orange : CELLD_COLORS.border}
            />
            <Runtime
              position={[x, RUNTIME_Y, RUNTIME_Z]}
              size={RUNTIME_SIZE}
              color={CELLD_COLORS.blue}
            />
            <Database
              position={[x, DATABASE_Y, DATABASE_Z]}
              radius={DATABASE_RADIUS}
              height={DATABASE_HEIGHT}
              color={CELLD_COLORS.blue}
            />
            <Line
              points={commitRoute(x)}
              color={routeColor}
              lineWidth={selected ? 1.8 : 1}
              dashed={!selected}
              dashSize={0.08}
              gapSize={0.07}
            />
            <mesh
              position={[x, DATABASE_Y, DATABASE_Z - DATABASE_RADIUS - 0.06]}
              rotation={[Math.PI / 2, 0, 0]}
            >
              <coneGeometry args={[0.045, 0.12, 10]} />
              <meshBasicMaterial color={routeColor} />
            </mesh>
            <SurfaceId
              position={[
                x,
                RUNTIME_Y + 0.24,
                RUNTIME_Z + RUNTIME_SIZE / 2 + 0.008,
              ]}
              scale={0.19}
              color={CELLD_COLORS.darkInk}
            >
              TEMP
            </SurfaceId>
            <SurfaceId
              position={[
                x,
                RUNTIME_Y - 0.24,
                RUNTIME_Z + RUNTIME_SIZE / 2 + 0.008,
              ]}
              scale={0.19}
              color={CELLD_COLORS.darkInk}
            >
              {String(cell.volatileCount)}
            </SurfaceId>
            <Box
              position={[x, DATABASE_Y, DATABASE_Z + DATABASE_RADIUS + 0.008]}
              size={[0.93, 0.3, 0.025]}
              color={CELLD_COLORS.panel}
              outline={CELLD_COLORS.green}
            />
            <SurfaceId
              position={[x, DATABASE_Y, DATABASE_Z + DATABASE_RADIUS + 0.025]}
              scale={0.31}
              color={CELLD_COLORS.green}
            >
              {String(cell.committedCount)}
            </SurfaceId>
          </group>
        );
      })}
      <Labels labels={labels} />
    </>
  );
}
