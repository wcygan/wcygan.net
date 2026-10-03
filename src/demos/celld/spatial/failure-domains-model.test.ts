import { describe, expect, it } from "vitest";
import { failureSnapshot, type FailureLayout } from "./failure-domains-model";

describe("failure domains for a recent fleet-acknowledged write", () => {
  it.each<FailureLayout>(["separate", "shared"])(
    "retains owner and current follower copies before upload in %s layout",
    (layout) => {
      const snapshot = failureSnapshot(layout, "acknowledged");
      expect(snapshot.retainedCopies).toBe(2);
      expect(snapshot.slots.map((slot) => slot.containsWrite)).toEqual([
        true,
        true,
        false,
      ]);
      expect(snapshot.completeFollowerTail).toBe(true);
      expect(snapshot.recovery).toBe("not-needed");
      expect(snapshot.explanation).toContain("not a second serving cell");
    },
  );

  it("requires recovery from the complete follower tail after separate owner disk loss", () => {
    const snapshot = failureSnapshot("separate", "lose-host");
    expect(snapshot).toMatchObject({
      ownerLost: true,
      followerLost: false,
      bucketCovered: false,
      completeFollowerTail: true,
      retainedCopies: 1,
      recovery: "follower-tail",
    });
    expect(snapshot.explanation).toContain("seal the prior log session");
    expect(snapshot.explanation).toContain("before restoring");
    expect(snapshot.hosts.filter((host) => host.lost)).toHaveLength(1);
  });

  it("does not use older bucket history after shared-host permanent disk loss", () => {
    const snapshot = failureSnapshot("shared", "lose-host");
    expect(snapshot).toMatchObject({
      ownerLost: true,
      followerLost: true,
      bucketCovered: false,
      completeFollowerTail: false,
      retainedCopies: 0,
      recovery: "tail-unavailable",
    });
    expect(snapshot.slots.every((slot) => !slot.containsWrite)).toBe(true);
    expect(snapshot.explanation).toContain("cannot recover this write");
    expect(snapshot.explanation).toContain("fate is inconclusive");
    expect(snapshot.explanation).toContain("records bounded loss");
    expect(
      snapshot.hosts.find((host) => host.id === "host-a")?.members,
    ).toEqual(["owner", "follower"]);
  });

  it.each<FailureLayout>(["separate", "shared"])(
    "retains the uploaded write outside the lost host in %s layout",
    (layout) => {
      const snapshot = failureSnapshot(layout, "bucket-covered");
      expect(snapshot.ownerLost).toBe(true);
      expect(snapshot.followerLost).toBe(layout === "shared");
      expect(snapshot.bucketCovered).toBe(true);
      expect(snapshot.recovery).toBe("bucket");
      expect(snapshot.slots.find((slot) => slot.id === "bucket")).toMatchObject(
        {
          state: "retained",
          containsWrite: true,
        },
      );
      expect(snapshot.hosts.find((host) => host.id === "storage")?.lost).toBe(
        false,
      );
      expect(snapshot.explanation).toContain("still gate activation");
    },
  );

  it("distinguishes an HTTP failure from the illustrative destruction of disks", () => {
    const snapshot = failureSnapshot("shared", "lose-host");
    expect(snapshot.caveat).toContain("permanent disk loss");
    expect(snapshot.caveat).toContain("HTTP error");
    expect(snapshot.caveat).toContain("does not prove data loss");
    expect(snapshot.caveat).toContain("does not promise immediate failover");
  });

  it("keeps source geometry stable when the write's coverage changes", () => {
    const pending = failureSnapshot("separate", "acknowledged");
    const lost = failureSnapshot("separate", "lose-host");
    const uploaded = failureSnapshot("separate", "bucket-covered");
    expect(pending.slots.map((slot) => slot.position)).toEqual(
      lost.slots.map((slot) => slot.position),
    );
    expect(pending.slots.map((slot) => slot.position)).toEqual(
      uploaded.slots.map((slot) => slot.position),
    );
  });
});
