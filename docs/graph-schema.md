# Graph schema

The current schema version is `2` (`CURRENT_EVOLUTION_GRAPH_SCHEMA_VERSION`). Imports accept supported legacy input and migrate it before validation.

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
- **Stage:** `id`, `title`, numeric `order`, optional `description`.
- **Lane:** `id`, `title`, numeric `coordinate`, optional `color`. Coordinates need not be contiguous.
- **Node:** `id`, `title`, `branchId`, `status`; optional description, icon, level, acquisition timestamp, evidence, manual position, metadata, `stageId`, and `laneId`.
- **Edge:** `id`, `source`, `target`, and type `dependency | evolution | related`.
- **Status:** `locked | available | acquired | mastered`.

When stages and lanes are used, nodes must provide coherent stage/lane references. `stage-lane` layout is intended for that model.

## Validation

```ts
import { validateEvolutionGraph } from "@no0vie/brnchly-core";

const { valid, issues } = validateEvolutionGraph(candidate);
```

Validation reports structural problems, duplicate IDs/orders/coordinates, unknown references, incomplete stage/lane assignments, dependency self-links, and dependency cycles. It returns issues rather than repairing data.

## Identity and immutability

IDs are document identities and should remain stable. Arrays and entities are caller-owned; replace changed entities/arrays instead of mutating values already passed to consumers. This also gives React reliable change detection.

## Schema compatibility

TypeScript permits schema `1` at call sites for migration compatibility. `parseEvolutionGraph` and `serializeEvolutionGraph` produce/require a valid current schema value. New documents should always use version `2`.
