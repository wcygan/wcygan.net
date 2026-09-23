import type { Message, NodeId, TransactionFrame } from "./types";

export function transitionTiming(
  from: TransactionFrame,
  to?: TransactionFrame,
) {
  if (to?.messages.length) {
    const beats =
      Math.max(...to.messages.map((message) => message.beat ?? 0)) + 1;
    return { dwell: 600, travel: 1200 * beats, settle: 400 };
  }
  if (from.layout !== to?.layout || to?.wait) {
    return { dwell: 700, travel: 1600, settle: 400 };
  }
  return { dwell: 650, travel: 550, settle: 400 };
}

/** Parallel messages share a beat; a reply can wait for an earlier request. */
export function messagePhase(
  message: Message,
  messages: Message[],
  progress: number,
) {
  const beats = Math.max(...messages.map((item) => item.beat ?? 0)) + 1;
  return progress * beats - (message.beat ?? 0);
}

export function changedNodes(from: TransactionFrame, to: TransactionFrame) {
  const nodes = new Set<NodeId>();
  from.accounts.forEach((account, index) => {
    if (JSON.stringify(account) !== JSON.stringify(to.accounts[index])) {
      nodes.add(index === 0 ? "a" : "b");
    }
  });
  if (JSON.stringify(from.coordinator) !== JSON.stringify(to.coordinator)) {
    nodes.add("coordinator");
  }
  from.replicas.forEach((replica, index) => {
    if (JSON.stringify(replica) !== JSON.stringify(to.replicas[index])) {
      nodes.add(replica.id);
    }
  });
  return nodes;
}
