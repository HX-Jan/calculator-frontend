# Current project overview

Updated: 2026-10-02. The calculator supports basic/scientific modes, safe backend evaluation, persistent history, expression editing with undo/redo, step-by-step traces and a shared formula library.

- [Frontend](https://github.com/HX-Jan/calculator-frontend)
- [Backend and API contract](https://github.com/HX-Jan/calculator-backend)
- [Verification](VERIFICATION.md)

## Architecture

![Architecture](architecture.png)

## Features

![Functional structure](functions.png)

## Calculation and persistence

![Request flow](flow.png)

The frontend never evaluates expressions. Formula parameters and calculations are handled by the backend; results remain strings. History and custom formulas are shared by all visitors without accounts. Successful calculations are committed before returning success. Public hosting is not yet deployed or verified. This overview does not claim the coursework blog has been published.
