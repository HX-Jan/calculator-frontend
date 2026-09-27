# Clarity interface direction

Reference: [minimalist-ui](https://github.com/Leonxlnx/taste-skill/tree/main/skills/minimalist-skill), installed and read locally. The user's request for a simple calculator takes priority over the skill's optional editorial decoration and animation.

## Intent

A small everyday tool: expression, result, keypad and saved history. No hero, marketing copy, gradients, raised keycaps or ornamental icons. A single quiet frame groups calculation and history, separated by a thin line.

## Tokens and layout

- Canvas: #fafafa; surface: #ffffff.
- Text: #242424; secondary: #737373.
- Dividers: #eaeaea; numeric keys: #f5f5f5.
- Black equals button supplies the only strong visual accent.
- Locally bundled Manrope for UI and tabular results, JetBrains Mono for worked steps, system Chinese fallback.
- Desktop: 832px frame, calculator and history in a 1.2:1 split. Mobile: one column, history below.
- Light theme by default; neutral dark theme optional and persisted.

## Interaction review

Preserves keyboard entry, visible focus, real backend calculations, error messages, searchable history, deletion confirmation and pagination. Steps stay collapsed until requested. Numeric keys have 58px touch targets. No decorative motion; reduced-motion preference is respected.
