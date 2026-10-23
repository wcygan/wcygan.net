import type { Server } from "./model";

const x = (server: Server) => 40 + ["A", "B", "C"].indexOf(server) * 140;
const radius = 12;
const vertical = 32;
const arc = (Math.PI * radius) / 2;

export function packetRouteLength(from: Server, to: Server) {
  return Math.abs(x(to) - x(from)) + vertical * 2 + arc * 2 - radius * 2;
}

/** Constant-speed travel around rounded corners, without abrupt direction changes. */
export function packetPosition(from: Server, to: Server, progress: number) {
  const start = x(from),
    end = x(to),
    direction = Math.sign(end - start);
  const horizontal = Math.abs(end - start) - radius * 2;
  let distance =
    Math.max(0, Math.min(1, progress)) * (vertical * 2 + arc * 2 + horizontal);
  if (distance <= vertical) return [start, 30 + distance] as const;
  distance -= vertical;
  if (distance <= arc) {
    const angle = distance / radius;
    return [
      start + direction * radius * (1 - Math.cos(angle)),
      62 + radius * Math.sin(angle),
    ] as const;
  }
  distance -= arc;
  if (distance <= horizontal)
    return [start + direction * (radius + distance), 74] as const;
  distance -= horizontal;
  if (distance <= arc) {
    const angle = distance / radius;
    return [
      end - direction * radius + direction * radius * Math.sin(angle),
      62 + radius * Math.cos(angle),
    ] as const;
  }
  return [end, 62 - (distance - arc)] as const;
}

export function packetRoute(from: Server, to: Server) {
  const start = x(from),
    end = x(to),
    direction = Math.sign(end - start);
  const sweep = direction > 0 ? 0 : 1;
  return `M${start} 48 V62 A12 12 0 0 ${sweep} ${start + direction * radius} 74 H${end - direction * radius} A12 12 0 0 ${sweep} ${end} 62 V48`;
}
