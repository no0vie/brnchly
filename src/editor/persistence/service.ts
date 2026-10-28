import {
  parseEvolutionGraph,
  serializeEvolutionGraph,
  validateEvolutionGraph,
  type EvolutionGraph,
  type EvolutionGraphV2,
} from "../../domain/evolutionGraph";

export interface StorageLike {
  readonly length: number;
  clear(): void;
  getItem(key: string): string | null;
  key(index: number): string | null;
  removeItem(key: string): void;
  setItem(key: string, value: string): void;
}

export interface DocumentSummary {
  id: string;
  graphId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, unknown>;
}

export interface StoredDocument<Layout = unknown> extends DocumentSummary {
  graph: EvolutionGraphV2;
  layout?: Layout;
}

export type ImportCollisionPolicy = "reject" | "duplicate" | "overwrite";

export class DocumentPersistenceError extends Error {
  readonly code:
    "storage_unavailable" | "quota_exceeded" | "corrupt_data" | "not_found" | "invalid_graph" | "collision";
  readonly cause?: unknown;

  constructor(code: DocumentPersistenceError["code"], message: string, cause?: unknown) {
    super(message);
    this.name = "DocumentPersistenceError";
    this.code = code;
    this.cause = cause;
  }
}

interface ServiceOptions {
  namespace?: string;
  createId?: () => string;
  now?: () => number;
}

interface CreateOptions<Layout> {
  layout?: Layout;
  metadata?: Record<string, unknown>;
  title?: string;
}

const defaultId = (): string =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;

export class LocalDocumentService<Layout = unknown> {
  private readonly indexKey: string;
  private readonly createId: () => string;
  private readonly now: () => number;

  constructor(
    private readonly storage: StorageLike,
    options: ServiceOptions = {},
  ) {
    const namespace = options.namespace ?? "brnchly:documents";
    this.indexKey = `${namespace}:index`;
    this.graphKey = (id) => `${namespace}:graph:${id}`;
    this.layoutKey = (id) => `${namespace}:layout:${id}`;
    this.createId = options.createId ?? defaultId;
    this.now = options.now ?? Date.now;
  }

  private readonly graphKey: (id: string) => string;
  private readonly layoutKey: (id: string) => string;

  list(): DocumentSummary[] {
    const raw = this.read(this.indexKey);
    if (raw === null) return [];
    const value = this.parseJson(raw, "document index");
    if (!Array.isArray(value) || !value.every(this.isSummary)) {
      throw new DocumentPersistenceError("corrupt_data", "The stored document index is corrupt.");
    }
    return value.map((item) => ({ ...item, ...(item.metadata ? { metadata: { ...item.metadata } } : {}) }));
  }

  newDocument(graph: EvolutionGraph, options: CreateOptions<Layout> = {}): DocumentSummary {
    return this.create(graph, options);
  }

  create(graph: EvolutionGraph, options: CreateOptions<Layout> = {}): DocumentSummary {
    const currentGraph = this.validSerializedGraph(graph);
    const timestamp = new Date(this.now()).toISOString();
    const summary: DocumentSummary = {
      id: this.createId(),
      graphId: currentGraph.id,
      title: options.title ?? currentGraph.title,
      createdAt: timestamp,
      updatedAt: timestamp,
      ...(options.metadata ? { metadata: { ...options.metadata } } : {}),
    };
    this.commit(summary.id, currentGraph, options.layout, [...this.list(), summary]);
    return { ...summary };
  }

  open(id: string): StoredDocument<Layout> {
    const summary = this.requireSummary(id);
    const rawGraph = this.read(this.graphKey(id));
    if (rawGraph === null)
      throw new DocumentPersistenceError("corrupt_data", `Stored graph for document "${id}" is missing.`);
    let graph: EvolutionGraphV2;
    try {
      graph = parseEvolutionGraph(rawGraph);
    } catch (error) {
      throw new DocumentPersistenceError("corrupt_data", `Stored graph for document "${id}" is corrupt.`, error);
    }
    const rawLayout = this.read(this.layoutKey(id));
    const layout =
      rawLayout === null ? undefined : (this.parseJson(rawLayout, `layout for document "${id}"`) as Layout);
    return { ...summary, graph, ...(layout === undefined ? {} : { layout }) };
  }

  save(id: string, graph: EvolutionGraph, layout?: Layout): DocumentSummary {
    const existing = this.requireSummary(id);
    const currentGraph = this.validSerializedGraph(graph);
    const updated = { ...existing, graphId: currentGraph.id, updatedAt: new Date(this.now()).toISOString() };
    const index = this.list().map((item) => (item.id === id ? updated : item));
    this.commit(id, currentGraph, layout, index);
    return updated;
  }

  rename(id: string, title: string): DocumentSummary {
    if (!title.trim()) throw new DocumentPersistenceError("invalid_graph", "Document title cannot be empty.");
    const existing = this.requireSummary(id);
    const updated = { ...existing, title: title.trim(), updatedAt: new Date(this.now()).toISOString() };
    this.write(this.indexKey, JSON.stringify(this.list().map((item) => (item.id === id ? updated : item))));
    return updated;
  }

  duplicate(id: string, title?: string): DocumentSummary {
    const source = this.open(id);
    return this.create(source.graph, {
      ...(source.layout === undefined ? {} : { layout: source.layout }),
      ...(source.metadata ? { metadata: source.metadata } : {}),
      title: title ?? `${source.title} copy`,
    });
  }

  delete(id: string): void {
    this.requireSummary(id);
    const keys = [this.indexKey, this.graphKey(id), this.layoutKey(id)];
    const previous = keys.map((key) => this.read(key));
    try {
      this.write(keys[0], JSON.stringify(this.list().filter((item) => item.id !== id)));
      this.remove(keys[1]);
      this.remove(keys[2]);
    } catch (error) {
      keys.forEach((key, position) => {
        try {
          if (previous[position] === null) this.storage.removeItem(key);
          else this.storage.setItem(key, previous[position]!);
        } catch {
          // Preserve the original actionable storage failure.
        }
      });
      throw error;
    }
  }

  export(id: string): string {
    return serializeEvolutionGraph(this.open(id).graph);
  }

  import(json: string, options: { collision?: ImportCollisionPolicy; layout?: Layout } = {}): StoredDocument<Layout> {
    const imported = parseEvolutionGraph(json);
    const collision = this.list().find(({ graphId }) => graphId === imported.id);
    const policy = options.collision ?? "reject";
    if (collision && policy === "reject") {
      throw new DocumentPersistenceError(
        "collision",
        `A document with graph id "${imported.id}" already exists; choose a collision policy.`,
      );
    }
    if (collision && policy === "overwrite") {
      this.save(collision.id, imported, options.layout);
      return this.open(collision.id);
    }
    const created = this.create(imported, { layout: options.layout });
    return this.open(created.id);
  }

  private validSerializedGraph(graph: EvolutionGraph): EvolutionGraphV2 {
    const validation = validateEvolutionGraph(graph);
    if (!validation.valid) {
      throw new DocumentPersistenceError(
        "invalid_graph",
        `Cannot save invalid Evolution Graph: ${validation.issues.map(({ message }) => message).join(" ")}`,
      );
    }
    return parseEvolutionGraph(serializeEvolutionGraph(graph));
  }

  private requireSummary(id: string): DocumentSummary {
    const summary = this.list().find((item) => item.id === id);
    if (!summary) throw new DocumentPersistenceError("not_found", `Document "${id}" was not found.`);
    return summary;
  }

  private commit(id: string, graph: EvolutionGraphV2, layout: Layout | undefined, index: DocumentSummary[]): void {
    const keys = [this.graphKey(id), this.layoutKey(id), this.indexKey];
    const previous = keys.map((key) => this.read(key));
    try {
      this.write(keys[0], serializeEvolutionGraph(graph));
      if (layout === undefined) this.remove(keys[1]);
      else this.write(keys[1], JSON.stringify(layout));
      this.write(keys[2], JSON.stringify(index));
    } catch (error) {
      keys.forEach((key, position) => {
        try {
          if (previous[position] === null) this.storage.removeItem(key);
          else this.storage.setItem(key, previous[position]!);
        } catch {
          // Preserve the original actionable storage failure.
        }
      });
      throw error;
    }
  }

  private read(key: string): string | null {
    try {
      return this.storage.getItem(key);
    } catch (error) {
      throw this.storageError(error);
    }
  }

  private write(key: string, value: string): void {
    try {
      this.storage.setItem(key, value);
    } catch (error) {
      throw this.storageError(error);
    }
  }

  private remove(key: string): void {
    try {
      this.storage.removeItem(key);
    } catch (error) {
      throw this.storageError(error);
    }
  }

  private storageError(error: unknown): DocumentPersistenceError {
    const quota =
      error instanceof DOMException &&
      (error.name === "QuotaExceededError" || error.name === "NS_ERROR_DOM_QUOTA_REACHED");
    return new DocumentPersistenceError(
      quota ? "quota_exceeded" : "storage_unavailable",
      quota ? "Local storage quota was exceeded." : "Local storage is unavailable.",
      error,
    );
  }

  private parseJson(raw: string, label: string): unknown {
    try {
      return JSON.parse(raw);
    } catch (error) {
      throw new DocumentPersistenceError("corrupt_data", `The stored ${label} is corrupt JSON.`, error);
    }
  }

  private readonly isSummary = (value: unknown): value is DocumentSummary => {
    if (typeof value !== "object" || value === null) return false;
    const item = value as Partial<DocumentSummary>;
    return [item.id, item.graphId, item.title, item.createdAt, item.updatedAt].every(
      (field) => typeof field === "string",
    );
  };
}
