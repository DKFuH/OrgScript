#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { formatDocument } = require("../src/formatter");
const { buildModel } = require("../src/validate");
const { toCanonicalModel } = require("../src/export-json");
const { toMarkdownSummary } = require("../src/export-markdown");
const { toMermaidMarkdown } = require("../src/export-mermaid");

const repoRoot = path.resolve(__dirname, "..");
const examplesDir = path.join(repoRoot, "examples");
const goldenDir = path.join(repoRoot, "tests", "golden");

fs.mkdirSync(goldenDir, { recursive: true });

const files = fs
  .readdirSync(examplesDir)
  .filter((file) => file.endsWith(".orgs"))
  .sort();

for (const file of files) {
  const sourcePath = path.join(examplesDir, file);
  const result = buildModel(sourcePath);

  if (!result.ok) {
    console.error(`Cannot generate golden files for invalid example: ${file}`);
    process.exit(1);
  }

  const baseName = path.basename(file, ".orgs");
  const astOutputPath = path.join(goldenDir, `${baseName}.ast.json`);
  const modelOutputPath = path.join(goldenDir, `${baseName}.model.json`);
  const formattedOutputPath = path.join(goldenDir, `${baseName}.formatted.orgs`);
  const summaryOutputPath = path.join(goldenDir, `${baseName}.summary.md`);
  const annotatedSummaryOutputPath = path.join(goldenDir, `${baseName}.summary.annotations.md`);
  const mermaidOutputPath = path.join(goldenDir, `${baseName}.mermaid.md`);
  const canonicalModel = toCanonicalModel(result.ast);

  fs.writeFileSync(
    astOutputPath,
    `${JSON.stringify(normalizeAst(result.ast), null, 2)}\n`,
    "utf8"
  );
  fs.writeFileSync(
    modelOutputPath,
    `${JSON.stringify(canonicalModel, null, 2)}\n`,
    "utf8"
  );
  fs.writeFileSync(formattedOutputPath, formatDocument(result.ast), "utf8");
  fs.writeFileSync(summaryOutputPath, toMarkdownSummary(canonicalModel), "utf8");

  if (hasAnnotations(canonicalModel)) {
    fs.writeFileSync(
      annotatedSummaryOutputPath,
      toMarkdownSummary(canonicalModel, { includeAnnotations: true }),
      "utf8"
    );
  } else if (fs.existsSync(annotatedSummaryOutputPath)) {
    fs.unlinkSync(annotatedSummaryOutputPath);
  }

  try {
    fs.writeFileSync(mermaidOutputPath, toMermaidMarkdown(canonicalModel), "utf8");
  } catch (error) {
    if (fs.existsSync(mermaidOutputPath)) {
      fs.unlinkSync(mermaidOutputPath);
    }
  }

  console.log(`Wrote golden files for ${file}`);
}

function normalizeAst(ast) {
  return {
    ...ast,
    filePath: path.relative(repoRoot, ast.filePath).replace(/\\/g, "/"),
  };
}

function hasAnnotations(model) {
  return JSON.stringify(model).includes('"annotations":[{');
}
