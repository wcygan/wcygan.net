import { type ReactNode, useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Html, Line, OrbitControls } from "@react-three/drei";
import { Group, OrthographicCamera, PointsMaterial, Spherical } from "three";
import { SceneCanvas } from "~/demos/shared/SceneCanvas";
import {
  CITIES,
  type City,
  coordinateArcs,
  formatCoordinate,
  type GlobePoint,
  globePoint,
  latitudeRing,
  longitudeRing,
} from "./geography";
import {
  LAND_DETAIL_POSITIONS,
  LAND_POINT_POSITIONS,
} from "./land-points.generated";

export interface GlobeViewCommand {
  kind: "reset" | "left" | "right" | "up" | "down" | "in" | "out";
  revision: number;
}

interface Props {
  cityId: string;
  active: boolean;
  reduced: boolean;
  view: GlobeViewCommand;
  onReady: () => void;
  onUnavailable: () => void;
}

const RADIUS = 1.65;
const CAMERA: GlobePoint = [0, 2.4, 8];
const DEGREE = Math.PI / 180;
const CAMERA_ELEVATION = Math.atan2(CAMERA[1], CAMERA[2]);

function Label({
  position,
  children,
  kind = "muted",
}: {
  position: GlobePoint;
  children: ReactNode;
  kind?: "muted" | "coordinate" | "city";
}) {
  return (
    <Html
      position={position}
      center
      zIndexRange={[1, 0]}
      className={`embeddings-scene-label embeddings-scene-label--${kind}`}
    >
      {children}
    </Html>
  );
}

function Camera({
  view,
  onUnavailable,
}: Pick<Props, "view" | "onUnavailable">) {
  const { camera, size, gl, invalidate } = useThree();
  const fittedZoom = Math.min(size.width / 5.45, size.height / 4.85);
  const fit = useRef(fittedZoom);
  fit.current = fittedZoom;

  useEffect(() => {
    const lost = (event: Event) => {
      event.preventDefault();
      onUnavailable();
    };
    gl.domElement.addEventListener("webglcontextlost", lost);
    return () => gl.domElement.removeEventListener("webglcontextlost", lost);
  }, [gl, onUnavailable]);

  useEffect(() => {
    const ortho = camera as OrthographicCamera;
    ortho.zoom = fittedZoom;
    ortho.updateProjectionMatrix();
    invalidate();
  }, [camera, fittedZoom, invalidate]);

  useEffect(() => {
    const ortho = camera as OrthographicCamera;
    if (view.kind === "reset") {
      camera.position.set(...CAMERA);
      ortho.zoom = fit.current;
    } else if (view.kind === "in" || view.kind === "out") {
      ortho.zoom = Math.max(
        fit.current * 0.65,
        Math.min(
          fit.current * 1.8,
          ortho.zoom * (view.kind === "in" ? 1.2 : 1 / 1.2),
        ),
      );
    } else {
      const spherical = new Spherical().setFromVector3(camera.position);
      if (view.kind === "left" || view.kind === "right") {
        spherical.theta += view.kind === "left" ? -Math.PI / 8 : Math.PI / 8;
      } else {
        spherical.phi += view.kind === "up" ? -Math.PI / 10 : Math.PI / 10;
        spherical.phi = Math.max(0.08, Math.min(Math.PI - 0.08, spherical.phi));
      }
      camera.position.setFromSpherical(spherical);
    }
    camera.lookAt(0, 0, 0);
    ortho.updateProjectionMatrix();
    invalidate();
  }, [camera, view.kind, view.revision, invalidate]);

  return (
    <OrbitControls
      enablePan={false}
      enableDamping={false}
      minZoom={fittedZoom * 0.65}
      maxZoom={fittedZoom * 1.8}
    />
  );
}

function Land() {
  const detailMaterial = useRef<PointsMaterial>(null);
  const { camera, size } = useThree();

  useFrame(() => {
    if (!detailMaterial.current) return;
    const fittedZoom = Math.min(size.width / 5.45, size.height / 4.85);
    const zoomScale = (camera as OrthographicCamera).zoom / fittedZoom;
    const reveal = Math.max(0, Math.min(1, (zoomScale - 1.1) / 0.4));
    const opacity = reveal * 0.75;
    if (Math.abs(detailMaterial.current.opacity - opacity) > 0.01) {
      detailMaterial.current.opacity = opacity;
    }
  });

  return (
    <group scale={RADIUS + 0.006}>
      <points>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[LAND_POINT_POSITIONS, 3]}
          />
        </bufferGeometry>
        <pointsMaterial
          color="#2f5d3a"
          size={2.25}
          sizeAttenuation={false}
          transparent
          opacity={0.75}
        />
      </points>
      <points>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[LAND_DETAIL_POSITIONS, 3]}
          />
        </bufferGeometry>
        <pointsMaterial
          ref={detailMaterial}
          color="#2f5d3a"
          size={2.25}
          sizeAttenuation={false}
          transparent
          opacity={0}
          depthWrite={false}
        />
      </points>
    </group>
  );
}

function Graticule() {
  const parallels = useMemo(
    () => [-60, -30, 30, 60].map((lat) => latitudeRing(lat, RADIUS + 0.01)),
    [],
  );
  const meridians = useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) =>
        longitudeRing(i * 30, RADIUS + 0.01),
      ),
    [],
  );
  return (
    <>
      {[...parallels, ...meridians].map((points, index) => (
        <Line key={index} points={points} color="#adb1a9" lineWidth={0.6} />
      ))}
      <Line
        points={latitudeRing(0, RADIUS + 0.016)}
        color="#878d84"
        lineWidth={1}
      />
      <Line
        points={longitudeRing(0, RADIUS + 0.016)}
        color="#727a72"
        dashed
        dashSize={0.04}
        gapSize={0.035}
        lineWidth={1}
      />
      <Line
        points={[
          [0, -1.87, 0],
          [0, 1.89, 0],
        ]}
        color="#8b9188"
        lineWidth={1}
      />
      <Label position={[0, 2.02, 0]}>N</Label>
      <Label position={globePoint(-52, 0, 1.82)}>0° meridian</Label>
    </>
  );
}

function Coordinates({ city }: { city: City }) {
  const arcs = useMemo(() => coordinateArcs(city, RADIUS + 0.026), [city]);
  const point = globePoint(city.latitude, city.longitude, RADIUS + 0.052);
  const tip = globePoint(city.latitude, city.longitude, RADIUS + 0.22);
  const equator = globePoint(0, city.longitude, RADIUS + 0.026);
  return (
    <>
      <Line points={arcs.longitude} color="#697d95" lineWidth={2.7} />
      <Line points={arcs.latitude} color="#b65d3d" lineWidth={2.7} />
      <Line
        points={[[0, 0, 0], point]}
        color="#4d5553"
        lineWidth={1.1}
        dashed
        dashSize={0.045}
        gapSize={0.038}
        depthTest={false}
        transparent
        opacity={0.65}
      />
      <Line points={[point, tip]} color="#252d2b" lineWidth={1.2} />
      <mesh position={point}>
        <sphereGeometry args={[0.06, 24, 16]} />
        <meshStandardMaterial color="#26332f" roughness={0.6} />
      </mesh>
      <mesh position={equator}>
        <sphereGeometry args={[0.024, 16, 12]} />
        <meshBasicMaterial color="#b65d3d" />
      </mesh>
      <mesh>
        <sphereGeometry args={[0.023, 16, 12]} />
        <meshBasicMaterial color="#4d5553" depthTest={false} />
      </mesh>
      <Label
        position={globePoint(
          city.latitude + (city.latitude < 0 ? -8 : 8),
          city.longitude,
          1.97,
        )}
        kind="city"
      >
        {city.name}
      </Label>
      <Label
        position={globePoint(city.latitude / 2, city.longitude, 2.12)}
        kind="coordinate"
      >
        <span className="embeddings-coordinate-latitude">
          {formatCoordinate(city.latitude, "latitude")}
        </span>
      </Label>
      <Label
        position={globePoint(-9, city.longitude / 2, 1.9)}
        kind="coordinate"
      >
        <span className="embeddings-coordinate-longitude">
          {formatCoordinate(city.longitude, "longitude")}
        </span>
      </Label>
      <Label position={globePoint(0, city.longitude > 0 ? -20 : 24, 1.93)}>
        equator
      </Label>
    </>
  );
}

function Globe({
  cityId,
  active,
  reduced,
  view,
}: Pick<Props, "cityId" | "active" | "reduced" | "view">) {
  const city = CITIES.find((entry) => entry.id === cityId) ?? CITIES[0];
  const globe = useRef<Group>(null);
  const { camera, invalidate } = useThree();
  const target = useRef(-city.longitude * DEGREE);
  const targetTilt = useRef(city.latitude * DEGREE - CAMERA_ELEVATION);
  const initialized = useRef(false);

  useEffect(() => {
    // Face the chosen city toward the reader and compensate for the camera's
    // elevation so its marker settles near the stage center. The reader's
    // camera and zoom never reset when the city changes.
    target.current =
      Math.atan2(camera.position.x, camera.position.z) -
      city.longitude * DEGREE;
    targetTilt.current = city.latitude * DEGREE - CAMERA_ELEVATION;
    if (!initialized.current && globe.current) {
      globe.current.rotation.y = target.current;
      globe.current.rotation.x = targetTilt.current;
      initialized.current = true;
    }
    invalidate();
  }, [city.latitude, city.longitude, camera, invalidate]);
  useEffect(() => {
    if (view.kind === "reset") {
      target.current = -city.longitude * DEGREE;
      targetTilt.current = city.latitude * DEGREE - CAMERA_ELEVATION;
      invalidate();
    }
    // A view command only focuses the globe for an explicit reset. Orbit
    // commands preserve the earth's orientation so exploration still works.
  }, [view.kind, view.revision, invalidate]);
  useEffect(() => invalidate(), [active, reduced, invalidate]);

  useFrame((_, delta) => {
    if (!globe.current) return;
    const longitudeDifference = Math.atan2(
      Math.sin(target.current - globe.current.rotation.y),
      Math.cos(target.current - globe.current.rotation.y),
    );
    const tiltDifference = targetTilt.current - globe.current.rotation.x;
    if (
      Math.abs(longitudeDifference) < 0.0001 &&
      Math.abs(tiltDifference) < 0.0001
    ) {
      return;
    }
    if (reduced) {
      globe.current.rotation.y += longitudeDifference;
      globe.current.rotation.x += tiltDifference;
      // Html reads projected world positions in its own frame subscriber.
      // Draw one settled frame so labels also adopt this discrete pose.
      invalidate();
    } else if (active) {
      globe.current.rotation.y +=
        longitudeDifference * (1 - Math.exp(-Math.min(delta, 0.05) * 5));
      globe.current.rotation.x +=
        tiltDifference * (1 - Math.exp(-Math.min(delta, 0.05) * 5));
      invalidate();
    }
  });

  return (
    <group ref={globe}>
      <mesh>
        <sphereGeometry args={[RADIUS, 96, 64]} />
        <meshStandardMaterial color="#eceee7" roughness={1} />
      </mesh>
      <Land />
      <Graticule />
      <Coordinates city={city} />
    </group>
  );
}

export default function GlobeScene(props: Props) {
  return (
    <SceneCanvas
      sceneId="embeddings:city-coordinates"
      onReady={props.onReady}
      onUnavailable={props.onUnavailable}
      orthographic
      camera={{ position: CAMERA, zoom: 65, near: 0.1, far: 100 }}
      dpr={[1, 2]}
      frameloop="demand"
      gl={{ antialias: true, alpha: true }}
      fallback={null}
    >
      <Camera view={props.view} onUnavailable={props.onUnavailable} />
      <ambientLight intensity={1.5} />
      <directionalLight position={[-3, 5, 7]} intensity={1.2} />
      <Globe {...props} />
    </SceneCanvas>
  );
}
