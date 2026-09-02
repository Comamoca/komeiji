import { selectAll } from "css-select"
import { specificityOf } from "./specificity.js"
import { parseStyleDeclarations } from "./style.js"
import { isElement, isText } from "./types.js"
import type { ParsedDocument, ParsedElement, ParsedNode } from "./types.js"

export type RuleStyles = ReadonlyMap<ParsedElement, Readonly<Record<string, string>>>

interface CssRule {
  readonly selector: string
  readonly declarations: Record<string, string>
  readonly specificity: number
  readonly order: number
}

function collectElements(nodes: readonly ParsedNode[], elements: ParsedElement[]): void {
  for (const node of nodes) {
    if (isElement(node)) {
      elements.push(node)
      collectElements(node.children, elements)
    }
  }
}

function styleElementSheet(element: ParsedElement): string {
  return element.children.filter(isText).map((text) => text.data).join("")
}

/**
 * Splits a stylesheet into top-level `selector { body }` blocks. Tracks string
 * literals and brace depth so semicolons, quotes and nested at-rule blocks do
 * not break the split; at-rules are skipped entirely (the reference drops
 * `@media` when no viewport is known and never handles other at-rules).
 */
export function splitRules(sheet: string): { selector: string; body: string }[] {
  const blocks: { selector: string; body: string }[] = []
  const withoutComments = sheet.replace(/\/\*[\s\S]*?\*\//g, "")
  let depth = 0
  let selectorStart = 0
  let bodyStart = -1
  let selector = ""
  let quote: string | null = null
  for (let index = 0; index < withoutComments.length; index += 1) {
    const char = withoutComments[index]
    if (quote !== null) {
      if (char === "\\") index += 1
      else if (char === quote) quote = null
      continue
    }
    if (char === '"' || char === "'") {
      quote = char
      continue
    }
    if (char === "{") {
      if (depth === 0) {
        selector = withoutComments.slice(selectorStart, index).trim()
        bodyStart = index + 1
      }
      depth += 1
    } else if (char === "}") {
      if (depth > 0) depth -= 1
      if (depth === 0 && bodyStart >= 0) {
        blocks.push({ selector, body: withoutComments.slice(bodyStart, index) })
        selectorStart = index + 1
        bodyStart = -1
      }
    }
  }
  return blocks.filter((block) => block.selector !== "" && !block.selector.startsWith("@"))
}

export function collectStyles(document: ParsedDocument): RuleStyles {
  const elements: ParsedElement[] = []
  collectElements(document.children, elements)
  const sheets = elements
    .filter((element) => element.name === "style")
    .map(styleElementSheet)
  const rules: CssRule[] = []
  for (const sheet of sheets) {
    for (const block of splitRules(sheet)) {
      let specificity: number
      try {
        specificity = specificityOf(block.selector)
      } catch (error) {
        // Untrusted CSS boundary: unparseable selectors skip their rule, matching the selectAll guard below.
        if (error instanceof Error) continue
        throw error
      }
      rules.push({
        selector: block.selector,
        declarations: parseStyleDeclarations(block.body),
        specificity,
        order: rules.length,
      })
    }
  }
  rules.sort((left, right) => left.specificity - right.specificity || left.order - right.order)
  const styles = new Map<ParsedElement, Record<string, string>>()
  for (const rule of rules) {
    let matched: readonly ParsedElement[]
    try {
      matched = selectAll<ParsedNode, ParsedElement>(rule.selector, elements)
    } catch (error) {
      // Untrusted CSS boundary: an unsupported or invalid selector skips its
      // rule instead of failing the whole document.
      if (error instanceof Error) continue
      throw error
    }
    for (const element of matched) {
      const current = styles.get(element) ?? {}
      styles.set(element, { ...current, ...rule.declarations })
    }
  }
  return styles
}
