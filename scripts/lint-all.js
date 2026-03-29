#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { lintDocument, renderLintReport, summarizeFindings } = require("../src/linter");
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
      console.error(`Cannot lint invalid OrgScript: ${file}`);
      for (const issue of [...result.syntaxIssues, ...result.semanticIssues]) {
        console.error(`  line ${issue.line}: ${issue.message}`);
      }
      continue;
    }

    const findings = lintDocument(result.ast);
    const summary = summarizeFindings(findings);

    if (summary.error > 0 || summary.warning > 0 || summary.info > 0) {
      hasFailure = true;
      console.error(renderLintReport(file, findings).join("\n"));
    } else {
      console.log(`No lint findings: ${file}`);
    }
  }

  process.exit(hasFailure ? 1 : 0);
}
