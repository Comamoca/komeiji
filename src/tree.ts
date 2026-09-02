import type { RuleStyles } from "./inline.js"
import { parseStyleDeclarations } from "./style.js"
import { isTailwindClass } from "./tw.js"
import { isElement, isText } from "./types.js"
import type { ParsedDocument, ParsedElement, ParsedNode, StyleObject, VNode, VNodeChild } from "./types.js"

const ROOT_STYLE: Readonly<Record<string, string>> = {
  display: "flex",
  flexDirection: "column",
  width: "100%",
  height: "100%",
}

function collapse(children: readonly VNodeChild[]): VNodeChild {
  const only = children[0]
  if (children.length === 1 && typeof only === "string") return only
  return children
}

function mergeStyles(
  ruleStyle: Readonly<Record<string, string>> | undefined,
  inlineSource: string | undefined,
): StyleObject | undefined {
  if (ruleStyle === undefined && inlineSource === undefined) return undefined
  const inlineStyle = inlineSource === undefined ? {} : parseStyleDeclarations(inlineSource)
  return { ...ruleStyle, ...inlineStyle }
}

function convertElement(element: ParsedElement, styles: RuleStyles): VNode {
  const { style, ...attributes } = element.attribs
  const props: Record<string, unknown> = { ...attributes }
  const classValue = attributes["class"]
  if (
    classValue !== undefined &&
    classValue !== "" &&
    !("tw" in attributes) &&
    isTailwindClass(classValue)
  ) {
    props["tw"] = classValue
  }
  const styleProp = mergeStyles(styles.get(element), style)
  if (styleProp !== undefined) props["style"] = styleProp
  props["children"] = collapse(convertChildren(element.children, styles))
  return { type: element.name, props }
}

function convertNode(node: ParsedNode, styles: RuleStyles): VNodeChild | null {
  if (isText(node)) {
    const text = node.data.trim()
    return text === "" ? null : text
  }
  if (isElement(node)) {
    if (node.type === "style") return null
    return convertElement(node, styles)
  }
  // Comments, doctype directives and CDATA are skipped; `<style>` elements are
  // consumed by the inliner. The reference leaves holes for these, which
  // satori drops anyway.
  return null
}

function convertChildren(nodes: readonly ParsedNode[], styles: RuleStyles): VNodeChild[] {
  const children: VNodeChild[] = []
  for (const node of nodes) {
    const converted = convertNode(node, styles)
    if (converted !== null) children.push(converted)
  }
  return children
}

export function buildRoot(document: ParsedDocument, styles: RuleStyles): VNode {
  return {
    type: "div",
    props: {
      style: { ...ROOT_STYLE },
      children: collapse(convertChildren(document.children, styles)),
    },
  }
}
