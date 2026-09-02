/**
 * Heuristic that copies a Tailwind-looking `class` attribute into the special
 * `tw` prop, which satori consumes natively (via twrnc). Ported verbatim from
 * satori-html 0.3.2, quirks included: any class name containing `:` (e.g.
 * responsive variants) or matching one of the prefixes below marks the whole
 * class attribute as Tailwind.
 */
const TW_NAME_PATTERNS: readonly (string | RegExp)[] = [
  /[mp](t|b|r|l|x|y)?-/,
  "color-",
  "flex",
  "h-",
  "w-",
  "min-w-",
  "min-h-",
  "max-w-",
  "max-h-",
  "leading-",
  "text-",
  "opacity-",
  "font-",
  "aspect-",
  "tint-",
  "bg-",
  "shadow-",
  "rounded",
  "top-",
  "right-",
  "bottom-",
  "left-",
  "inset-",
  "border",
  "elevation-",
  "tracking-",
  "z-",
]

export function isTailwindClass(classAttribute: string): boolean {
  const classNames = classAttribute.split(/\s+/)
  for (const pattern of TW_NAME_PATTERNS) {
    for (const className of classNames) {
      if (className.includes(":")) return true
      if (typeof pattern === "string") {
        if (className.startsWith(pattern)) return true
      } else if (pattern.test(className)) {
        return true
      }
    }
  }
  return false
}
