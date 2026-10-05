# Calculator interface design

Design reference: [minimalist-ui](https://github.com/Leonxlnx/taste-skill/tree/main/skills/minimalist-skill). The interface uses a monochrome palette, compact controls and minimal permanent instructions.

## Intent

A small everyday tool: expression, result, keypad and saved history. No hero, marketing copy, gradients, raised keycaps or ornamental icons. A single quiet frame groups calculation and history, separated by a thin line.

## Tokens and layout

- Canvas: #fafafa; surface: #ffffff.
- Text: #242424; secondary: #737373.
- Dividers: #eaeaea; numeric keys: #f5f5f5.
- Black equals button supplies the only strong visual accent.
- Locally bundled Manrope for UI and tabular results, Arial / Microsoft YaHei for readable worked steps; JetBrains Mono remains bundled for existing numeric styles.
- Desktop: 832px frame, calculator and history in a 1.2:1 split. Mobile: one column, history below.
- Light theme by default; neutral dark theme optional and persisted.

## Interaction review

Preserves keyboard entry, visible focus, real backend calculations, error messages, searchable history, deletion confirmation and pagination. Steps stay collapsed until requested. Main mobile controls have at least 44px touch targets; desktop keys are more compact. No decorative motion; reduced-motion preference is respected.

## Current features

The right panel switches between history and shared formulas. Formula editing and parameter entry use compact native dialogs. Step traces use ordinary typography and ×/÷ symbols, with restrained highlighting and local horizontal scrolling. No decorative animation or persistent marketing text.

Formula cards, parameter dialogs, the editor preview, history and deletion dialogs use locally bundled KaTeX for conventional mathematical notation. Input retains the backend expression syntax. Long formulas scroll inside their own region; incomplete edits fall back to text. No calculation is performed by the display converter.
