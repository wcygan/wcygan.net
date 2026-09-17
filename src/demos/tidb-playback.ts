export const TIDB_PLAYBACK_SPEEDS = [0.5, 1, 2, 4, 8] as const;
export type TidbPlaybackSpeed = (typeof TIDB_PLAYBACK_SPEEDS)[number];
