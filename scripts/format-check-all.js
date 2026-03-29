#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { formatDocument } = require("../src/formatter");
const { buildModel } = require("../src/validate");

const repoRoot = path.resolve(__dirname, "..");
const examplesDir = path.join(repoRoot, "examples");

run();

function run() {
  const files = fs
    .readdirSync(examplesDir)
    .filter((file) => file.endsWith(".orgs"))
    .sort();

  let hasFailure = false;

  for (const file of files) {
    const sourcePath = path.join(examplesDir, file);
    const result = buildModel(sourcePath);

    if (!result.ok) {
      hasFailure = true;
      console.error(`Cannot format-check invalid OrgScript: ${file}`);
      for (const issue of [...result.syntaxIssues, ...result.semanticIssues]) {
        console.error(`  line ${issue.line}: ${issue.message}`);
      }
      continue;
    }

    const current = fs.readFileSync(sourcePath, "utf8");
    const formatted = formatDocument(result.ast);

    if (current === formatted) {
      console.log(`Formatting check passed: ${file}`);
      continue;
    }

    hasFailure = true;
    console.error(`Formatting changes required: ${file}`);
  }

  process.exit(hasFailure ? 1 : 0);
}
