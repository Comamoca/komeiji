import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { html } from "../src/index.ts";
import satori from "satori";

const fontData = readFileSync(join(import.meta.dir, "assets", "Inter-Regular.woff"));
const fonts = [{ name: "Inter", data: fontData, weight: 400, style: "normal" }];
const options = { width: 200, height: 200, fonts } as const;

const fixtures = {
  basic: `<div>Hello world</div>`,
  style: `<div style="color: red">Hello world</div>`,
  "inline-css": `<div class="cool">Hello world</div><style>.cool { color: red; }</style>`,
  tailwind: `<div class="bg-gray-50 flex">
  <div class="flex flex-col w-full py-12 px-4 items-center justify-between p-8">
    <h2 class="flex flex-col text-3xl font-bold tracking-tight text-gray-900 text-left">
      <span>Ready to dive in?</span>
      <span class="text-indigo-600">Start your free trial today.</span>
    </h2>
  </div>
</div>`,
};

describe("satori render parity with satori-html reference", () => {
  for (const [name, source] of Object.entries(fixtures)) {
    it(`renders ${name} to the same SVG as the satori-html reference`, async () => {
      const golden = readFileSync(join(import.meta.dir, "snapshots", `${name}.svg`), "utf8");
      const svg = await satori(html(source), options);
      expect(svg).toBe(golden);
    });
  }
});
