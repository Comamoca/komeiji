# komeiji

Generate a [satori](https://github.com/vercel/satori)-friendly VDOM from a string of HTML.

Modern, Bun-ready successor of [`satori-html`](https://github.com/natemoo-re/satori-html) — drop-in API compatible, with the known upstream bugs fixed.

## Why a rewrite

`satori-html` has not published a release since 2022-12 and crashes on **every** input under Bun 1.x (the bundled parsel selector engine cannot handle the `:where([style])` rule the CSS inliner always injects). This library keeps the same API and output contract while:

| | satori-html | komeiji |
|---|---|---|
| Bun / Node / Edge | crashes under Bun | works everywhere (tested on Bun 1.3 + Node 24) |
| HTML entities | `&amp;` renders literally | decoded (HTML spec) |
| CSS custom props | `--x` corrupted to `-X` | preserved |
| Uppercase tags | `DIV` misses satori preset styles | lowercased (HTML spec) |
| Malformed `style=""` | tolerant | tolerant (`{}`), never throws |
| `url(a;b.png)` in styles | works | works |
| Types | `any`-heavy | strict, no `any` |

## Install

```bash
bun add komeiji        # or npm/pnpm
```

## Usage

```js
import satori from "satori";
import { html } from "komeiji";

const markup = html`<div style="color: black;">hello, world</div>`;
const svg = await satori(markup, {
  width: 600,
  height: 400,
  fonts: [],
});
```

The `html` utility can be used as a tagged template literal or as a plain function.

```js
html`<div style="color: ${color};">hello</div>`;
html('<div style="color: black;">hello</div>');
```

`<style>` elements are parsed and inlined onto matching elements (class, id, tag and attribute selectors, comma lists, combinators; cascade ordered by specificity then source order; the inline `style` attribute always wins). At-rules such as `@media` are ignored, matching upstream behavior.

Elements whose `class` looks like Tailwind utilities get the class copied into the special `tw` prop, which satori consumes natively.

## Example

A runnable OG-image example lives in [`examples/og-image.ts`](examples/og-image.ts). It renders an 800x400 card from HTML (inline styles + a `<style>` block + Tailwind classes + interpolations) and writes `examples/output.svg`:

```bash
bun run example
```

```html
<div style="display: flex; padding: 48px">
  <style>.brand { color: #6366f1; }</style>
  <h2 style="font-size: 40px">${title}</h2>
  <span class="brand">Start your free trial today.</span>
</div>
```

## Deviations from satori-html

All render-equivalent through satori or strict improvements, and each is locked by a test:

- HTML entities are decoded in text and attribute values.
- `children` arrays never contain holes (comments and whitespace-only text are simply skipped; satori drops them anyway).
- Tag and attribute names are lowercased.
- CSS custom properties are preserved; vendor prefixes follow the React convention (`-webkit-transform` → `WebkitTransform`, `-ms-flex` → `msFlex`).
- Property names are case-insensitive (`COLOR:` works).
- Interpolations use the cooked template strings (Bun 1.3 mis-escapes astral characters in `strings.raw`).

## Development

```bash
bun install
bun test        # unit + golden-render tests
bun run build   # tsc -> dist
```

The golden SVG snapshots in `test/snapshots/` were captured once from `satori-html@0.3.2` (via Node, where that package works) and are committed, so render parity with the reference is checked byte-for-byte on every test run without depending on it.

## License

MIT
