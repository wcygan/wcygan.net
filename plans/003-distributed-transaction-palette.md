# Distributed transaction palette audit

Audited the 14 `.dt-demo` tokens in `src/styles/app.css` and their sRGB bridge in `src/demos/distributed-transactions/palette.ts`. Measurements below reflect the final implemented palette.

## Findings

All semantic text colors meet WCAG 2 normal-text AA (4.5:1) against both `--dt-paper` and the stage (`#f7f6f3`). Prepared and pre-commit have the smallest margins, but still pass after rounding to 8-bit sRGB. Group inks exceed 9:1 on the stage. No semantic text lightness correction is required.

Two corrections made during validation:

| Role                            | Before                 | After                   | Reason                                                                                                                                                                                  |
| ------------------------------- | ---------------------- | ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Active packets and connections  | `oklch(0.54 0.14 245)` | `oklch(0.54 0.135 245)` | The original has linear-sRGB red −0.003914 and is slightly out of gamut. Reducing chroma preserves lightness and hue; all channels then fit sRGB. Contrast remains 4.64:1 on the stage. |
| Connectors and offline outlines | `oklch(0.68 0.025 85)` | `oklch(0.647 0.025 85)` | The original is 2.67:1 against the stage. Darkening only lightness brings structural strokes above the 3:1 graphical-object target with rounding margin.                                |

For active blue, maximum in-gamut chroma at the current lightness/hue is approximately 0.135922. Raising lightness to keep chroma 0.14 instead requires at least L 0.5562 and reduces stage contrast below 4.5:1. Chroma reduction is the appropriate gamut fix.

For the line token, maximum lightness for exactly 3:1 on the stage is approximately 0.649462 before 8-bit rounding. A value of 0.647 provides a small rendering margin. Pale database bodies are intentionally below 3:1; their dark perimeter rings, direct labels, and identity text establish shape and identity instead.

## Measurements

Conversion used the standard OKLCH → OKLab → linear sRGB matrices, followed by the sRGB transfer function. Gamut testing checked unclamped linear channels in [0, 1]. WCAG contrast used linear-sRGB luminance coefficients 0.2126, 0.7152, 0.0722 and `(lighter + 0.05) / (darker + 0.05)`. The sRGB column is rounded to 8 bits and shown only for diagnostic comparison; OKLCH remains the CSS source of truth.

| Token        | Current OKLCH            | Approximate sRGB | In sRGB gamut | Contrast on paper | Contrast on stage |
| ------------ | ------------------------ | ---------------- | ------------- | ----------------: | ----------------: |
| `database-a` | `oklch(0.82 0.09 250)`   | `#97c9fd`        | Yes           |            1.71:1 |            1.61:1 |
| `database-b` | `oklch(0.82 0.09 310)`   | `#d6b4f0`        | Yes           |            1.77:1 |            1.67:1 |
| `ink-a`      | `oklch(0.38 0.105 250)`  | `#034477`        | Yes           |            9.85:1 |            9.27:1 |
| `ink-b`      | `oklch(0.38 0.105 310)`  | `#532f6b`        | Yes           |           10.34:1 |            9.73:1 |
| `neutral`    | `oklch(0.89 0.015 85)`   | `#dfdad0`        | Yes           |            1.37:1 |            1.29:1 |
| `paper`      | `oklch(0.994 0.001 106)` | `#fdfdfc`        | Yes           |            1.00:1 |            1.06:1 |
| `ink`        | `oklch(0.395 0.014 100)` | `#48473e`        | Yes           |            9.23:1 |            8.69:1 |
| `line`       | `oklch(0.647 0.025 85)`  | `#958d7d`        | Yes           |            3.22:1 |            3.03:1 |
| `offline`    | `oklch(0.94 0.006 95)`   | `#ecebe7`        | Yes           |            1.17:1 |            1.10:1 |
| `prepared`   | `oklch(0.55 0.105 80)`   | `#916a18`        | Yes           |            4.83:1 |            4.55:1 |
| `pre-commit` | `oklch(0.56 0.14 50)`    | `#b35713`        | Yes           |            4.82:1 |            4.54:1 |
| `committed`  | `oklch(0.47 0.11 155)`   | `#106c3e`        | Yes           |            6.36:1 |            5.98:1 |
| `aborted`    | `oklch(0.53 0.16 25)`    | `#b63b39`        | Yes           |            5.63:1 |            5.30:1 |
| `active`     | `oklch(0.54 0.135 245)`  | `#0374b7`        | Yes           |            4.93:1 |            4.64:1 |

All 14 current tokens fit sRGB. The corrected active token rounds to `#0374b7`, giving 4.93:1 on paper and 4.64:1 on the stage. Prepared rounded to `#916a18` measures 4.82:1 and 4.54:1; pre-commit rounded to `#b35713` measures 4.81:1 and 4.53:1.

The CSS label measurements are independent of Three.js lighting. Mesh materials can shade differently under scene lights, so the outlined shapes and DOM labels still need rendered inspection. `readPalette()` uses an sRGB 2D canvas to resolve CSS colors to Three.js-compatible hex strings; after all tokens fit sRGB this preserves the intended colors without browser-dependent gamut mapping. This is an appropriate exception to keeping new authored CSS colors in OKLCH.

## Full before/after palette table

The old 3D palette was `server #dedcd5`, `offline #eeede8`, `tile #fdfdfc`, `log #b9b5a9`, `ink #48473f`, and `line #b2afa4`. Rows below map those source roles to every introduced palette role. The table includes the applied gamut and structural-contrast corrections.

| Use                                     | Before                                                            | After                                   |
| --------------------------------------- | ----------------------------------------------------------------- | --------------------------------------- |
| A database body                         | Server `#dedcd5`                                                  | `--dt-database-a: oklch(0.82 0.09 250)` |
| A account row tile                      | Tile `#fdfdfc`                                                    | `--dt-database-a: oklch(0.82 0.09 250)` |
| B database body                         | Server `#dedcd5`                                                  | `--dt-database-b: oklch(0.82 0.09 310)` |
| B account row tile                      | Tile `#fdfdfc`                                                    | `--dt-database-b: oklch(0.82 0.09 310)` |
| A database rings and identity ink       | 3D ink `#48473f`; CSS identity labels inherited primary/muted ink | `--dt-ink-a: oklch(0.38 0.105 250)`     |
| B database rings and identity ink       | 3D ink `#48473f`; CSS identity labels inherited primary/muted ink | `--dt-ink-b: oklch(0.38 0.105 310)`     |
| Shared database / coordinator body      | Server `#dedcd5`                                                  | `--dt-neutral: oklch(0.89 0.015 85)`    |
| Neutral tile/paper                      | Tile `#fdfdfc`                                                    | `--dt-paper: oklch(0.994 0.001 106)`    |
| Neutral geometry outlines               | Ink `#48473f`                                                     | `--dt-ink: oklch(0.395 0.014 100)`      |
| Offline body                            | Offline `#eeede8`                                                 | `--dt-offline: oklch(0.94 0.006 95)`    |
| Prepared records and state labels       | Log `#b9b5a9`; neutral label ink                                  | `--dt-prepared: oklch(0.55 0.105 80)`   |
| Pre-commit records and state labels     | Log `#b9b5a9`; neutral label ink                                  | `--dt-pre-commit: oklch(0.56 0.14 50)`  |
| Committed records and state labels      | Log `#b9b5a9`; neutral label ink                                  | `--dt-committed: oklch(0.47 0.11 155)`  |
| Aborted records and state labels        | Log `#b9b5a9`; neutral label ink                                  | `--dt-aborted: oklch(0.53 0.16 25)`     |
| Active messages / emphasized connectors | Neutral ink/line `#48473f` / `#b2afa4`                            | `--dt-active: oklch(0.54 0.135 245)`    |
| Connectors / offline outlines           | Line `#b2afa4`                                                    | `--dt-line: oklch(0.647 0.025 85)`      |
| Account label background                | Translucent paper `#fdfdfcf2`                                     | Opaque `var(--dt-paper)`                |
| Account label shadow                    | None                                                              | `0 1px 3px oklch(0 0 0 / 0.06)`         |

The stage, editorial primary ink, muted ink, button colors, and general article colors stay unchanged and are therefore not color-change rows.
