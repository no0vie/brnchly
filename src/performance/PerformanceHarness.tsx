import React, { Profiler, useEffect, useMemo, useState } from "react";
import { Button, Space, Typography } from "antd";
import type { EvolutionGraph } from "../domain/evolutionGraph";
import { EvolutionGraphView } from "../renderer";
import { generatePerformanceGraph, type PerformanceGraphSize } from "./graphGenerator";

declare global {
  interface Window {
    __BRNCHLY_PERF__?: {
      size: number;
      nodeCount: number;
      edgeCount: number;
      reactCommits: Array<{ phase: string; actualDuration: number; baseDuration: number; commitTime: number }>;
    };
  }
}

const emptyGraph = (graph: EvolutionGraph): EvolutionGraph => ({ ...graph, edges: [] });

export const PerformanceHarness: React.FC<{ size: PerformanceGraphSize }> = ({ size }) => {
  const completeGraph = useMemo(() => generatePerformanceGraph(size), [size]);
  const [includeEdges, setIncludeEdges] = useState(true);
  const graph = includeEdges ? completeGraph : emptyGraph(completeGraph);

  if (!window.__BRNCHLY_PERF__ || window.__BRNCHLY_PERF__.size !== size) {
    window.__BRNCHLY_PERF__ = {
      size,
      nodeCount: completeGraph.nodes.length,
      edgeCount: completeGraph.edges.length,
      reactCommits: [],
    };
  }

  useEffect(() => {
    let secondFrame = 0;
    const firstFrame = requestAnimationFrame(() => {
      secondFrame = requestAnimationFrame(() => {
        document.documentElement.dataset.perfReady = "true";
        performance.mark("brnchly-perf-ready");
      });
    });
    return () => {
      cancelAnimationFrame(firstFrame);
      cancelAnimationFrame(secondFrame);
      delete document.documentElement.dataset.perfReady;
    };
  }, [size]);

  return (
    <main
      data-testid="performance-harness"
      data-node-count={completeGraph.nodes.length}
      data-edge-count={completeGraph.edges.length}
    >
      <Typography.Title level={3}>brnchly performance harness</Typography.Title>
      <Space>
        <Button onClick={() => setIncludeEdges(false)}>Clear SVG edges</Button>
        <Button onClick={() => setIncludeEdges(true)}>Render SVG edges</Button>
      </Space>
      <Profiler
        id="EvolutionGraphView"
        onRender={(_id, phase, actualDuration, baseDuration, _startTime, commitTime) => {
          window.__BRNCHLY_PERF__?.reactCommits.push({ phase, actualDuration, baseDuration, commitTime });
        }}
      >
        <EvolutionGraphView graph={graph} mode="graph" layout="stage-lane" readonly showLaneLabels />
      </Profiler>
    </main>
  );
};
