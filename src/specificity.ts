import { parse } from "css-what"

/**
 * Computes a CSS specificity total (ids, classes/attributes/pseudo-classes,
 * types) used to order `<style>` rules like the reference implementation does.
 *
 * Approximations, documented: `:where()` contributes nothing (per spec) and
 * `:is()`/`:not()` count as one class-level selector instead of taking their
 * argument's specificity. OG-image stylesheets do not exercise these.
 */
export function specificityOf(selector: string): number {
  let ids = 0
  let classes = 0
  let types = 0
  for (const compound of parse(selector)) {
    for (const token of compound) {
      if (token.type === "attribute") {
        // css-what marks shorthand tokens (`#id`, `.class`) with `ignoreCase: "quirks"`;
        // that is what separates `#id` (an id selector) from `[id=x]` (an attribute selector).
        if (token.name === "id" && token.ignoreCase === "quirks") {
          ids += 1
        } else {
          classes += 1
        }
      } else if (token.type === "pseudo") {
        if (token.name !== "where") classes += 1
      } else if (token.type === "pseudo-element") {
        types += 1
      } else if (token.type === "tag") {
        types += 1
      }
    }
  }
  return ids * 10_000 + classes * 100 + types
}
