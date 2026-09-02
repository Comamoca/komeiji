export type StyleObject = Readonly<Record<string, string>>

export type VNodeChild = string | VNode | readonly VNodeChild[]

export interface VNodeProps {
  readonly style?: StyleObject
  readonly children?: VNodeChild
  readonly [attribute: string]: unknown
}

export interface VNode {
  readonly type: string
  readonly props: VNodeProps
}

/**
 * Minimal structural view of the parser's tree. Defined here (instead of
 * borrowing the parser's own types) so the published `.d.ts` files reference
 * nothing outside this package.
 */
export interface ParsedText {
  readonly type: "text"
  readonly data: string
}

export interface ParsedElement {
  readonly type: "tag" | "script" | "style"
  readonly name: string
  readonly attribs: Readonly<Record<string, string>>
  readonly children: readonly ParsedNode[]
}

export interface ParsedOther {
  readonly type: string
}

export type ParsedNode = ParsedText | ParsedElement | ParsedOther

export interface ParsedDocument {
  readonly children: readonly ParsedNode[]
}

export function isText(node: ParsedNode): node is ParsedText {
  return node.type === "text"
}

export function isElement(node: ParsedNode): node is ParsedElement {
  return node.type === "tag" || node.type === "script" || node.type === "style"
}
