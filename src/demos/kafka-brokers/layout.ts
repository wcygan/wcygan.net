import type { Point } from "./timeline";

export type BrokerId = 0 | 1 | 2;
export const BROKERS = [0, 1, 2] as const satisfies readonly BrokerId[];

export const WIDTH = 480;
const MARGIN = 16;
export const BOX = { w: 160, h: 88, y: 16 } as const;
export const PRODUCER = { x: MARGIN, ...BOX } as const;
export const PLACEMENT_PRODUCER = { ...PRODUCER, h: 120 } as const;
export const CONTROLLER = { x: WIDTH - MARGIN - BOX.w, ...BOX } as const;
export const BROKER = { w: 132, h: 116, y: 196, gap: 26 } as const;
export const SLOT = { w: 35, h: 30, gap: 4, y: BROKER.y + 76 } as const;
// In-flight payloads are larger than stored records so motion stands out.
export const PAYLOAD = { w: 44, h: 34 } as const;

const PRODUCER_BUS = 138;
const CONTROLLER_BUS = 158;
const FETCH_RAILS = [340, 386] as const;
const bottom = BROKER.y + BROKER.h;
export const PLACEMENT_HEIGHT = bottom + 20;
// The leader's per-replica view sits under the fetch rails, one cell per broker.
export const VIEW = { y: FETCH_RAILS[1] + 28, h: 104 } as const;
export const FAILOVER_HEIGHT = VIEW.y + VIEW.h + 16;

export const brokerX = (id: BrokerId) => MARGIN + id * (BROKER.w + BROKER.gap);
export const brokerCenter = (id: BrokerId) => brokerX(id) + BROKER.w / 2;

export const INSET = 12;
export const slotX = (id: BrokerId, index: number) =>
  brokerX(id) + INSET + index * (SLOT.w + SLOT.gap);

// `offset` moves the entry off-center when a controller route shares the
// broker's top edge; without a controller, routes enter at the center.
export function producerRoute(
  to: BrokerId,
  offset = 0,
  height: number = PRODUCER.h,
): Point[] {
  const x = PRODUCER.x + PRODUCER.w / 2;
  const entry = brokerCenter(to) + offset;
  const bus = Math.max(PRODUCER_BUS, PRODUCER.y + height + 28);
  return [
    [x, PRODUCER.y + height],
    [x, bus],
    [entry, bus],
    [entry, BROKER.y],
  ];
}

export const placementRoute = (to: BrokerId) =>
  producerRoute(to, 0, PLACEMENT_PRODUCER.h);

export function controllerRoute(to: BrokerId): Point[] {
  const x = CONTROLLER.x + CONTROLLER.w / 2;
  const entry = brokerCenter(to) + 20;
  return [
    [x, CONTROLLER.y + CONTROLLER.h],
    [x, CONTROLLER_BUS],
    [entry, CONTROLLER_BUS],
    [entry, BROKER.y],
  ];
}

// Each follower gets its own rail below the brokers so concurrent fetches
// never share a segment. Records travel leader → follower on these rails.
export function fetchRoute(leader: BrokerId, follower: BrokerId): Point[] {
  const distance = Math.abs(follower - leader);
  const rail = FETCH_RAILS[distance - 1];
  const exit = brokerCenter(leader) + (distance === 1 ? 10 : -10);
  const entry = brokerCenter(follower);
  return [
    [exit, bottom],
    [exit, rail],
    [entry, rail],
    [entry, bottom],
  ];
}

export const reversed = (points: readonly Point[]) => [...points].reverse();
