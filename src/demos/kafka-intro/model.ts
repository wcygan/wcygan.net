export interface IntroRecord {
  readonly offset: number;
  readonly key: string;
  readonly value: string;
}

/** A single retained partition. Offsets belong to this log, not to a reader. */
export const INTRO_RECORDS: readonly IntroRecord[] = [
  { offset: 0, key: "101", value: "created" },
  { offset: 1, key: "102", value: "created" },
  { offset: 2, key: "103", value: "created" },
  { offset: 3, key: "104", value: "created" },
  { offset: 4, key: "101", value: "paid" },
  { offset: 5, key: "103", value: "paid" },
];

export interface GroupMember {
  readonly member: number;
  readonly partitions: readonly number[];
}

/** An illustrative round-robin assignment, not a prediction of Kafka's assignor. */
export function assignPartitions(
  partitionCount: number,
  memberCount: number,
): readonly GroupMember[] {
  if (
    !Number.isInteger(partitionCount) ||
    partitionCount < 1 ||
    !Number.isInteger(memberCount) ||
    memberCount < 1
  ) {
    throw new RangeError(
      "A group needs positive integer partition and member counts",
    );
  }
  return Array.from({ length: memberCount }, (_, index) => ({
    member: index + 1,
    partitions: Array.from(
      { length: partitionCount },
      (_, partition) => partition,
    ).filter((partition) => partition % memberCount === index),
  }));
}

export interface IntroReader {
  readonly nextOffset: number;
  /** The next record to read after restarting from the saved checkpoint. */
  readonly committedOffset: number;
}

export const INITIAL_INTRO_READER: IntroReader = {
  nextOffset: 2,
  committedOffset: 2,
};

export type ReaderAction = "read" | "commit" | "restart" | "replay";

/** An isolated, manual reader: no live consumer group or external effects. */
export function moveReader(
  reader: IntroReader,
  action: ReaderAction,
  endOffset: number,
): IntroReader {
  switch (action) {
    case "read":
      return {
        ...reader,
        nextOffset: Math.min(endOffset, reader.nextOffset + 1),
      };
    case "commit":
      return { ...reader, committedOffset: reader.nextOffset };
    case "restart":
      return { ...reader, nextOffset: reader.committedOffset };
    case "replay":
      return { ...reader, nextOffset: 0 };
  }
}

export function committedLag(reader: IntroReader, endOffset: number): number {
  return Math.max(0, endOffset - reader.committedOffset);
}

export type CleanupPolicy = "delete" | "compact";

/**
 * A completed cleanup example. Delete removes an entire old segment ending at
 * offset 2. Compact removes superseded keys; scheduling, tombstones, and the
 * active segment's eligibility are omitted rather than simulated as immediate.
 */
export function cleanupRecords(
  records: readonly IntroRecord[],
  policy: CleanupPolicy,
): readonly IntroRecord[] {
  if (policy === "delete")
    return records.filter((record) => record.offset >= 3);

  const latestByKey = new Map<string, number>();
  for (const record of records) latestByKey.set(record.key, record.offset);
  return records.filter(
    (record) => latestByKey.get(record.key) === record.offset,
  );
}

export function deliverySnapshot(mode: "direct" | "kafka", recovered: boolean) {
  return {
    checkoutCanFinish: mode === "kafka" || recovered,
    shippingReceived: true,
    analyticsReceived: recovered,
    retained: mode === "kafka",
    waiting: mode === "direct" && !recovered,
  };
}

export const PIPELINE_AMOUNTS = [42, 18, 73] as const;
export function pipelineSnapshot(processed: number) {
  const count = Math.max(0, Math.min(3, Math.floor(processed)));
  return {
    count,
    total: PIPELINE_AMOUNTS.slice(0, count).reduce<number>((a, b) => a + b, 0),
    next: PIPELINE_AMOUNTS[count] ?? null,
  };
}
