import { useId } from "react";
import { BigDatabaseSecondaryTree } from "~/components/BigDatabaseSecondaryTree";
import {
  BigDatabasePlaybackControls,
  BigDatabasePlaybackStatus,
} from "~/components/BigDatabasePlayback";
import { useQueryPlayback } from "~/demos/big-database/use-query-playback";

export function BigDatabaseSecondaryIndexDemo() {
  const id = useId();
  const playback = useQueryPlayback("secondary");
  return (
    <figure
      ref={playback.figure}
      className="big-db-figure big-db-flow"
      data-graphic-frame="workbench"
      data-graphic-kind="svg"
      aria-labelledby={id}
    >
      <header>
        <p className="article-graphic-title" id={id}>
          A secondary lookup traverses two trees
        </p>
      </header>
      <BigDatabasePlaybackControls playback={playback} />
      <div
        className="big-db-stage big-db-flow-stage big-db-tree-flow-stage"
        data-graphic-stage="padded"
      >
        <BigDatabaseSecondaryTree
          step={playback.snapshot.step}
          path={playback.snapshot.path}
          packet={playback.reduced ? undefined : playback.snapshot.packet}
        />
        <p className="big-db-flow-count">
          {playback.snapshot.step < 3
            ? "1 index traversal"
            : "2 index traversals"}{" "}
          · cached pages
        </p>
      </div>
      <BigDatabasePlaybackStatus playback={playback} />
    </figure>
  );
}
