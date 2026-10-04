# Calculator Frontend

[简体中文](README.md) | **English**

A responsive calculator with basic and scientific modes, a monochrome interface, keyboard input, light/dark themes, step-by-step simplification, history and a shared formula library. All calculations run on the backend.

[Live site](https://calculator.assignment1.workers.dev) · [Backend repository](https://github.com/HX-Jan/calculator-backend) · [Deployment guide (Chinese)](https://github.com/HX-Jan/calculator-backend/blob/main/cloudflare/README.md)

![Calculator running locally](docs/preview.png)

## Project information

Owner: [Hong Xiang / HX-Jan](https://github.com/HX-Jan), responsible for requirements, interface decisions and iteration priorities. [Development notes](docs/DEVELOPMENT.en.md)

## Run locally

Requires Node.js 22.12 or newer (verified with Node 24), with the backend on port 8000 by default.

```powershell
npm ci
Copy-Item .env.example .env
npm run dev
```

Open http://127.0.0.1:5173. On macOS/Linux, use `cp .env.example .env`.

`VITE_API_BASE_URL` defaults to `http://127.0.0.1:8000` in development and the website origin in production. For a separate API host, edit `.env` before starting or building, and allow the frontend origin in the backend's `ALLOWED_ORIGINS`.

The frontend does not create a database. History and formulas come from the backend; theme, mode and angle preferences are stored in localStorage.

## Calculation features

- Basic/scientific mode selection persists and retains the expression and result. Changing DEG/RAD clears the old result and requires recalculation.
- Supports arithmetic, decimals, parentheses, unary signs, squares, cubes, powers, reciprocals, factorials, percentages, π and e. Multiplication must be explicit.
- The 2nd key switches scientific pages: trigonometric, inverse trigonometric, hyperbolic and inverse hyperbolic functions, roots, logarithms, abs, exp, floor/ceil and more.
- Two-argument dialogs support `root(x,n)`, `logbase(x,b)`, `mod(x,y)`, `perm(n,r)` and `comb(n,r)`. Confirm to create an expression, then press equals. Cancel leaves the input unchanged.
- `sin(30)` in DEG returns `0.5`; `sin(pi/2)` in RAD returns `1`. Inverse trigonometry follows the angle unit; hyperbolic functions do not use it.
- EXP enters scientific notation, such as `1.2E-3`; lowercase e is also accepted. The standalone constant e requires explicit multiplication.
- Percent always divides by 100: `200+10% = 200.1`, `200*10% = 20`.
- Factorials accept integers 0–69. Permutations and combinations accept integers `0 ≤ r ≤ n ≤ 1000`. Negative inputs support only integer odd roots; backend result bounds still apply.

Only real numbers are supported; matrices, complex numbers, equation solving and statistics are excluded. Trigonometric, inverse trigonometric, hyperbolic and inverse hyperbolic functions are approximate to about 15 significant digits; roots and logarithms may also be rounded. Domain errors do not create history.

## Input and results

Type or use the keypad. Enter calculates; Escape clears input. After success, a digit, decimal point or constant starts a new expression; an operator continues from the result. Clicking the input or moving the cursor allows editing the original expression. Repeated equals without changes does not resubmit or save duplicates.

Function keys wrap selected text or the complete operand before the cursor. With no operand, they insert paired parentheses. On a completed result, square, cube, reciprocal and sign keys immediately request backend calculation. Generated closing parentheses can be skipped; empty pairs can be deleted together. Plain text input is not automatically paired.

Ans inserts the last successful result; MS stores it, MR recalls it and MC clears memory. Ans and memory last only for the current page session; AC does not clear memory. Copy, Ans, memory and continuation always use the raw result string. Scientific display does not use JavaScript floating-point conversion; long values are reused as equivalent scientific-notation input.

Conflicting actions are disabled during requests. Network or calculation failures retain input and clear old results and steps. Failed history refreshes indicate that displayed data may be stale.

## Error location and undo

Expression errors select the affected characters; missing content places the cursor at the insertion point. Editing or undo clears the old marker; the backend validates the next calculation.

Undo/redo supports the latest 100 edits, including clearing, pasting, wrapping and selection replacement. Use Ctrl+Z, Ctrl+Y or Ctrl+Shift+Z; on macOS, use Command. A new edit clears the redo branch; refreshing clears the stack. Undo restores the expression, cursor and generated brackets, without deleting saved history, changing memory or recalculating.

## Steps and history

Steps are collapsed by default. Expand to see numbers, operation names, complete before/after expressions and highlighted operands. Trigonometric and inverse trigonometric steps include DEG/RAD. Values may be rounded; the last step matches the result. Long expressions scroll within the panel and support keyboard focus. Responses without trace fields fall back to the older step list.

History is grouped by local date and supports search, 20-row pages, copying and confirmed deletion. Reuse fills the expression without calculating; press equals again. Scientific reuse restores scientific mode and the recorded angle unit. Clearing search returns to page one.

Export downloads only the currently loaded page, up to 20 rows, containing ID, expression, result, angle unit and UTC time. CSV uses UTF-8 BOM and single-quote text prefixes for expressions/results to prevent spreadsheet formula execution or long-number rounding. Copy buttons provide raw text. Export is unavailable for empty, loading or failed data and does not modify the database.

History and custom formulas are shared by all visitors; there are no accounts or private records.

## Shared formula library

The history/formula panel defaults to history. Builtins include circle area, circumference, the Pythagorean theorem and quadratic evaluation. Builtins are read-only but can be copied into custom entries. Custom formulas support creation, name search, editing and confirmed deletion.

Names and parameter labels allow up to 40 characters; expressions allow 500. Parameters are up to eight individual lowercase letters, excluding e; pi and function names are reserved. Implicit multiplication is unsupported. Identify parameters to set Chinese labels; saving also identifies them and validates syntax only, so `1/x` can be saved.

Parameter values may be `-3`, `1/3`, `sqrt(2)` and other scientific expressions, without references to other parameters. The selected DEG/RAD applies to all parameters and the formula. The backend substitutes each expression in parentheses, with a 500-character total limit. Success returns the expanded expression, result and steps to the calculator and saves the expanded expression in history.

Parameter errors appear beside fields; overall errors appear at the dialog bottom. Failures retain input. Custom formulas use updated timestamps for conflict checks; refresh and reopen after another visitor edits one. Deleting formulas does not delete history. Duplicate submission and dialog closing are disabled during requests; retry after the network recovers. The library requires a backend supporting formula APIs.

## Structure

| File | Responsibility |
|---|---|
| `src/main.js` | State, requests, keyboard and history interactions |
| `src/api.js` | JSON requests and errors |
| `src/expression-editor.js` | Cursor, selection, paired brackets, undo/redo |
| `src/result-view.js` | Raw result strings and scientific display |
| `src/steps-view.js` | Backend steps and UTF-16 highlights |
| `src/history-utils.js` | Date grouping and current-page CSV |
| `src/formula-library.js` | Formula list, editing and parameter dialogs |
| `src/style.css` / `index.html` | Responsive themes and accessible controls |

Server text is rendered with `textContent`. The frontend does not identify formula variables or evaluate parameters or final results.

## Checks and build

```powershell
npm run check
npm test
npm run build
npm run preview -- --port 5173
```

Stop the development server before previewing on the same port. Backend tests live in the companion repository. Browser checks cover `0.1+0.2`, `(1+2)*3`, `3*-2`, invalid input, division by zero, persistence, history, themes and mobile layout. A disconnected backend must not produce a new result.

## Deployment and verification

Workers Static Assets serves the frontend alongside the same-origin Python API; D1 stores data. Build and deploy from the backend's `cloudflare` directory. `VITE_*` configuration is public and must not contain passwords or credentials. GitHub Actions runs checks, without automatic deployment.

As of 2026-10-04, backend CI passed 232 tests with 98% coverage; frontend passed 12 tests, syntax checks and build. DNS records, deployment and D1 bindings are confirmed. Connections reset on the current network; end-to-end access on the current domain and direct access from mainland China have not been reverified.

The desktop layout targets 1366×768. Main mobile controls are at least 44px, with history below the calculator. Fonts are bundled locally; licenses are in `public/licenses`.

Additional documents: [Verification (Chinese)](docs/VERIFICATION.md) · [Design](DESIGN.md) · [Architecture and feature diagrams](docs/OVERVIEW.md)
