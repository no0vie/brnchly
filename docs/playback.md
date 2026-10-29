# Playback

Playback planning is part of `@no0vie/brnchly-core`; playback controls in the repository app are not exported by `@no0vie/brnchly-react`.

## Plan and snapshots

```ts
import { createPlaybackPlan, snapshotAt } from "@no0vie/brnchly-core";

const plan = createPlaybackPlan(graph);
const snapshot = snapshotAt(plan, 0);
```

Core exports `PlaybackController`, `createPlaybackPlan`, `snapshotAt`, `nextStageCheckpoint`, and `previousStageCheckpoint`, plus playback types.

To visualize a snapshot, pass newly allocated sets to the renderer:

```tsx
<GraphRenderer
  graph={graph}
  layout="stage-lane"
  visibleNodeIds={new Set(snapshot.visibleNodeIds)}
  visibleEdgeIds={new Set(snapshot.visibleEdgeIds)}
  newNodeIds={new Set(snapshot.newlyVisibleNodeIds)}
  activeStageId={snapshot.activeStageId}
/>
```

The caller owns timing, play/pause controls, speed, and camera policy. Do not mutate previously passed sets. The repository demo shows one composition with follow, overview, and manual camera modes; those controls are not package API.

Respect reduced-motion preferences by avoiding animated camera transitions. Playback ordering depends on graph stage/order data and should be validated before use.
