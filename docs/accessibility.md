# Accessibility

## Current behavior

- Toolbar controls use native buttons/selects and visible focus treatment.
- Pointer pan/zoom and node interaction have keyboard coverage in selected flows.
- The Universal Editor's add forms restore focus to their invoking control after cancellation or successful creation.
- The Inspector's basic native keyboard focus order and the form-based keyboard alternative for edge creation have focused component coverage.
- Reduced-motion media preferences suppress renderer transitions/animations, and automated Chromium coverage verifies that playback remains available.
- Node/details UI exposes labels used by automated Chromium tests.

## Known gaps

This project has not completed a WCAG conformance audit. Focus restoration outside the tested Universal Editor add forms, complete Inspector traversal beyond the tested basic order, screen-reader behavior, high-contrast/forced-colors behavior, touch/mobile use, and Firefox/WebKit accessibility are not comprehensively verified. Do not claim conformance from the current automated tests.

## Integration responsibilities

- Put the graph under a descriptive heading and provide surrounding instructions.
- Ensure the container is large enough without trapping page zoom or scrolling.
- Provide an equivalent list/table or textual route for graph content when the visual canvas is not usable.
- Keep controls reachable by keyboard and do not remove package focus outlines without a replacement.
- Respect `prefers-reduced-motion`; use zero-duration imperative camera transitions when appropriate.
- Announce application-level import, validation, save, and edit errors.
- Test your actual colors, data, browser matrix, keyboard flow, and assistive technologies.

See [Styling](styling.md) for theme variables and [Renderer](renderer.md) for interaction APIs.
