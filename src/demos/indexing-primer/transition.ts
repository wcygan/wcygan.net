import { lessons, type LessonId } from "./model";
import { linkPoints } from "./geometry";
import {
  visual,
  WIDTH,
  type EntryState,
  type Page,
  type TreeLink,
  type TreeVisual,
} from "./visual";

type Route = Pick<TreeLink, "from" | "to" | "kind">;
const PLAYBACK_RATE = 0.75;
export type Travel = Route & { progress: number; reverse?: boolean };
type TransitionEvent =
  | { kind: "hold" | "query"; duration: number }
  | { kind: "inspect"; page: string; duration: number }
  | { kind: "travel"; route: Route; reverse?: boolean; duration: number }
  | {
      kind: "read";
      page: string;
      entry: number;
      state?: EntryState;
      duration: number;
    };

export interface TransitionFrame {
  visual: TreeVisual;
  travel?: Travel;
  reading?: { page: string; entry: number };
  queryChange?: { from: string; to: string; progress: number };
}

const inspect = (page: string): TransitionEvent => ({
  kind: "inspect",
  page,
  duration: 233,
});
const travel = (
  from: string,
  to: string,
  kind: TreeLink["kind"] = "branch",
  reverse?: boolean,
): TransitionEvent => ({
  kind: "travel",
  route: { from, to, kind },
  reverse,
  duration: 0,
});
const read = (
  page: string,
  entry: number,
  state?: EntryState,
): TransitionEvent => ({
  kind: "read",
  page,
  entry,
  state,
  duration: 233,
});
const readPage = (page: string) => [
  read(page, 0),
  read(page, 1),
  read(page, 2),
];

function settledStep(id: LessonId, step: number) {
  const lesson = lessons.find((candidate) => candidate.id === id)!;
  return Math.max(0, Math.min(Math.floor(step), lesson.stepCount - 1));
}

function eventsFor(id: LessonId, step: number): TransitionEvent[] {
  switch (id) {
    case "scan": {
      const page = `primary-leaf-${step + 1}`;
      return [
        step === 0
          ? inspect(page)
          : travel(`primary-leaf-${step}`, page, "leaf"),
        ...readPage(page),
      ];
    }
    case "tree":
      return step === 0
        ? [inspect("primary-root"), travel("primary-root", "primary-leaf-3")]
        : [read("primary-leaf-3", 2)];
    case "secondary":
    case "cover":
      if (step === 0)
        return [
          inspect("secondary-root"),
          travel("secondary-root", "secondary-leaf-3"),
          read("secondary-leaf-3", 2),
        ];
      return id === "cover"
        ? [travel("secondary-root", "secondary-leaf-3", "branch", true)]
        : [
            travel("secondary-leaf-3", "primary-root", "handoff"),
            inspect("primary-root"),
            travel("primary-root", "primary-leaf-3"),
            read("primary-leaf-3", 2),
          ];
    case "compound":
      return step === 0
        ? [
            inspect("compound-root"),
            travel("compound-root", "compound-leaf-1"),
            ...readPage("compound-leaf-1"),
          ]
        : [
            inspect("compound-leaf-1"),
            read("compound-leaf-1", 0, "checked"),
            read("compound-leaf-1", 1, "checked"),
            read("compound-leaf-1", 2),
            travel("compound-leaf-1", "compound-leaf-2", "leaf"),
            inspect("compound-leaf-2"),
            read("compound-leaf-2", 0, "checked"),
            read("compound-leaf-2", 1, "checked"),
            read("compound-leaf-2", 2),
          ];
    case "writes":
      return (step === 0 ? ["primary", "name"] : ["city"]).flatMap((index) => [
        inspect(`write-${index}-root`),
        travel(`write-${index}-root`, `write-${index}-leaf`),
        read(`write-${index}-leaf`, 2),
      ]);
  }
}

export function transitionPlan(id: LessonId, step: number) {
  const current = settledStep(id, step);
  const last = lessons.find((candidate) => candidate.id === id)!.stepCount - 1;
  const events = current === last ? [] : eventsFor(id, current);
  const target = visual(id, Math.min(current + 1, last));
  for (const event of events) {
    if (event.kind !== "travel") continue;
    const points = linkPoints(target, event.route, WIDTH);
    const distance = points
      .slice(1)
      .reduce(
        (total, point, index) =>
          total +
          Math.hypot(point.x - points[index].x, point.y - points[index].y),
        0,
      );
    event.duration = Math.min(600, Math.max(375, Math.round(distance * 2.1)));
  }
  for (const event of events) event.duration /= PLAYBACK_RATE;
  if (visual(id, current).query !== target.query)
    events.unshift(
      { kind: "hold", duration: 1500 },
      { kind: "query", duration: 800 },
    );
  return {
    duration: events.reduce((total, event) => total + event.duration, 0),
    events,
  };
}

function pageIn(snapshot: TreeVisual, id: string): Page {
  return snapshot.groups
    .flatMap((group) => group.pages)
    .find((page) => page.id === id)!;
}

function inspectPage(snapshot: TreeVisual, target: TreeVisual, pageId: string) {
  const page = pageIn(snapshot, pageId);
  page.state = "active";
  if (page.kind === "branch") {
    const targetGroup = target.groups.find((group) =>
      group.pages.some((candidate) => candidate.id === pageId),
    )!;
    for (const targetPage of targetGroup.pages)
      if (targetPage.state === "muted")
        pageIn(snapshot, targetPage.id).state = "muted";
    page.entries = pageIn(target, pageId).entries.map((entry) => ({
      ...entry,
    }));
    if (!page.entries.some((entry) => entry.state === "active"))
      page.entries[page.entries.length - 1].state = "active";
  }
}

function completeEvent(
  id: LessonId,
  snapshot: TreeVisual,
  target: TreeVisual,
  events: TransitionEvent[],
  index: number,
) {
  const event = events[index];
  switch (event.kind) {
    case "hold":
      break;
    case "query":
      Object.assign(snapshot, visual(id, 0), {
        query: target.query,
        result: undefined,
      });
      break;
    case "inspect":
      inspectPage(snapshot, target, event.page);
      break;
    case "travel": {
      const link = snapshot.groups
        .flatMap((group) => group.links)
        .find(
          (link) =>
            link.from === event.route.from &&
            link.to === event.route.to &&
            link.kind === event.route.kind,
        )!;
      link.active = true;
      const page = pageIn(
        snapshot,
        event.reverse ? event.route.from : event.route.to,
      );
      if (page.state !== "found" && page.state !== "new") page.state = "active";
      break;
    }
    case "read": {
      const page = pageIn(snapshot, event.page);
      const targetPage = pageIn(target, event.page);
      page.entries[event.entry] = { ...targetPage.entries[event.entry] };
      if (event.state) page.entries[event.entry].state = event.state;
      const moreReads = events
        .slice(index + 1)
        .some((next) => next.kind === "read" && next.page === event.page);
      page.state = moreReads ? "active" : targetPage.state;
      break;
    }
  }
}

export function transitionVisual(
  id: LessonId,
  step: number,
  progress: number,
): TransitionFrame {
  const current = settledStep(id, step);
  const from = visual(id, current);
  const plan = transitionPlan(id, current);
  const fraction = Number.isNaN(progress)
    ? 0
    : Math.max(0, Math.min(1, progress));
  if (fraction === 0 || plan.duration === 0) return { visual: from };
  const target = visual(id, current + 1);
  if (fraction === 1) return { visual: target };

  const snapshot = from;
  let remaining = fraction * plan.duration;
  const frame: TransitionFrame = { visual: snapshot };
  for (let index = 0; index < plan.events.length; index++) {
    const event = plan.events[index];
    if (remaining >= event.duration) {
      completeEvent(id, snapshot, target, plan.events, index);
      remaining -= event.duration;
      continue;
    }
    if (event.kind === "query") {
      const progress = remaining / event.duration;
      frame.queryChange = { from: from.query, to: target.query, progress };
      if (progress >= 0.5)
        Object.assign(snapshot, visual(id, 0), {
          query: target.query,
          result: undefined,
        });
    } else if (event.kind === "inspect")
      inspectPage(snapshot, target, event.page);
    else if (event.kind === "travel")
      frame.travel = {
        ...event.route,
        progress: remaining / event.duration,
        reverse: event.reverse,
      };
    else if (event.kind === "read") {
      const page = pageIn(snapshot, event.page);
      if (page.entries[event.entry]) page.entries[event.entry].state = "active";
      frame.reading = { page: event.page, entry: event.entry };
    }
    break;
  }

  if (id === "scan") {
    const checked = snapshot.groups
      .flatMap((group) => group.pages)
      .filter((page) => page.kind === "leaf")
      .flatMap((page) => page.entries)
      .filter(
        (entry) => entry.state === "checked" || entry.state === "found",
      ).length;
    snapshot.result =
      checked === 9 ? target.result : `${checked} of 9 rows checked`;
  }
  return frame;
}
