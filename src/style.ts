import styleToObject from "style-to-object"
import type { StyleObject } from "./types.js"

const VENDOR_PREFIXES: readonly string[] = ["webkit", "moz", "ms", "o"]

/**
 * camelCases a kebab-case CSS property name per the React convention:
 * `border-top` → `borderTop`, `-webkit-transform` → `WebkitTransform`,
 * `-ms-flex` → `msFlex`. CSS custom properties are preserved verbatim.
 */
function camelizeProperty(property: string): string {
  if (property.startsWith("--")) return property
  const lowercased = property.toLowerCase()
  const vendor = /^-([a-z]+)-(.+)$/.exec(lowercased)
  if (vendor !== null && vendor[1] !== undefined && VENDOR_PREFIXES.includes(vendor[1])) {
    const prefix = vendor[1] === "ms" ? "ms" : vendor[1].charAt(0).toUpperCase() + vendor[1].slice(1)
    const remainder = vendor[2] ?? ""
    const camel = remainder.replace(/-([a-z])/g, (_, char: string) => char.toUpperCase())
    return prefix + camel.charAt(0).toUpperCase() + camel.slice(1)
  }
  return lowercased.replace(/-([a-z])/g, (_, char: string) => char.toUpperCase())
}

/**
 * Parses a CSS declaration list (from a style attribute or a rule body) into a
 * camelCased style object.
 *
 * Deviations from satori-html's naive camelize:
 * - CSS custom properties (`--x`) are preserved verbatim (upstream corrupts them to `-X`).
 * - Vendor prefixes follow the React convention (`-webkit-*` → `Webkit*`, `-ms-*` → `ms*`).
 * - Property names are lowercased before camelizing (CSS is case-insensitive except for
 *   custom properties), so `COLOR: RED` yields `color`, matching browsers.
 * - Malformed fragments that would make the parser throw degrade to `{}` instead of
 *   throwing, matching the tolerant stylis-based pipeline of the reference.
 */
export function parseStyleDeclarations(source: string): StyleObject {
  try {
    const declarations = styleToObject(source)
    if (declarations === null) return {}
    return Object.fromEntries(
      Object.entries(declarations).map(([property, value]) => [camelizeProperty(property), value]),
    )
  } catch (error) {
    if (error instanceof Error) return {}
    throw error
  }
}

