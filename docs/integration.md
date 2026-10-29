# Integration

## React/Vite

Install core, React renderer, React, and React DOM; import `@no0vie/brnchly-react/styles.css`; and pass a required `layout` prop. Give the renderer a visible, practical-size container.

## State ownership

Keep graph state outside the renderer:

```tsx
const [graph, setGraph] = useState<EvolutionGraph>(initialGraph);

<GraphRenderer
  graph={graph}
  layout="manual"
  editingEnabled
  onNodePositionCommit={(nodeId, position) =>
    setGraph((current) => ({
      ...current,
      nodes: current.nodes.map((node) => (node.id === nodeId ? { ...node, position } : node)),
    }))
  }
/>;
```

This preserves immutable input and makes persistence, validation, undo, and collaboration policies application decisions. Apply the same pattern to connection requests, selection, camera, and layout choice.

## Client loading

The React renderer is browser UI. If your framework pre-renders routes, load/render the graph component only on the client. Module evaluation is tested by this repository, but SSR markup and hydration behavior are not verified.

## Static hosting and Pages

Vite uses `VITE_BASE_PATH` and defaults to `/`, so local development is unchanged. `npm run build:pages` builds with `/brnchly/` and copies `dist/index.html` to `dist/404.html`. The latter is a static-host fallback for direct navigation in this single-page app. The app currently has no path router, so asset-base correctness is the primary requirement.

The Pages workflow uploads `dist` and deploys through GitHub’s Pages environment. Its presence does not mean a deployment has run or passed.

## CSP and assets

The renderer does not require a backend. Consumer-provided icon strings, evidence URLs, and imported metadata are application data; validate/sanitize untrusted content according to your display and navigation policies.
