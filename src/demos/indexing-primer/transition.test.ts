import { describe, expect, it } from "vitest";
import { lessons, type LessonId } from "./model";
import { transitionPlan, transitionVisual } from "./transition";
import { linkPoints } from "./geometry";
import { visual, type TreeVisual } from "./visual";

const page = (snapshot: TreeVisual, id: string) =>
  snapshot.groups
    .flatMap((group) => group.pages)
    .find((page) => page.id === id)!;
const at = (id: LessonId, step: number, milliseconds: number) =>
  transitionVisual(id, step, milliseconds / transitionPlan(id, step).duration);
const beat = (id: LessonId, step: number, index: number) => {
  const events = transitionPlan(id, step).events;
  const start = events
    .slice(0, index)
    .reduce((total, event) => total + event.duration, 0);
  const duration = events[index].duration;
  return { start, end: start + duration, middle: start + duration / 2 };
};
const found = (snapshot: TreeVisual) =>
  snapshot.groups
    .flatMap((group) => group.pages)
    .flatMap((page) => page.entries)
    .filter((entry) => entry.state === "found");

describe("indexing causal transitions", () => {
  it("gives payloads time to follow the route without slowing entry reads", () => {
    const routes = transitionPlan("secondary", 1).events.filter(
      (event) => event.kind === "travel",
    );
    const snapshot = visual("secondary", 2);
    expect(routes).toHaveLength(2);
    const lengths: number[] = [];
    for (const event of routes) {
      const points = linkPoints(snapshot, event.route, 640);
      const distance = points
        .slice(1)
        .reduce(
          (total, point, index) =>
            total +
            Math.hypot(point.x - points[index].x, point.y - points[index].y),
          0,
        );
      lengths.push(distance);
      expect(event.duration).toBeGreaterThanOrEqual(500);
      expect(event.duration).toBeLessThanOrEqual(800);
      expect(event.duration / distance).toBeCloseTo(2.1 / 0.75, 2);
    }
    expect(lengths[0]).toBeGreaterThan(lengths[1]);
    expect(routes[0].duration).toBeGreaterThan(routes[1].duration);
    const crossing = transitionPlan("scan", 1).events[0];
    expect(crossing.kind).toBe("travel");
    expect(crossing.duration).toBe(500);
    for (const lesson of lessons)
      for (let step = 0; step < lesson.stepCount - 1; step++)
        for (const event of transitionPlan(lesson.id, step).events)
          if (event.kind === "travel") {
            expect(event.duration).toBeGreaterThanOrEqual(500);
            expect(event.duration).toBeLessThanOrEqual(800);
          }
  });

  it("runs inspections and reads at 75 percent of the previous speed", () => {
    for (const lesson of lessons) {
      for (let step = 0; step < lesson.stepCount - 1; step++) {
        const plan = transitionPlan(lesson.id, step);
        for (const event of plan.events) {
          if (event.kind === "inspect" || event.kind === "read")
            expect(event.duration).toBe(233 / 0.75);
        }
      }
    }
  });

  it("starts and ends at the authored snapshots without changing geometry", () => {
    for (const lesson of lessons) {
      for (let step = 0; step < lesson.stepCount; step++) {
        const start = visual(lesson.id, step);
        const end = visual(lesson.id, Math.min(step + 1, lesson.stepCount - 1));
        expect(transitionVisual(lesson.id, step, 0)).toEqual({ visual: start });
        expect(transitionVisual(lesson.id, step, 1)).toEqual({ visual: end });
        expect(transitionVisual(lesson.id, step, -1)).toEqual({
          visual: start,
        });
        expect(transitionVisual(lesson.id, step, 2)).toEqual({ visual: end });
        for (const progress of [0.1, 0.4, 0.7, 0.99]) {
          const snapshot = transitionVisual(lesson.id, step, progress).visual;
          const geometry = (value: TreeVisual) =>
            value.groups
              .flatMap((group) => group.pages)
              .map(({ id, x, y, width, height }) => ({
                id,
                x,
                y,
                width,
                height,
              }));
          expect(geometry(snapshot)).toEqual(geometry(start));
        }
      }
      const final = transitionPlan(lesson.id, lesson.stepCount - 1);
      expect(final.events).toEqual([]);
      expect(final.duration).toBe(0);
    }
  });

  it("grays skipped siblings when choosing the branch and visits its leaf only on arrival", () => {
    const selecting = at("tree", 0, beat("tree", 0, 0).middle);
    expect(page(selecting.visual, "primary-root").entries[1].state).toBe(
      "active",
    );
    expect(page(selecting.visual, "primary-root").entries[0].state).toBe(
      "muted",
    );
    for (const id of ["primary-leaf-1", "primary-leaf-2"])
      expect(page(selecting.visual, id).state).toBe("muted");
    expect(page(selecting.visual, "primary-leaf-3").state).toBeUndefined();
    expect(selecting.travel).toBeUndefined();
    const traveling = at("tree", 0, beat("tree", 0, 1).middle);
    expect(traveling.travel).toMatchObject({
      from: "primary-root",
      to: "primary-leaf-3",
      kind: "branch",
    });
    expect(traveling.travel!.progress).toBeCloseTo(0.5);
    for (const id of ["primary-leaf-1", "primary-leaf-2"])
      expect(page(traveling.visual, id).state).toBe("muted");
    expect(page(traveling.visual, "primary-leaf-3").state).toBeUndefined();
    expect(found(traveling.visual)).toEqual([]);
    const arrived = transitionVisual("tree", 0, 1);
    expect(page(arrived.visual, "primary-leaf-3").state).toBe("active");
    expect(found(arrived.visual)).toEqual([]);
    expect(found(transitionVisual("tree", 1, 1).visual)).toMatchObject([
      { key: "09" },
    ]);
  });

  it("counts scan rows only after each row has been read", () => {
    const reading = at("scan", 0, beat("scan", 0, 1).middle);
    expect(reading.reading).toEqual({ page: "primary-leaf-1", entry: 0 });
    expect(reading.visual.result).toBe("0 of 9 rows checked");
    expect(page(reading.visual, "primary-leaf-1").entries[0].state).toBe(
      "active",
    );
    expect(at("scan", 0, beat("scan", 0, 1).end + 1).visual.result).toBe(
      "1 of 9 rows checked",
    );
    expect(at("scan", 0, beat("scan", 0, 2).end + 1).visual.result).toBe(
      "2 of 9 rows checked",
    );
    expect(transitionVisual("scan", 0, 1).visual.result).toBe(
      "3 of 9 rows checked",
    );
    const nextPage = at("scan", 1, beat("scan", 1, 0).middle);
    expect(nextPage.travel).toMatchObject({
      from: "primary-leaf-1",
      to: "primary-leaf-2",
    });
    expect(nextPage.travel!.progress).toBeCloseTo(0.5);
    expect(nextPage.visual.result).toBe("3 of 9 rows checked");
    expect(
      page(nextPage.visual, "primary-leaf-2").entries.every(
        (entry) => !entry.state,
      ),
    ).toBe(true);
    expect(
      found(at("scan", 2, transitionPlan("scan", 2).duration - 1).visual),
    ).toEqual([]);
    expect(found(transitionVisual("scan", 2, 1).visual)).toMatchObject([
      { key: "09" },
    ]);
  });

  it("does not reveal a secondary match while its lookup is still traveling", () => {
    const arrival = beat("secondary", 0, 1).end;
    const beforeArrival = at("secondary", 0, arrival - 1);
    expect(beforeArrival.travel?.to).toBe("secondary-leaf-3");
    expect(found(beforeArrival.visual)).toEqual([]);
    const reading = at("secondary", 0, arrival + 1);
    expect(reading.travel).toBeUndefined();
    expect(reading.reading).toEqual({ page: "secondary-leaf-3", entry: 2 });
    expect(page(reading.visual, "secondary-leaf-3").state).toBe("active");
    expect(found(reading.visual)).toEqual([]);
    expect(found(transitionVisual("secondary", 0, 1).visual)).toMatchObject([
      { key: "Zoe", value: "→ 9" },
    ]);
  });

  it("hands the primary key off before choosing and visiting the primary leaf", () => {
    const handoff = at("secondary", 1, beat("secondary", 1, 0).middle);
    expect(handoff.travel).toMatchObject({
      from: "secondary-leaf-3",
      to: "primary-root",
      kind: "handoff",
    });
    expect(handoff.travel!.progress).toBeCloseTo(0.5);
    expect(page(handoff.visual, "primary-root").state).toBeUndefined();
    expect(found(handoff.visual)).toHaveLength(1);
    const choosePrimary = at("secondary", 1, beat("secondary", 1, 1).middle);
    expect(choosePrimary.travel).toBeUndefined();
    expect(page(choosePrimary.visual, "primary-root").entries[1].state).toBe(
      "active",
    );
    expect(page(choosePrimary.visual, "primary-leaf-3").state).toBeUndefined();
    const primaryTravel = at("secondary", 1, beat("secondary", 1, 2).middle);
    expect(primaryTravel.travel).toMatchObject({
      from: "primary-root",
      to: "primary-leaf-3",
    });
    expect(primaryTravel.travel!.progress).toBeCloseTo(0.5);
    expect(found(primaryTravel.visual)).toHaveLength(1);
    const readingPrimary = at("secondary", 1, beat("secondary", 1, 2).end + 1);
    expect(readingPrimary.reading).toEqual({
      page: "primary-leaf-3",
      entry: 2,
    });
    expect(found(readingPrimary.visual)).toHaveLength(1);
    const complete = transitionVisual("secondary", 1, 1).visual;
    expect(found(complete)).toHaveLength(2);
    expect(complete.result).toContain("2 tree lookups");
  });

  it("returns a covering result without activating the primary tree", () => {
    const returning = at("cover", 1, beat("cover", 1, 0).middle);
    expect(returning.travel).toMatchObject({
      from: "secondary-root",
      to: "secondary-leaf-3",
      reverse: true,
    });
    expect(returning.travel!.progress).toBeCloseTo(0.5);
    expect(returning.visual.result).toBeUndefined();
    expect(page(returning.visual, "primary-root").state).toBe("muted");
    expect(returning.visual.groups[1].links.every((link) => !link.active)).toBe(
      true,
    );
    expect(transitionVisual("cover", 1, 1).visual.result).toBe(
      "Name + ID returned · 1 tree lookup",
    );
  });

  it("holds the city result and changes queries before beginning the name scan", () => {
    const city = visual("compound", 1);
    for (const milliseconds of [1, 750, 1499])
      expect(at("compound", 1, milliseconds)).toEqual({ visual: city });

    const fadingOut = at("compound", 1, 1700);
    expect(fadingOut.visual).toEqual(city);
    expect(fadingOut.queryChange).toMatchObject({
      from: "WHERE city = 'Austin'",
      to: "WHERE name = 'Zoe'",
    });
    expect(fadingOut.queryChange?.progress).toBeCloseTo(0.25);
    expect(fadingOut.reading).toBeUndefined();
    expect(fadingOut.travel).toBeUndefined();

    const fadingIn = at("compound", 1, 2100);
    expect(fadingIn.visual.query).toBe("WHERE name = 'Zoe'");
    expect(fadingIn.queryChange?.progress).toBeCloseTo(0.75);
    expect(found(fadingIn.visual)).toHaveLength(0);
    expect(fadingIn.visual.result).toBeUndefined();
    expect(fadingIn.reading).toBeUndefined();
    expect(fadingIn.travel).toBeUndefined();
    expect(at("compound", 1, 2100)).toEqual(fadingIn);
  });

  it("starts the city lookup immediately and clears its matches before scanning names", () => {
    expect(visual("compound", 0).query).toBe("WHERE city = 'Austin'");
    expect(page(at("compound", 0, 1).visual, "compound-root").state).toBe(
      "active",
    );
    expect(found(visual("compound", 1))).toHaveLength(3);
    const first = at("compound", 1, 2301);
    expect(first.visual.query).toBe("WHERE name = 'Zoe'");
    expect(first.queryChange).toBeUndefined();
    expect(first.visual.result).toBeUndefined();
    expect(found(first.visual)).toHaveLength(0);
    const crossing = at("compound", 1, beat("compound", 1, 6).middle);
    expect(crossing.travel).toMatchObject({
      from: "compound-leaf-1",
      to: "compound-leaf-2",
      kind: "leaf",
    });
    expect(crossing.travel!.progress).toBeCloseTo(0.5);
    expect(found(crossing.visual)).toMatchObject([
      { key: "Zoe", value: "→ 9" },
    ]);
    expect(
      page(crossing.visual, "compound-leaf-2").entries.every(
        (entry) => !entry.state,
      ),
    ).toBe(true);
    const lastRead = at(
      "compound",
      1,
      transitionPlan("compound", 1).duration - 1,
    );
    expect(found(lastRead.visual)).toHaveLength(1);
    expect(found(transitionVisual("compound", 1, 1).visual)).toMatchObject([
      { key: "Zoe", value: "→ 9" },
      { key: "Zoe", value: "→ 19" },
    ]);
  });

  it("inserts each new index entry only after its own route and write complete", () => {
    const primaryWrite = beat("writes", 0, 2).end;
    const beforePrimary = at("writes", 0, primaryWrite - 1);
    expect(
      page(beforePrimary.visual, "write-primary-leaf").entries,
    ).toHaveLength(2);
    expect(page(beforePrimary.visual, "write-name-leaf").entries).toHaveLength(
      2,
    );
    const afterPrimary = at("writes", 0, primaryWrite + 1);
    expect(
      page(afterPrimary.visual, "write-primary-leaf").entries[2],
    ).toMatchObject({ key: "09", state: "new" });
    expect(page(afterPrimary.visual, "write-name-leaf").entries).toHaveLength(
      2,
    );
    const nameTravel = at("writes", 0, beat("writes", 0, 4).middle);
    expect(nameTravel.travel).toMatchObject({
      from: "write-name-root",
      to: "write-name-leaf",
    });
    expect(nameTravel.travel!.progress).toBeCloseTo(0.5);
    expect(page(nameTravel.visual, "write-name-leaf").entries).toHaveLength(2);
    const cityTravel = at("writes", 1, beat("writes", 1, 1).middle);
    expect(cityTravel.travel).toMatchObject({
      from: "write-city-root",
      to: "write-city-leaf",
    });
    expect(cityTravel.travel!.progress).toBeCloseTo(0.5);
    expect(page(cityTravel.visual, "write-city-leaf").entries).toHaveLength(2);
    expect(
      page(transitionVisual("writes", 1, 1).visual, "write-city-leaf")
        .entries[2],
    ).toMatchObject({ key: "Boston", value: "→ 9", state: "new" });
  });

  it("produces the same frame when a paused transition is inspected repeatedly", () => {
    const first = transitionVisual("secondary", 1, 0.4);
    transitionVisual("secondary", 1, 0.8);
    expect(transitionVisual("secondary", 1, 0.4)).toEqual(first);
    expect(transitionVisual("scan", 0, Number.NaN)).toEqual({
      visual: visual("scan", 0),
    });
  });
});
