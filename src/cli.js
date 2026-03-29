const fs = require("fs");
const path = require("path");
const {
  createCheckReport,
  createCliErrorReport,
  createLintReport: createLintJsonReport,
  createValidateReport,
} = require("./diagnostics");
const { toCanonicalModel } = require("./export-json");
const { toMermaidMarkdown } = require("./export-mermaid");
const { formatDocument } = require("./formatter");
const { lintDocument, renderLintReport, summarizeFindings } = require("./linter");
const { buildModel, validateFile } = require("./validate");

function printUsage() {
  console.log(`OrgScript CLI

Usage:
  orgscript validate <file> [--json]
  orgscript check <file> [--json]
  orgscript format <file> [--check]
  orgscript lint <file> [--json]
  orgscript export json <file>
  orgscript export mermaid <file>
`);
}

function run(args) {
  const options = parseArgs(args);
  const [command, maybeSubcommand, maybeFile] = options.positionals;

  if (!command || command === "--help" || command === "-h") {
    printUsage();
    process.exit(0);
  }

  if (command === "validate") {
    const absolutePath = resolveFile("validate", maybeSubcommand, options.json);
    const result = validateFile(absolutePath);

    if (options.json) {
      console.log(JSON.stringify(createValidateReport(absolutePath, result), null, 2));
      process.exit(result.ok ? 0 : 1);
    }

    if (!result.ok) {
      printIssues(`Invalid OrgScript: ${absolutePath}`, result.issues);
      process.exit(1);
    }

    console.log(`Valid OrgScript: ${absolutePath}`);
    console.log(
      `  top-level blocks: ${result.summary.topLevelBlocks}, statements: ${result.summary.statements}`
    );
    process.exit(0);
  }

  if (command === "check") {
    const absolutePath = resolveFile("check", maybeSubcommand, options.json);
    const result = runCheck(absolutePath);

    if (options.json) {
      console.log(JSON.stringify(createCheckReport(absolutePath, result), null, 2));
      process.exit(result.ok ? 0 : 1);
    }

    const lines = renderCheckReport(absolutePath, result);
    const stream = result.ok ? console.log : console.error;
    stream(lines.join("\n"));
    process.exit(result.ok ? 0 : 1);
  }

  if (command === "export" && maybeSubcommand === "json") {
    const absolutePath = resolveFile("export", maybeFile);
    const result = buildModel(absolutePath);

    if (!result.ok) {
      printIssues(`Cannot export invalid OrgScript: ${absolutePath}`, [
        ...result.syntaxIssues,
        ...result.semanticIssues,
      ]);
      process.exit(1);
    }

    const canonical = toCanonicalModel(result.ast);
    console.log(JSON.stringify(canonical, null, 2));
    process.exit(0);
  }

  if (command === "export" && maybeSubcommand === "mermaid") {
    const absolutePath = resolveFile("export", maybeFile);
    const result = buildModel(absolutePath);

    if (!result.ok) {
      printIssues(`Cannot export invalid OrgScript: ${absolutePath}`, [
        ...result.syntaxIssues,
        ...result.semanticIssues,
      ]);
      process.exit(1);
    }

    try {
      const canonical = toCanonicalModel(result.ast);
      const mermaid = toMermaidMarkdown(canonical);
      process.stdout.write(mermaid);
      process.exit(0);
    } catch (error) {
      console.error(`Cannot export Mermaid from ${absolutePath}: ${error.message}`);
      process.exit(1);
    }
  }

  if (command === "format") {
    const absolutePath = resolveFile("format", maybeSubcommand);
    const result = buildModel(absolutePath);

    if (!result.ok) {
      printIssues(`Cannot format invalid OrgScript: ${absolutePath}`, [
        ...result.syntaxIssues,
        ...result.semanticIssues,
      ]);
      process.exit(1);
    }

    const formatted = formatDocument(result.ast);
    const current = fs.readFileSync(absolutePath, "utf8");

    if (current === formatted) {
      console.log(
        options.check
          ? `Formatting check passed: ${absolutePath}`
          : `Already formatted: ${absolutePath}`
      );
      process.exit(0);
    }

    if (options.check) {
      console.error(`Formatting changes required: ${absolutePath}`);
      process.exit(1);
    }

    fs.writeFileSync(absolutePath, formatted, "utf8");
    console.log(`Formatted OrgScript: ${absolutePath}`);
    process.exit(0);
  }

  if (command === "lint") {
    const absolutePath = resolveFile("lint", maybeSubcommand, options.json);
    const result = buildModel(absolutePath);

    if (options.json && !result.ok) {
      console.log(JSON.stringify(createValidateReport(absolutePath, result), null, 2));
      process.exit(1);
    }

    if (!result.ok) {
      printIssues(`Cannot lint invalid OrgScript: ${absolutePath}`, [
        ...result.syntaxIssues,
        ...result.semanticIssues,
      ]);
      process.exit(1);
    }

    const findings = lintDocument(result.ast);
    const summary = summarizeFindings(findings);

    if (options.json) {
      console.log(JSON.stringify(createLintJsonReport(absolutePath, findings), null, 2));
      process.exit(summary.error > 0 ? 1 : 0);
    }

    if (findings.length === 0) {
      console.log(renderLintReport(absolutePath, findings).join("\n"));
      process.exit(0);
    }

    const report = renderLintReport(absolutePath, findings).join("\n");
    if (summary.error > 0) {
      console.error(report);
      process.exit(1);
    }

    console.log(report);
    process.exit(0);
  }

  console.error(`Unknown command: ${command}`);
  printUsage();
  process.exit(1);
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
    exitCliError(command, "missing_file_path", "Missing file path.", jsonMode);
  }

  const absolutePath = path.resolve(process.cwd(), filePath);

  if (!fs.existsSync(absolutePath)) {
    exitCliError(command, "file_not_found", `File not found: ${absolutePath}`, jsonMode, absolutePath);
  }

  return absolutePath;
}

function exitCliError(command, code, message, jsonMode, filePath) {
  if (jsonMode && (command === "validate" || command === "lint")) {
    console.log(JSON.stringify(createCliErrorReport(command, code, message, filePath), null, 2));
    process.exit(1);
  }

  console.error(`${message}\n`);
  printUsage();
  process.exit(1);
}

function printIssues(header, issues) {
  console.error(header);

  for (const issue of issues) {
    const severity = (issue.severity || "error").toUpperCase();
    const code = issue.code ? ` ${issue.code}` : "";
    console.error(`  ${severity}${code} line ${issue.line}: ${issue.message}`);
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

function renderCheckReport(filePath, result) {
  const lines = [`CHECK ${toDisplayPath(filePath)}`];

  if (result.validate.ok) {
    lines.push("  validate: ok");
  } else {
    lines.push("  validate: failed");
    for (const issue of result.validate.issues) {
      const code = issue.code ? ` ${issue.code}` : "";
      lines.push(`    ERROR${code} line ${issue.line}: ${issue.message}`);
    }
  }

  if (result.lint.skipped) {
    lines.push("  lint: skipped");
  } else {
    const { error, warning, info } = result.lint.summary;
    const status = result.lint.ok ? "ok" : "failed";
    lines.push(`  lint: ${status} (${error} error(s), ${warning} warning(s), ${info} info)`);
  }

  if (result.format.skipped) {
    lines.push("  format: skipped");
  } else if (result.format.ok) {
    lines.push("  format: ok");
  } else {
    lines.push("  format: failed (canonical formatting changes required)");
  }

  lines.push(`Result: ${result.ok ? "PASS" : "FAIL"}`);
  return lines;
}

function toDisplayPath(filePath) {
  const relative = path.relative(process.cwd(), filePath).replace(/\\/g, "/");
  return relative || path.basename(filePath);
}

module.exports = { run };
