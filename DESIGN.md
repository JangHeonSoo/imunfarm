# IMUN.FARM Design

Restrained monochrome editorial. The page reads like a well-set farm newspaper ledger: rules, type and numbers carry the hierarchy, not color or depth.

## Tokens (src/styles/global.css)

| token             | light                 | dark                  | use                                            |
| ----------------- | --------------------- | --------------------- | ---------------------------------------------- |
| `--bg`            | `#faf8f6`             | `#0c0c0b`             | page surface (warm off-white / off-black)      |
| `--ink`           | `#1d1d1b`             | `#f4f2ef`             | text, 1px section rules, filled selected state |
| `--muted`         | ink 62%               | ink 60%               | secondary text, labels                         |
| `--line`          | ink 14%               | ink 16%               | row dividers                                   |
| `--faint`         | `#c9c7c5`             | ink 30%               | inactive marks                                 |
| `--up` / `--down` | `#b4432c` / `#2f6ea8` | `#e0745c` / `#7fb3e2` | price change only, never decoration or CTA     |

Layout: `--gutter` clamp(16px, 1.7vw, 24px). Reading column `--measure` 760px; wide pages 1080px.

## Type

- Manrope (self-hosted 300–800) for Latin and figures, Pretendard / Apple SD Gothic Neo for Hangul. One family system; no serif, no mono costume.
- Wordmark 800, tracking .05em. Headings 700, tracking -0.01em. Big figures 800 with `tabular-nums`.
- `.im-label` 10px / 500 / .1em uppercase muted: crumbs and table heads, not decorative kickers.
- `.im-menu` 13px / 600 / .05em uppercase: nav, Korean first plus English muted (English hidden < 600px).

## Components

- Sections open with a 1px `--ink` top rule; rows divide with 1px `--line`.
- Selected / primary state = `--ink` fill with `--bg` text. Everything else is text with underline (offset 3px).
- Site search is always `.im-search` (big SEARCH input), never a boxed widget.
- Chips: 999px pill, 1px line border, ink fill when pressed.
- Radius small (4px controls, pills only for chips). No cards with shadow.

## Never

Blue or colored CTA, box-shadow, gradients, glass, pastel tints, grain/noise, emoji icons, striped fills, exclamation marks.

## Copy

UI copy (buttons, notices, helper text) uses polite ~습니다 form. Blog bodies use ~다. Number ranges use `–` or `에서`, never ASCII `~`. Every figure carries its source date.
