#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { buildModel } = require("../src/validate");
const { toCanonicalModel } = require("../src/export-json");

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

  fs.writeFileSync(
    astOutputPath,
    `${JSON.stringify(normalizeAst(result.ast), null, 2)}\n`,
    "utf8"
  );
  fs.writeFileSync(
    modelOutputPath,
    `${JSON.stringify(toCanonicalModel(result.ast), null, 2)}\n`,
    "utf8"
  );

  console.log(`Wrote golden files for ${file}`);
}

function normalizeAst(ast) {
  return {
    ...ast,
    filePath: path.relative(repoRoot, ast.filePath).replace(/\\/g, "/"),
  };
}
