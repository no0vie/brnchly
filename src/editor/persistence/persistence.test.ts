import { describe, expect, it, vi } from "vitest";
import type { EvolutionGraph } from "../../domain/evolutionGraph";
import { AutosaveController, DocumentPersistenceError, LocalDocumentService, type StorageLike } from "./index";

const graph = (id = "graph-1", title = "Graph One"): EvolutionGraph => ({
  schemaVersion: 2,
  id,
  title,
  branches: [{ id: "main", title: "Main", color: "#fff" }],
  nodes: [{ id: "node", title: "Node", branchId: "main", status: "available" }],
  edges: [],
});

class MemoryStorage implements StorageLike {
  private readonly values = new Map<string, string>();
  get length() {
    return this.values.size;
  }
  clear() {
    this.values.clear();
  }
  getItem(key: string) {
    return this.values.get(key) ?? null;
  }
  key(index: number) {
    return [...this.values.keys()][index] ?? null;
  }
  removeItem(key: string) {
    this.values.delete(key);
  }
  setItem(key: string, value: string) {
    this.values.set(key, value);
  }
}

const service = (storage: StorageLike = new MemoryStorage()) => {
  let id = 0;
  let now = 1000;
  return new LocalDocumentService(storage, { createId: () => `doc-${++id}`, now: () => ++now });
};

describe("LocalDocumentService", () => {
  it("creates, lists, opens, renames, duplicates, saves, and deletes documents", () => {
    const store = new MemoryStorage();
    const documents = service(store);
    const created = documents.create(graph(), { layout: { zoom: 1.5 }, metadata: { color: "blue" } });

    expect(documents.list()).toEqual([
      expect.objectContaining({ id: "doc-1", title: "Graph One", metadata: { color: "blue" } }),
    ]);
    expect(documents.open(created.id)).toEqual(expect.objectContaining({ graph: graph(), layout: { zoom: 1.5 } }));

    documents.rename(created.id, "Renamed");
    documents.save(created.id, graph("graph-1", "Changed"), { zoom: 2 });
    const duplicate = documents.duplicate(created.id, "Copy");

    expect(documents.open(created.id)).toEqual(
      expect.objectContaining({ graph: graph("graph-1", "Changed"), layout: { zoom: 2 } }),
    );
    expect(duplicate).toEqual(expect.objectContaining({ id: "doc-2", title: "Copy" }));
    expect(documents.open(duplicate.id).graph.id).toBe("graph-1");
    documents.delete(created.id);
    expect(documents.list().map(({ id }) => id)).toEqual(["doc-2"]);
    expect(() => documents.open(created.id)).toThrow("not found");
  });

  it("stores layout separately from the serialized graph", () => {
    const store = new MemoryStorage();
    service(store).create(graph(), { layout: { selected: "node" } });

    const graphRecord = store.getItem("brnchly:documents:graph:doc-1");
    expect(graphRecord).not.toContain("selected");
    expect(store.getItem("brnchly:documents:layout:doc-1")).toContain("selected");
  });

  it.each(["graph", "layout"])("rolls back every record when deleting the %s record fails", (failedRecord) => {
    const store = new MemoryStorage();
    const documents = service(store);
    const created = documents.create(graph(), { layout: { selected: "node" } });
    const keys = {
      index: "brnchly:documents:index",
      graph: `brnchly:documents:graph:${created.id}`,
      layout: `brnchly:documents:layout:${created.id}`,
    };
    const before = Object.fromEntries(Object.entries(keys).map(([record, key]) => [record, store.getItem(key)]));
    const originalRemove = store.removeItem.bind(store);
    let injected = false;
    store.removeItem = (key: string) => {
      if (!injected && key === keys[failedRecord as "graph" | "layout"]) {
        injected = true;
        throw new Error("injected remove failure");
      }
      originalRemove(key);
    };

    expect(() => documents.delete(created.id)).toThrow(DocumentPersistenceError);

    expect(Object.fromEntries(Object.entries(keys).map(([record, key]) => [record, store.getItem(key)]))).toEqual(
      before,
    );
    expect(documents.open(created.id)).toEqual(
      expect.objectContaining({ graph: graph(), layout: { selected: "node" } }),
    );
  });

  it("rejects invalid saves without replacing the last valid graph", () => {
    const documents = service();
    const created = documents.create(graph());
    const invalid = { ...graph(), branches: [] };

    expect(() => documents.save(created.id, invalid)).toThrow("invalid");
    expect(documents.open(created.id).graph).toEqual(graph());
  });

  it("reports unavailable storage, quota failures, and corrupted records", () => {
    const unavailable: StorageLike = {
      length: 0,
      clear: () => undefined,
      key: () => null,
      removeItem: () => undefined,
      getItem: () => {
        throw new Error("disabled");
      },
      setItem: () => {
        throw new DOMException("full", "QuotaExceededError");
      },
    };
    expect(() => service(unavailable).list()).toThrow(DocumentPersistenceError);
    expect(() => service(unavailable).create(graph())).toThrow(/quota|storage/i);

    const corrupted = new MemoryStorage();
    corrupted.setItem("brnchly:documents:index", "not-json");
    expect(() => service(corrupted).list()).toThrow(/corrupt/i);
  });

  it("imports through migrations and validation, exports through the serializer, and protects collisions", () => {
    const documents = service();
    const first = documents.create(graph("same", "Existing"));
    const legacy = JSON.stringify({
      schemaVersion: 0,
      id: "same",
      title: "Imported",
      nodes: [{ id: "old", title: "Old" }],
      edges: [],
    });

    expect(() => documents.import(legacy)).toThrow(/collision/i);
    expect(documents.open(first.id).graph.title).toBe("Existing");
    const imported = documents.import(legacy, { collision: "duplicate" });
    expect(imported.graphId).toBe("same");
    expect(JSON.parse(documents.export(imported.id))).toEqual(
      expect.objectContaining({ schemaVersion: 2, title: "Imported" }),
    );
    expect(() => documents.import("{broken")).toThrow("valid JSON");
    expect(documents.list()).toHaveLength(2);
  });

  it("only overwrites a graph-id collision when explicitly requested", () => {
    const documents = service();
    const existing = documents.create(graph("same", "Existing"));
    const result = documents.import(JSON.stringify(graph("same", "Replacement")), { collision: "overwrite" });

    expect(result.id).toBe(existing.id);
    expect(documents.open(existing.id).graph.title).toBe("Replacement");
    expect(documents.list()).toHaveLength(1);
  });
});

describe("AutosaveController", () => {
  it("debounces saves and transitions through unsaved, saving, and saved", async () => {
    vi.useFakeTimers();
    const statuses: string[] = [];
    const save = vi.fn(async (_value: number) => undefined);
    const autosave = new AutosaveController(save, { delayMs: 750, onStatus: ({ status }) => statuses.push(status) });

    autosave.schedule(1);
    autosave.schedule(2);
    expect(autosave.status.status).toBe("unsaved");
    await vi.advanceTimersByTimeAsync(750);

    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith(2);
    expect(statuses).toEqual(["unsaved", "unsaved", "saving", "saved"]);
    vi.useRealTimers();
  });

  it("does not report an older in-flight save as saved when a newer generation is pending", async () => {
    let resolveFirstSave: (() => void) | undefined;
    const firstSave = new Promise<void>((resolve) => {
      resolveFirstSave = resolve;
    });
    const save = vi.fn((value: number) => (value === 1 ? firstSave : Promise.resolve()));
    const autosave = new AutosaveController(save, { delayMs: 60_000 });

    autosave.schedule(1);
    const firstFlush = autosave.flush();
    autosave.schedule(2);
    resolveFirstSave?.();
    await firstFlush;

    expect(autosave.status).toEqual({ status: "unsaved", value: 2 });
    autosave.cancel();
  });

  it("supports cancellation, flush, and error status while retaining the unsaved value", async () => {
    vi.useFakeTimers();
    const save = vi.fn(async (value: string) => {
      if (value === "bad") throw new Error("quota");
    });
    const autosave = new AutosaveController(save, { delayMs: 500 });

    autosave.schedule("cancelled");
    autosave.cancel();
    await vi.advanceTimersByTimeAsync(500);
    expect(save).not.toHaveBeenCalled();

    autosave.schedule("bad");
    await autosave.flush();
    expect(autosave.status).toEqual(
      expect.objectContaining({ status: "error", value: "bad", error: expect.any(Error) }),
    );
    vi.useRealTimers();
  });
});
