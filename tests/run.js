#!/usr/bin/env node

const assert = require("assert");
const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const { formatDocument } = require("../src/formatter");
const { buildModel } = require("../src/validate");
const { toCanonicalModel } = require("../src/export-json");
const { toMarkdownSummary } = require("../src/export-markdown");
const { toMermaidMarkdown } = require("../src/export-mermaid");
const { toHtmlDocumentation } = require("../src/export-html");
const { toBpmnXml } = require("../src/export-bpmn");
const { toGraphJson } = require("../src/export-graph");
const { toLittleHorseSkeleton } = require("../src/export-littlehorse");
const { toAiContext } = require("../src/export-context");
const { analyzeDocument } = require("../src/analyze");
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
  testMarkdownExport();
  testHtmlExport();
  testMarkdownExporterAdditionalBlockKinds();
  testSkeletonExporters();
  testCommentsAndAnnotations();
  testVsCodeArtifacts();
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
    const summaryPath = path.join(goldenDir, `${baseName}.summary.md`);
    const annotatedSummaryPath = path.join(goldenDir, `${baseName}.summary.annotations.md`);
    const mermaidPath = path.join(goldenDir, `${baseName}.mermaid.md`);
    const canonicalModel = toCanonicalModel(result.ast);

    const actualAst = JSON.stringify(normalizeAst(result.ast), null, 2);
    const expectedAst = fs.readFileSync(astPath, "utf8").trimEnd();
    assert.strictEqual(actualAst, expectedAst, `AST snapshot mismatch for ${file}`);

    const actualModel = JSON.stringify(canonicalModel, null, 2);
    const expectedModel = fs.readFileSync(modelPath, "utf8").trimEnd();
    assert.strictEqual(actualModel, expectedModel, `Model snapshot mismatch for ${file}`);

    const actualFormatted = formatDocument(result.ast);
    const expectedFormatted = fs.readFileSync(formattedPath, "utf8");
    assert.strictEqual(
      actualFormatted,
      expectedFormatted,
      `Formatted snapshot mismatch for ${file}`
    );

    if (fs.existsSync(summaryPath)) {
      const actualSummary = toMarkdownSummary(canonicalModel);
      const expectedSummary = fs.readFileSync(summaryPath, "utf8");
      assert.strictEqual(
        actualSummary,
        expectedSummary,
        `Markdown summary snapshot mismatch for ${file}`
      );
    }

    if (fs.existsSync(annotatedSummaryPath)) {
      const actualAnnotatedSummary = toMarkdownSummary(canonicalModel, {
        includeAnnotations: true,
      });
      const expectedAnnotatedSummary = fs.readFileSync(annotatedSummaryPath, "utf8");
      assert.strictEqual(
        actualAnnotatedSummary,
        expectedAnnotatedSummary,
        `Annotated Markdown summary snapshot mismatch for ${file}`
      );
    }

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

    const issues = [...result.syntaxIssues, ...result.semanticIssues];
    const messages = issues.map((issue) => issue.message);
    const codes = issues.map((issue) => issue.code);

    for (const expected of entry.expectedMessages) {
      const found = messages.some((message) => message.includes(expected));
      assert.ok(found, `Expected error containing "${expected}" in ${entry.file}`);
    }

    for (const expectedCode of entry.expectedCodes || []) {
      assert.ok(codes.includes(expectedCode), `Expected error code "${expectedCode}" in ${entry.file}`);
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
      assert.strictEqual(reportLines.length, 3, `Expected stable clean report for ${entry.file}`);
      assert.strictEqual(reportLines[0], `LINT ${entry.file}`, `Unexpected lint heading for ${entry.file}`);
    } else {
      assert.strictEqual(
        reportLines[1],
        `  status: ${summary.error > 0 ? "failed" : "passed"}`,
        `Unexpected lint status line for ${entry.file}`
      );
      assert.strictEqual(
        reportLines[2],
        `  summary: ${summary.error} error(s), ${summary.warning} warning(s), ${summary.info} info`,
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
  assert.ok(Array.isArray(validateOkPayload.diagnostics));
  assertDiagnosticsShape(validateOkPayload.diagnostics);

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
  assert.strictEqual(validateInvalidPayload.diagnostics[0].severity, "error");
  assert.ok(validateInvalidPayload.diagnostics[0].code.startsWith("syntax."));
  assert.strictEqual(
    validateInvalidPayload.diagnostics[0].file,
    "tests/invalid/unknown-top-level.orgs"
  );
  assert.ok(typeof validateInvalidPayload.diagnostics[0].line === "number");
  assertDiagnosticsShape(validateInvalidPayload.diagnostics);

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
  assert.strictEqual(lintWarningPayload.diagnostics[0].code, "lint.process-missing-trigger");
  assert.strictEqual(lintWarningPayload.diagnostics[0].file, "tests/lint/process-missing-trigger.orgs");
  assertDiagnosticsShape(lintWarningPayload.diagnostics);

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
  assert.strictEqual(lintErrorPayload.diagnostics[0].code, "lint.process-multiple-triggers");
  assertDiagnosticsShape(lintErrorPayload.diagnostics);

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
  assert.ok(Array.isArray(checkOkPayload.diagnostics));
  assertDiagnosticsShape(checkOkPayload.diagnostics);

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
  assert.ok(
    checkLintErrorPayload.diagnostics.some(
      (diagnostic) => diagnostic.code === "lint.process-multiple-triggers"
    ),
    "Expected check diagnostics to include lint.process-multiple-triggers"
  );
  assertDiagnosticsShape(checkLintErrorPayload.diagnostics);

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
  assert.ok(checkInvalidPayload.diagnostics[0].code.startsWith("syntax."));
  assertDiagnosticsShape(checkInvalidPayload.diagnostics);

  const exportJson = runCli([
    cliPath,
    "export",
    "json",
    "./examples/lead-qualification.orgs",
  ]);
  assert.strictEqual(exportJson.status, 0, "Expected export json to succeed");
  const exportPayload = JSON.parse(exportJson.stdout);
  assert.strictEqual(exportPayload.type, "document");
  assert.strictEqual(exportPayload.version, "0.4");
  assert.deepStrictEqual(exportPayload.metadata.languages, {
    source: "en",
    comments: "en",
    annotations: "en",
    context: "en",
  });

  const exportMarkdown = runCli([
    cliPath,
    "export",
    "markdown",
    "./examples/craft-business-lead-to-order.orgs",
  ]);
  assert.strictEqual(exportMarkdown.status, 0, "Expected export markdown to succeed");
  assert.ok(
    exportMarkdown.stdout.includes("# Process: CraftBusinessLeadToOrder"),
    "Expected Markdown export heading"
  );

  const exportMarkdownWithAnnotations = runCli([
    cliPath,
    "export",
    "markdown",
    "./examples/lead-qualification.orgs",
    "--with-annotations",
  ]);
  assert.strictEqual(exportMarkdownWithAnnotations.status, 0, "Expected annotated Markdown export to succeed");
  assert.ok(
    exportMarkdownWithAnnotations.stdout.includes("### Metadata"),
    "Expected annotated Markdown export metadata section"
  );
  assert.ok(
    exportMarkdownWithAnnotations.stdout.includes('@note="Track referral lead handling separately."'),
    "Expected inline statement annotations in Markdown export"
  );

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

  const exportBpmn = runCli([
    cliPath,
    "export",
    "bpmn",
    "./examples/craft-business-lead-to-order.orgs",
  ]);
  assert.strictEqual(exportBpmn.status, 0, "Expected export bpmn to succeed");
  assert.ok(
    exportBpmn.stdout.includes("<bpmn:definitions"),
    "Expected BPMN export to include definitions"
  );

  const exportLittleHorse = runCli([
    cliPath,
    "export",
    "littlehorse",
    "./examples/craft-business-lead-to-order.orgs",
  ]);
  assert.strictEqual(exportLittleHorse.status, 0, "Expected export littlehorse to succeed");
  assert.ok(
    exportLittleHorse.stdout.includes("OrgScript -> LittleHorse workflow skeleton"),
    "Expected LittleHorse skeleton header"
  );

  const exportGraph = runCli([
    cliPath,
    "export",
    "graph",
    "./examples/craft-business-lead-to-order.orgs",
  ]);
  assert.strictEqual(exportGraph.status, 0, "Expected export graph to succeed");
  const exportGraphPayload = JSON.parse(exportGraph.stdout);
  assert.strictEqual(exportGraphPayload.type, "graph");
  assert.ok(Array.isArray(exportGraphPayload.nodes));
  assert.ok(Array.isArray(exportGraphPayload.edges));

  const exportContext = runCli([
    cliPath,
    "export",
    "context",
    "./examples/lead-qualification.orgs",
  ]);
  assert.strictEqual(exportContext.status, 0, "Expected export context to succeed");
  const exportContextPayload = JSON.parse(exportContext.stdout);
  assert.strictEqual(exportContextPayload.source.model.version, "0.4");
  assert.strictEqual(exportContextPayload.source.metadata.commentsIncluded, false);
  assert.deepStrictEqual(exportContextPayload.source.metadata.documentHeader.languages, {
    source: "en",
    comments: "en",
    annotations: "en",
    context: "en",
  });
  assert.ok(exportContextPayload.source.metadata.annotations.total > 0);
  assert.strictEqual(exportContextPayload.source.metadata.annotations.keys.owner, 1);
  assert.strictEqual(exportContextPayload.source.metadata.annotations.keys.status, 1);
  assert.ok(
    exportContextPayload.source.metadata.annotations.entries.some(
      (entry) => entry.path === "process:LeadQualification" && entry.key === "owner"
    ),
    "Expected top-level annotation entry in AI context metadata"
  );
  assert.ok(
    exportContextPayload.source.metadata.annotations.entries.some(
      (entry) => entry.path === "process:LeadQualification.body[1]" && entry.key === "note"
    ),
    "Expected statement annotation entry in AI context metadata"
  );
  assert.ok(
    JSON.stringify(exportContextPayload).includes('"status"'),
    "Expected annotations to survive in AI context via canonical model"
  );
  assert.ok(
    !JSON.stringify(exportContextPayload).includes("Shared lead qualification path"),
    "Expected comments to stay out of AI context by default"
  );

  const analyzeCommand = runCli([
    cliPath,
    "analyze",
    "./examples/lead-qualification.orgs",
    "--json",
  ]);
  assert.strictEqual(analyzeCommand.status, 0, "Expected analyze --json to succeed");
  const analyzePayload = JSON.parse(analyzeCommand.stdout);
  assert.strictEqual(analyzePayload.command, "analyze");
  assert.ok(analyzePayload.analysis.summary.totalBlocks > 0);

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

  const exportBpmnUnsupported = runCli([
    cliPath,
    "export",
    "bpmn",
    "./examples/service-escalation.orgs",
  ]);
  assert.strictEqual(
    exportBpmnUnsupported.status,
    1,
    "Expected export bpmn to fail when no supported blocks exist"
  );
  assert.ok(
    exportBpmnUnsupported.stderr.includes("No BPMN-exportable blocks found"),
    "Expected unsupported BPMN export reason"
  );

  const exportLittleHorseUnsupported = runCli([
    cliPath,
    "export",
    "littlehorse",
    "./examples/service-escalation.orgs",
  ]);
  assert.strictEqual(
    exportLittleHorseUnsupported.status,
    1,
    "Expected export littlehorse to fail when no supported blocks exist"
  );
  assert.ok(
    exportLittleHorseUnsupported.stderr.includes("No LittleHorse-exportable blocks found"),
    "Expected unsupported LittleHorse export reason"
  );

  const exportGraphUnsupported = runCli([
    cliPath,
    "export",
    "graph",
    "./examples/service-escalation.orgs",
  ]);
  assert.strictEqual(
    exportGraphUnsupported.status,
    1,
    "Expected export graph to fail when no supported blocks exist"
  );
  assert.ok(
    exportGraphUnsupported.stderr.includes("No graph-exportable blocks found"),
    "Expected unsupported graph export reason"
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
    canonicalCheck.stdout.includes("FORMAT examples/craft-business-lead-to-order.orgs"),
    "Expected format --check heading"
  );
  assert.ok(
    canonicalCheck.stdout.includes("  status: passed"),
    "Expected format --check success status"
  );

  const canonicalCheckJson = runCli([
    cliPath,
    "format",
    "./examples/craft-business-lead-to-order.orgs",
    "--check",
    "--json",
  ]);
  assert.strictEqual(canonicalCheckJson.status, 0, "Expected format --check --json to pass");
  const canonicalCheckJsonPayload = JSON.parse(canonicalCheckJson.stdout);
  assert.strictEqual(canonicalCheckJsonPayload.command, "format");
  assert.strictEqual(canonicalCheckJsonPayload.canonical, true);
  assert.ok(Array.isArray(canonicalCheckJsonPayload.diagnostics));
  assertDiagnosticsShape(canonicalCheckJsonPayload.diagnostics);

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
      nonCanonicalCheck.stderr.includes("format.not-canonical"),
      "Expected format --check failure code"
    );
    assert.strictEqual(
      fs.readFileSync(nonCanonicalPath, "utf8"),
      nonCanonicalSource,
      "Expected format --check to leave the file unchanged"
    );

    const nonCanonicalCheckJson = runCli([
      cliPath,
      "format",
      "./tests/.tmp-format-noncanonical.orgs",
      "--check",
      "--json",
    ]);
    assert.strictEqual(nonCanonicalCheckJson.status, 1, "Expected format --check --json to fail");
    const nonCanonicalCheckJsonPayload = JSON.parse(nonCanonicalCheckJson.stdout);
    assert.strictEqual(nonCanonicalCheckJsonPayload.command, "format");
    assert.strictEqual(nonCanonicalCheckJsonPayload.canonical, false);
    assert.strictEqual(nonCanonicalCheckJsonPayload.diagnostics[0].code, "format.not-canonical");
    assertDiagnosticsShape(nonCanonicalCheckJsonPayload.diagnostics);
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
    invalidCheck.stderr.includes("FORMAT tests/invalid/unknown-top-level.orgs"),
    "Expected invalid format --check heading"
  );
  assert.ok(
    invalidCheck.stderr.includes("  status: failed"),
    "Expected invalid format --check status"
  );
  assert.ok(
    invalidCheck.stderr.includes("  summary: "),
    "Expected invalid format --check summary"
  );

  const invalidCheckJson = runCli([
    cliPath,
    "format",
    "./tests/invalid/unknown-top-level.orgs",
    "--check",
    "--json",
  ]);
  assert.strictEqual(invalidCheckJson.status, 1, "Expected invalid format --check --json to fail");
  const invalidCheckJsonPayload = JSON.parse(invalidCheckJson.stdout);
  assert.strictEqual(invalidCheckJsonPayload.command, "format");
  assert.strictEqual(invalidCheckJsonPayload.canonical, false);
  assert.ok(invalidCheckJsonPayload.diagnostics[0].code.startsWith("syntax."));
  assertDiagnosticsShape(invalidCheckJsonPayload.diagnostics);
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
  assert.ok(checkOk.stdout.includes("validate: passed"), "Expected validate pass in check output");
  assert.ok(checkOk.stdout.includes("lint: passed (0 error(s), 0 warning(s), 0 info)"), "Expected lint pass in check output");
  assert.ok(checkOk.stdout.includes("format: passed"), "Expected format pass in check output");
  assert.ok(checkOk.stdout.includes("Result: PASS"), "Expected passing summary in check output");

  const checkWarning = runCli([cliPath, "check", "./tests/lint/process-missing-trigger.orgs"]);
  assert.strictEqual(checkWarning.status, 0, "Expected warning-only check to stay non-failing");
  assert.ok(
    checkWarning.stdout.includes("lint: passed (0 error(s), 1 warning(s), 0 info)"),
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

function testMarkdownExport() {
  const cliPath = path.join(repoRoot, "bin", "orgscript.js");
  const supportedFixtures = [
    "craft-business-lead-to-order",
    "lead-qualification",
    "order-approval",
    "service-escalation",
  ];

  for (const fixture of supportedFixtures) {
    const exported = runCli([cliPath, "export", "markdown", `./examples/${fixture}.orgs`]);
    assert.strictEqual(exported.status, 0, `Expected Markdown export to succeed for ${fixture}`);
    const expected = fs.readFileSync(path.join(goldenDir, `${fixture}.summary.md`), "utf8");
    assert.strictEqual(exported.stdout, expected, `Unexpected Markdown export for ${fixture}`);
  }
}

function testHtmlExport() {
  const cliPath = path.join(repoRoot, "bin", "orgscript.js");

  const exported = runCli([cliPath, "export", "html", "./examples/lead-qualification.orgs"]);
  assert.strictEqual(exported.status, 0, "Expected HTML export to succeed");
  assert.ok(exported.stdout.includes("<!DOCTYPE html>"), "Expected HTML document output");
  assert.ok(
    !exported.stdout.includes("<strong>Metadata:</strong>"),
    "Expected default HTML export to omit annotations"
  );

  const exportedWithAnnotations = runCli([
    cliPath,
    "export",
    "html",
    "./examples/lead-qualification.orgs",
    "--with-annotations",
  ]);
  assert.strictEqual(exportedWithAnnotations.status, 0, "Expected annotated HTML export to succeed");
  assert.ok(
    exportedWithAnnotations.stdout.includes("<strong>Metadata:</strong>"),
    "Expected annotated HTML export metadata block"
  );
  assert.ok(
    exportedWithAnnotations.stdout.includes("@owner"),
    "Expected annotated HTML export to include annotation keys"
  );
}

function testMarkdownExporterAdditionalBlockKinds() {
  const model = {
    version: "0.4",
    type: "document",
    body: [
      {
        type: "event",
        name: "OrderPaid",
        body: [
          {
            type: "notify",
            target: "finance",
            message: "Payment received",
          },
          {
            type: "create",
            entity: "receipt",
          },
        ],
      },
      {
        type: "metric",
        name: "CloseRate",
        formula: "won_quotes / total_quotes",
        owner: "sales_management",
        target: ">= 0.35",
      },
    ],
  };

  const output = toMarkdownSummary(model);
  assert.ok(output.includes("# Event: OrderPaid"), "Expected event summary heading");
  assert.ok(output.includes("notify `finance` with `\"Payment received\"`"), "Expected event action");
  assert.ok(output.includes("# Metric: CloseRate"), "Expected metric summary heading");
  assert.ok(output.includes("`won_quotes / total_quotes`"), "Expected metric formula");
}

function testSkeletonExporters() {
  const model = {
    version: "0.4",
    type: "document",
    body: [
      {
        type: "process",
        name: "OrderApproval",
        body: [
          {
            type: "when",
            trigger: "order.submitted",
          },
          {
            type: "if",
            condition: {
              type: "comparison",
              left: { type: "field", path: "order.amount" },
              operator: ">",
              right: { type: "number", value: 10000 },
            },
            then: [
              { type: "notify", target: "finance", message: "High value order" },
            ],
            elseIf: [],
            else: null,
          },
          {
            type: "transition",
            target: "order.status",
            value: { type: "string", value: "approved" },
          },
        ],
      },
    ],
  };

  const bpmn = toBpmnXml(model);
  assert.ok(bpmn.includes("<bpmn:process"), "Expected BPMN process");
  assert.ok(bpmn.includes("OrderApproval"), "Expected BPMN process name");
  assert.ok(bpmn.includes("<bpmndi:BPMNDiagram"), "Expected BPMN diagram");

  const littleHorse = toLittleHorseSkeleton(model);
  assert.ok(littleHorse.includes("OrderApprovalWorkflow"), "Expected LittleHorse class name");
  assert.ok(littleHorse.includes("when order.submitted"), "Expected trigger comment");

  const graph = JSON.parse(toGraphJson(model));
  assert.strictEqual(graph.type, "graph");
  assert.ok(graph.nodes.length > 0, "Expected graph nodes");
  assert.ok(graph.edges.length > 0, "Expected graph edges");
}

function testCommentsAndAnnotations() {
  const sourcePath = path.join(examplesDir, "lead-qualification.orgs");
  const result = buildModel(sourcePath);

  assert.ok(result.ok, "Expected annotated example to stay valid");

  const processNode = result.ast.body[0];
  assert.deepStrictEqual(result.ast.metadata.languages, {
    source: "en",
    comments: "en",
    annotations: "en",
    context: "en",
  });
  assert.strictEqual(processNode.annotations.length, 2, "Expected process annotations");
  assert.strictEqual(processNode.leadingComments.length, 1, "Expected process leading comment");
  assert.strictEqual(processNode.body[0].leadingComments.length, 1, "Expected statement leading comment");
  assert.strictEqual(processNode.body[1].annotations.length, 1, "Expected statement annotation");
  assert.strictEqual(processNode.trailingComments.length, 1, "Expected trailing process comment");

  const canonical = toCanonicalModel(result.ast);
  const serialized = JSON.stringify(canonical);
  assert.ok(
    serialized.includes('"annotations"'),
    "Expected canonical model to contain annotations"
  );
  assert.ok(
    serialized.includes('"metadata"'),
    "Expected canonical model to contain document metadata"
  );
  assert.ok(
    !serialized.includes("Shared lead qualification path"),
    "Expected canonical model to exclude comments"
  );

  const context = toAiContext(canonical, []);
  const contextSerialized = JSON.stringify(context);
  assert.ok(contextSerialized.includes('"status"'), "Expected annotations in AI context");
  assert.strictEqual(context.source.metadata.commentsIncluded, false);
  assert.strictEqual(context.source.metadata.documentHeader.languages.comments, "en");
  assert.strictEqual(context.source.metadata.annotations.total, 4);
  assert.strictEqual(context.source.metadata.annotations.keys.owner, 1);
  assert.strictEqual(context.source.metadata.annotations.keys.status, 1);
  assert.ok(
    context.source.metadata.annotations.entries.some(
      (entry) => entry.path === "process:LeadQualification.body[1]" && entry.key === "note"
    ),
    "Expected process statement annotation in AI context metadata"
  );
  assert.ok(
    !contextSerialized.includes("Shared lead qualification path"),
    "Expected comments to stay out of AI context"
  );

  const defaultSummary = toMarkdownSummary(canonical);
  assert.ok(
    !defaultSummary.includes("### Metadata"),
    "Expected default Markdown summary to omit annotations"
  );
  const annotatedSummary = toMarkdownSummary(canonical, { includeAnnotations: true });
  assert.ok(
    annotatedSummary.includes("### Metadata"),
    "Expected annotated Markdown summary to include metadata"
  );
  assert.ok(
    annotatedSummary.includes("### Document Metadata"),
    "Expected annotated Markdown summary to include document metadata"
  );
  assert.ok(
    annotatedSummary.includes('@review="Revisit the budget threshold each quarter."'),
    "Expected annotated Markdown summary to include inline annotations"
  );

  const defaultHtml = toHtmlDocumentation(canonical, "Lead Qualification");
  assert.ok(!defaultHtml.includes("<strong>Metadata:</strong>"), "Expected default HTML to omit annotations");
  const annotatedHtml = toHtmlDocumentation(canonical, "Lead Qualification", {
    includeAnnotations: true,
  });
  assert.ok(
    annotatedHtml.includes("<strong>Metadata:</strong>"),
    "Expected annotated HTML to include metadata"
  );
  assert.ok(
    annotatedHtml.includes("<strong>Document metadata:</strong>"),
    "Expected annotated HTML to include document metadata"
  );

  const analysis = analyzeDocument(canonical);
  assert.strictEqual(analysis.summary.totalBlocks, 1, "Expected analysis block count to stay stable");
  assert.strictEqual(
    analysis.blocks[0].metrics.triggers,
    1,
    "Expected analysis metrics to ignore annotations/comments"
  );
}

function testVsCodeArtifacts() {
  const vscodeDir = path.join(repoRoot, "editors", "vscode");
  const extensionManifest = JSON.parse(
    fs.readFileSync(path.join(vscodeDir, "package.json"), "utf8")
  );
  const languageConfig = JSON.parse(
    fs.readFileSync(path.join(vscodeDir, "language-configuration.json"), "utf8")
  );
  const snippets = JSON.parse(
    fs.readFileSync(path.join(vscodeDir, "snippets", "orgscript.code-snippets"), "utf8")
  );
  const grammar = JSON.parse(
    fs.readFileSync(path.join(vscodeDir, "syntaxes", "orgscript.tmLanguage.json"), "utf8")
  );

  assert.strictEqual(extensionManifest.contributes.languages[0].id, "orgscript");
  assert.ok(
    extensionManifest.contributes.snippets.some(
      (entry) => entry.path === "./snippets/orgscript.code-snippets"
    ),
    "Expected VS Code extension to contribute OrgScript snippets"
  );
  assert.strictEqual(languageConfig.comments.lineComment, "#");
  assert.ok(
    typeof languageConfig.indentationRules.increaseIndentPattern === "string",
    "Expected VS Code language configuration indentation rules"
  );
  assert.ok(snippets["OrgScript Annotation"], "Expected annotation snippet");
  assert.ok(snippets["OrgScript Language Header"], "Expected language header snippet");
  assert.ok(snippets["OrgScript Process Block"], "Expected process snippet");
  assert.strictEqual(grammar.scopeName, "source.orgscript");
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

function assertDiagnosticsShape(diagnostics) {
  for (const diagnostic of diagnostics) {
    assert.ok(typeof diagnostic.severity === "string", "Expected diagnostic severity");
    assert.ok(typeof diagnostic.code === "string", "Expected diagnostic code");
    assert.ok(typeof diagnostic.file === "string", "Expected diagnostic file");
    assert.ok(typeof diagnostic.line === "number", "Expected diagnostic line");
    assert.ok(typeof diagnostic.message === "string", "Expected diagnostic message");
  }
}

function normalizeAst(ast) {
  return {
    ...ast,
    filePath: path.relative(repoRoot, ast.filePath).replace(/\\/g, "/"),
  };
}
