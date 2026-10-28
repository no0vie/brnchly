// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
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

  it("cancels animation resources on unmount", () => {
    const cancel = vi.spyOn(window, "cancelAnimationFrame");
    const view = render(<EvolutionGraphView graph={threeLaneEvolution} mode="graph" layout="stage-lane" />);
    view.unmount();
    expect(cancel).toHaveBeenCalled();
    cancel.mockRestore();
  });
});
