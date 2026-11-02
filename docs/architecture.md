# Architecture

## Package boundaries

```text
standalone application → @no0vie/brnchly-react → @no0vie/brnchly-core
```

### Core

`@no0vie/brnchly-core` owns EvolutionGraph types, validation, migrations, serialization, deterministic layout, traversal, routing, playback planning, and viewport math. It has no React, DOM, storage, or application dependency.

Layout and camera are separate: layout returns positions, bounds, node size, and optional stage/lane regions; viewport utilities pan, zoom, fit, resize, and focus those results without invoking layout. HTML/SVG rendering and browser measurement do not enter core.

### React renderer

`@no0vie/brnchly-react` owns `GraphRenderer`, its public types, and the exported stylesheet. It projects core layout/routing results into SVG edges and HTML node cards, observes its container, handles pointer/camera interactions, and reports edit intent through callbacks.

React and React DOM are peer dependencies. The package does not depend on Ant Design, MobX, persistence, or the editor.

### Standalone application

The root application contains:

- Classic Mode and its legacy-data adapter;
- Graph Mode and evolution playback composition;
- `UniversalEditor`, command/history logic, and local persistence;
- demo graphs and the deterministic performance harness.

These are integration examples and product UI, not public npm exports.

## Data ownership

`EvolutionGraph` is the canonical serializable document. Public core operations derive results or return migrated/parsed values. `GraphRenderer` never writes into its `graph` prop.

Interaction intent crosses the React boundary through callbacks for selection, camera, layout, node positions, and connections. Controlled owners must pass updated values back. `defaultSelectedNodeId` and `defaultCamera` initialize uncontrolled state only.

The editor converts interaction requests into immutable graph commands, validates complete candidate graphs, and stores accepted before/after snapshots for bounded undo/redo. Compound operations are one transaction and one history entry. Rejected operations retain the prior graph.

## Persistence boundary

The application persistence service validates and serializes schema-v2 graphs before storing them in `localStorage`. Autosave and document lifecycle are editor concerns. History, selection, camera, drafts, collaboration, authentication, and server backup are not part of persisted graph data.

## Rendering decisions

The project uses deterministic in-repository layout plus HTML/SVG rendering. This keeps core testable and node controls accessible without adding a graph-framework runtime dependency. Camera state remains separate from layout so pan, zoom, resize, fit, and focus do not recompute graph geometry.

React Flow/XYFlow was not adopted because its graph-state conventions and runtime dependency were unnecessary for the current boundary. D3 would introduce imperative integration for algorithms small enough to keep pure and tested. Canvas/WebGL could improve very-large-graph rendering but would complicate native controls, accessibility, and hit testing.

Consequences include simple cubic edge routing, no node avoidance, predictable rather than globally optimized layout, no virtualization, and growing browser style/paint cost on large graphs. Revisit the rendering choice when measured requirements demand richer routing, substantially larger graphs, GPU rendering, or interaction behavior that the HTML/SVG model cannot support.

## Public boundary

Only package-root exports and `@no0vie/brnchly-react/styles.css` are public. Internal source paths, editor modules, app components, CSS implementation classes, and repository hooks have no compatibility guarantee.
