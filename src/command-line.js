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
const { toBpmnXml } = require("./export-bpmn");
const { toLittleHorseSkeleton } = require("./export-littlehorse");
const { toGraphJson } = require("./export-graph");
const { formatDocument } = require("./formatter");
const { lintDocument, summarizeFindings } = require("./linter");
const { buildModel, validateFile } = require("./validate");
const { analyzeDocument, renderTextAnalysis } = require("./analyze");
const { toAiContext } = require("./export-context");

function printRootUsage() {
  console.log(`OrgScript CLI v${require("../package.json").version}

A human-readable, AI-friendly description language for business logic.

Usage:
  orgscript <command> [options] [file]

Commands:
  check           Run validate + lint + format-check
  validate        Check syntax and semantic validity
  lint            Run static analysis rules
  format          Auto-format or check canonical style
  analyze         Run deterministic structural analysis
  export          Export derived artifacts
  help            Show help for a command or topic

Global Options:
  -h, --help      Show help
  -v, --version   Show version number

Examples:
  orgscript check ./examples/craft-business-lead-to-order.orgs
  orgscript export markdown ./examples/order-approval.orgs
  orgscript export html ./examples/order-approval.orgs --with-annotations

Docs:
  README.md
  docs/OrgScript-Manual-EN.md
  docs/OrgScript-Handbuch-DE.md
  spec/language-spec.md
`);
}

function printValidateUsage() {
  console.log(`orgscript validate

Usage:
  orgscript validate <file> [--json]

Options:
  --json          Output machine-readable JSON diagnostics
  -h, --help      Show this help

Docs:
  README.md
  spec/language-spec.md
`);
}

function printLintUsage() {
  console.log(`orgscript lint

Usage:
  orgscript lint <file> [--json]

Options:
  --json          Output machine-readable JSON diagnostics
  -h, --help      Show this help

Docs:
  README.md
  docs/OrgScript-Manual-EN.md
  docs/OrgScript-Handbuch-DE.md
`);
}

function printCheckUsage() {
  console.log(`orgscript check

Usage:
  orgscript check <file> [--json]

Options:
  --json          Output machine-readable JSON diagnostics
  -h, --help      Show this help

Docs:
  README.md
  docs/OrgScript-Manual-EN.md
  docs/OrgScript-Handbuch-DE.md
`);
}

function printFormatUsage() {
  console.log(`orgscript format

Usage:
  orgscript format <file> [--check] [--json]

Options:
  --check         Check whether the file is canonically formatted
  --json          Output machine-readable JSON diagnostics (only with --check)
  -h, --help      Show this help

Docs:
  README.md
  docs/OrgScript-Manual-EN.md
  docs/OrgScript-Handbuch-DE.md
`);
}

function printAnalyzeUsage() {
  console.log(`orgscript analyze

Usage:
  orgscript analyze <file> [--json]

Options:
  --json          Output machine-readable JSON analysis
  -h, --help      Show this help

Docs:
  README.md
  docs/OrgScript-Manual-EN.md
  docs/OrgScript-Handbuch-DE.md
`);
}

function printExportUsage() {
  console.log(`orgscript export

Usage:
  orgscript export <target> <file> [options]

Targets:
  json            Canonical JSON model
  context         AI/tooling context bundle
  markdown        Stakeholder-friendly logic summary
  mermaid         Process and stateflow diagrams (Markdown)
  html            Self-contained documentation page
  bpmn            BPMN XML skeleton
  littlehorse     LittleHorse workflow skeleton (pseudo-code)
  graph           Compact nodes + edges graph JSON

Options:
  --with-annotations  Include annotations and document metadata in supported Markdown and HTML exports
  -h, --help          Show this help

Docs:
  README.md
  docs/OrgScript-Manual-EN.md
  docs/OrgScript-Handbuch-DE.md
`);
}

function printExportTargetUsage(target) {
  const docs = `Docs:\n  README.md\n  docs/OrgScript-Manual-EN.md\n  docs/OrgScript-Handbuch-DE.md\n`;
  if (target === "json") {
    console.log(`orgscript export json

Usage:
  orgscript export json <file>

${docs}`);
    return;
  }

  if (target === "context") {
    console.log(`orgscript export context

Usage:
  orgscript export context <file>

${docs}`);
    return;
  }

  if (target === "markdown") {
    console.log(`orgscript export markdown

Usage:
  orgscript export markdown <file> [--with-annotations]

Options:
  --with-annotations  Include annotations and document metadata
  -h, --help          Show this help

${docs}`);
    return;
  }

  if (target === "mermaid") {
    console.log(`orgscript export mermaid

Usage:
  orgscript export mermaid <file>

${docs}`);
    return;
  }

  if (target === "html") {
    console.log(`orgscript export html

Usage:
  orgscript export html <file> [--with-annotations]

Options:
  --with-annotations  Include annotations and document metadata
  -h, --help          Show this help

${docs}`);
    return;
  }

  if (target === "bpmn") {
    console.log(`orgscript export bpmn

Usage:
  orgscript export bpmn <file>

${docs}`);
    return;
  }

  if (target === "littlehorse") {
    console.log(`orgscript export littlehorse

Usage:
  orgscript export littlehorse <file>

${docs}`);
    return;
  }

  if (target === "graph") {
    console.log(`orgscript export graph

Usage:
  orgscript export graph <file>

${docs}`);
    return;
  }

  printExportUsage();
}

function run(args) {
  const options = parseArgs(args);
  const [command, maybeSubcommand, maybeFile] = options.positionals;

  if (options.version) {
    console.log(require("../package.json").version);
    process.exit(0);
  }

  if (!command) {
    printRootUsage();
    process.exit(0);
  }

  if (command === "help") {
    if (!maybeSubcommand) {
      printRootUsage();
      process.exit(0);
    }

    if (maybeSubcommand === "export") {
      if (maybeFile) {
        printExportTargetUsage(maybeFile);
      } else {
        printExportUsage();
      }
      process.exit(0);
    }

    if (maybeSubcommand === "validate") {
      printValidateUsage();
      process.exit(0);
    }

    if (maybeSubcommand === "lint") {
      printLintUsage();
      process.exit(0);
    }

    if (maybeSubcommand === "check") {
      printCheckUsage();
      process.exit(0);
    }

    if (maybeSubcommand === "format") {
      printFormatUsage();
      process.exit(0);
    }

    if (maybeSubcommand === "analyze") {
      printAnalyzeUsage();
      process.exit(0);
    }

    printRootUsage();
    process.exit(0);
  }

  if (options.help) {
    if (command === "export") {
      if (maybeSubcommand) {
        printExportTargetUsage(maybeSubcommand);
      } else {
        printExportUsage();
      }
      process.exit(0);
    }

    if (command === "validate") {
      printValidateUsage();
      process.exit(0);
    }

    if (command === "lint") {
      printLintUsage();
      process.exit(0);
    }

    if (command === "check") {
      printCheckUsage();
      process.exit(0);
    }

    if (command === "format") {
      printFormatUsage();
      process.exit(0);
    }

    if (command === "analyze") {
      printAnalyzeUsage();
      process.exit(0);
    }

    printRootUsage();
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
      process.stdout.write(
        toMarkdownSummary(toCanonicalModel(result.ast), {
          includeAnnotations: options.withAnnotations,
        })
      );
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

  if (command === "export" && maybeSubcommand === "bpmn") {
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
      process.stdout.write(toBpmnXml(toCanonicalModel(result.ast)));
      process.exit(0);
    } catch (error) {
      console.error(`Cannot export BPMN from ${absolutePath}: ${error.message}`);
      process.exit(1);
    }
  }

  if (command === "export" && maybeSubcommand === "littlehorse") {
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
      process.stdout.write(toLittleHorseSkeleton(toCanonicalModel(result.ast)));
      process.exit(0);
    } catch (error) {
      console.error(`Cannot export LittleHorse from ${absolutePath}: ${error.message}`);
      process.exit(1);
    }
  }

  if (command === "export" && maybeSubcommand === "graph") {
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
      console.log(JSON.stringify(toGraphJson(toCanonicalModel(result.ast)), null, 2));
      process.exit(0);
    } catch (error) {
      console.error(`Cannot export graph from ${absolutePath}: ${error.message}`);
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
      process.stdout.write(
        toHtmlDocumentation(toCanonicalModel(result.ast), title, {
          includeAnnotations: options.withAnnotations,
        })
      );
      process.exit(0);
    } catch (error) {
      console.error(`Cannot export HTML from ${absolutePath}: ${error.message}`);
      process.exit(1);
    }
  }

  if (command === "export" && maybeSubcommand === "context") {
    const absolutePath = resolveFile("export", maybeFile);
    const result = buildModel(absolutePath);

    // AI context includes findings/diagnostics
    const findings = result.ok ? lintDocument(result.ast) : [];
    const validateReport = createValidateReport(absolutePath, result);
    
    // We package context even if not perfectly valid, so AI can help fix.
    // However, if we can't parse, we can only report diagnostics.
    if (!result.ok) {
        console.log(
          JSON.stringify(toAiContext({ version: "0.4", type: "document", body: [] }, validateReport.diagnostics), null, 2)
        );
        process.exit(1);
    }

    const model = toCanonicalModel(result.ast);
    const context = toAiContext(model, validateReport.diagnostics.concat(findings));
    console.log(JSON.stringify(context, null, 2));
    process.exit(0);
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

  if (command === "analyze") {
    const absolutePath = resolveFile("analyze", maybeSubcommand, options.json);
    const result = buildModel(absolutePath);

    if (!result.ok) {
      printDiagnostics(
        `ANALYZE ${toDisplayPath(absolutePath)}`,
        createValidateReport(absolutePath, result).diagnostics
      );
      process.exit(1);
    }

    const model = toCanonicalModel(result.ast);
    const analysis = analyzeDocument(model);

    if (options.json) {
      console.log(JSON.stringify({
        command: "analyze",
        file: toDisplayPath(absolutePath),
        analysis
      }, null, 2));
      process.exit(0);
    }

    console.log(renderTextAnalysis(analysis, toDisplayPath(absolutePath)));
    process.exit(0);
  }

  exitCliError(command, "cli.unknown-command", `Unknown command: ${command}`, options.json);
}

function parseArgs(args) {
  const options = {
    check: false,
    json: false,
    withAnnotations: false,
    help: false,
    version: false,
    positionals: [],
  };

  for (const argument of args) {
    if (argument === "--help" || argument === "-h") {
      options.help = true;
      continue;
    }

    if (argument === "--version" || argument === "-v") {
      options.version = true;
      continue;
    }

    if (argument === "--check") {
      options.check = true;
      continue;
    }

    if (argument === "--json") {
      options.json = true;
      continue;
    }

    if (argument === "--with-annotations") {
      options.withAnnotations = true;
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

  console.error(`${message}\nRun "orgscript --help" for usage.\n`);
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
