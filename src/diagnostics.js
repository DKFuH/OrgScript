const path = require("path");

const DEFAULT_COUNTS = {
  error: 0,
  warning: 0,
  info: 0,
};

function createValidateReport(filePath, result) {
  const diagnostics = [
    ...mapIssues(result.syntaxIssues || [], "syntax"),
    ...mapIssues(result.semanticIssues || [], "semantic"),
  ];
  const summary = createSummary(diagnostics, result.summary);

  return {
    command: "validate",
    file: toDisplayPath(filePath),
    ok: diagnostics.length === 0,
    valid: diagnostics.length === 0,
    summary,
    diagnostics,
  };
}

function createLintReport(filePath, findings) {
  const diagnostics = findings.map((finding) => ({
    source: "lint",
    code: finding.code,
    severity: finding.severity,
    line: finding.line || 1,
    message: finding.message,
  }));
  const summary = createSummary(diagnostics);

  return {
    command: "lint",
    file: toDisplayPath(filePath),
    ok: summary.error === 0,
    clean: summary.error === 0,
    summary,
    diagnostics,
  };
}

function createCheckReport(filePath, result) {
  const validateDiagnostics = [
    ...mapIssues(result.validate.syntaxIssues || [], "syntax"),
    ...mapIssues(result.validate.semanticIssues || [], "semantic"),
  ];
  const lintDiagnostics = (result.lint.findings || []).map((finding) => ({
    source: "lint",
    code: finding.code,
    severity: finding.severity,
    line: finding.line || 1,
    message: finding.message,
  }));
  const formatDiagnostics = result.format.requiresChanges
    ? [
        {
          source: "format",
          code: "format_check_failed",
          severity: "error",
          line: 1,
          message: "Canonical formatting changes required.",
        },
      ]
    : [];

  return {
    command: "check",
    file: toDisplayPath(filePath),
    ok: result.ok,
    summary: createSummary([
      ...validateDiagnostics,
      ...lintDiagnostics,
      ...formatDiagnostics,
    ]),
    validate: {
      ok: result.validate.ok,
      valid: result.validate.ok,
      skipped: false,
      summary: createSummary(validateDiagnostics, result.validate.summary || {}),
      diagnostics: validateDiagnostics,
    },
    lint: {
      ok: result.lint.ok,
      clean: result.lint.ok,
      skipped: result.lint.skipped,
      summary: createSummary(lintDiagnostics),
      diagnostics: lintDiagnostics,
    },
    format: {
      ok: result.format.ok,
      canonical: result.format.ok,
      skipped: result.format.skipped,
      summary: createSummary(formatDiagnostics),
      diagnostics: formatDiagnostics,
    },
  };
}

function createCliErrorReport(command, code, message, filePath) {
  const diagnostics = [
    {
      source: "cli",
      code,
      severity: "error",
      line: 1,
      message,
    },
  ];

  return {
    command,
    file: filePath ? toDisplayPath(filePath) : null,
    ok: false,
    summary: createSummary(diagnostics),
    diagnostics,
  };
}

function mapIssues(issues, source) {
  return issues.map((issue) => ({
    source,
    code: issue.code || `${source}_error`,
    severity: "error",
    line: issue.line || 1,
    message: issue.message,
  }));
}

function createSummary(diagnostics, extras = {}) {
  const counts = diagnostics.reduce(
    (summary, diagnostic) => {
      summary[diagnostic.severity] += 1;
      return summary;
    },
    { ...DEFAULT_COUNTS }
  );

  return {
    ...extras,
    diagnostics: diagnostics.length,
    error: counts.error,
    warning: counts.warning,
    info: counts.info,
  };
}

function toDisplayPath(filePath) {
  if (!filePath) {
    return null;
  }

  const relative = path.relative(process.cwd(), filePath).replace(/\\/g, "/");
  return relative || path.basename(filePath);
}

module.exports = {
  createCheckReport,
  createCliErrorReport,
  createLintReport,
  createValidateReport,
};
