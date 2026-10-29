# Styling

Import the package stylesheet once:

```ts
import "@no0vie/brnchly-react/styles.css";
```

The stylesheet is an explicit package export. The renderer uses `.graph-mode`, `.graph-toolbar`, `.graph-viewport`, node, edge, region, and details classes.

## Size

Provide a normal-width container and enough vertical space. Current package CSS gives `.graph-viewport` `height: min(68vh, 720px)` and `min-height: 520px`. A practical wrapper is:

```tsx
<div style={{ width: "100%", minHeight: 600 }}>
  <GraphRenderer graph={graph} layout="horizontal-dag" />
</div>
```

## Theme tokens

Override CSS custom properties on a wrapper or `.graph-mode`:

```css
.product-graph {
  --brnchly-graph-background: #ffffff;
  --brnchly-graph-surface: #f8fafc;
  --brnchly-graph-text: #0f172a;
  --brnchly-graph-muted: #475569;
  --brnchly-graph-border: rgba(15, 23, 42, 0.2);
  --brnchly-graph-accent: #4f46e5;
}
```

Some colors remain class-level implementation details, so test overrides against upgrades. There is no public node-render function or CSS-class stability guarantee beyond documented package styling.

## Reduced motion

The renderer stylesheet suppresses relevant animation/transition behavior under `prefers-reduced-motion`. Application-controlled camera transitions should also use duration `0` when the preference is active.
