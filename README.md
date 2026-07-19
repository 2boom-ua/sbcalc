# Sidebar Calculator

A lightweight, elegant calculator Chrome/Edge extension that lives in your browser's side panel. Built with vanilla JavaScript and the [math.js](https://mathjs.org/) library for robust expression evaluation.

[![License](https://img.shields.io/badge/license-GPLv3-red.svg)](https://www.gnu.org/licenses/gpl-2.0.html)
![Version](https://img.shields.io/badge/version-1.4-green.svg)

## Features

- **Side Panel Integration** — Opens instantly via the browser action button or side panel toggle
- **Full Expression Support** — Enter and evaluate complex mathematical expressions with parentheses
- **Calculation History** — Keeps the last 5 calculations with one-click recall
- **Memory Functions** — M+, M-, MR, MC with visual indicator showing stored value
- **Scientific Operations** — Square (x²), square root (√), inverse (x⁻¹), factorial (x!), rounding (Rnd), percent (%)
- **Smart Percent Logic** — Calculates `500 + 10%` as `500 + 50` automatically
- **Keyboard Support** — Full numpad and operator key bindings
- **Copy & Paste** — Click to copy result; long-press for comma-separated format; paste numbers directly into display
- **History Interaction** — Click a history line to load its result; long-press to copy the entire line
- **Auto-resizing Display** — Font size dynamically adjusts to fit long expressions
- **Dark/Light Theme** — Respects `prefers-color-scheme` automatically
- **Persistent State** — Expression, history, and memory survive browser restarts
- **Backspace Long-press** — Hold backspace to clear entry instantly

## Installation

### From Source (Developer Mode)

1. Download or clone this repository
2. Open Chrome or Edge and navigate to `chrome://extensions/`
3. Enable **Developer mode** (toggle in the top-right corner)
4. Click **Load unpacked** and select the extension folder
5. Click the extension icon in the toolbar or open the side panel to start calculating

### From Chrome Web Store *(coming soon)*

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `0-9` | Input digits |
| `.` / `,` | Decimal point |
| `+` `-` `*` `/` | Operators |
| `Enter` / `=` | Calculate result |
| `Backspace` | Delete last character |
| `Escape` / `C` | Clear all |
| `%` | Percent |
| `(` `)` | Parentheses |

## Permissions

| Permission | Purpose |
|-----------|---------|
| `sidePanel` | Required to display the calculator in the browser side panel |
| `storage` | Persist calculation history, current expression, and memory across sessions |
| `clipboardRead` | Paste numbers from clipboard into the display |
| `clipboardWrite` | Copy results and history lines to clipboard |

## Tech Stack

- **Manifest V3** — Latest Chrome extension format
- **Service Worker** — Lightweight background script
- **math.js** — Safe mathematical expression evaluation, 
- **math.js** — Safe mathematical expression evaluation,
- **CSS Variables** — Dynamic theming without JavaScript
- **Chrome Storage API** — Local persistence for user data

## License

This extention is licensed under the GPLv2 or later.

## Credits

- [math.js](https://mathjs.org/) by Jos de Jong
