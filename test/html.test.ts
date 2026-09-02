import { describe, expect, it } from "bun:test";
import { html } from "../src/index.ts";

const wrap = (...children: unknown[]) => ({
  type: "div",
  props: {
    style: {
      display: "flex",
      flexDirection: "column",
      height: "100%",
      width: "100%",
    },
    children,
  },
});

const firstChild = (children: unknown): unknown => (Array.isArray(children) ? children[0] : children);

describe("html", () => {
  it("works as a simple tagged template", () => {
    const result = html`<div>Hello world</div>`;
    expect(result).toEqual(wrap({ type: "div", props: { children: "Hello world" } }));
  });

  it("works as a complex tagged template", () => {
    const result = html`<div>Hello ${"world"}</div>`;
    expect(result).toEqual(wrap({ type: "div", props: { children: "Hello world" } }));
  });

  it("works as a function", () => {
    const result = html(`<div>Hello world</div>`);
    expect(result).toEqual(wrap({ type: "div", props: { children: "Hello world" } }));
  });

  it("renders falsy and numeric interpolations like the upstream", () => {
    expect(html`<div>${null}</div>`).toEqual(wrap({ type: "div", props: { children: [] } }));
    expect(html`<div>${false}</div>`).toEqual(wrap({ type: "div", props: { children: [] } }));
    expect(html`<div>${42}</div>`).toEqual(wrap({ type: "div", props: { children: "42" } }));
  });

  it("handles basic styles", () => {
    const result = html`<div style="color: red; border-top: 1px solid green;">
      Hello world
    </div>`;
    expect(result).toEqual(
      wrap({
        type: "div",
        props: {
          style: {
            borderTop: "1px solid green",
            color: "red",
          },
          children: "Hello world",
        },
      }),
    );
  });

  it("inlines css", () => {
    const result = html`<div class="cool">Hello world</div>
      <style>
        .cool {
          color: red;
        }
      </style>`;
    expect(result).toEqual(
      wrap({
        type: "div",
        props: {
          style: {
            color: "red",
          },
          class: "cool",
          children: "Hello world",
        },
      }),
    );
  });

  it("removes style elements from the tree", () => {
    const result = html`<div class="cool">Hello world</div>
      <style>
        .cool {
          color: red;
        }
      </style>`;
    expect(JSON.stringify(result)).not.toContain('"type":"style"');
  });

  it("lets the inline style attribute win over a matching rule", () => {
    const result = html`<div class="a" style="color: blue">x</div>
      <style>
        .a {
          color: red;
          margin: 1px;
        }
      </style>`;
    expect(firstChild(result.props.children)).toEqual({
      type: "div",
      props: { class: "a", style: { color: "blue", margin: "1px" }, children: "x" },
    });
  });

  it("applies higher-specificity rules over lower ones", () => {
    const result = html`<div id="x" class="a">x</div>
      <style>
        .a {
          color: red;
        }
        #x {
          color: green;
        }
      </style>`;
    expect(firstChild(result.props.children)).toEqual({
      type: "div",
      props: { id: "x", class: "a", style: { color: "green" }, children: "x" },
    });
  });

  it("applies later rules over earlier ones at equal specificity", () => {
    const result = html`<div class="a">x</div>
      <style>
        .a {
          color: red;
        }
        .a {
          color: green;
        }
      </style>`;
    expect(firstChild(result.props.children)).toEqual({
      type: "div",
      props: { class: "a", style: { color: "green" }, children: "x" },
    });
  });

  it("skips rules with unparseable selectors instead of throwing", () => {
    for (const broken of [".a,", "[foo=", "p:", ":bogus("]) {
      const result = html`<div class="a b">x</div>
        <style>
          ${broken} { color: red; }
          .b {
            color: green;
          }
        </style>`;
      expect(firstChild(result.props.children)).toEqual({
        type: "div",
        props: { class: "a b", style: { color: "green" }, children: "x" },
      });
    }
  });

  it("preserves url() in css", () => {
    const result = html`<div
      style="background-image: url(https://example.com/img.png);"
    />`;
    expect(result).toEqual(
      wrap({
        type: "div",
        props: {
          style: { backgroundImage: "url(https://example.com/img.png)" },
          children: [],
        },
      }),
    );
  });

  it("supports semicolons inside url() in style attribute", () => {
    const result = html`<div style="background-image: url(a;b.png)">x</div>`;
    expect(firstChild(result.props.children)).toEqual({
      type: "div",
      props: { style: { backgroundImage: "url(a;b.png)" }, children: "x" },
    });
  });

  it("supports linebreaks in style attribute", () => {
    const result = html`<div
      style="
    background-color: white;
    height: 100%;
    width: 100%;
  "
    >
      <div
        style="
      flex-grow: 1;
      margin: 80px;
    "
      >
        Hello World! 👋
      </div>
    </div>`;
    expect(result).toEqual(
      wrap({
        type: "div",
        props: {
          children: [
            {
              type: "div",
              props: {
                children: "Hello World! 👋",
                style: {
                  flexGrow: "1",
                  margin: "80px",
                },
              },
            },
          ],
          style: {
            backgroundColor: "white",
            height: "100%",
            width: "100%",
          },
        },
      }),
    );
  });

  it("supports parens in style attribute", () => {
    const result = html`<div
      style="background-image: linear-gradient(135deg, #ef629f, #eecda3); display: flex;"
    ></div>`;
    expect(result).toEqual(
      wrap({
        type: "div",
        props: {
          children: [],
          style: {
            backgroundImage: "linear-gradient(135deg, #ef629f, #eecda3)",
            display: "flex",
          },
        },
      }),
    );
  });

  it("decodes HTML entities in text", () => {
    const result = html`<p>A &amp; B &#39;C&#39; &copy;</p>`;
    expect(firstChild(result.props.children)).toEqual({
      type: "p",
      props: { children: "A & B 'C' ©" },
    });
  });

  it("decodes HTML entities in attribute values", () => {
    const result = html`<div title="a &amp; b">x</div>`;
    expect(firstChild(result.props.children)).toEqual({
      type: "div",
      props: { title: "a & b", children: "x" },
    });
  });

  it("preserves CSS custom properties in style attribute", () => {
    const result = html`<div style="--x: 1; color: red;">hi</div>`;
    expect(firstChild(result.props.children)).toEqual({
      type: "div",
      props: { style: { "--x": "1", color: "red" }, children: "hi" },
    });
  });

  it("preserves CSS custom properties inside style elements", () => {
    const result = html`<div class="cool">hi</div>
      <style>
        .cool {
          --x: 1;
          color: red;
        }
      </style>`;
    expect(firstChild(result.props.children)).toEqual({
      type: "div",
      props: { class: "cool", style: { "--x": "1", color: "red" }, children: "hi" },
    });
  });

  it("does not throw on malformed style attributes", () => {
    const result = html`<div style="top">x</div>`;
    expect(firstChild(result.props.children)).toEqual({
      type: "div",
      props: { style: {}, children: "x" },
    });
  });

  it("lowercases tag and attribute names", () => {
    const result = html`<DIV STYLE="COLOR: RED">hi</DIV>`;
    expect(firstChild(result.props.children)).toEqual({
      type: "div",
      props: { style: { color: "RED" }, children: "hi" },
    });
  });

  it("camelcases vendor prefixes like the reference", () => {
    const result = html`<div style="-webkit-transform: scale(2)">hi</div>`;
    expect(firstChild(result.props.children)).toEqual({
      type: "div",
      props: { style: { WebkitTransform: "scale(2)" }, children: "hi" },
    });
  });

  it("collapses a bare text root", () => {
    expect(html`hello`).toEqual({
      type: "div",
      props: {
        style: {
          display: "flex",
          flexDirection: "column",
          height: "100%",
          width: "100%",
        },
        children: "hello",
      },
    });
  });

  it("ignores comments instead of leaving holes", () => {
    expect(html`<div><!-- c -->hi</div>`).toEqual(
      wrap({ type: "div", props: { children: "hi" } }),
    );
  });

  it("ignores doctype directives", () => {
    expect(html`<!DOCTYPE html><div>x</div>`).toEqual(
      wrap({ type: "div", props: { children: "x" } }),
    );
  });

  it("keeps void elements as children-less nodes", () => {
    const result = html`<div><br><img src="https://example.com/i.png"></div>`;
    expect(firstChild(result.props.children)).toEqual({
      type: "div",
      props: {
        children: [{ type: "br", props: { children: [] } }, { type: "img", props: { src: "https://example.com/i.png", children: [] } }],
      },
    });
  });

  it("handles malformed markup without throwing", () => {
    const result = html`<div><p>unclosed <span>x`;
    expect(JSON.stringify(result)).toContain("unclosed");
    expect(JSON.stringify(result)).toContain("span");
  });
});
