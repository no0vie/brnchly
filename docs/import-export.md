# Import and export

Use core serialization functions at trust boundaries.

```ts
import { parseEvolutionGraph, serializeEvolutionGraph } from "@no0vie/brnchly-core";

const graph = parseEvolutionGraph(jsonText);
const json = serializeEvolutionGraph(graph);
```

`parseEvolutionGraph` parses JSON, migrates supported legacy data, validates the result, and returns schema v2. `serializeEvolutionGraph` migrates and validates before producing formatted JSON. Both reject invalid documents with `EvolutionGraphImportError`.

```ts
try {
  const nextGraph = parseEvolutionGraph(fileText);
  setGraph(nextGraph);
} catch (error) {
  // Keep the current graph unchanged and show an actionable error.
}
```

Never partially apply an unvalidated import. Parsing returns a new caller-owned graph; keep prior state until the whole operation succeeds. The library does not read files, download blobs, or persist documents—those browser/application concerns remain yours.

`migrateLegacyEvolutionData` converts the original item/step format. `migrateEvolutionGraph` upgrades graph payloads. See [Migration guide](migration-guide.md).
