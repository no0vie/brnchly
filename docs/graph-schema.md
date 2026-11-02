# EvolutionGraph schema

The persisted current schema is version `2`, exposed as `CURRENT_EVOLUTION_GRAPH_SCHEMA_VERSION`. The broad `EvolutionGraph` TypeScript interface accepts `schemaVersion: 1 | 2` so callers can provide migration input; `validateEvolutionGraph` accepts only a valid current schema. New and stored documents must use version `2`.

```ts
interface EvolutionGraph {
  schemaVersion: 1 | 2;
  id: string;
  title: string;
  description?: string;
  branches: EvolutionBranch[];
  stages?: GraphStage[];
  lanes?: GraphLane[];
  nodes: EvolutionNode[];
  edges: EvolutionEdge[];
  metadata?: Record<string, unknown>;
}
```

## Entities

- **Branch:** `id`, `title`, `color`, optional `description`.
- **Stage:** `id`, `title`, finite numeric `order`, optional `description`.
- **Lane:** `id`, `title`, finite numeric `coordinate`, optional `color`. Coordinates need not be contiguous.
- **Node:** `id`, `title`, `branchId`, `status`; optional description, icon, level, acquisition timestamp, evidence, manual `position`, metadata, `stageId`, and `laneId`.
- **Edge:** `id`, `source`, `target`, and `type` (`dependency`, `evolution`, or `related`).
- **Status:** `locked`, `available`, `acquired`, or `mastered`.

When stage/lane placement is used, a node must provide both `stageId` and `laneId`, and both references must exist.

## Validation

```ts
import { validateEvolutionGraph } from "@no0vie/brnchly-core";

const result = validateEvolutionGraph(candidate);
if (!result.valid) console.error(result.issues);
```

Validation reports malformed structures, duplicate IDs, duplicate stage orders/lane coordinates, unknown references, incomplete stage/lane assignments, dependency self-links, and dependency cycles. It reports issues without repairing input.

## Migration and import

- `migrateEvolutionGraph(unknownPayload)` upgrades supported graph payloads to schema v2.
- `migrateLegacyEvolutionData(items, steps, options)` converts the original Classic item/step model.
- `parseEvolutionGraph(json)` parses JSON, migrates, validates, and returns `EvolutionGraphV2`.
- `serializeEvolutionGraph(graph)` migrates and validates before returning formatted JSON.
- Parse/serialization failures use `EvolutionGraphImportError`.

At trust boundaries, prefer `parseEvolutionGraph` and keep the current document unchanged until parsing succeeds. The library does not read files, download blobs, or persist documents.

## Compatibility

IDs are document identities and should remain stable. Replace changed entities/arrays rather than mutating values already passed to consumers. Supported legacy migration remains part of the v1 compatibility surface; incompatible persisted-schema changes require a new major version.
