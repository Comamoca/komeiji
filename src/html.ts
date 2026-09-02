import { parseDocument } from "htmlparser2"
import { collectStyles } from "./inline.js"
import { buildRoot } from "./tree.js"
import type { VNode } from "./types.js"

/**
 * Interpolation semantics match the reference exactly: `null`, `undefined` and
 * `false` vanish, everything else goes through `String()`.
 */
function formatExpression(value: unknown): string {
  return value == null || value === false ? "" : String(value)
}

/**
 * Joins the cooked template parts with formatted expressions. Cooked strings
 * are used deliberately: Bun 1.3.x re-escapes astral characters (e.g. emoji)
 * inside `strings.raw`, which would corrupt the markup.
 */
function joinTemplate(parts: readonly string[], expressions: readonly unknown[]): string {
  let source = ""
  parts.forEach((part, index) => {
    if (index > 0) source += formatExpression(expressions[index - 1])
    source += part
  })
  return source
}

/**
 * Transforms an HTML string (tagged template or plain call) into a
 * satori-compatible VNode:
 *
 * ```js
 * import satori from "satori";
 * import { html } from "komeiji";
 *
 * const svg = await satori(html`<div style="color: black">hello</div>`, {
 *   width: 600,
 *   height: 400,
 *   fonts: [],
 * });
 * ```
 */
export function html(
  templates: string | TemplateStringsArray,
  ...expressions: readonly unknown[]
): VNode {
  const source =
    typeof templates === "string" ? templates : joinTemplate([...templates], expressions)
  const document = parseDocument(source.trim())
  const styles = collectStyles(document)
  return buildRoot(document, styles)
}
