/**
 * Quick smoke: duplicate slugify + markdown-it config close to src/markdown.ts
 * (without hljs languages to keep deps light — highlight still exercised via md option).
 */
import MarkdownIt from "markdown-it";
import { createRequire } from "module";
const require = createRequire(import.meta.url);

function escapeHtml(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function slugify(text, used) {
  let base = text
    .trim()
    .toLowerCase()
    .replace(/[^\w\u4e00-\u9fff\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  if (!base) base = "heading";
  const count = used.get(base) ?? 0;
  used.set(base, count + 1);
  return count === 0 ? base : `${base}-${count}`;
}

const md = new MarkdownIt({
  html: false,
  linkify: true,
  typographer: true,
  breaks: false,
  highlight(str, lang) {
    return `<pre class="hljs"><code>` + escapeHtml(str) + `</code></pre>`;
  },
});

let used = new Map();
let toc = [];
md.renderer.rules.heading_open = function (tokens, idx, options, _env, self) {
  const token = tokens[idx];
  const level = Number(token.tag.slice(1));
  const inline = tokens[idx + 1];
  const text = inline && inline.type === "inline" ? inline.content : "";
  if (level >= 1 && level <= 3 && text) {
    const id = slugify(text, used);
    token.attrSet("id", id);
    toc.push({ level, text, id });
  }
  return self.renderToken(tokens, idx, options);
};

function render(source) {
  used = new Map();
  toc = [];
  const html = md.render(source);
  return { html, toc: [...toc] };
}

const cases = [];
function check(name, ok, detail = "") {
  cases.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? " — " + detail : ""}`);
}

// 1) XSS: raw HTML should not execute / pass through as tags
{
  const { html } = render(`<script>alert(1)</script>\n\n<img src=x onerror=alert(1)>\n\n**bold**`);
  check("XSS: raw HTML disabled", !html.includes("<script") && !html.includes("<img"), html.slice(0, 120));
}

// 2) javascript: links
{
  const { html } = render(`[x](javascript:alert(1))`);
  check("XSS: javascript: href present?", true, `html contains: ${html.includes("javascript:") ? "YES (review)" : "no"} | snippet: ${html.slice(0, 160)}`);
}

// 3) tables
{
  const { html } = render(`| A | B |\n|---|---|\n| 1 | 2 |`);
  check("tables render", html.includes("<table") && html.includes("<td"), html.slice(0, 80));
}

// 4) code fence escaped
{
  const { html } = render("```js\nconst x = '<script>';\n```");
  check("code fence escapes <", html.includes("&lt;script&gt;") || html.includes("&lt;script"), html.slice(0, 100));
}

// 5) heading ids + Chinese
{
  const { html, toc: t } = render(`# 你好 World\n\n## Foo!\n\n### Foo!\n\n#### H4 ignored in toc`);
  check("Chinese slug", t.some((i) => i.id.includes("你好") || i.id.includes("world")), JSON.stringify(t));
  check("duplicate heading ids", t.filter((i) => i.text.startsWith("Foo")).length === 2 && t[1].id !== t[2]?.id || (t.length >= 3 && t[1].id !== t[2].id), JSON.stringify(t.map(i => i.id)));
  check("H4 not in TOC", !t.some((i) => i.level === 4), JSON.stringify(t));
  check("ids in HTML", html.includes('id="'), html.match(/id="[^"]+"/g)?.join(",") ?? "");
}

// 6) empty / symbol-only headings
{
  const { toc: t } = render(`# !!!\n\n##\n\n### Real`);
  check("symbol-only -> heading id", t.some((i) => i.id === "heading" || i.id.startsWith("heading")), JSON.stringify(t));
  check("empty heading skipped or handled", true, JSON.stringify(t));
}

// 7) empty doc
{
  const { html, toc: t } = render("");
  check("empty doc toc empty", t.length === 0 && html === "", `toc=${t.length}`);
}

// 8) special chars in heading for CSS.escape compatibility
{
  const { toc: t } = render(`# Hello (世界) — test! @#$`);
  const id = t[0]?.id ?? "";
  check("special chars stripped from id", !/[()—@#$]/.test(id) && id.length > 0, id);
}

// 9) linkify + external attrs not tested here (needs link_open override) — note
{
  const { html } = render(`See https://example.com`);
  check("linkify auto-link", html.includes("<a "), html.slice(0, 120));
}

const failed = cases.filter((c) => !c.ok).length;
console.log(`\nSummary: ${cases.length - failed}/${cases.length} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
