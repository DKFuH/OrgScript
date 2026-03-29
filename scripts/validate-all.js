#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { validateFile } = require("../src/validate");

const examplesDir = path.resolve(__dirname, "..", "examples");
const files = fs
  .readdirSync(examplesDir)
  .filter((file) => file.endsWith(".orgs"))
  .sort();

let failed = false;

for (const file of files) {
  const absolutePath = path.join(examplesDir, file);
  const result = validateFile(absolutePath);

  if (!result.ok) {
    failed = true;
    console.error(`Invalid OrgScript: ${file}`);

    for (const issue of result.issues) {
      console.error(`  line ${issue.line}: ${issue.message}`);
    }

    continue;
  }

  console.log(`Valid OrgScript: ${file}`);
}

process.exit(failed ? 1 : 0);
