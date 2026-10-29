import React, { useRef, useState } from "react";
import ReactDOM from "react-dom/client";
import { CURRENT_EVOLUTION_GRAPH_SCHEMA_VERSION, type EvolutionGraph } from "@no0vie/brnchly-core";
import { GraphRenderer, type GraphRendererHandle, type GraphRendererProps } from "@no0vie/brnchly-react";
import "@no0vie/brnchly-react/styles.css";
import "./theme.css";

const graph: EvolutionGraph = {
  schemaVersion: CURRENT_EVOLUTION_GRAPH_SCHEMA_VERSION,
  id: "consumer-graph",
  title: "Consumer graph",
  branches: [{ id: "main", title: "Main", color: "#6366f1" }],
  nodes: [
    { id: "start", title: "Start", branchId: "main", status: "mastered" },
    { id: "next", title: "Next", branchId: "main", status: "available" },
  ],
  edges: [{ id: "start-next", source: "start", target: "next", type: "evolution" }],
};

export function App() {
  const renderer = useRef<GraphRendererHandle>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const onSelectedNodeChange: NonNullable<GraphRendererProps["onSelectedNodeChange"]> = setSelectedNodeId;

  return (
    <main>
      <header>
        <h1>brnchly package consumer</h1>
        <div className="actions">
          <button onClick={() => renderer.current?.fitToView()}>Fit</button>
          <button onClick={() => renderer.current?.resetView()}>Reset</button>
          <button onClick={() => renderer.current?.focusNode("next")}>Focus next</button>
        </div>
        <output>Selected: {selectedNodeId ?? "none"}</output>
      </header>
      <section className="graph-container" aria-label="Evolution graph">
        <GraphRenderer
          ref={renderer}
          graph={graph}
          layout="horizontal-dag"
          selectedNodeId={selectedNodeId}
          onSelectedNodeChange={onSelectedNodeChange}
        />
      </section>
    </main>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
