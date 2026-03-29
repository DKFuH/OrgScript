const fs = require("fs");
const path = require("path");
const { toCanonicalModel } = require("./export-json");
const { formatDocument } = require("./formatter");
const { lintDocument } = require("./linter");
const { buildModel, validateFile } = require("./validate");

function printUsage() {
  console.log(`OrgScript CLI

Usage:
  orgscript validate <file>
  orgscript format <file>
  orgscript lint <file>
  orgscript export json <file>
`);
}

function run(args) {
  const [command, maybeSubcommand, maybeFile] = args;

  if (!command || command === "--help" || command === "-h") {
    printUsage();
    process.exit(0);
  }

  if (command === "validate") {
    const absolutePath = resolveFile(maybeSubcommand);
    const result = validateFile(absolutePath);

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

  if (command === "export" && maybeSubcommand === "json") {
    const absolutePath = resolveFile(maybeFile);
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

  if (command === "format") {
    const absolutePath = resolveFile(maybeSubcommand);
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
      console.log(`Already formatted: ${absolutePath}`);
      process.exit(0);
    }

    fs.writeFileSync(absolutePath, formatted, "utf8");
    console.log(`Formatted OrgScript: ${absolutePath}`);
    process.exit(0);
  }

  if (command === "lint") {
    const absolutePath = resolveFile(maybeSubcommand);
    const result = buildModel(absolutePath);

    if (!result.ok) {
      printIssues(`Cannot lint invalid OrgScript: ${absolutePath}`, [
        ...result.syntaxIssues,
        ...result.semanticIssues,
      ]);
      process.exit(1);
    }

    const findings = lintDocument(result.ast);

    if (findings.length === 0) {
      console.log(`No lint findings: ${absolutePath}`);
      process.exit(0);
    }

    console.error(`Lint findings: ${absolutePath}`);
    for (const finding of findings) {
      console.error(
        `  line ${finding.line}: [${finding.severity}] (${finding.code}) ${finding.message}`
      );
    }
    process.exit(1);
  }

  console.error(`Unknown command: ${command}`);
  printUsage();
  process.exit(1);
}

function resolveFile(filePath) {
  if (!filePath) {
    console.error("Missing file path.\n");
    printUsage();
    process.exit(1);
  }

  const absolutePath = path.resolve(process.cwd(), filePath);

  if (!fs.existsSync(absolutePath)) {
    console.error(`File not found: ${absolutePath}`);
    process.exit(1);
  }

  return absolutePath;
}

function printIssues(header, issues) {
  console.error(header);

  for (const issue of issues) {
    console.error(`  line ${issue.line}: ${issue.message}`);
  }
}

module.exports = { run };
