#!/usr/bin/env node

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const { buildModel } = require("../src/validate");
const { toCanonicalModel } = require("../src/export-json");

const repoRoot = path.resolve(__dirname, "..");
const examplesDir = path.join(repoRoot, "examples");
const goldenDir = path.join(repoRoot, "tests", "golden");
const invalidDir = path.join(repoRoot, "tests", "fixtures", "invalid");
const expectationsPath = path.join(invalidDir, "expectations.json");

run();

function run() {
  testGoldenSnapshots();
  testInvalidFixtures();
  console.log("All tests passed.");
}

function testGoldenSnapshots() {
  const files = fs
    .readdirSync(examplesDir)
    .filter((file) => file.endsWith(".orgs"))
    .sort();

  for (const file of files) {
    const sourcePath = path.join(examplesDir, file);
    const result = buildModel(sourcePath);

    if (!result.ok) {
      throw new Error(`Expected valid example but got issues for ${file}`);
    }

    const baseName = path.basename(file, ".orgs");
    const astPath = path.join(goldenDir, `${baseName}.ast.json`);
    const modelPath = path.join(goldenDir, `${baseName}.model.json`);

    const actualAst = JSON.stringify(normalizeAst(result.ast), null, 2);
    const expectedAst = fs.readFileSync(astPath, "utf8").trimEnd();
    assert.strictEqual(actualAst, expectedAst, `AST snapshot mismatch for ${file}`);

    const actualModel = JSON.stringify(toCanonicalModel(result.ast), null, 2);
    const expectedModel = fs.readFileSync(modelPath, "utf8").trimEnd();
    assert.strictEqual(actualModel, expectedModel, `Model snapshot mismatch for ${file}`);
  }
}

function testInvalidFixtures() {
  const expectations = JSON.parse(fs.readFileSync(expectationsPath, "utf8"));

  for (const entry of expectations) {
    const sourcePath = path.join(invalidDir, entry.file);
    const result = buildModel(sourcePath);

    if (result.ok) {
      throw new Error(`Expected invalid fixture but got success for ${entry.file}`);
    }

    const messages = [...result.syntaxIssues, ...result.semanticIssues].map((issue) => issue.message);

    for (const expected of entry.expectedMessages) {
      const found = messages.some((message) => message.includes(expected));
      assert.ok(found, `Expected error containing "${expected}" in ${entry.file}`);
    }
  }
}

function normalizeAst(ast) {
  return {
    ...ast,
    filePath: path.relative(repoRoot, ast.filePath).replace(/\\/g, "/"),
  };
}
