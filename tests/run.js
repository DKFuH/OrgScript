#!/usr/bin/env node

const assert = require("assert");
const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const { formatDocument } = require("../src/formatter");
const { buildModel } = require("../src/validate");
const { toCanonicalModel } = require("../src/export-json");
const { toMermaidMarkdown } = require("../src/export-mermaid");
const { lintDocument, renderLintReport, summarizeFindings } = require("../src/linter");

const repoRoot = path.resolve(__dirname, "..");
const examplesDir = path.join(repoRoot, "examples");
const goldenDir = path.join(repoRoot, "tests", "golden");
const invalidDir = path.join(repoRoot, "tests", "invalid");
const lintDir = path.join(repoRoot, "tests", "lint");
const expectationsPath = path.join(invalidDir, "expectations.json");
const lintExpectationsPath = path.join(lintDir, "expectations.json");
run();

function run() {
  testGoldenSnapshots();
  testInvalidFixtures();
  testLintFixtures();
  testFormatterStability();
  testCliDiagnosticsAndExitCodes();
  testFormatCheckMode();
  testCheckCommand();
  testMermaidExport();
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
    const mermaidPath = path.join(goldenDir, `${baseName}.mermaid.md`);

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

    if (fs.existsSync(mermaidPath)) {
      const actualMermaid = toMermaidMarkdown(toCanonicalModel(result.ast));
      const expectedMermaid = fs.readFileSync(mermaidPath, "utf8");
      assert.strictEqual(
        actualMermaid,
        expectedMermaid,
        `Mermaid snapshot mismatch for ${file}`
      );
    }
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

    if (entry.expectedSeverities) {
      for (const [code, severity] of Object.entries(entry.expectedSeverities)) {
        const finding = findings.find((item) => item.code === code);
        assert.ok(finding, `Expected finding "${code}" in ${entry.file}`);
        assert.strictEqual(
          finding.severity,
          severity,
          `Expected severity "${severity}" for "${code}" in ${entry.file}`
        );
      }
    }

    const summary = summarizeFindings(findings);
    const counted = findings.reduce(
      (acc, finding) => {
        acc[finding.severity] += 1;
        return acc;
      },
      { error: 0, warning: 0, info: 0 }
    );
    assert.deepStrictEqual(summary, counted, `Unexpected lint summary for ${entry.file}`);

    const reportLines = renderLintReport(entry.file, findings);
    if (findings.length === 0) {
      assert.strictEqual(reportLines.length, 1, `Expected single-line clean report for ${entry.file}`);
    } else {
      assert.strictEqual(
        reportLines[1],
        `  summary: ${summary.error} error(s), ${summary.warning} warning(s), ${summary.info} info finding(s)`,
        `Unexpected lint summary line for ${entry.file}`
      );
    }
  }
}

function testCliDiagnosticsAndExitCodes() {
  const cliPath = path.join(repoRoot, "bin", "orgscript.js");

  const validateOk = runCli([
    cliPath,
    "validate",
    "./examples/craft-business-lead-to-order.orgs",
    "--json",
  ]);
  assert.strictEqual(validateOk.status, 0, "Expected validate --json to succeed for valid file");
  const validateOkPayload = JSON.parse(validateOk.stdout);
  assert.strictEqual(validateOkPayload.command, "validate");
  assert.strictEqual(validateOkPayload.valid, true);
  assert.strictEqual(validateOkPayload.summary.error, 0);

  const validateInvalid = runCli([
    cliPath,
    "validate",
    "./tests/invalid/unknown-top-level.orgs",
    "--json",
  ]);
  assert.strictEqual(validateInvalid.status, 1, "Expected validate --json to fail for invalid file");
  const validateInvalidPayload = JSON.parse(validateInvalid.stdout);
  assert.strictEqual(validateInvalidPayload.command, "validate");
  assert.strictEqual(validateInvalidPayload.valid, false);
  assert.ok(validateInvalidPayload.summary.error > 0);
  assert.ok(validateInvalidPayload.diagnostics.length > 0);

  const lintWarning = runCli([
    cliPath,
    "lint",
    "./tests/lint/process-missing-trigger.orgs",
    "--json",
  ]);
  assert.strictEqual(lintWarning.status, 0, "Expected lint warnings to stay non-failing");
  const lintWarningPayload = JSON.parse(lintWarning.stdout);
  assert.strictEqual(lintWarningPayload.command, "lint");
  assert.strictEqual(lintWarningPayload.clean, true);
  assert.ok(lintWarningPayload.summary.warning > 0);
  assert.strictEqual(lintWarningPayload.summary.error, 0);

  const lintError = runCli([
    cliPath,
    "lint",
    "./tests/lint/process-multiple-triggers.orgs",
    "--json",
  ]);
  assert.strictEqual(lintError.status, 1, "Expected lint errors to fail");
  const lintErrorPayload = JSON.parse(lintError.stdout);
  assert.strictEqual(lintErrorPayload.command, "lint");
  assert.strictEqual(lintErrorPayload.clean, false);
  assert.ok(lintErrorPayload.summary.error > 0);

  const checkOk = runCli([
    cliPath,
    "check",
    "./examples/craft-business-lead-to-order.orgs",
    "--json",
  ]);
  assert.strictEqual(checkOk.status, 0, "Expected check --json to succeed for canonical valid file");
  const checkOkPayload = JSON.parse(checkOk.stdout);
  assert.strictEqual(checkOkPayload.command, "check");
  assert.strictEqual(checkOkPayload.ok, true);
  assert.strictEqual(checkOkPayload.validate.valid, true);
  assert.strictEqual(checkOkPayload.lint.clean, true);
  assert.strictEqual(checkOkPayload.format.canonical, true);

  const checkLintError = runCli([
    cliPath,
    "check",
    "./tests/lint/process-multiple-triggers.orgs",
    "--json",
  ]);
  assert.strictEqual(checkLintError.status, 1, "Expected check --json to fail on lint errors");
  const checkLintErrorPayload = JSON.parse(checkLintError.stdout);
  assert.strictEqual(checkLintErrorPayload.command, "check");
  assert.strictEqual(checkLintErrorPayload.ok, false);
  assert.ok(checkLintErrorPayload.lint.summary.error > 0);

  const checkInvalid = runCli([
    cliPath,
    "check",
    "./tests/invalid/unknown-top-level.orgs",
    "--json",
  ]);
  assert.strictEqual(checkInvalid.status, 1, "Expected check --json to fail on invalid input");
  const checkInvalidPayload = JSON.parse(checkInvalid.stdout);
  assert.strictEqual(checkInvalidPayload.command, "check");
  assert.strictEqual(checkInvalidPayload.ok, false);
  assert.strictEqual(checkInvalidPayload.validate.valid, false);
  assert.strictEqual(checkInvalidPayload.lint.skipped, true);
  assert.strictEqual(checkInvalidPayload.format.skipped, true);

  const exportJson = runCli([
    cliPath,
    "export",
    "json",
    "./examples/craft-business-lead-to-order.orgs",
  ]);
  assert.strictEqual(exportJson.status, 0, "Expected export json to succeed");
  const exportPayload = JSON.parse(exportJson.stdout);
  assert.strictEqual(exportPayload.type, "document");

  const exportMermaid = runCli([
    cliPath,
    "export",
    "mermaid",
    "./examples/craft-business-lead-to-order.orgs",
  ]);
  assert.strictEqual(exportMermaid.status, 0, "Expected export mermaid to succeed");
  assert.ok(
    exportMermaid.stdout.includes("# OrgScript Mermaid Export"),
    "Expected Mermaid export heading"
  );

  const exportMermaidUnsupported = runCli([
    cliPath,
    "export",
    "mermaid",
    "./examples/service-escalation.orgs",
  ]);
  assert.strictEqual(
    exportMermaidUnsupported.status,
    1,
    "Expected export mermaid to fail when no supported blocks exist"
  );
  assert.ok(
    exportMermaidUnsupported.stderr.includes("Cannot export Mermaid"),
    "Expected Mermaid export failure message"
  );
  assert.ok(
    exportMermaidUnsupported.stderr.includes("No Mermaid-exportable blocks found"),
    "Expected unsupported Mermaid export reason"
  );

  const formatCommand = runCli([
    cliPath,
    "format",
    "./examples/craft-business-lead-to-order.orgs",
  ]);
  assert.strictEqual(formatCommand.status, 0, "Expected format to succeed on canonical file");
  assert.ok(
    formatCommand.stdout.includes("Already formatted"),
    "Expected format command to report already formatted file"
  );
}

function testFormatCheckMode() {
  const cliPath = path.join(repoRoot, "bin", "orgscript.js");
  const canonicalSourcePath = path.join(examplesDir, "craft-business-lead-to-order.orgs");
  const canonicalSource = fs.readFileSync(canonicalSourcePath, "utf8");

  const canonicalCheck = runCli([
    cliPath,
    "format",
    "./examples/craft-business-lead-to-order.orgs",
    "--check",
  ]);
  assert.strictEqual(canonicalCheck.status, 0, "Expected format --check to pass for canonical file");
  assert.ok(
    canonicalCheck.stdout.includes("Formatting check passed"),
    "Expected format --check success message"
  );

  const nonCanonicalPath = path.join(repoRoot, "tests", ".tmp-format-noncanonical.orgs");
  const nonCanonicalSource = canonicalSource.replace("\n\n  when lead.created", "\n  when lead.created");
  fs.writeFileSync(nonCanonicalPath, nonCanonicalSource, "utf8");

  try {
    const nonCanonicalCheck = runCli([
      cliPath,
      "format",
      "./tests/.tmp-format-noncanonical.orgs",
      "--check",
    ]);
    assert.strictEqual(
      nonCanonicalCheck.status,
      1,
      "Expected format --check to fail for non-canonical file"
    );
    assert.ok(
      nonCanonicalCheck.stderr.includes("Formatting changes required"),
      "Expected format --check failure message"
    );
    assert.strictEqual(
      fs.readFileSync(nonCanonicalPath, "utf8"),
      nonCanonicalSource,
      "Expected format --check to leave the file unchanged"
    );
  } finally {
    if (fs.existsSync(nonCanonicalPath)) {
      fs.unlinkSync(nonCanonicalPath);
    }
  }

  const invalidCheck = runCli([
    cliPath,
    "format",
    "./tests/invalid/unknown-top-level.orgs",
    "--check",
  ]);
  assert.strictEqual(invalidCheck.status, 1, "Expected format --check to fail for invalid file");
  assert.ok(
    invalidCheck.stderr.includes("Cannot format invalid OrgScript"),
    "Expected invalid format --check message"
  );
}

function testCheckCommand() {
  const cliPath = path.join(repoRoot, "bin", "orgscript.js");
  const canonicalSourcePath = path.join(examplesDir, "craft-business-lead-to-order.orgs");
  const canonicalSource = fs.readFileSync(canonicalSourcePath, "utf8");

  const checkOk = runCli([cliPath, "check", "./examples/craft-business-lead-to-order.orgs"]);
  assert.strictEqual(checkOk.status, 0, "Expected check to pass for canonical example");
  assert.ok(
    checkOk.stdout.includes("CHECK examples/craft-business-lead-to-order.orgs"),
    "Expected check header in check output"
  );
  assert.ok(checkOk.stdout.includes("validate: ok"), "Expected validate pass in check output");
  assert.ok(checkOk.stdout.includes("lint: ok (0 error(s), 0 warning(s), 0 info)"), "Expected lint pass in check output");
  assert.ok(checkOk.stdout.includes("format: ok"), "Expected format pass in check output");
  assert.ok(checkOk.stdout.includes("Result: PASS"), "Expected passing summary in check output");

  const checkWarning = runCli([cliPath, "check", "./tests/lint/process-missing-trigger.orgs"]);
  assert.strictEqual(checkWarning.status, 0, "Expected warning-only check to stay non-failing");
  assert.ok(
    checkWarning.stdout.includes("lint: ok (0 error(s), 1 warning(s), 0 info)"),
    "Expected warning summary in check output"
  );
  assert.ok(
    checkWarning.stdout.includes("Result: PASS"),
    "Expected overall pass for warning-only check"
  );

  const checkLintError = runCli([cliPath, "check", "./tests/lint/conflicting-role-permissions.orgs"]);
  assert.strictEqual(checkLintError.status, 1, "Expected check to fail on lint errors");
  assert.ok(
    checkLintError.stderr.includes("lint: failed"),
    "Expected lint failure in check output"
  );
  assert.ok(
    checkLintError.stderr.includes("Result: FAIL"),
    "Expected failed summary for lint-error check"
  );

  const nonCanonicalPath = path.join(repoRoot, "tests", ".tmp-check-noncanonical.orgs");
  const nonCanonicalSource = canonicalSource.replace("\n\n  when lead.created", "\n  when lead.created");
  fs.writeFileSync(nonCanonicalPath, nonCanonicalSource, "utf8");

  try {
    const checkFormatFailure = runCli([cliPath, "check", "./tests/.tmp-check-noncanonical.orgs"]);
    assert.strictEqual(checkFormatFailure.status, 1, "Expected check to fail on format drift");
    assert.ok(
      checkFormatFailure.stderr.includes("format: failed"),
      "Expected format failure in check output"
    );
    assert.strictEqual(
      fs.readFileSync(nonCanonicalPath, "utf8"),
      nonCanonicalSource,
      "Expected check to leave non-canonical file unchanged"
    );
  } finally {
    if (fs.existsSync(nonCanonicalPath)) {
      fs.unlinkSync(nonCanonicalPath);
    }
  }

  const checkInvalid = runCli([cliPath, "check", "./tests/invalid/unknown-top-level.orgs"]);
  assert.strictEqual(checkInvalid.status, 1, "Expected check to fail for invalid file");
  assert.ok(
    checkInvalid.stderr.includes("validate: failed"),
    "Expected validate failure in check output"
  );
  assert.ok(checkInvalid.stderr.includes("lint: skipped"), "Expected skipped lint in check output");
  assert.ok(
    checkInvalid.stderr.includes("format: skipped"),
    "Expected skipped format in check output"
  );
  assert.ok(checkInvalid.stderr.includes("Result: FAIL"), "Expected failed summary for invalid file");
}

function testMermaidExport() {
  const cliPath = path.join(repoRoot, "bin", "orgscript.js");
  const supportedFixtures = [
    "craft-business-lead-to-order",
    "lead-qualification",
    "order-approval",
  ];

  for (const fixture of supportedFixtures) {
    const exported = runCli([cliPath, "export", "mermaid", `./examples/${fixture}.orgs`]);
    assert.strictEqual(exported.status, 0, `Expected Mermaid export to succeed for ${fixture}`);
    const expected = fs.readFileSync(path.join(goldenDir, `${fixture}.mermaid.md`), "utf8");
    assert.strictEqual(exported.stdout, expected, `Unexpected Mermaid export for ${fixture}`);
  }

  const unsupportedMermaid = runCli([
    cliPath,
    "export",
    "mermaid",
    "./examples/service-escalation.orgs",
  ]);
  assert.strictEqual(
    unsupportedMermaid.status,
    1,
    "Expected Mermaid export to fail for unsupported example"
  );
  assert.ok(
    unsupportedMermaid.stderr.includes("No Mermaid-exportable blocks found"),
    "Expected unsupported Mermaid export message"
  );
}

function runCli(args) {
  const result = spawnSync(process.execPath, args, {
    cwd: repoRoot,
    encoding: "utf8",
  });

  if (result.error) {
    throw result.error;
  }

  return result;
}

function normalizeAst(ast) {
  return {
    ...ast,
    filePath: path.relative(repoRoot, ast.filePath).replace(/\\/g, "/"),
  };
}
