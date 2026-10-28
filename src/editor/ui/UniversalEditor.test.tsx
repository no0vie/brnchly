// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { EvolutionGraph } from "../../domain/evolutionGraph";
import { UniversalEditor } from "./UniversalEditor";

vi.mock("../../renderer", () => ({
  EvolutionGraphView: ({ graph }: { graph: { title: string; nodes: unknown[] } }) => (
    <div data-testid="preview-graph">
      {graph.title}:{graph.nodes.length}
    </div>
  ),
  GraphRenderer: ({
    graph,
    onNodePositionCommit,
    onConnectionCommit,
  }: {
    graph: { nodes: Array<{ id: string; position?: { x: number; y: number } }> };
    onNodePositionCommit?: (id: string, position: { x: number; y: number }) => void;
    onConnectionCommit?: (source: string, target: string) => void;
  }) => (
    <div data-testid="editor-renderer">
      {graph.nodes.map((node) => `${node.id}:${node.position?.x ?? "-"},${node.position?.y ?? "-"}`).join("|")}
      <button onClick={() => onNodePositionCommit?.("one", { x: 40, y: 50 })}>Commit visual drag</button>
      <button onClick={() => onConnectionCommit?.("two", "one")}>Commit visual connection</button>
      <button onClick={() => onConnectionCommit?.("one", "two")}>Commit invalid visual connection</button>
    </div>
  ),
}));

const localStorageSetItem = Storage.prototype.setItem;

beforeEach(() => localStorage.clear());
afterEach(() => {
  vi.restoreAllMocks();
  cleanup();
});

const openEditor = async () => {
  const user = userEvent.setup();
  render(<UniversalEditor theme="light" />);
  return user;
};

describe("UniversalEditor", () => {
  it("edits canonical graph root values instead of conflicting metadata keys", async () => {
    const storedGraph: EvolutionGraph = {
      schemaVersion: 2,
      id: "root-values",
      title: "Root title",
      description: "Root description",
      metadata: { title: "Legacy metadata title", description: "Legacy metadata description" },
      branches: [],
      nodes: [],
      edges: [],
    };
    localStorage.setItem(
      "brnchly:documents:index",
      JSON.stringify([
        {
          id: "document-1",
          graphId: storedGraph.id,
          title: "Document",
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
        },
      ]),
    );
    localStorage.setItem("brnchly:documents:graph:document-1", JSON.stringify(storedGraph));

    await openEditor();

    expect(screen.getByLabelText("Graph title")).toHaveValue("Root title");
    expect(screen.getByLabelText("Graph description")).toHaveValue("Root description");
  });

  it("creates a graph without JSON and edits metadata through undoable commands", async () => {
    const user = await openEditor();
    await user.click(screen.getByRole("button", { name: "New document" }));
    await user.clear(screen.getByLabelText("Graph title"));
    await user.type(screen.getByLabelText("Graph title"), "Product evolution");
    await user.click(screen.getByRole("button", { name: "Save metadata" }));

    expect(screen.getByRole("heading", { name: "Product evolution" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Undo" }));
    expect(screen.getByRole("heading", { name: "Untitled graph" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Redo" }));
    expect(screen.getByRole("heading", { name: "Product evolution" })).toBeInTheDocument();
  });

  it("flushes an immediate edit before duplicating and opens the duplicate with the visible graph", async () => {
    const user = await openEditor();
    await user.click(screen.getByRole("button", { name: "New document" }));
    await user.clear(screen.getByLabelText("Graph title"));
    await user.type(screen.getByLabelText("Graph title"), "Visible edit");
    await user.click(screen.getByRole("button", { name: "Save metadata" }));

    await user.click(screen.getByRole("button", { name: "Duplicate" }));

    expect(screen.getByRole("heading", { name: "Visible edit" })).toBeInTheDocument();
    const index = JSON.parse(localStorage.getItem("brnchly:documents:index") ?? "[]") as Array<{ id: string }>;
    expect(index).toHaveLength(2);
    expect(JSON.parse(localStorage.getItem(`brnchly:documents:graph:${index[0].id}`) ?? "{}")).toEqual(
      expect.objectContaining({ title: "Visible edit" }),
    );
    expect(JSON.parse(localStorage.getItem(`brnchly:documents:graph:${index[1].id}`) ?? "{}")).toEqual(
      expect.objectContaining({ title: "Visible edit" }),
    );
  });

  it("blocks a transition when flushing the visible graph fails", async () => {
    const user = await openEditor();
    await user.click(screen.getByRole("button", { name: "New document" }));
    await user.click(screen.getByRole("button", { name: "New document" }));
    const index = JSON.parse(localStorage.getItem("brnchly:documents:index") ?? "[]") as Array<{ id: string }>;
    await user.selectOptions(screen.getByLabelText("Open document"), index[0].id);
    await user.clear(screen.getByLabelText("Graph title"));
    await user.type(screen.getByLabelText("Graph title"), "Must remain visible");
    await user.click(screen.getByRole("button", { name: "Save metadata" }));
    const setItem = vi.spyOn(Storage.prototype, "setItem").mockImplementation(function (this: Storage, key, value) {
      if (key.includes(":graph:")) throw new Error("Storage unavailable");
      return Reflect.apply(localStorageSetItem, this, [key, value]);
    });

    await user.selectOptions(screen.getByLabelText("Open document"), index[1].id);

    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent(/storage/i));
    expect(screen.getByRole("heading", { name: "Must remain visible" })).toBeInTheDocument();
    expect(screen.getByLabelText("Graph title")).toHaveValue("Must remain visible");
    expect(screen.getByLabelText("Open document")).toHaveValue(index[0].id);
    setItem.mockRestore();
  });

  it("surfaces rejected commands in a persistent validation list", async () => {
    const user = await openEditor();
    await user.click(screen.getByRole("button", { name: "New document" }));
    await user.click(screen.getByRole("button", { name: "Add edge" }));
    await user.type(screen.getByLabelText("Edge id"), "broken");
    await user.click(screen.getByRole("button", { name: "Create edge" }));

    const validation = screen.getByRole("region", { name: "Validation issues" });
    expect(validation).toHaveTextContent(/invalid|source|target/i);
    await user.click(screen.getByRole("button", { name: "View" }));
    expect(validation).toBeInTheDocument();
  });

  it("renders preview from the current graph without exposing editing controls", async () => {
    const user = await openEditor();
    await user.click(screen.getByRole("button", { name: "New document" }));
    await user.click(screen.getByRole("button", { name: "Preview" }));

    expect(screen.getByTestId("preview-graph")).toHaveTextContent("Untitled graph:0");
    expect(screen.queryByRole("button", { name: "Create node" })).not.toBeInTheDocument();
  });

  it("supports modifier multi-select, select all, clear, and bulk delete", async () => {
    const user = await openEditor();
    await user.click(screen.getByRole("button", { name: "New document" }));
    await user.click(screen.getByRole("button", { name: "Add branch" }));
    await user.type(screen.getByLabelText("Branch id"), "one");
    await user.type(screen.getByLabelText("Branch title"), "One");
    await user.click(screen.getByRole("button", { name: "Create branch" }));
    await user.click(screen.getByRole("button", { name: "Add branch" }));
    await user.type(screen.getByLabelText("Branch id"), "two");
    await user.type(screen.getByLabelText("Branch title"), "Two");
    await user.click(screen.getByRole("button", { name: "Create branch" }));

    const structure = screen.getByRole("region", { name: "Graph structure" });
    await user.click(within(structure).getByRole("button", { name: /One/ }));
    fireEvent.click(within(structure).getByRole("button", { name: /Two/ }), { metaKey: true });
    expect(screen.getByText("2 selected")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Clear selection" }));
    await user.click(screen.getByRole("button", { name: "Select all" }));
    await user.click(screen.getByRole("button", { name: "Bulk delete" }));
    expect(within(structure).queryByRole("button", { name: /One|Two/ })).not.toBeInTheDocument();
  });

  it("deletes referenced mixed selections in dependency order without duplicate cascades", async () => {
    const user = await openEditor();
    await user.click(screen.getByRole("button", { name: "New document" }));
    await user.click(screen.getByRole("button", { name: "Add branch" }));
    await user.type(screen.getByLabelText("Branch id"), "branch");
    await user.type(screen.getByLabelText("Branch title"), "Branch");
    await user.click(screen.getByRole("button", { name: "Create branch" }));
    for (const id of ["one", "two"]) {
      await user.click(screen.getByRole("button", { name: "Add node" }));
      await user.type(screen.getByLabelText("Node id"), id);
      await user.type(screen.getByLabelText("Node title"), id);
      await user.selectOptions(screen.getByLabelText("Branch"), "branch");
      await user.click(screen.getByRole("button", { name: "Create node" }));
    }
    await user.click(screen.getByRole("button", { name: "Commit visual connection" }));
    await user.click(screen.getByRole("button", { name: "Select all" }));

    await user.click(screen.getByRole("button", { name: "Bulk delete" }));

    const structure = screen.getByRole("region", { name: "Graph structure" });
    expect(within(structure).queryByRole("button", { name: /Branch branch/ })).not.toBeInTheDocument();
    expect(within(structure).queryByRole("button", { name: /^one one$/ })).not.toBeInTheDocument();
    expect(within(structure).queryByRole("button", { name: /two → one/ })).not.toBeInTheDocument();
    expect(screen.getByText("Nothing selected")).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Validation issues" })).not.toBeInTheDocument();
  });

  it("maps visual drag and connection commits to undoable validated commands", async () => {
    const user = await openEditor();
    await user.click(screen.getByRole("button", { name: "New document" }));
    await user.click(screen.getByRole("button", { name: "Add branch" }));
    await user.type(screen.getByLabelText("Branch id"), "branch");
    await user.type(screen.getByLabelText("Branch title"), "Branch");
    await user.click(screen.getByRole("button", { name: "Create branch" }));

    for (const id of ["one", "two"]) {
      await user.click(screen.getByRole("button", { name: "Add node" }));
      await user.type(screen.getByLabelText("Node id"), id);
      await user.type(screen.getByLabelText("Node title"), id);
      await user.selectOptions(screen.getByLabelText("Branch"), "branch");
      await user.click(screen.getByRole("button", { name: "Create node" }));
    }
    await user.selectOptions(screen.getByLabelText("Layout"), "manual");

    await user.click(screen.getByRole("button", { name: "Commit visual drag" }));
    expect(screen.getByTestId("editor-renderer")).toHaveTextContent("one:40,50");
    await user.click(screen.getByRole("button", { name: "Undo" }));
    expect(screen.getByTestId("editor-renderer")).toHaveTextContent("one:-,-");
    await user.click(screen.getByRole("button", { name: "Redo" }));
    expect(screen.getByTestId("editor-renderer")).toHaveTextContent("one:40,50");

    await user.click(screen.getByRole("button", { name: "Commit visual connection" }));
    expect(screen.getByRole("region", { name: "Graph structure" })).toHaveTextContent("two → one");
    await user.click(screen.getByRole("button", { name: "Commit invalid visual connection" }));
    expect(screen.getByRole("region", { name: "Validation issues" })).toHaveTextContent(/cycle|dependency/i);
  });

  it("does not intercept editor shortcuts while typing", async () => {
    const user = await openEditor();
    await user.click(screen.getByRole("button", { name: "New document" }));
    const title = screen.getByLabelText("Graph title");
    await user.click(title);
    fireEvent.keyDown(title, { key: "a", metaKey: true });
    fireEvent.keyDown(title, { key: "Delete" });
    expect(title).toHaveFocus();
    expect(title).toHaveValue("Untitled graph");
    expect(screen.getByText("Nothing selected")).toBeInTheDocument();
  });
});
