const path = require("path");

const DEFAULT_COUNTS = {
  error: 0,
  warning: 0,
  info: 0,
};

const SEVERITY_RANK = {
  error: 0,
  warning: 1,
  info: 2,
};

function createValidateReport(filePath, result) {
  const diagnostics = sortDiagnostics([
    ...mapIssues(filePath, result.syntaxIssues || [], "syntax"),
    ...mapIssues(filePath, result.semanticIssues || [], "semantic"),
  ]);
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
  const diagnostics = sortDiagnostics(
    findings.map((finding) =>
      createDiagnostic("lint", filePath, {
        code: finding.code,
        severity: finding.severity,
        line: finding.line || 1,
        message: finding.message,
      })
    )
  );
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

function createLintInvalidReport(filePath, result) {
  const diagnostics = sortDiagnostics([
    ...mapIssues(filePath, result.syntaxIssues || [], "syntax"),
    ...mapIssues(filePath, result.semanticIssues || [], "semantic"),
  ]);
  const summary = createSummary(diagnostics, result.summary);

  return {
    command: "lint",
    file: toDisplayPath(filePath),
    ok: false,
    clean: false,
    inputValid: false,
    summary,
    diagnostics,
  };
}

function createFormatCheckReport(filePath, result) {
  const diagnostics = sortDiagnostics(
    (result.diagnostics || []).map((diagnostic) =>
      createDiagnostic("format", filePath, diagnostic)
    )
  );
  const summary = createSummary(diagnostics);

  return {
    command: "format",
    file: toDisplayPath(filePath),
    ok: summary.error === 0,
    canonical: summary.error === 0,
    check: true,
    mode: "check",
    summary,
    diagnostics,
  };
}

function createFormatInvalidReport(filePath, result) {
  const diagnostics = sortDiagnostics([
    ...mapIssues(filePath, result.syntaxIssues || [], "syntax"),
    ...mapIssues(filePath, result.semanticIssues || [], "semantic"),
  ]);
  const summary = createSummary(diagnostics, result.summary);

  return {
    command: "format",
    file: toDisplayPath(filePath),
    ok: false,
    canonical: false,
    check: true,
    inputValid: false,
    mode: "check",
    summary,
    diagnostics,
  };
}

function createCheckReport(filePath, result) {
  const validate = createCheckValidateStage(filePath, result.validate);
  const lint = createCheckLintStage(filePath, result.lint);
  const format = createCheckFormatStage(filePath, result.format);
  const diagnostics = sortDiagnostics([
    ...validate.diagnostics,
    ...lint.diagnostics,
    ...format.diagnostics,
  ]);

  return {
    command: "check",
    file: toDisplayPath(filePath),
    ok: result.ok,
    summary: createSummary(diagnostics),
    diagnostics,
    validate,
    lint,
    format,
  };
}

function createCliErrorReport(command, code, message, filePath) {
  const diagnostics = [
    createDiagnostic("cli", filePath, {
      code,
      severity: "error",
      line: 1,
      message,
    }),
  ];

  return {
    command,
    file: filePath ? toDisplayPath(filePath) : null,
    ok: false,
    summary: createSummary(diagnostics),
    diagnostics,
  };
}

function createDiagnostic(source, filePath, diagnostic) {
  return {
    source,
    severity: diagnostic.severity || "error",
    code: diagnostic.code || `${source}.unknown`,
    file: toDisplayPath(filePath),
    line: diagnostic.line || 1,
    message: diagnostic.message,
  };
}

function mapIssues(filePath, issues, source) {
  return issues.map((issue) =>
    createDiagnostic(source, filePath, {
      code: issue.code || `${source}.unknown`,
      severity: "error",
      line: issue.line || 1,
      message: issue.message,
    })
  );
}

function createCheckValidateStage(filePath, result) {
  const diagnostics = sortDiagnostics([
    ...mapIssues(filePath, result.syntaxIssues || [], "syntax"),
    ...mapIssues(filePath, result.semanticIssues || [], "semantic"),
  ]);

  return {
    ok: result.ok,
    valid: result.ok,
    skipped: false,
    summary: createSummary(diagnostics, result.summary || {}),
    diagnostics,
  };
}

function createCheckLintStage(filePath, result) {
  if (result.skipped) {
    return {
      ok: false,
      clean: false,
      skipped: true,
      summary: createSummary([]),
      diagnostics: [],
    };
  }

  const diagnostics = sortDiagnostics(
    (result.findings || []).map((finding) =>
      createDiagnostic("lint", filePath, {
        code: finding.code,
        severity: finding.severity,
        line: finding.line || 1,
        message: finding.message,
      })
    )
  );

  return {
    ok: result.ok,
    clean: result.ok,
    skipped: false,
    summary: createSummary(diagnostics),
    diagnostics,
  };
}

function createCheckFormatStage(filePath, result) {
  if (result.skipped) {
    return {
      ok: false,
      canonical: false,
      skipped: true,
      summary: createSummary([]),
      diagnostics: [],
    };
  }

  const diagnostics = result.requiresChanges
    ? [
        createDiagnostic("format", filePath, {
          code: "format.not-canonical",
          severity: "error",
          line: 1,
          message: "Canonical formatting changes required.",
        }),
      ]
    : [];

  return {
    ok: result.ok,
    canonical: result.ok,
    skipped: false,
    summary: createSummary(diagnostics),
    diagnostics,
  };
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

function sortDiagnostics(diagnostics) {
  return [...diagnostics].sort((left, right) => {
    const leftFile = left.file || "";
    const rightFile = right.file || "";

    if (leftFile !== rightFile) {
      return leftFile.localeCompare(rightFile);
    }

    if ((left.line || 1) !== (right.line || 1)) {
      return (left.line || 1) - (right.line || 1);
    }

    if (SEVERITY_RANK[left.severity] !== SEVERITY_RANK[right.severity]) {
      return SEVERITY_RANK[left.severity] - SEVERITY_RANK[right.severity];
    }

    if (left.code !== right.code) {
      return left.code.localeCompare(right.code);
    }

    return left.message.localeCompare(right.message);
  });
}

function formatDiagnosticLine(diagnostic) {
  const sev = diagnostic.severity.toUpperCase().padEnd(7);
  return `  ${sev} [${diagnostic.code}] ${diagnostic.file}:${diagnostic.line} - ${diagnostic.message}`;
}

function renderCommandReport(title, filePath, report, options = {}) {
  const lines = [`${title} ${toDisplayPath(filePath)}`];

  lines.push(`  status: ${report.ok ? "passed" : "failed"}`);
  lines.push(
    `  summary: ${report.summary.error} error(s), ${report.summary.warning} warning(s), ${report.summary.info} info`
  );

  if (options.includeStats && report.summary.topLevelBlocks !== undefined) {
    lines.push(
      `  stats: ${report.summary.topLevelBlocks} top-level block(s), ${report.summary.statements} statement(s)`
    );
  }

  for (const diagnostic of report.diagnostics) {
    lines.push(formatDiagnosticLine(diagnostic));
  }

  lines.push(`Result: ${report.ok ? "PASS" : "FAIL"}`);
  return lines;
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
  createFormatCheckReport,
  createFormatInvalidReport,
  createLintInvalidReport,
  createLintReport,
  createValidateReport,
  formatDiagnosticLine,
  renderCommandReport,
  sortDiagnostics,
  toDisplayPath,
};
