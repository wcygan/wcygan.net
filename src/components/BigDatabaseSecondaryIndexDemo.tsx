import { useId } from "react";
import { BigDatabaseSecondaryTree } from "~/components/BigDatabaseSecondaryTree";
import {
  BigDatabasePlaybackControls,
  BigDatabasePlaybackSteps,
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
        <p className="big-db-flow-intro">
          Find the email, carry its primary key, then fetch the row. Scroll the
          trees sideways on narrow screens.
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
        <BigDatabasePlaybackSteps
          playback={playback}
          label="Email → primary key → row"
          count={`${playback.snapshot.step < 3 ? "1 index traversal" : "2 index traversals"} · cached pages`}
        />
      </div>
      <BigDatabasePlaybackStatus playback={playback} />
      <figcaption>
        Illustrative non-covering lookup through a unique email index. The
        secondary leaf stores the email and primary key; the clustered leaf
        supplies the requested status. Both trees' pages are assumed cached. A
        covering secondary index could avoid the second traversal. Playback is
        slowed for teaching.
      </figcaption>
    </figure>
  );
}
