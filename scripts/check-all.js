#!/usr/bin/env node

const { readdirSync } = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const repoRoot = path.resolve(__dirname, "..");
const examplesDir = path.join(repoRoot, "examples");
const cliPath = path.join(repoRoot, "bin", "orgscript.js");

const files = readdirSync(examplesDir)
  .filter((file) => file.endsWith(".orgs"))
  .sort();

let hasFailure = false;

for (const file of files) {
  const relativePath = `./examples/${file}`;
  const result = spawnSync(process.execPath, [cliPath, "check", relativePath], {
    cwd: repoRoot,
    encoding: "utf8",
  });

  if (result.stdout) {
    process.stdout.write(result.stdout);
    if (!result.stdout.endsWith("\n")) {
      process.stdout.write("\n");
    }
  }

  if (result.stderr) {
    process.stderr.write(result.stderr);
    if (!result.stderr.endsWith("\n")) {
      process.stderr.write("\n");
    }
  }

  if (result.status !== 0) {
    hasFailure = true;
  }
}

process.exit(hasFailure ? 1 : 0);
