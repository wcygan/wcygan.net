export const WAR_STORY_TOTAL_HOURS = 48;
export const WAR_STORY_DEPLOY_HOUR = 36;
export const WAR_STORY_SAMPLE_INTERVAL_HOURS = 2;
export const WAR_STORY_INPUT_LOW_QPS = 1_000;
export const WAR_STORY_INPUT_HIGH_QPS = 4_000;
export const WAR_STORY_DOWNSTREAM_MULTIPLIER = 2;
export const WAR_STORY_POST_FIX_QPS = 10;
export const WAR_STORY_REDUNDANT_PERCENT = 99;

export type WarStoryPoint = {
  hour: number;
  inputQps: number;
  downstreamQps: number;
  postFixQps: number;
};

export const WAR_STORY_POINTS = Array.from(
  {
    length: WAR_STORY_TOTAL_HOURS / WAR_STORY_SAMPLE_INTERVAL_HOURS + 1,
  },
  (_, index) => {
    const hour = index * WAR_STORY_SAMPLE_INTERVAL_HOURS;
    const inputQps = inputQpsAtHour(hour);

    return {
      hour,
      inputQps,
      downstreamQps: inputQps * WAR_STORY_DOWNSTREAM_MULTIPLIER,
      postFixQps: WAR_STORY_POST_FIX_QPS,
    } satisfies WarStoryPoint;
  },
);

export function inputQpsAtHour(hour: number) {
  const cycle = Math.sin((hour / 12) * Math.PI * 2 - Math.PI / 2);
  const normalized = (cycle + 1) / 2;
  return Math.round(
    WAR_STORY_INPUT_LOW_QPS +
      normalized * (WAR_STORY_INPUT_HIGH_QPS - WAR_STORY_INPUT_LOW_QPS),
  );
}

export function deployProgress() {
  return WAR_STORY_DEPLOY_HOUR / WAR_STORY_TOTAL_HOURS;
}
