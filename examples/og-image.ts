/**
 * HTML -> SVG example.
 *
 * Run: bun run examples/og-image.ts
 * Writes: examples/output.svg
 */
import { html } from "komeiji";
import satori from "satori";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

const fontData = readFileSync(join(here, "..", "test", "assets", "Inter-Regular.woff"));

const title = "Ready to dive in?";

// Inline styles, a <style> block, Tailwind classes and interpolations all work.
const markup = html`
  <div
    style="
      background-color: white;
      height: 100%;
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 48px;
    "
  >
    <style>
      .brand {
        color: #6366f1;
      }
    </style>
    <div class="flex flex-col items-start">
      <h2 style="margin: 0; font-size: 40px; font-weight: 700; color: #111827;">
        ${title}
      </h2>
      <span class="brand" style="font-size: 24px; font-weight: 600;">
        Start your free trial today.
      </span>
    </div>
    <div class="flex items-center justify-center" style="background-color: #6366f1; color: white; border-radius: 8px; padding: 12px 24px; font-size: 18px;">
      Get started
    </div>
  </div>
`;

const svg = await satori(markup, {
  width: 800,
  height: 400,
  fonts: [{ name: "Inter", data: fontData, weight: 400, style: "normal" }],
});

const out = join(here, "output.svg");
writeFileSync(out, svg);
console.log(`wrote ${out} (${svg.length} bytes)`);
