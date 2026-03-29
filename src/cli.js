const fs = require("fs");
const path = require("path");
const { toCanonicalModel } = require("./export-json");
const { buildModel, validateFile } = require("./validate");

function printUsage() {
  console.log(`OrgScript CLI

Usage:
  orgscript validate <file>
  orgscript export json <file>

Planned:
  orgscript format <file>
  orgscript lint <file>`);
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

  if (command === "format" || command === "lint") {
    console.error(`\`${command}\` is planned but not implemented yet.`);
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
