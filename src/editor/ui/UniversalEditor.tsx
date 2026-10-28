import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { EvolutionGraphView, GraphRenderer } from "../../renderer";
import type {
  EvolutionEdgeType,
  EvolutionGraph,
  EvolutionGraphTheme,
  EvolutionLayoutStrategy,
  NodeStatus,
} from "../../domain/evolutionGraph";
import {
  createGraphHistory,
  executeGraphCommand,
  redo,
  undo,
  type GraphCommand,
  type GraphHistory,
  type ReferencedEntityDeletePolicy,
} from "../core";
import { AutosaveController, LocalDocumentService, type AutosaveStatus, type DocumentSummary } from "../persistence";
import "./editor.css";

type EntityKind = "stage" | "lane" | "branch" | "node" | "edge";
type Selection = { kind: EntityKind; id: string };
type EditorView = "view" | "edit" | "preview";
type LayoutState = { strategy: EvolutionLayoutStrategy };
type InspectorDraft = {
  id?: string;
  title?: string;
  description?: string;
  color?: string;
  order?: number;
  coordinate?: number;
  branchId?: string;
  stageId?: string;
  laneId?: string;
  status?: NodeStatus;
  source?: string;
  target?: string;
  type?: EvolutionEdgeType;
  position?: { x: number; y: number };
};

const uid = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
const blankGraph = (): EvolutionGraph => ({
  schemaVersion: 2,
  id: uid("graph"),
  title: "Untitled graph",
  description: "",
  branches: [],
  stages: [],
  lanes: [],
  nodes: [],
  edges: [],
});
const inputTarget = (target: EventTarget | null) => {
  const element = target as HTMLElement | null;
  return !!element?.closest("input, textarea, select, [contenteditable='true']");
};
const entityKey = ({ kind, id }: Selection) => `${kind}:${id}`;
const graphTitle = (graph: EvolutionGraph) => graph.title;
const graphDescription = (graph: EvolutionGraph) => graph.description ?? "";

export interface UniversalEditorProps {
  theme: EvolutionGraphTheme;
}

export const UniversalEditor: React.FC<UniversalEditorProps> = ({ theme }) => {
  const service = useMemo(() => new LocalDocumentService<LayoutState>(window.localStorage), []);
  const [documents, setDocuments] = useState<DocumentSummary[]>([]);
  const [documentId, setDocumentId] = useState<string>();
  const [history, setHistory] = useState<GraphHistory>();
  const [view, setView] = useState<EditorView>("edit");
  const [layout, setLayout] = useState<EvolutionLayoutStrategy>("stage-lane");
  const [selected, setSelected] = useState<Selection[]>([]);
  const [query, setQuery] = useState("");
  const [adding, setAdding] = useState<EntityKind>();
  const [connectionEdgeType, setConnectionEdgeType] = useState<EvolutionEdgeType>("dependency");
  const [issues, setIssues] = useState<string[]>([]);
  const [storageError, setStorageError] = useState<string>();
  const [autosaveStatus, setAutosaveStatus] = useState<AutosaveStatus<EvolutionGraph>>({ status: "saved" });
  const fileRef = useRef<HTMLInputElement>(null);
  const currentDocumentRef = useRef<string>();
  const layoutRef = useRef(layout);

  const refreshDocuments = useCallback(() => {
    try {
      setDocuments(service.list());
      setStorageError(undefined);
    } catch (error) {
      setStorageError(error instanceof Error ? error.message : "Storage failed");
    }
  }, [service]);

  const autosave = useMemo(
    () =>
      new AutosaveController<EvolutionGraph>(
        (graph) => {
          if (!currentDocumentRef.current) return;
          service.save(currentDocumentRef.current, graph, { strategy: layoutRef.current });
          refreshDocuments();
        },
        { delayMs: 500, onStatus: setAutosaveStatus },
      ),
    [refreshDocuments, service],
  );

  useEffect(() => {
    refreshDocuments();
    try {
      const docs = service.list();
      if (docs[0]) {
        const opened = service.open(docs[0].id);
        setDocumentId(opened.id);
        currentDocumentRef.current = opened.id;
        setHistory(createGraphHistory(opened.graph));
        if (opened.layout?.strategy) setLayout(opened.layout.strategy);
      }
    } catch (error) {
      setStorageError(error instanceof Error ? error.message : "Restore failed");
    }
    return () => autosave.cancel();
  }, [autosave, refreshDocuments, service]);

  useEffect(() => {
    layoutRef.current = layout;
  }, [layout]);

  const execute = useCallback(
    (command: GraphCommand, onSuccess?: () => void) => {
      setHistory((current) => {
        if (!current) return current;
        const outcome = executeGraphCommand(current, command);
        if (!outcome.result.success) {
          setIssues([
            outcome.result.error ?? "Command rejected",
            ...outcome.result.validation.issues.map((issue) => issue.message),
          ]);
          return current;
        }
        setIssues([]);
        autosave.schedule(outcome.history.graph);
        onSuccess?.();
        return outcome.history;
      });
    },
    [autosave],
  );

  const initialize = (graph: EvolutionGraph, id: string, savedLayout?: LayoutState) => {
    autosave.cancel();
    setDocumentId(id);
    currentDocumentRef.current = id;
    setHistory(createGraphHistory(graph));
    setLayout(savedLayout?.strategy ?? "stage-lane");
    setSelected([]);
    setIssues([]);
    setStorageError(undefined);
    setAutosaveStatus({ status: "saved", value: graph });
  };
  const flushCurrentDocument = useCallback(async () => {
    if (!currentDocumentRef.current) return true;
    await autosave.flush();
    if (autosave.status.status !== "error") return true;
    const error = autosave.status.error;
    setStorageError(error instanceof Error ? error.message : "Could not save current document");
    return false;
  }, [autosave]);
  const createDocument = async () => {
    if (!(await flushCurrentDocument())) return;
    try {
      const graph = blankGraph();
      const summary = service.newDocument(graph, { title: graph.title });
      initialize(graph, summary.id);
      refreshDocuments();
    } catch (error) {
      setStorageError(error instanceof Error ? error.message : "Could not create document");
    }
  };
  const openDocument = async (id: string) => {
    if (id === currentDocumentRef.current || !(await flushCurrentDocument())) return;
    try {
      const opened = service.open(id);
      initialize(opened.graph, opened.id, opened.layout);
    } catch (error) {
      setStorageError(error instanceof Error ? error.message : "Could not open document");
    }
  };
  const historyAction = useCallback(
    (action: typeof undo) =>
      setHistory((current) => {
        if (!current) return current;
        const outcome = action(current);
        if (!outcome.result.success) return current;
        autosave.schedule(outcome.history.graph);
        setIssues([]);
        return outcome.history;
      }),
    [autosave],
  );

  const allSelections = useMemo<Selection[]>(
    () =>
      history
        ? [
            ...(history.graph.stages ?? []).map(({ id }) => ({ kind: "stage" as const, id })),
            ...(history.graph.lanes ?? []).map(({ id }) => ({ kind: "lane" as const, id })),
            ...history.graph.branches.map(({ id }) => ({ kind: "branch" as const, id })),
            ...history.graph.nodes.map(({ id }) => ({ kind: "node" as const, id })),
            ...history.graph.edges.map(({ id }) => ({ kind: "edge" as const, id })),
          ]
        : [],
    [history],
  );

  const deleteSelections = useCallback(
    (items = selected, policy: ReferencedEntityDeletePolicy = { mode: "reject" }) => {
      if (!items.length) return;
      const priority: Record<EntityKind, number> = { edge: 0, node: 1, stage: 2, lane: 2, branch: 2 };
      const normalized = [...new Map(items.map((item) => [entityKey(item), item])).values()].sort(
        (left, right) => priority[left.kind] - priority[right.kind],
      );
      const commands: GraphCommand[] = normalized.map(({ kind, id }) =>
        kind === "stage" || kind === "lane" || kind === "branch"
          ? ({ type: `delete-${kind}`, id, policy } as GraphCommand)
          : ({ type: `delete-${kind}`, id } as GraphCommand),
      );
      execute({ type: "transaction", commands }, () => setSelected([]));
    },
    [execute, selected],
  );

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (inputTarget(event.target) || !history) return;
      const modifier = event.metaKey || event.ctrlKey;
      if (modifier && event.key.toLowerCase() === "z") {
        event.preventDefault();
        historyAction(event.shiftKey ? redo : undo);
      } else if (modifier && event.key.toLowerCase() === "y") {
        event.preventDefault();
        historyAction(redo);
      } else if (modifier && event.key.toLowerCase() === "s") {
        event.preventDefault();
        void autosave.flush();
      } else if (modifier && event.key.toLowerCase() === "a") {
        event.preventDefault();
        setSelected(allSelections);
      } else if (event.key === "Delete" || event.key === "Backspace") {
        event.preventDefault();
        deleteSelections();
      } else if (event.key === "Escape") setSelected([]);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [allSelections, autosave, deleteSelections, history, historyAction]);

  const graph = history?.graph;
  const selectedOne = selected.length === 1 ? selected[0] : undefined;

  return (
    <section className="universal-editor" aria-label="Universal graph editor">
      <header className="editor-toolbar">
        <button onClick={createDocument}>New document</button>
        <select
          aria-label="Open document"
          value={documentId ?? ""}
          onChange={(event) => void openDocument(event.target.value)}
        >
          <option value="" disabled>
            Open document…
          </option>
          {documents.map((doc) => (
            <option key={doc.id} value={doc.id}>
              {doc.title}
            </option>
          ))}
        </select>
        <button
          disabled={!documentId}
          onClick={async () => {
            if (!documentId || !(await flushCurrentDocument())) return;
            try {
              const copy = service.duplicate(documentId);
              refreshDocuments();
              await openDocument(copy.id);
            } catch (error) {
              setStorageError(error instanceof Error ? error.message : "Duplicate failed");
            }
          }}
        >
          Duplicate
        </button>
        <button
          disabled={!documentId}
          onClick={() => {
            if (!documentId) return;
            const title = window.prompt("Document name", documents.find((d) => d.id === documentId)?.title);
            if (!title) return;
            try {
              service.rename(documentId, title);
              refreshDocuments();
            } catch (error) {
              setStorageError(error instanceof Error ? error.message : "Rename failed");
            }
          }}
        >
          Rename
        </button>
        <button
          disabled={!documentId}
          onClick={async () => {
            if (!documentId || !window.confirm("Delete this local document?") || !(await flushCurrentDocument()))
              return;
            try {
              service.delete(documentId);
              setHistory(undefined);
              setDocumentId(undefined);
              currentDocumentRef.current = undefined;
              refreshDocuments();
            } catch (error) {
              setStorageError(error instanceof Error ? error.message : "Delete failed");
            }
          }}
        >
          Delete document
        </button>
        <button
          disabled={!documentId}
          onClick={async () => {
            if (!documentId || !(await flushCurrentDocument())) return;
            try {
              const blob = new Blob([service.export(documentId)], { type: "application/json" });
              const link = document.createElement("a");
              link.href = URL.createObjectURL(blob);
              link.download = `${graphTitle(graph!)}.json`;
              link.click();
              URL.revokeObjectURL(link.href);
            } catch (error) {
              setStorageError(error instanceof Error ? error.message : "Export failed");
            }
          }}
        >
          Export JSON
        </button>
        <button onClick={() => fileRef.current?.click()}>Import file</button>
        <input
          ref={fileRef}
          hidden
          type="file"
          accept="application/json,.json"
          onChange={async (event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            try {
              if (!(await flushCurrentDocument())) return;
              const imported = service.import(await file.text(), { collision: "duplicate" });
              refreshDocuments();
              initialize(imported.graph, imported.id, imported.layout);
            } catch (error) {
              setStorageError(error instanceof Error ? error.message : "Import failed");
            }
            event.target.value = "";
          }}
        />
        <span className={`save-status save-status--${autosaveStatus.status}`} role="status">
          {autosaveStatus.status}
        </span>
      </header>

      {storageError && (
        <div className="editor-error" role="alert">
          {storageError}
        </div>
      )}
      {!graph || !history ? (
        <div className="editor-empty">
          <h2>No document open</h2>
          <p>Create a graph or open a local document to begin.</p>
        </div>
      ) : (
        <>
          <div className="editor-titlebar">
            <div>
              <h2>{graphTitle(graph)}</h2>
              <p>{graphDescription(graph)}</p>
            </div>
            <div className="view-switch" aria-label="Editor mode">
              {(["view", "edit", "preview"] as const).map((item) => (
                <button key={item} aria-pressed={view === item} onClick={() => setView(item)}>
                  {item[0].toUpperCase() + item.slice(1)}
                </button>
              ))}
            </div>
            <button aria-label="Undo" disabled={!history.past.length} onClick={() => historyAction(undo)}>
              ↶ Undo
            </button>
            <button aria-label="Redo" disabled={!history.future.length} onClick={() => historyAction(redo)}>
              ↷ Redo
            </button>
          </div>

          {!!issues.length && (
            <section className="validation-list" aria-label="Validation issues" role="region">
              <strong>Command rejected</strong>
              <ul>
                {issues.map((issue, i) => (
                  <li key={`${issue}-${i}`}>{issue}</li>
                ))}
              </ul>
            </section>
          )}

          {view === "preview" ? (
            <EvolutionGraphView graph={graph} mode="graph" readonly theme={theme} autoplay layout={layout} />
          ) : (
            <div className="editor-grid">
              <aside className="structure-panel" aria-label="Graph structure" role="region">
                <input
                  aria-label="Search structure"
                  placeholder="Search structure"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
                <div className="selection-actions">
                  <span>{selected.length ? `${selected.length} selected` : "Nothing selected"}</span>
                  <button onClick={() => setSelected(allSelections)}>Select all</button>
                  <button aria-label="Clear selection" onClick={() => setSelected([])}>
                    Clear
                  </button>
                  <button disabled={!selected.length || view !== "edit"} onClick={() => deleteSelections()}>
                    Bulk delete
                  </button>
                </div>
                {(["stage", "lane", "branch", "node", "edge"] as EntityKind[]).map((kind) => {
                  const items =
                    kind === "stage"
                      ? (graph.stages ?? [])
                      : kind === "lane"
                        ? (graph.lanes ?? [])
                        : kind === "branch"
                          ? graph.branches
                          : kind === "node"
                            ? graph.nodes
                            : graph.edges;
                  const filtered = items.filter((item) =>
                    ("title" in item ? item.title : item.id).toLowerCase().includes(query.toLowerCase()),
                  );
                  return (
                    <div className="structure-group" key={kind}>
                      <div>
                        <strong>{kind[0].toUpperCase() + kind.slice(1)}s</strong>
                        {view === "edit" && (
                          <button
                            aria-label={`Add ${kind}`}
                            onClick={() => {
                              setAdding(kind);
                              setSelected([]);
                            }}
                          >
                            ＋
                          </button>
                        )}
                      </div>
                      {filtered.map((item) => {
                        const choice = { kind, id: item.id };
                        const active = selected.some((s) => entityKey(s) === entityKey(choice));
                        return (
                          <button
                            className={active ? "selected" : ""}
                            aria-pressed={active}
                            key={item.id}
                            onClick={(event) =>
                              setSelected((current) =>
                                event.metaKey || event.ctrlKey
                                  ? active
                                    ? current.filter((s) => entityKey(s) !== entityKey(choice))
                                    : [...current, choice]
                                  : [choice],
                              )
                            }
                          >
                            {"title" in item ? item.title : `${item.source} → ${item.target}`} <small>{item.id}</small>
                          </button>
                        );
                      })}
                    </div>
                  );
                })}
              </aside>

              <main className="editor-canvas">
                <div className="canvas-options">
                  <label>
                    Layout{" "}
                    <select
                      value={layout}
                      onChange={(event) => {
                        const next = event.target.value as EvolutionLayoutStrategy;
                        setLayout(next);
                        layoutRef.current = next;
                        autosave.schedule(graph);
                      }}
                    >
                      <option value="stage-lane">Stage / lane</option>
                      <option value="horizontal-dag">Horizontal DAG</option>
                      <option value="manual">Manual coordinates</option>
                    </select>
                  </label>
                  <label>
                    Connection edge type{" "}
                    <select
                      aria-label="Connection edge type"
                      value={connectionEdgeType}
                      onChange={(event) => setConnectionEdgeType(event.target.value as EvolutionEdgeType)}
                    >
                      <option value="dependency">Dependency</option>
                      <option value="evolution">Evolution</option>
                      <option value="related">Related</option>
                    </select>
                  </label>
                </div>
                <GraphRenderer
                  graph={graph}
                  layout={layout}
                  readonly={view !== "edit"}
                  editingEnabled={view === "edit"}
                  selectedNodeIds={new Set(selected.filter(({ kind }) => kind === "node").map(({ id }) => id))}
                  onNodeClick={(node) => setSelected([{ kind: "node", id: node.id }])}
                  onNodePositionCommit={(nodeId, position) => {
                    const source = graph.nodes.find(({ id }) => id === nodeId);
                    const selectedNodes = selected
                      .filter(({ kind }) => kind === "node")
                      .map(({ id }) => graph.nodes.find((node) => node.id === id))
                      .filter((node): node is NonNullable<typeof node> => Boolean(node));
                    if (source?.position && selectedNodes.length > 1 && selectedNodes.every((node) => node.position)) {
                      const delta = { x: position.x - source.position.x, y: position.y - source.position.y };
                      execute({
                        type: "transaction",
                        commands: selectedNodes.map((node) => ({
                          type: "update-node",
                          id: node.id,
                          patch: { position: { x: node.position!.x + delta.x, y: node.position!.y + delta.y } },
                        })),
                      });
                    } else execute({ type: "update-node", id: nodeId, patch: { position } });
                  }}
                  onConnectionCommit={(source, target) =>
                    execute({
                      type: "add-edge",
                      edge: { id: uid("edge"), source, target, type: connectionEdgeType },
                    })
                  }
                />
              </main>

              <aside className="inspector-panel" aria-label="Inspector">
                {adding && view === "edit" ? (
                  <CreateForm
                    kind={adding}
                    graph={graph}
                    onCancel={() => setAdding(undefined)}
                    onCreate={(command) => {
                      execute(command);
                      setAdding(undefined);
                    }}
                  />
                ) : selectedOne ? (
                  <Inspector
                    selection={selectedOne}
                    graph={graph}
                    editable={view === "edit"}
                    onCommand={execute}
                    onDelete={(policy) => deleteSelections([selectedOne], policy)}
                  />
                ) : (
                  <MetadataForm graph={graph} editable={view === "edit"} onCommand={execute} />
                )}
              </aside>
            </div>
          )}
        </>
      )}
    </section>
  );
};

const MetadataForm = ({
  graph,
  editable,
  onCommand,
}: {
  graph: EvolutionGraph;
  editable: boolean;
  onCommand: (command: GraphCommand) => void;
}) => {
  const [title, setTitle] = useState(graphTitle(graph));
  const [description, setDescription] = useState(graphDescription(graph));
  useEffect(() => {
    setTitle(graphTitle(graph));
    setDescription(graphDescription(graph));
  }, [graph]);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onCommand({ type: "update-graph", patch: { title: title.trim(), description } });
      }}
    >
      <h3>Metadata</h3>
      <label>
        Title
        <input
          aria-label="Graph title"
          required
          disabled={!editable}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </label>
      <label>
        Description
        <textarea
          aria-label="Graph description"
          disabled={!editable}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </label>
      {editable && <button>Save metadata</button>}
    </form>
  );
};

const CreateForm = ({
  kind,
  graph,
  onCreate,
  onCancel,
}: {
  kind: EntityKind;
  graph: EvolutionGraph;
  onCreate: (command: GraphCommand) => void;
  onCancel: () => void;
}) => {
  const [id, setId] = useState("");
  const [title, setTitle] = useState("");
  const [color, setColor] = useState("#1677ff");
  const [source, setSource] = useState("");
  const [target, setTarget] = useState("");
  const [edgeType, setEdgeType] = useState<EvolutionEdgeType>("dependency");
  const [branchId, setBranchId] = useState(graph.branches[0]?.id ?? "");
  const [stageId, setStageId] = useState(graph.stages?.[0]?.id ?? "");
  const [laneId, setLaneId] = useState(graph.lanes?.[0]?.id ?? "");
  const submit = () => {
    if (kind === "stage") onCreate({ type: "add-stage", stage: { id, title, order: graph.stages?.length ?? 0 } });
    if (kind === "lane")
      onCreate({ type: "add-lane", lane: { id, title, coordinate: graph.lanes?.length ?? 0, color } });
    if (kind === "branch") onCreate({ type: "add-branch", branch: { id, title, color } });
    if (kind === "node")
      onCreate({
        type: "add-node",
        node: { id, title, branchId, status: "locked", ...(stageId && laneId ? { stageId, laneId } : {}) },
      });
    if (kind === "edge") onCreate({ type: "add-edge", edge: { id, source, target, type: edgeType } });
  };
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <h3>Add {kind}</h3>
      <label>
        ID
        <input
          aria-label={`${kind[0].toUpperCase() + kind.slice(1)} id`}
          required
          value={id}
          onChange={(e) => setId(e.target.value)}
        />
      </label>
      {kind !== "edge" && (
        <label>
          Title
          <input
            aria-label={`${kind[0].toUpperCase() + kind.slice(1)} title`}
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </label>
      )}
      {(kind === "branch" || kind === "lane") && (
        <label>
          Color
          <input type="color" value={color} onChange={(e) => setColor(e.target.value)} />
        </label>
      )}
      {kind === "node" && (
        <>
          <Choice label="Branch" value={branchId} set={setBranchId} items={graph.branches} />
          <Choice label="Stage" value={stageId} set={setStageId} items={graph.stages ?? []} optional />
          <Choice label="Lane" value={laneId} set={setLaneId} items={graph.lanes ?? []} optional />
        </>
      )}
      {kind === "edge" && (
        <>
          <Choice label="Source" value={source} set={setSource} items={graph.nodes} optional />
          <Choice label="Target" value={target} set={setTarget} items={graph.nodes} optional />
          <label>
            Type
            <select
              aria-label="Edge type"
              value={edgeType}
              onChange={(e) => setEdgeType(e.target.value as EvolutionEdgeType)}
            >
              <option value="dependency">Dependency</option>
              <option value="evolution">Evolution</option>
              <option value="related">Related</option>
            </select>
          </label>
        </>
      )}
      <div className="form-actions">
        <button>Create {kind}</button>
        <button type="button" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
};

const Choice = ({
  label,
  value,
  set,
  items,
  optional = false,
}: {
  label: string;
  value: string;
  set: (value: string) => void;
  items: { id: string; title: string }[];
  optional?: boolean;
}) => (
  <label>
    {label}
    <select aria-label={label} required={!optional} value={value} onChange={(e) => set(e.target.value)}>
      {optional && <option value="">None</option>}
      {items.map((item) => (
        <option key={item.id} value={item.id}>
          {item.title}
        </option>
      ))}
    </select>
  </label>
);

const Inspector = ({
  selection,
  graph,
  editable,
  onCommand,
  onDelete,
}: {
  selection: Selection;
  graph: EvolutionGraph;
  editable: boolean;
  onCommand: (command: GraphCommand) => void;
  onDelete: (policy?: ReferencedEntityDeletePolicy) => void;
}) => {
  const items =
    selection.kind === "stage"
      ? (graph.stages ?? [])
      : selection.kind === "lane"
        ? (graph.lanes ?? [])
        : selection.kind === "branch"
          ? graph.branches
          : selection.kind === "node"
            ? graph.nodes
            : graph.edges;
  const item = items.find((entry) => entry.id === selection.id);
  const [draft, setDraft] = useState<InspectorDraft>({});
  const [policy, setPolicy] = useState<"reject" | "delete-nodes">("reject");
  useEffect(
    () =>
      setDraft(
        item
          ? {
              ...item,
              position: "position" in item && item.position ? { ...item.position } : undefined,
            }
          : {},
      ),
    [item],
  );
  if (!item) return <p>Selection no longer exists.</p>;
  const field = (name: keyof InspectorDraft | "position.x" | "position.y", label: string, type = "text") => {
    const positionKey = name === "position.x" ? "x" : "y";
    const value = name.startsWith("position.")
      ? (draft.position?.[positionKey] ?? "")
      : (draft[name as keyof InspectorDraft] ?? "");
    return (
      <label>
        {label}
        <input
          type={type}
          disabled={!editable}
          value={typeof value === "object" ? "" : value}
          onChange={(e) => {
            const next = type === "number" ? Number(e.target.value) : e.target.value;
            if (name.startsWith("position."))
              setDraft((d) => ({
                ...d,
                position: { x: d.position?.x ?? 0, y: d.position?.y ?? 0, [positionKey]: Number(next) },
              }));
            else setDraft((d) => ({ ...d, [name]: next }));
          }}
        />
      </label>
    );
  };
  const save = () => {
    const { id: _id, ...patch } = draft;
    onCommand({ type: `update-${selection.kind}`, id: selection.id, patch } as GraphCommand);
  };
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
    >
      <h3>{selection.kind[0].toUpperCase() + selection.kind.slice(1)} inspector</h3>
      {selection.kind !== "edge" && field("title", "Title")}
      {("description" in item ||
        selection.kind === "stage" ||
        selection.kind === "branch" ||
        selection.kind === "node") && (
        <label>
          Description
          <textarea
            disabled={!editable}
            value={draft.description ?? ""}
            onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
          />
        </label>
      )}
      {selection.kind === "branch" && field("color", "Color", "color")}
      {selection.kind === "lane" && (
        <>
          {field("coordinate", "Coordinate", "number")}
          {field("color", "Color", "color")}
        </>
      )}
      {selection.kind === "stage" && field("order", "Order", "number")}
      {selection.kind === "node" && (
        <>
          <Choice
            label="Branch"
            value={draft.branchId ?? ""}
            set={(branchId) => setDraft((d) => ({ ...d, branchId }))}
            items={graph.branches}
          />
          <label>
            Status
            <select
              disabled={!editable}
              value={draft.status ?? "locked"}
              onChange={(e) => setDraft((d) => ({ ...d, status: e.target.value as NodeStatus }))}
            >
              {["locked", "available", "acquired", "mastered"].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
          <Choice
            label="Stage"
            value={draft.stageId ?? ""}
            set={(stageId) => setDraft((d) => ({ ...d, stageId: stageId || undefined }))}
            items={graph.stages ?? []}
            optional
          />
          <Choice
            label="Lane"
            value={draft.laneId ?? ""}
            set={(laneId) => setDraft((d) => ({ ...d, laneId: laneId || undefined }))}
            items={graph.lanes ?? []}
            optional
          />
          {field("position.x", "Manual X", "number")}
          {field("position.y", "Manual Y", "number")}
        </>
      )}
      {selection.kind === "edge" && (
        <>
          <Choice
            label="Source"
            value={draft.source ?? ""}
            set={(source) => setDraft((d) => ({ ...d, source }))}
            items={graph.nodes}
          />
          <Choice
            label="Target"
            value={draft.target ?? ""}
            set={(target) => setDraft((d) => ({ ...d, target }))}
            items={graph.nodes}
          />
          <label>
            Type
            <select
              disabled={!editable}
              value={draft.type}
              onChange={(e) => setDraft((d) => ({ ...d, type: e.target.value as EvolutionEdgeType }))}
            >
              <option value="dependency">Dependency</option>
              <option value="evolution">Evolution</option>
              <option value="related">Related</option>
            </select>
          </label>
        </>
      )}
      {editable && (
        <>
          <button>Save changes</button>
          {["stage", "lane", "branch"].includes(selection.kind) && (
            <label>
              Delete policy
              <select
                aria-label="Delete policy"
                value={policy}
                onChange={(e) => setPolicy(e.target.value as typeof policy)}
              >
                <option value="reject">Reject if referenced</option>
                <option value="delete-nodes">Delete referenced nodes</option>
              </select>
            </label>
          )}
          <button type="button" className="danger" onClick={() => onDelete({ mode: policy })}>
            Delete
          </button>
        </>
      )}
    </form>
  );
};
