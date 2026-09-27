# Clarity interface direction

Design reference process: [Anthropic frontend-design skill](https://github.com/anthropics/skills/tree/main/skills/frontend-design), installed and read locally for this redesign. No third-party website template was copied.

## Intent

A focused desktop calculation instrument with a readable history ledger. The calculator itself is the main visual object, not a promotional hero. Users should recognize the input, answer, keypad and saved calculations immediately.

## Tokens

- Midnight `#101521`: page canvas.
- Graphite blue `#1b2333`: instrument enclosure.
- Raised slate `#293449`: numeric keys.
- Mist `#edf0fa`: primary text.
- Lavender `#b7c4ff`: operation controls and active accents.
- Steel `#98a6be`: supporting text.

Type: locally bundled Manrope Variable for controls and interface; JetBrains Mono Variable for expressions and results. Chinese falls back to Microsoft YaHei/PingFang SC. Clear scale from 12px supporting text to 56px results; no tiny decorative labels.

## Layout

```
brand                                    service  theme

计算工作台                    example expressions
┌────────────────────────────┬─────────────────────┐
│ standard         precision │ history     refresh │
│                            │ search              │
│ expression                 │                     │
│                  result    │ expression = result │
│                            │ time / reuse/delete │
│ sculpted 4-column keypad   │                     │
│ keyboard help              │ paging              │
│ collapsible worked steps   │ shared-space note   │
└────────────────────────────┴─────────────────────┘
```

The two areas share one enclosure rather than unrelated floating cards. Results align right; history aligns left. On narrow screens the history follows the calculator vertically. Keycaps supply the main depth; backgrounds and typography stay restrained.

## Review against rejected design

Removed the decorative English eyebrow, arbitrary edition number, tiny footer slogans and overly spacious marketing header. Avoided the common near-black/neon-green palette. A cool instrument palette, distinct key hierarchy and history ledger make the visual choices specific to a calculator. Both dark and light themes retain readable contrast, keyboard focus and reduced-motion support.
