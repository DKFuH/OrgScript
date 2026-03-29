const fs = require("fs");
const path = require("path");
const {
  createCheckReport,
  createCliErrorReport,
  createFormatCheckReport,
  createFormatInvalidReport,
  createLintInvalidReport,
  createLintReport,
  createValidateReport,
  formatDiagnosticLine,
  renderCommandReport,
  toDisplayPath,
} = require("./diagnostics");
const { toCanonicalModel } = require("./export-json");
const { toMarkdownSummary } = require("./export-markdown");
const { toMermaidMarkdown } = require("./export-mermaid");
const { toHtmlDocumentation } = require("./export-html");
const { formatDocument } = require("./formatter");
const { lintDocument, summarizeFindings } = require("./linter");
const { buildModel, validateFile } = require("./validate");

function printUsage() {
  console.log(`OrgScript CLI v${require("../package.json").version}

A human-readable, AI-friendly description language for business logic.

Usage:
  orgscript check <file> [--json]       Run all quality checks (validate, lint, format)
  orgscript validate <file> [--json]    Check syntax and semantic validity
  orgscript lint <file> [--json]        Run static analysis rules
  orgscript format <file> [--check]     Auto-format or check canonical style
  orgscript export <kind> <file>        Export to different formats

Export Kinds:
  json        Canonical JSON model
  markdown    Stakeholder-friendly logic summary
  mermaid     Process and stateflow diagrams (Markdown)
  html        Self-contained documentation page

Global Options:
  --help, -h     Show this help
  --version, -v  Show version number
  --json         Output machine-readable JSON (where supported)
`);
}

function run(args) {
  const options = parseArgs(args);
  const [command, maybeSubcommand, maybeFile] = options.positionals;

  if (!command || command === "--help" || command === "-h") {
    printUsage();
    process.exit(0);
  }

  if (command === "--version" || command === "-v") {
    console.log(require("../package.json").version);
    process.exit(0);
  }

  if (command === "validate") {
    const absolutePath = resolveFile("validate", maybeSubcommand, options.json);
    const result = validateFile(absolutePath);
    const report = createValidateReport(absolutePath, result);

    if (options.json) {
      console.log(JSON.stringify(report, null, 2));
      process.exit(report.ok ? 0 : 1);
    }

    const output = renderCommandReport("VALIDATE", absolutePath, report, {
      includeStats: true,
    });
    const stream = report.ok ? console.log : console.error;
    stream(output.join("\n"));
    process.exit(report.ok ? 0 : 1);
  }

  if (command === "check") {
    const absolutePath = resolveFile("check", maybeSubcommand, options.json);
    const result = runCheck(absolutePath);
    const report = createCheckReport(absolutePath, result);

    if (options.json) {
      console.log(JSON.stringify(report, null, 2));
      process.exit(report.ok ? 0 : 1);
    }

    const lines = renderCheckReport(absolutePath, result, report);
    const stream = report.ok ? console.log : console.error;
    stream(lines.join("\n"));
    process.exit(report.ok ? 0 : 1);
  }

  if (command === "export" && maybeSubcommand === "json") {
    const absolutePath = resolveFile("export", maybeFile);
    const result = buildModel(absolutePath);

    if (!result.ok) {
      printDiagnostics(
        `EXPORT ${toDisplayPath(absolutePath)}`,
        createValidateReport(absolutePath, result).diagnostics
      );
      process.exit(1);
    }

    console.log(JSON.stringify(toCanonicalModel(result.ast), null, 2));
    process.exit(0);
  }

  if (command === "export" && maybeSubcommand === "markdown") {
    const absolutePath = resolveFile("export", maybeFile);
    const result = buildModel(absolutePath);

    if (!result.ok) {
      printDiagnostics(
        `EXPORT ${toDisplayPath(absolutePath)}`,
        createValidateReport(absolutePath, result).diagnostics
      );
      process.exit(1);
    }

    try {
      process.stdout.write(toMarkdownSummary(toCanonicalModel(result.ast)));
      process.exit(0);
    } catch (error) {
      console.error(`Cannot export Markdown from ${absolutePath}: ${error.message}`);
      process.exit(1);
    }
  }

  if (command === "export" && maybeSubcommand === "mermaid") {
    const absolutePath = resolveFile("export", maybeFile);
    const result = buildModel(absolutePath);

    if (!result.ok) {
      printDiagnostics(
        `EXPORT ${toDisplayPath(absolutePath)}`,
        createValidateReport(absolutePath, result).diagnostics
      );
      process.exit(1);
    }

    try {
      process.stdout.write(toMermaidMarkdown(toCanonicalModel(result.ast)));
      process.exit(0);
    } catch (error) {
      console.error(`Cannot export Mermaid from ${absolutePath}: ${error.message}`);
      process.exit(1);
    }
  }

  if (command === "export" && maybeSubcommand === "html") {
    const absolutePath = resolveFile("export", maybeFile);
    const result = buildModel(absolutePath);

    if (!result.ok) {
      printDiagnostics(
        `EXPORT ${toDisplayPath(absolutePath)}`,
        createValidateReport(absolutePath, result).diagnostics
      );
      process.exit(1);
    }

    try {
      const title = `OrgScript Documentation: ${path.basename(absolutePath)}`;
      process.stdout.write(toHtmlDocumentation(toCanonicalModel(result.ast), title));
      process.exit(0);
    } catch (error) {
      console.error(`Cannot export HTML from ${absolutePath}: ${error.message}`);
      process.exit(1);
    }
  }

  if (command === "format") {
    const absolutePath = resolveFile("format", maybeSubcommand, options.json);

    if (options.json && !options.check) {
      exitCliError(
        "format",
        "cli.format-json-requires-check",
        "`format --json` is only supported together with `--check`.",
        true,
        absolutePath
      );
    }

    const result = buildModel(absolutePath);

    if (!result.ok) {
      const report =
        options.check && options.json
          ? createFormatInvalidReport(absolutePath, result)
          : createValidateReport(absolutePath, result);

      if (options.check && options.json) {
        console.log(JSON.stringify(report, null, 2));
      } else {
        const output = renderCommandReport("FORMAT", absolutePath, report, {
          includeStats: true,
        });
        console.error(output.join("\n"));
      }
      process.exit(1);
    }

    const formatted = formatDocument(result.ast);
    const current = fs.readFileSync(absolutePath, "utf8");
    const formatReport = createFormatCheckReport(absolutePath, {
      diagnostics:
        current !== formatted
          ? [
              {
                code: "format.not-canonical",
                severity: "error",
                line: 1,
                message: "Canonical formatting changes required.",
              },
            ]
          : [],
    });

    if (options.check && options.json) {
      console.log(JSON.stringify(formatReport, null, 2));
      process.exit(formatReport.ok ? 0 : 1);
    }

    if (current === formatted) {
      if (options.check) {
        console.log(renderCommandReport("FORMAT", absolutePath, formatReport).join("\n"));
      } else {
        console.log(`Already formatted: ${absolutePath}`);
      }
      process.exit(0);
    }

    if (options.check) {
      console.error(renderCommandReport("FORMAT", absolutePath, formatReport).join("\n"));
      process.exit(1);
    }

    fs.writeFileSync(absolutePath, formatted, "utf8");
    console.log(`Formatted OrgScript: ${absolutePath}`);
    process.exit(0);
  }

  if (command === "lint") {
    const absolutePath = resolveFile("lint", maybeSubcommand, options.json);
    const result = buildModel(absolutePath);

    if (!result.ok) {
      const report = createLintInvalidReport(absolutePath, result);

      if (options.json) {
        console.log(JSON.stringify(report, null, 2));
      } else {
        const output = renderCommandReport("LINT", absolutePath, report, {
          includeStats: true,
        }).join("\n");
        console.error(output);
      }
      process.exit(1);
    }

    const findings = lintDocument(result.ast);
    const summary = summarizeFindings(findings);
    const report = createLintReport(absolutePath, findings);

    if (options.json) {
      console.log(JSON.stringify(report, null, 2));
      process.exit(summary.error > 0 ? 1 : 0);
    }

    const reportLines = renderCommandReport("LINT", absolutePath, report).join("\n");
    if (summary.error > 0) {
      console.error(reportLines);
      process.exit(1);
    }

    console.log(reportLines);
    process.exit(0);
  }

  exitCliError(command, "cli.unknown-command", `Unknown command: ${command}`, options.json);
}

function parseArgs(args) {
  const options = {
    check: false,
    json: false,
    positionals: [],
  };

  for (const argument of args) {
    if (argument === "--check") {
      options.check = true;
      continue;
    }

    if (argument === "--json") {
      options.json = true;
      continue;
    }

    options.positionals.push(argument);
  }

  return options;
}

function resolveFile(command, filePath, jsonMode = false) {
  if (!filePath) {
    exitCliError(command, "cli.missing-file-path", "Missing file path.", jsonMode);
  }

  const absolutePath = path.resolve(process.cwd(), filePath);

  if (!fs.existsSync(absolutePath)) {
    exitCliError(
      command,
      "cli.file-not-found",
      `File not found: ${absolutePath}`,
      jsonMode,
      absolutePath
    );
  }

  return absolutePath;
}

function exitCliError(command, code, message, jsonMode, filePath) {
  if (jsonMode) {
    console.log(JSON.stringify(createCliErrorReport(command, code, message, filePath), null, 2));
    process.exit(1);
  }

  console.error(`${message}\n`);
  printUsage();
  process.exit(1);
}

function printDiagnostics(header, issues) {
  console.error(header);

  for (const issue of issues) {
    console.error(formatDiagnosticLine(issue));
  }
}

function runCheck(filePath) {
  const validation = validateFile(filePath);

  if (!validation.ok) {
    return {
      ok: false,
      validate: {
        ok: false,
        syntaxIssues: validation.syntaxIssues,
        semanticIssues: validation.semanticIssues,
        issues: validation.issues,
        summary: validation.summary,
      },
      lint: {
        ok: false,
        skipped: true,
        findings: [],
        summary: { error: 0, warning: 0, info: 0 },
      },
      format: {
        ok: false,
        skipped: true,
        requiresChanges: false,
      },
    };
  }

  const findings = lintDocument(validation.ast);
  const lintSummary = summarizeFindings(findings);
  const current = fs.readFileSync(filePath, "utf8");
  const formatted = formatDocument(validation.ast);
  const requiresChanges = current !== formatted;
  const lintOk = lintSummary.error === 0;
  const formatOk = !requiresChanges;

  return {
    ok: lintOk && formatOk,
    validate: {
      ok: true,
      syntaxIssues: [],
      semanticIssues: [],
      issues: [],
      summary: validation.summary,
    },
    lint: {
      ok: lintOk,
      skipped: false,
      findings,
      summary: lintSummary,
    },
    format: {
      ok: formatOk,
      skipped: false,
      requiresChanges,
    },
  };
}

function renderCheckReport(filePath, result, report = createCheckReport(filePath, result)) {
  const lines = [`CHECK ${toDisplayPath(filePath)}`];

  lines.push(`  validate: ${result.validate.ok ? "passed" : "failed"}`);

  if (result.lint.skipped) {
    lines.push("  lint: skipped");
  } else {
    const { error, warning, info } = result.lint.summary;
    lines.push(
      `  lint: ${result.lint.ok ? "passed" : "failed"} (${error} error(s), ${warning} warning(s), ${info} info)`
    );
  }

  if (result.format.skipped) {
    lines.push("  format: skipped");
  } else if (result.format.ok) {
    lines.push("  format: passed");
  } else {
    lines.push("  format: failed (canonical formatting changes required)");
  }

  lines.push(
    `  summary: ${report.summary.error} error(s), ${report.summary.warning} warning(s), ${report.summary.info} info`
  );
  for (const diagnostic of report.diagnostics) {
    lines.push(formatDiagnosticLine(diagnostic));
  }
  lines.push(`Result: ${result.ok ? "PASS" : "FAIL"}`);
  return lines;
}

module.exports = { run };
