export type RegionCode = "OR" | "TX" | "VA";
export type UserCode = "SEA" | "DAL" | "NYC";

export type GeoDnsPhase = "seattle-query" | "dallas-query" | "new-york-query";

export type RegionStatus = "available" | "selected";

export type DemoState = {
  stepIndex: number;
};

export type RegionSnapshot = {
  code: RegionCode;
  label: string;
  endpoint: string;
  status: RegionStatus;
};

export type UserSnapshot = {
  code: UserCode;
  label: string;
};

export type GeoDnsSnapshot = {
  phase: GeoDnsPhase;
  phaseLabel: string;
  activeUser: UserSnapshot;
  selectedRegion: RegionCode;
  policyLabel: string;
  dnsAnswer: string;
  reason: string;
  regions: readonly RegionSnapshot[];
};

export const GEO_DNS_STEPS = [
  { phase: "seattle-query", label: "Seattle" },
  { phase: "dallas-query", label: "Dallas" },
  { phase: "new-york-query", label: "New York" },
] as const satisfies readonly { phase: GeoDnsPhase; label: string }[];

export const REDUCED_MOTION_STEP_INDEX = GEO_DNS_STEPS.length - 1;

const USERS: Record<UserCode, UserSnapshot> = {
  SEA: { code: "SEA", label: "Seattle user" },
  DAL: { code: "DAL", label: "Dallas user" },
  NYC: { code: "NYC", label: "New York user" },
};

const REGION_LABELS: Record<RegionCode, string> = {
  OR: "Oregon",
  TX: "Texas",
  VA: "Virginia",
};

const REGION_ENDPOINTS: Record<RegionCode, string> = {
  OR: "oregon.app.example.com",
  TX: "texas.app.example.com",
  VA: "virginia.app.example.com",
};

type StepDefinition = {
  activeUser: UserCode;
  selectedRegion: RegionCode;
  policyLabel: string;
  dnsAnswer: string;
  reason: string;
  phaseLabel: string;
};

const STEP_DEFINITIONS: Record<GeoDnsPhase, StepDefinition> = {
  "seattle-query": {
    activeUser: "SEA",
    selectedRegion: "OR",
    policyLabel: "Geo routing",
    dnsAnswer: REGION_ENDPOINTS.OR,
    reason: "Seattle is closest to the Oregon entry server.",
    phaseLabel: "GeoDNS answers a Seattle lookup with the Oregon endpoint.",
  },
  "dallas-query": {
    activeUser: "DAL",
    selectedRegion: "TX",
    policyLabel: "Geo routing",
    dnsAnswer: REGION_ENDPOINTS.TX,
    reason: "Dallas stays near the Texas entry server.",
    phaseLabel: "The same hostname can resolve to Texas for a Dallas user.",
  },
  "new-york-query": {
    activeUser: "NYC",
    selectedRegion: "VA",
    policyLabel: "Geo routing",
    dnsAnswer: REGION_ENDPOINTS.VA,
    reason: "New York is closest to the Virginia entry server.",
    phaseLabel: "A New York lookup usually receives the Virginia endpoint.",
  },
};

export function deriveGeoDnsSnapshot(state: DemoState): GeoDnsSnapshot {
  const normalizedIndex = normalizeStepIndex(state.stepIndex);
  const phase = GEO_DNS_STEPS[normalizedIndex].phase;
  const definition = STEP_DEFINITIONS[phase];

  return {
    phase,
    phaseLabel: definition.phaseLabel,
    activeUser: USERS[definition.activeUser],
    selectedRegion: definition.selectedRegion,
    policyLabel: definition.policyLabel,
    dnsAnswer: definition.dnsAnswer,
    reason: definition.reason,
    regions: regionSnapshots(definition),
  };
}

export function geoDnsStepState(currentPhase: GeoDnsPhase, index: number) {
  const currentIndex = GEO_DNS_STEPS.findIndex(
    (step) => step.phase === currentPhase,
  );

  if (currentIndex === GEO_DNS_STEPS.length - 1 && index <= currentIndex) {
    return "complete";
  }

  if (index < currentIndex) return "complete";
  if (index === currentIndex) return "active";
  return "pending";
}

function normalizeStepIndex(stepIndex: number) {
  const normalized = Math.trunc(stepIndex) % GEO_DNS_STEPS.length;
  return normalized < 0 ? normalized + GEO_DNS_STEPS.length : normalized;
}

function regionSnapshots(
  definition: StepDefinition,
): readonly RegionSnapshot[] {
  return (["OR", "TX", "VA"] as const).map((code) => ({
    code,
    label: REGION_LABELS[code],
    endpoint: REGION_ENDPOINTS[code],
    status: regionStatus(code, definition),
  }));
}

function regionStatus(
  code: RegionCode,
  definition: StepDefinition,
): RegionStatus {
  if (code === definition.selectedRegion) return "selected";
  return "available";
}
