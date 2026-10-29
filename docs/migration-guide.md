# Migration guide

## Legacy item/step data

```ts
import { migrateLegacyEvolutionData } from "@no0vie/brnchly-core";

const graph = migrateLegacyEvolutionData(items, steps, {
  id: "legacy-import",
  title: "Imported evolution",
});
```

This creates an `EvolutionGraph` from the original linear/classic representation and retains legacy step metadata where applicable. Validate the result before storing it.

## Schema v1 to v2

```ts
import { migrateEvolutionGraph, validateEvolutionGraph } from "@no0vie/brnchly-core";

const current = migrateEvolutionGraph(unknownPayload);
const result = validateEvolutionGraph(current);
```

`parseEvolutionGraph` combines JSON parsing, migration, and validation and is preferred for imported text. New documents should set `schemaVersion: 2`.

## Renderer integration changes

Use the package-root imports and explicit stylesheet:

```ts
import { GraphRenderer } from "@no0vie/brnchly-react";
import "@no0vie/brnchly-react/styles.css";
```

Pass the required `layout` prop. Prefer `onSelectedNodeChange`; `onNodeSelectionChange` is deprecated. Adopt controlled selection/camera only when your application passes updated state back. Renderer callbacks never mutate your graph.

## Breaking-change policy

For 1.x, incompatible public package API or schema changes require a major version. Deprecations should remain for at least one minor release when practical. Repository-only editor/demo internals are not covered by package API compatibility. See [Release](release.md).
