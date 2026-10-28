// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import type { GraphRendererHandle } from "./GraphRenderer";
import { threeLaneEvolution } from "../data/demoGraphs";
import { EvolutionGraphView } from "./EvolutionGraphView";
import { GraphRenderer } from "./GraphRenderer";

class ResizeObserverMock {
  observe() {}
  disconnect() {}
}

beforeAll(() => {
  vi.stubGlobal("ResizeObserver", ResizeObserverMock);
  HTMLElement.prototype.setPointerCapture = vi.fn();
  HTMLElement.prototype.releasePointerCapture = vi.fn();
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: query.includes("reduce"),
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  });
});

afterEach(() => cleanup());

describe("EvolutionGraphView", () => {
  it("mounts Graph Mode and switches into Evolution Mode", async () => {
    const user = userEvent.setup();
    render(<EvolutionGraphView graph={threeLaneEvolution} mode="graph" layout="stage-lane" />);

    expect(screen.getByRole("region", { name: /Three-Lane Evolution graph/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Origin. Status: mastered" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Evolution Mode" }));
    expect(screen.getByLabelText("Evolution playback controls")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Origin. Status: mastered" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Upper path. Status: acquired" })).not.toBeInTheDocument();
  });

  it("supports play, pause, restart, seek and speed controls", async () => {
    const user = userEvent.setup();
    render(<EvolutionGraphView graph={threeLaneEvolution} mode="graph" layout="stage-lane" />);
    await user.click(screen.getByRole("button", { name: "Evolution Mode" }));

    await user.click(screen.getByRole("button", { name: "Play evolution" }));
    expect(screen.getByRole("button", { name: "Pause evolution" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Pause evolution" }));
    expect(screen.getByRole("button", { name: "Resume evolution" })).toBeInTheDocument();

    fireEvent.keyDown(screen.getByRole("slider"), { key: "ArrowRight" });
    await user.click(screen.getByRole("button", { name: "Restart evolution" }));
    expect(screen.getByRole("status")).toHaveTextContent("0%");

    await user.click(screen.getByRole("combobox", { name: "Playback speed" }));
    await user.click(await screen.findByText("2×"));
    expect(screen.getByRole("combobox", { name: "Playback speed" }).closest(".ant-select")).toHaveTextContent("2×");
  });

  it("selects a node, highlights dependencies and clears traversal with details", async () => {
    const user = userEvent.setup();
    const { container } = render(<EvolutionGraphView graph={threeLaneEvolution} mode="graph" layout="stage-lane" />);

    await user.click(screen.getByRole("button", { name: "Origin. Status: mastered" }));
    expect(screen.getByRole("combobox", { name: "Dependency highlight mode" })).toBeInTheDocument();
    expect(container.querySelector('[data-edge-id="e1"]')).toHaveClass("is-highlighted");
    await user.click(screen.getByRole("button", { name: "Close node details" }));
    expect(screen.queryByRole("combobox", { name: "Dependency highlight mode" })).not.toBeInTheDocument();
    expect(container.querySelector('[data-edge-id="e1"]')).not.toHaveClass("is-highlighted");
  });

  it("highlights selected lanes and their cross-lane edges", async () => {
    const { container } = render(
      <GraphRenderer graph={threeLaneEvolution} layout="stage-lane" highlightedLaneIds={new Set(["lane-a"])} />,
    );

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Upper path. Status: acquired" })).toHaveClass("is-highlighted"),
    );
    expect(container.querySelector('[data-edge-id="e3"]')).toHaveClass("is-highlighted");
  });

  it("derives traversal and lane highlighting from GraphHighlightState", async () => {
    const { container } = render(
      <GraphRenderer
        graph={threeLaneEvolution}
        layout="stage-lane"
        highlightState={{
          rootNodeId: "origin",
          traversalMode: "direct",
          selectedLaneIds: new Set(["lane-a"]),
        }}
      />,
    );

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Origin. Status: mastered" })).toHaveClass("is-highlighted"),
    );
    expect(screen.getByRole("button", { name: "Upper path. Status: acquired" })).toHaveClass("is-highlighted");
    expect(container.querySelector('[data-edge-id="e1"]')).toHaveClass("is-highlighted");
    expect(container.querySelector('[data-edge-id="e3"]')).toHaveClass("is-highlighted");
  });

  it("supports uncontrolled selection with a default and null as none", async () => {
    const user = userEvent.setup();
    const onSelectedNodeChange = vi.fn();
    const { rerender } = render(
      <GraphRenderer
        graph={threeLaneEvolution}
        layout="stage-lane"
        defaultSelectedNodeId="origin"
        onSelectedNodeChange={onSelectedNodeChange}
      />,
    );

    expect(screen.getByRole("button", { name: "Origin. Status: mastered" })).toHaveClass("universal-node--selected");
    await user.click(screen.getByRole("button", { name: "Close node details" }));
    expect(onSelectedNodeChange).toHaveBeenLastCalledWith(null);
    expect(screen.queryByRole("button", { name: "Close node details" })).not.toBeInTheDocument();

    rerender(<GraphRenderer graph={threeLaneEvolution} layout="stage-lane" selectedNodeId={null} />);
    await user.click(screen.getByRole("button", { name: "Upper path. Status: acquired" }));
    expect(screen.queryByRole("button", { name: "Close node details" })).not.toBeInTheDocument();
  });

  it("keeps controlled selection authoritative while reporting requested changes", async () => {
    const user = userEvent.setup();
    const onSelectedNodeChange = vi.fn();
    render(
      <GraphRenderer
        graph={threeLaneEvolution}
        layout="stage-lane"
        selectedNodeId="origin"
        onSelectedNodeChange={onSelectedNodeChange}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Upper path. Status: acquired" }));
    expect(onSelectedNodeChange).toHaveBeenCalledWith("upper-a");
    expect(screen.getByRole("button", { name: "Origin. Status: mastered" })).toHaveClass("universal-node--selected");
  });

  it("retains legacy selection callback compatibility", async () => {
    const user = userEvent.setup();
    const legacy = vi.fn();
    render(
      <GraphRenderer
        graph={threeLaneEvolution}
        layout="stage-lane"
        defaultSelectedNodeId="origin"
        onNodeSelectionChange={legacy}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Close node details" }));
    expect(legacy).toHaveBeenLastCalledWith(undefined);
  });

  it("uses an uncontrolled default camera and reports only actual viewport changes", () => {
    const rendererRef = createRef<GraphRendererHandle>();
    const onCameraChange = vi.fn();
    render(
      <GraphRenderer
        ref={rendererRef}
        graph={threeLaneEvolution}
        layout="stage-lane"
        defaultCamera={{ x: 12, y: 34, zoom: 1 }}
        onCameraChange={onCameraChange}
      />,
    );
    onCameraChange.mockClear();

    act(() => rendererRef.current?.setCamera({ x: 12, y: 34, zoom: 1 }));
    expect(onCameraChange).not.toHaveBeenCalled();
    act(() => rendererRef.current?.setCamera({ x: 20, y: 34, zoom: 1 }));
    expect(onCameraChange).toHaveBeenCalledTimes(1);
    expect(rendererRef.current?.getCamera()).toEqual({ x: 20, y: 34, zoom: 1 });
  });

  it("keeps a controlled camera authoritative and does not create callback cycles", () => {
    const rendererRef = createRef<GraphRendererHandle>();
    const onCameraChange = vi.fn();
    const camera = { x: 10, y: 20, zoom: 1 };
    const { rerender } = render(
      <GraphRenderer
        ref={rendererRef}
        graph={threeLaneEvolution}
        layout="stage-lane"
        camera={camera}
        onCameraChange={onCameraChange}
      />,
    );
    onCameraChange.mockClear();

    act(() => rendererRef.current?.setCamera(camera));
    expect(onCameraChange).not.toHaveBeenCalled();
    act(() => rendererRef.current?.setCamera({ x: 30, y: 20, zoom: 1 }));
    expect(onCameraChange).toHaveBeenCalledTimes(1);
    expect(rendererRef.current?.getCamera()).toEqual(camera);

    onCameraChange.mockClear();
    rerender(
      <GraphRenderer
        ref={rendererRef}
        graph={threeLaneEvolution}
        layout="stage-lane"
        camera={{ x: 30, y: 20, zoom: 1 }}
        onCameraChange={onCameraChange}
      />,
    );
    expect(onCameraChange).not.toHaveBeenCalled();
    expect(rendererRef.current?.getCamera()).toEqual({ x: 30, y: 20, zoom: 1 });
  });

  it("cancels animation resources on unmount", () => {
    const cancel = vi.spyOn(window, "cancelAnimationFrame");
    const view = render(<EvolutionGraphView graph={threeLaneEvolution} mode="graph" layout="stage-lane" />);
    view.unmount();
    expect(cancel).toHaveBeenCalled();
    cancel.mockRestore();
  });
});
