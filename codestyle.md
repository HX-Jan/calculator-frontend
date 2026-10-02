# Frontend code standards

Sources: [Google JavaScript Style Guide](https://google.github.io/styleguide/jsguide.html) and [Google HTML/CSS Style Guide](https://google.github.io/styleguide/htmlcssguide.html). Use Prettier for consistent formatting; formatter wrapping and spacing take precedence over conflicting source-guide examples.

- UTF-8, two-space indentation, ES modules, semicolons and single-quoted JavaScript strings.
- Prefer `const`, use `let` only for reassignment; no `var`.
- `camelCase` JavaScript identifiers; `kebab-case` CSS classes and HTML ids.
- Separate the API client from DOM interaction and styles.
- Use semantic buttons, forms, labels, keyboard focus indicators and status announcements.
- Never evaluate arithmetic in the browser. Send expressions, angle mode or formula parameters to the backend, never a client-computed result.
- Treat results as strings. Render user/server text using `textContent` or form `.value`.
- Handle loading, errors, empty data and stale requests explicitly. Do not silently treat failed writes as success.
- Store only interface preferences (theme, mode and angle unit) in localStorage, not authoritative history or shared formulas.
- Keep breakpoints and color tokens centralized in CSS; honor reduced-motion preference.
- Before commit: `npm run check` and `npm run build`; verify changed user flows in a real browser.
- Exclude `.env`, local databases, `node_modules`, build artifacts and secrets from Git.
