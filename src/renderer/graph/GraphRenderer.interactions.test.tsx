// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import type { EvolutionGraph } from "../../domain/evolutionGraph";
import { GraphRenderer } from "./GraphRenderer";

class ResizeObserverMock {
  observe() {}
  disconnect() {}
}

beforeAll(() => {
  vi.stubGlobal("ResizeObserver", ResizeObserverMock);
  HTMLElement.prototype.setPointerCapture = vi.fn();
  HTMLElement.prototype.releasePointerCapture = vi.fn();
});
afterEach(() => cleanup());

const graph: EvolutionGraph = {
  schemaVersion: 2,
  id: "manual",
  title: "Manual",
  branches: [{ id: "branch", title: "Branch", color: "#7c8cff" }],
  stages: [],
  lanes: [],
  nodes: [
    { id: "a", title: "Alpha", branchId: "branch", status: "available", position: { x: 10, y: 20 } },
    { id: "b", title: "Beta", branchId: "branch", status: "available", position: { x: 250, y: 80 } },
  ],
  edges: [],
};

const pointer = { pointerId: 1, clientX: 100, clientY: 100, button: 0 };

describe("GraphRenderer editing interactions", () => {
  it("previews a manual node drag and commits its world position once on pointerup", () => {
    const onNodePositionCommit = vi.fn();
    render(
      <GraphRenderer
        graph={graph}
        layout="manual"
        editingEnabled
        defaultCamera={{ x: 0, y: 0, zoom: 2 }}
        onNodePositionCommit={onNodePositionCommit}
      />,
    );

    const node = screen.getByRole("button", { name: "Alpha. Status: available" });
    fireEvent.pointerDown(node, pointer);
    fireEvent.pointerMove(node, { ...pointer, clientX: 140, clientY: 120 });
    expect(node.parentElement).toHaveStyle({ left: "30px", top: "30px" });
    expect(onNodePositionCommit).not.toHaveBeenCalled();
    fireEvent.pointerUp(node, { ...pointer, clientX: 140, clientY: 120 });

    expect(onNodePositionCommit).toHaveBeenCalledTimes(1);
    expect(onNodePositionCommit).toHaveBeenCalledWith("a", { x: 30, y: 30 });
  });

  it("cancels a drag with Escape and restores the controlled position", () => {
    const onNodePositionCommit = vi.fn();
    render(<GraphRenderer graph={graph} layout="manual" editingEnabled onNodePositionCommit={onNodePositionCommit} />);
    const node = screen.getByRole("button", { name: "Alpha. Status: available" });
    fireEvent.pointerDown(node, pointer);
    fireEvent.pointerMove(node, { ...pointer, clientX: 150, clientY: 130 });
    fireEvent.keyDown(window, { key: "Escape" });

    expect(node.parentElement).toHaveStyle({ left: "10px", top: "20px" });
    expect(onNodePositionCommit).not.toHaveBeenCalled();
  });

  it("does not drag nodes outside manual layout", () => {
    const onNodePositionCommit = vi.fn();
    render(
      <GraphRenderer
        graph={graph}
        layout="horizontal-dag"
        editingEnabled
        onNodePositionCommit={onNodePositionCommit}
      />,
    );
    const node = screen.getByRole("button", { name: "Alpha. Status: available" });
    fireEvent.pointerDown(node, pointer);
    fireEvent.pointerMove(node, { ...pointer, clientX: 150, clientY: 130 });
    fireEvent.pointerUp(node, { ...pointer, clientX: 150, clientY: 130 });
    expect(onNodePositionCommit).not.toHaveBeenCalled();
  });

  it("provides accessible connection ports and commits a non-self connection", () => {
    const onConnectionCommit = vi.fn();
    render(<GraphRenderer graph={graph} layout="manual" editingEnabled onConnectionCommit={onConnectionCommit} />);

    fireEvent.pointerDown(screen.getByRole("button", { name: "Start connection from Alpha" }), pointer);
    expect(screen.getByRole("button", { name: "Connect to Beta" })).toBeInTheDocument();
    fireEvent.pointerUp(screen.getByRole("button", { name: "Connect to Beta" }), pointer);
    expect(onConnectionCommit).toHaveBeenCalledWith("a", "b");

    fireEvent.pointerDown(screen.getByRole("button", { name: "Start connection from Alpha" }), pointer);
    expect(screen.queryByRole("button", { name: "Connect to Alpha" })).not.toBeInTheDocument();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("button", { name: "Connect to Beta" })).not.toBeInTheDocument();
  });

  it.each(["pointerUp", "pointerCancel"] as const)(
    "cancels an active connection on blank viewport %s",
    (releaseEvent) => {
      const onConnectionCommit = vi.fn();
      const { container } = render(
        <GraphRenderer graph={graph} layout="manual" editingEnabled onConnectionCommit={onConnectionCommit} />,
      );

      fireEvent.pointerDown(screen.getByRole("button", { name: "Start connection from Alpha" }), pointer);
      expect(screen.getByRole("button", { name: "Connect to Beta" })).toBeInTheDocument();

      fireEvent[releaseEvent](container.querySelector(".graph-viewport")!, pointer);

      expect(screen.queryByRole("button", { name: "Connect to Beta" })).not.toBeInTheDocument();
      expect(onConnectionCommit).not.toHaveBeenCalled();
    },
  );

  it("starts and commits a connection with Enter while exposing active state", () => {
    const onConnectionCommit = vi.fn();
    render(<GraphRenderer graph={graph} layout="manual" editingEnabled onConnectionCommit={onConnectionCommit} />);

    const source = screen.getByRole("button", { name: "Start connection from Alpha" });
    expect(source).toHaveAttribute("aria-pressed", "false");
    fireEvent.keyDown(source, { key: "Enter" });

    expect(source).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("status")).toHaveTextContent("Connecting from Alpha");
    fireEvent.keyDown(screen.getByRole("button", { name: "Connect to Beta" }), { key: "Enter" });

    expect(onConnectionCommit).toHaveBeenCalledWith("a", "b");
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("supports Space to start and commit and Escape to cancel from a connection button", () => {
    const onConnectionCommit = vi.fn();
    render(<GraphRenderer graph={graph} layout="manual" editingEnabled onConnectionCommit={onConnectionCommit} />);

    const source = screen.getByRole("button", { name: "Start connection from Alpha" });
    fireEvent.keyDown(source, { key: " " });
    fireEvent.keyDown(screen.getByRole("button", { name: "Connect to Beta" }), { key: "Escape" });
    expect(screen.queryByRole("button", { name: "Connect to Beta" })).not.toBeInTheDocument();

    fireEvent.keyDown(source, { key: " " });
    fireEvent.keyDown(screen.getByRole("button", { name: "Connect to Beta" }), { key: " " });
    expect(onConnectionCommit).toHaveBeenCalledWith("a", "b");
  });

  it("does not reapply a changed uncontrolled selection default", () => {
    const { rerender } = render(<GraphRenderer graph={graph} layout="manual" defaultSelectedNodeId="a" />);

    fireEvent.click(screen.getByRole("button", { name: "Beta. Status: available" }));
    expect(screen.getByRole("button", { name: "Beta. Status: available" })).toHaveClass("universal-node--selected");

    rerender(<GraphRenderer graph={graph} layout="manual" defaultSelectedNodeId="a" />);
    rerender(<GraphRenderer graph={graph} layout="manual" defaultSelectedNodeId={null} />);

    expect(screen.getByRole("button", { name: "Beta. Status: available" })).toHaveClass("universal-node--selected");
  });
});
