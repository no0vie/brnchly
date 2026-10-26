# ADR 0001: Pure layout engine and HTML/SVG renderer

- Status: Accepted
- Date: 2026-10-25

## Context

Phase 2 requires five deterministic layout strategies, arbitrary stages and lanes, typed edges, pan/zoom/focus, touch input, and support for 100+ nodes. The engine must remain independent from React and from any business domain. Classic Mode must continue to work.

## Decision

Use a small in-repository pure TypeScript layout engine (`src/layout`) and viewport math module (`src/viewport`). Render node cards as accessible HTML buttons and graph geometry as SVG in `src/renderer/GraphRenderer.tsx`.

- Layout takes an `EvolutionGraph` and options and returns immutable positions, bounds, node size, and stage/lane regions.
- Camera state is separate from layout output. Pan, zoom, resize, fit, and focus never invoke layout.
- DAG layouts use deterministic layering. `related` edges do not affect DAG order. Cyclic residual nodes are placed in a stable fallback layer so malformed runtime input cannot hang.
- Stage/Lane layout derives dynamic columns/rows from cell occupancy and sorts lanes numerically by `coordinate`.
- HTML nodes provide native focus and keyboard activation; SVG provides scalable regions and curved typed edges.
- No third-party graph package is added in Phase 2.

## Alternatives considered

### React Flow / XYFlow

Strong interaction model, but adds a significant dependency and imposes its own graph state conventions. Phase 2 needs a compact read-only renderer and stable public domain boundary, so this is deferred until editor requirements justify it.

### D3 layout and zoom

Flexible, but would mix imperative rendering/interaction with React or require additional adapters. The required layouts and viewport transforms are small enough to implement and test directly.

### Canvas/WebGL

Potentially better for very large graphs, but weakens native accessibility and complicates hit testing. The current target is 100+ nodes, where HTML/SVG is adequate.

## Consequences

### Positive

- Framework-independent, deterministic, unit-testable geometry.
- No new runtime dependency.
- Accessible node controls and straightforward theming.
- Embeddable renderer remains independent from MobX/editor state.
- Camera API is ready for future animation.

### Negative

- Edge routing is simple cubic routing and does not avoid nodes.
- No virtualization; very large graphs will eventually require profiling and potentially a renderer change.
- Layout quality is intentionally predictable rather than globally optimized.
- Stage/Lane validation rejects duplicate stage orders and lane coordinates instead of merging them.

## Revisit when

Phase 3 animation, Phase 4 graph editing, or measured performance beyond several hundred nodes requires richer routing, selection, drag handles, virtualization, or GPU rendering.
