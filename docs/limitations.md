# Known limitations

## Distribution and external automation

- npm publication and scope authority are not confirmed.
- Repository workflows exist, but their presence is not evidence that CI, publishing, or GitHub Pages deployment has run successfully.
- No live demo URL is claimed.
- Packages are ESM-only; CommonJS output is not provided.

## Browser and React support

- Automated browser coverage is Chromium. Firefox, WebKit, mobile browsers, and headed/GPU profiles are not release-verified.
- React 18 is verified by the repository consumer fixture. React 19 is inside the peer range but has not been verified.
- `GraphRenderer` is client/browser UI. SSR output and hydration are not supported claims.

## Performance

- HTML/SVG rendering is not virtualized.
- Large graphs can produce slow frames and long tasks. The retained production snapshot records material frame variability at 500 and 1,000 nodes and a 1,000-node long-task p95 above the non-gating investigation threshold.
- Edge routing is simple cubic routing and does not avoid nodes.
- The standalone Ant Design application can produce a bundle chunk-size warning; Ant Design is not bundled into the public packages.

See [development and performance](development.md) and `artifacts/performance/`.

## Editor and persistence

- The editor is repository-only and stores documents locally; there is no backend, authentication, collaboration, synchronization, conflict resolution, or server backup.
- `localStorage` is quota-limited and not fully transactional. Undo/redo history, selection, camera, and drafts are not persisted.
- Snapshot history scales with graph size and retained depth.

## Accessibility

- Keyboard basics, selected focus flows, and reduced motion have automated coverage.
- A full WCAG audit, comprehensive screen-reader matrix, forced-colors/high-contrast review, touch/mobile review, and complete Inspector/focus traversal have not been performed.
- Integrators should provide a textual alternative for graph content, preserve focus indicators, announce application errors, and test their own colors/data/browser/assistive-technology matrix.

## Consumer data and security

- Consumer-provided icon strings, evidence URLs, and metadata are application data, not trusted library configuration.
- Integrators must validate or sanitize untrusted URLs/content according to their display and navigation policy and apply an appropriate content-security policy.
- The library validates graph structure and references; it does not establish URL allowlists, content classification, authentication, or authorization.

## Customization

- The renderer owns its node cards, toolbar, and details UI; a public node-render function is not available.
- CSS custom properties are usable for broad theme colors, but implementation class names are not a stable API.
- Stage/lane layout requires coherent stage and lane references; validation rejects inconsistent documents.
