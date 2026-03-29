#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { buildModel } = require("../src/validate");
const { toCanonicalModel } = require("../src/export-json");
const { toMarkdownSummary } = require("../src/export-markdown");
const { toMermaidMarkdown } = require("../src/export-mermaid");
const { toHtmlDocumentation } = require("../src/export-html");

const repoRoot = path.resolve(__dirname, "..");
const mermaidOutputDir = path.join(repoRoot, "docs", "demos", "mermaid");
const markdownOutputDir = path.join(repoRoot, "docs", "demos", "markdown");
const htmlOutputDir = path.join(repoRoot, "docs", "demos", "html");

const demos = [
  {
    slug: "craft-business-lead-to-order",
    title: "Craft Business: Lead to Order",
    source: path.join(repoRoot, "examples", "craft-business-lead-to-order.orgs"),
    description:
      "Our hero example showcasing multi-block processes, rules, and stateflows in a realistic business scenario.",
  },
  {
    slug: "lead-qualification",
    title: "Lead qualification process",
    source: path.join(repoRoot, "examples", "lead-qualification.orgs"),
    description:
      "A compact process example that shows trigger, branching, assignment, notification, and state transition.",
  },
  {
    slug: "order-approval",
    title: "Order approval stateflow",
    source: path.join(repoRoot, "examples", "order-approval.orgs"),
    description:
      "A stateflow-focused example that also demonstrates how Mermaid export skips unsupported blocks while still producing useful output.",
  },
];

function main() {
  fs.mkdirSync(mermaidOutputDir, { recursive: true });
  fs.mkdirSync(markdownOutputDir, { recursive: true });
  fs.mkdirSync(htmlOutputDir, { recursive: true });

  for (const demo of demos) {
    const result = buildModel(demo.source);

    if (!result.ok) {
      throw new Error(`Cannot generate demo for ${demo.slug}: source file is invalid.`);
    }

    const markdown = toMermaidMarkdown(toCanonicalModel(result.ast));
    const rawMermaid = extractFirstMermaidBlock(markdown);

    fs.writeFileSync(path.join(mermaidOutputDir, `${demo.slug}.mermaid.md`), markdown, "utf8");
    fs.writeFileSync(path.join(mermaidOutputDir, `${demo.slug}.mmd`), `${rawMermaid}\n`, "utf8");
    fs.writeFileSync(
      path.join(markdownOutputDir, `${demo.slug}.summary.md`),
      toMarkdownSummary(toCanonicalModel(result.ast)),
      "utf8"
    );
    fs.writeFileSync(
      path.join(htmlOutputDir, `${demo.slug}.html`),
      toHtmlDocumentation(toCanonicalModel(result.ast), `OrgScript Demo: ${demo.title}`),
      "utf8"
    );
  }

  fs.writeFileSync(path.join(mermaidOutputDir, "README.md"), renderMermaidReadme(), "utf8");
  fs.writeFileSync(path.join(markdownOutputDir, "README.md"), renderMarkdownReadme(), "utf8");
  fs.writeFileSync(path.join(htmlOutputDir, "README.md"), renderHtmlReadme(), "utf8");
}

function extractFirstMermaidBlock(markdown) {
  const match = markdown.match(/```mermaid\r?\n([\s\S]*?)\r?\n```/);

  if (!match) {
    throw new Error("Expected Mermaid export to contain at least one Mermaid code block.");
  }

  return match[1];
}

function renderMermaidReadme() {
  const lines = [
    "# Mermaid demos",
    "",
    "This folder shows the shortest useful path from OrgScript source to generated diagram artifacts.",
    "",
    "Each demo keeps the source file in `examples/` and generates two downstream artifacts here:",
    "",
    "- `*.mermaid.md`: a Markdown document ready for GitHub rendering",
    "- `*.mmd`: the first extracted Mermaid diagram block for direct Mermaid tooling use",
    "",
    "## Generate",
    "",
    "```text",
    "npm run demo:generate",
    "```",
    "",
    "## Demos",
    "",
    "| Demo | Source | Markdown artifact | Mermaid artifact |",
    "| --- | --- | --- | --- |",
  ];

  for (const demo of demos) {
    const sourceRelative = path.relative(mermaidOutputDir, demo.source).replace(/\\/g, "/");
    lines.push(
      `| ${demo.title} | [${path.basename(demo.source)}](${sourceRelative}) | [${demo.slug}.mermaid.md](./${demo.slug}.mermaid.md) | [${demo.slug}.mmd](./${demo.slug}.mmd) |`
    );
    lines.push(`|  |  |  | ${demo.description} |`);
  }

  lines.push("");
  lines.push("## Notes");
  lines.push("");
  lines.push("- These artifacts are generated from the current exporter implementation.");
  lines.push(
    "- `order-approval` intentionally demonstrates the current behavior where unsupported blocks are skipped and called out in the generated Markdown."
  );
  lines.push(
    "- If you change Mermaid export behavior, regenerate this folder with `npm run demo:generate` and review the diffs."
  );
  lines.push("");

  return `${lines.join("\n")}\n`;
}

function renderMarkdownReadme() {
  const lines = [
    "# Markdown summary demos",
    "",
    "This folder shows the shortest path from OrgScript source to human-readable Markdown summaries.",
    "",
    "Each demo keeps the source file in `examples/` and generates one downstream artifact here:",
    "",
    "- `*.summary.md`: a concise Markdown summary of the modeled logic",
    "",
    "## Generate",
    "",
    "```text",
    "npm run demo:generate",
    "```",
    "",
    "## Demos",
    "",
    "| Demo | Source | Markdown summary |",
    "| --- | --- | --- |",
  ];

  for (const demo of demos) {
    const sourceRelative = path.relative(markdownOutputDir, demo.source).replace(/\\/g, "/");
    lines.push(
      `| ${demo.title} | [${path.basename(demo.source)}](${sourceRelative}) | [${demo.slug}.summary.md](./${demo.slug}.summary.md) |`
    );
    lines.push(`|  |  | ${demo.description} |`);
  }

  lines.push("");
  lines.push("## Notes");
  lines.push("");
  lines.push("- These artifacts are generated from the current Markdown summary exporter.");
  lines.push(
    "- The summaries are intentionally concise and deterministic rather than prose-heavy."
  );
  lines.push(
    "- If you change Markdown export behavior, regenerate this folder with `npm run demo:generate` and review the diffs."
  );
  lines.push("");

  return `${lines.join("\n")}\n`;
}

function renderHtmlReadme() {
  const lines = [
    "# HTML documentation demos",
    "",
    "This folder shows the shortest path from OrgScript source to a shareable HTML documentation artifact.",
    "",
    "Each demo keeps the source file in `examples/` and generates one downstream artifact here:",
    "",
    "- `*.html`: a static HTML page with embedded logic summaries and live Mermaid diagrams",
    "",
    "## Generate",
    "",
    "```text",
    "npm run demo:generate",
    "```",
    "",
    "## Demos",
    "",
    "| Demo | Source | HTML artifact |",
    "| --- | --- | --- |",
  ];

  for (const demo of demos) {
    const sourceRelative = path.relative(htmlOutputDir, demo.source).replace(/\\/g, "/");
    lines.push(
      `| ${demo.title} | [${path.basename(demo.source)}](${sourceRelative}) | [${demo.slug}.html](./${demo.slug}.html) |`
    );
    lines.push(`|  |  | ${demo.description} |`);
  }

  lines.push("");
  lines.push("## Notes");
  lines.push("");
  lines.push("- These artifacts are generated using the current HTML exporter implementation.");
  lines.push("- The diagrams are rendered by loading `mermaid.js` from a CDN within the HTML page.");
  lines.push("");

  return `${lines.join("\n")}\n`;
}

main();
