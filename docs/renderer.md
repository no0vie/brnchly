# React renderer

## Minimal use

```tsx
import { GraphRenderer } from "@no0vie/brnchly-react";
import "@no0vie/brnchly-react/styles.css";
import type { EvolutionGraph } from "@no0vie/brnchly-core";

export function View({ graph }: { graph: EvolutionGraph }) {
  return (
    <section style={{ width: "100%", minHeight: 600 }}>
      <GraphRenderer graph={graph} layout="horizontal-dag" />
    </section>
  );
}
```

`graph` and `layout` are required. Layout strategies are `manual`, `horizontal-dag`, `vertical-dag`, `radial`, and `stage-lane`.

## Controlled selection

```tsx
const [selected, setSelected] = useState<string | null>(null);
<GraphRenderer graph={graph} layout="horizontal-dag" selectedNodeId={selected} onSelectedNodeChange={setSelected} />;
```

Use `defaultSelectedNodeId` instead for uncontrolled initialization. Do not pass both models. `onNodeSelectionChange` is deprecated.

## Controlled camera

```tsx
const [camera, setCamera] = useState({ x: 500, y: 320, zoom: 1 });
<GraphRenderer graph={graph} layout="horizontal-dag" camera={camera} onCameraChange={setCamera} />;
```

Use `defaultCamera` for uncontrolled initialization. Camera callbacks do not mutate your state.

## Editing callbacks

Set `editingEnabled` and handle `onNodePositionCommit` / `onConnectionCommit`. The renderer previews interaction but does not modify `graph`; validate the operation, create a new graph, and pass it back. `selectedNodeIds` controls multi-node drag participation.

## Highlight and playback inputs

Pass read-only sets through `visibleNodeIds`, `visibleEdgeIds`, `newNodeIds`, and highlighted-ID props. Alternatively, `highlightState` derives dependency traversal from `rootNodeId`, `traversalMode`, and selected lanes. Replace sets rather than mutating a set already passed as a prop.

## Imperative handle

A `GraphRendererHandle` ref supports `fitToView`, `resetView`, `focusStage`, `focusLane`, `focusNode`, `setCamera`, `getCamera`, and `cancelCameraTransition`. Transition options accept duration, easing, and an abort signal.

## Browser requirement

Rendering uses pointer events, DOM sizing, `ResizeObserver`, animation frames, and `performance`. Treat it as client-only UI. Package module evaluation is tested, but SSR output and hydration are not verified or supported claims.
