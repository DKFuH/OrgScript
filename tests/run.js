#!/usr/bin/env node

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const { formatDocument } = require("../src/formatter");
const { buildModel } = require("../src/validate");
const { toCanonicalModel } = require("../src/export-json");

const repoRoot = path.resolve(__dirname, "..");
const examplesDir = path.join(repoRoot, "examples");
const goldenDir = path.join(repoRoot, "tests", "golden");
const invalidDir = path.join(repoRoot, "tests", "invalid");
const lintDir = path.join(repoRoot, "tests", "lint");
const expectationsPath = path.join(invalidDir, "expectations.json");
const lintExpectationsPath = path.join(lintDir, "expectations.json");
const { lintDocument } = require("../src/linter");

run();

function run() {
  testGoldenSnapshots();
  testInvalidFixtures();
  testLintFixtures();
  testFormatterStability();
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
    const formattedPath = path.join(goldenDir, `${baseName}.formatted.orgs`);

    const actualAst = JSON.stringify(normalizeAst(result.ast), null, 2);
    const expectedAst = fs.readFileSync(astPath, "utf8").trimEnd();
    assert.strictEqual(actualAst, expectedAst, `AST snapshot mismatch for ${file}`);

    const actualModel = JSON.stringify(toCanonicalModel(result.ast), null, 2);
    const expectedModel = fs.readFileSync(modelPath, "utf8").trimEnd();
    assert.strictEqual(actualModel, expectedModel, `Model snapshot mismatch for ${file}`);

    const actualFormatted = formatDocument(result.ast);
    const expectedFormatted = fs.readFileSync(formattedPath, "utf8");
    assert.strictEqual(
      actualFormatted,
      expectedFormatted,
      `Formatted snapshot mismatch for ${file}`
    );
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

function testFormatterStability() {
  const files = fs
    .readdirSync(examplesDir)
    .filter((file) => file.endsWith(".orgs"))
    .sort();

  for (const file of files) {
    const sourcePath = path.join(examplesDir, file);
    const originalSource = fs.readFileSync(sourcePath, "utf8");
    const initial = buildModel(sourcePath);

    if (!initial.ok) {
      throw new Error(`Expected valid example but got issues for ${file}`);
    }

    const formatted = formatDocument(initial.ast);
    assert.strictEqual(formatted, originalSource, `Formatter changed canonical example ${file}`);

    const tempPath = path.join(repoRoot, "tests", ".tmp-format-check.orgs");
    fs.writeFileSync(tempPath, formatted, "utf8");

    try {
      const reparsed = buildModel(tempPath);
      if (!reparsed.ok) {
        throw new Error(`Formatted output became invalid for ${file}`);
      }

      const reformatted = formatDocument(reparsed.ast);
      assert.strictEqual(reformatted, formatted, `Formatter was not idempotent for ${file}`);

      const initialModel = JSON.stringify(toCanonicalModel(initial.ast), null, 2);
      const reparsedModel = JSON.stringify(toCanonicalModel(reparsed.ast), null, 2);
      assert.strictEqual(reparsedModel, initialModel, `Formatter changed semantics for ${file}`);
    } finally {
      if (fs.existsSync(tempPath)) {
        fs.unlinkSync(tempPath);
      }
    }
  }
}

function testLintFixtures() {
  const expectations = JSON.parse(fs.readFileSync(lintExpectationsPath, "utf8"));

  for (const entry of expectations) {
    const sourcePath = path.join(lintDir, entry.file);
    const result = buildModel(sourcePath);

    if (!result.ok) {
      throw new Error(`Expected valid lint fixture but got issues for ${entry.file}`);
    }

    const findings = lintDocument(result.ast);
    const codes = findings.map((finding) => finding.code);

    for (const expectedCode of entry.expectedCodes) {
      assert.ok(
        codes.includes(expectedCode),
        `Expected lint code "${expectedCode}" in ${entry.file}`
      );
    }
  }
}

function normalizeAst(ast) {
  return {
    ...ast,
    filePath: path.relative(repoRoot, ast.filePath).replace(/\\/g, "/"),
  };
}
