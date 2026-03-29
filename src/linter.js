const SEVERITY = {
  error: "error",
  warning: "warning",
  info: "info",
};

const SEVERITY_RANK = {
  error: 0,
  warning: 1,
  info: 2,
};

const RULES = {
  "lint.process-missing-trigger": { severity: SEVERITY.warning },
  "lint.process-multiple-triggers": { severity: SEVERITY.error },
  "lint.process-trigger-order": { severity: SEVERITY.info },
  "lint.rule-missing-scope": { severity: SEVERITY.info },
  "lint.state-orphaned": { severity: SEVERITY.warning },
  "lint.state-no-incoming": { severity: SEVERITY.info },
  "lint.role-conflicting-permission": { severity: SEVERITY.error },
  "lint.unreachable-statement": { severity: SEVERITY.warning },
};

function lintDocument(ast) {
  const findings = [];

  for (const node of ast.body) {
    lintNode(node, findings);
  }

  return sortFindings(findings);
}

function summarizeFindings(findings) {
  const summary = {
    error: 0,
    warning: 0,
    info: 0,
  };

  for (const finding of findings) {
    summary[finding.severity] += 1;
  }

  return summary;
}

function renderLintReport(filePath, findings) {
  if (findings.length === 0) {
    return [`LINT ${filePath}`, "  status: passed", "  summary: 0 error(s), 0 warning(s), 0 info"];
  }

  const summary = summarizeFindings(findings);
  const lines = [
    `LINT ${filePath}`,
    `  status: ${summary.error > 0 ? "failed" : "passed"}`,
    `  summary: ${summary.error} error(s), ${summary.warning} warning(s), ${summary.info} info`,
  ];

  for (const finding of findings) {
    lines.push(
      `  ${finding.severity.toUpperCase()} ${finding.code} ${filePath}:${finding.line} ${finding.message}`
    );
  }

  return lines;
}

function lintNode(node, findings) {
  if (node.type === "ProcessNode") {
    lintProcess(node, findings);
    return;
  }

  if (node.type === "RuleNode") {
    lintRule(node, findings);
    lintStatementBlock(node.body || [], findings);
    return;
  }

  if (node.type === "EventNode") {
    lintStatementBlock(node.body || [], findings);
    return;
  }

  if (node.type === "StateflowNode") {
    lintStateflow(node, findings);
    return;
  }

  if (node.type === "RoleNode") {
    lintRole(node, findings);
    return;
  }

  if (node.type === "PolicyNode") {
    for (const clause of node.clauses || []) {
      lintActionBlock(clause.body || [], findings);
    }
  }
}

function lintProcess(node, findings) {
  const body = node.body || [];
  const triggers = body.filter((statement) => statement.type === "WhenNode");

  if (triggers.length === 0) {
    findings.push(
      createLintIssue(
        "lint.process-missing-trigger",
        1,
        `Process \`${node.name}\` has no \`when\` trigger.`
      )
    );
  }

  if (triggers.length > 1) {
    findings.push(
      createLintIssue(
        "lint.process-multiple-triggers",
        triggers[1].line,
        `Process \`${node.name}\` declares multiple \`when\` triggers.`
      )
    );
  }

  const firstNonTriggerIndex = body.findIndex((statement) => statement.type !== "WhenNode");
  if (firstNonTriggerIndex >= 0) {
    for (let index = firstNonTriggerIndex + 1; index < body.length; index += 1) {
      if (body[index].type === "WhenNode") {
        findings.push(
          createLintIssue(
            "lint.process-trigger-order",
            body[index].line,
            `Process \`${node.name}\` declares a \`when\` trigger after operational statements.`
          )
        );
      }
    }
  }

  lintStatementBlock(body, findings);
}

function lintRule(node, findings) {
  if (!node.appliesTo) {
    findings.push(
      createLintIssue(
        "lint.rule-missing-scope",
        1,
        `Rule \`${node.name}\` does not declare an \`applies to\` scope.`
      )
    );
  }
}

function lintStateflow(node, findings) {
  const incoming = new Map();
  const outgoing = new Map();
  const states = node.states || [];
  const transitions = node.transitions || [];

  for (const state of states) {
    incoming.set(state.value, 0);
    outgoing.set(state.value, 0);
  }

  for (const edge of transitions) {
    if (incoming.has(edge.to)) {
      incoming.set(edge.to, incoming.get(edge.to) + 1);
    }
    if (outgoing.has(edge.from)) {
      outgoing.set(edge.from, outgoing.get(edge.from) + 1);
    }
  }

  states.forEach((state, index) => {
    const inCount = incoming.get(state.value) || 0;
    const outCount = outgoing.get(state.value) || 0;

    if (inCount === 0 && outCount === 0) {
      findings.push(
        createLintIssue(
          "lint.state-orphaned",
          state.line,
          `State \`${state.value}\` in stateflow \`${node.name}\` has no incoming or outgoing transitions.`
        )
      );
      return;
    }

    if (index > 0 && inCount === 0) {
      findings.push(
        createLintIssue(
          "lint.state-no-incoming",
          state.line,
          `State \`${state.value}\` in stateflow \`${node.name}\` has no incoming transitions.`
        )
      );
    }
  });
}

function lintRole(node, findings) {
  const can = new Set((node.can || []).map((permission) => permission.value));

  for (const permission of node.cannot || []) {
    if (can.has(permission.value)) {
      findings.push(
        createLintIssue(
          "lint.role-conflicting-permission",
          permission.line,
          `Role \`${node.name}\` declares \`${permission.value}\` in both \`can\` and \`cannot\`.`
        )
      );
    }
  }
}

function lintStatementBlock(statements, findings) {
  let terminated = false;

  for (const statement of statements) {
    if (terminated) {
      findings.push(
        createLintIssue(
          "lint.unreachable-statement",
          statement.line || 1,
          "This statement is unreachable because the previous branch always stops."
        )
      );
    }

    if (statement.type === "IfNode") {
      lintStatementBlock(statement.then || [], findings);

      for (const branch of statement.elseIf || []) {
        lintStatementBlock(branch.then || [], findings);
      }

      if (statement.else) {
        lintStatementBlock(statement.else.body || [], findings);
      }
    }

    terminated = statementAlwaysStops(statement);
  }
}

function lintActionBlock(statements, findings) {
  let terminated = false;

  for (const statement of statements) {
    if (terminated) {
      findings.push(
        createLintIssue(
          "lint.unreachable-statement",
          statement.line || 1,
          "This statement is unreachable because the previous branch always stops."
        )
      );
    }

    terminated = statementAlwaysStops(statement);
  }
}

function statementAlwaysStops(statement) {
  if (!statement) {
    return false;
  }

  if (statement.type === "StopNode") {
    return true;
  }

  if (statement.type !== "IfNode") {
    return false;
  }

  const thenStops = blockAlwaysStops(statement.then || []);
  const elseIfStops = (statement.elseIf || []).every((branch) => blockAlwaysStops(branch.then || []));
  const elseStops = statement.else ? blockAlwaysStops(statement.else.body || []) : false;

  return thenStops && elseIfStops && elseStops;
}

function blockAlwaysStops(statements) {
  if (statements.length === 0) {
    return false;
  }

  return statementAlwaysStops(statements[statements.length - 1]);
}

function sortFindings(findings) {
  return [...findings].sort((left, right) => {
    if (left.line !== right.line) {
      return left.line - right.line;
    }

    if (SEVERITY_RANK[left.severity] !== SEVERITY_RANK[right.severity]) {
      return SEVERITY_RANK[left.severity] - SEVERITY_RANK[right.severity];
    }

    return left.code.localeCompare(right.code);
  });
}

function createLintIssue(code, line, message) {
  return {
    code,
    severity: RULES[code].severity,
    line,
    message,
  };
}

module.exports = {
  RULES,
  SEVERITY,
  lintDocument,
  renderLintReport,
  summarizeFindings,
};
