function lintDocument(ast) {
  const issues = [];

  for (const node of ast.body) {
    lintNode(node, issues);
  }

  return issues;
}

function lintNode(node, issues) {
  if (node.type === "ProcessNode") {
    lintProcess(node, issues);
    return;
  }

  if (node.type === "RuleNode" || node.type === "EventNode") {
    lintStatementBlock(node.body || [], issues);
    return;
  }

  if (node.type === "StateflowNode") {
    lintStateflow(node, issues);
    return;
  }

  if (node.type === "RoleNode") {
    lintRole(node, issues);
    return;
  }

  if (node.type === "PolicyNode") {
    for (const clause of node.clauses || []) {
      lintActionBlock(clause.body || [], issues);
    }
  }
}

function lintProcess(node, issues) {
  const triggers = (node.body || []).filter((statement) => statement.type === "WhenNode");

  if (triggers.length === 0) {
    issues.push(
      createLintIssue(
        "process-missing-trigger",
        "warning",
        1,
        `Process \`${node.name}\` has no \`when\` trigger.`
      )
    );
  }

  if (triggers.length > 1) {
    issues.push(
      createLintIssue(
        "process-multiple-triggers",
        "warning",
        triggers[1].line,
        `Process \`${node.name}\` declares multiple \`when\` triggers.`
      )
    );
  }

  lintStatementBlock(node.body || [], issues);
}

function lintStateflow(node, issues) {
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
      issues.push(
        createLintIssue(
          "state-orphaned",
          "warning",
          state.line,
          `State \`${state.value}\` in stateflow \`${node.name}\` has no incoming or outgoing transitions.`
        )
      );
      return;
    }

    if (index > 0 && inCount === 0) {
      issues.push(
        createLintIssue(
          "state-no-incoming",
          "warning",
          state.line,
          `State \`${state.value}\` in stateflow \`${node.name}\` has no incoming transitions.`
        )
      );
    }
  });
}

function lintRole(node, issues) {
  const can = new Set((node.can || []).map((permission) => permission.value));

  for (const permission of node.cannot || []) {
    if (can.has(permission.value)) {
      issues.push(
        createLintIssue(
          "role-conflicting-permission",
          "warning",
          permission.line,
          `Role \`${node.name}\` declares \`${permission.value}\` in both \`can\` and \`cannot\`.`
        )
      );
    }
  }
}

function lintStatementBlock(statements, issues) {
  let terminated = false;

  for (const statement of statements) {
    if (terminated) {
      issues.push(
        createLintIssue(
          "unreachable-statement",
          "warning",
          statement.line || 1,
          "This statement is unreachable because the previous branch always stops."
        )
      );
    }

    if (statement.type === "IfNode") {
      lintStatementBlock(statement.then || [], issues);

      for (const branch of statement.elseIf || []) {
        lintStatementBlock(branch.then || [], issues);
      }

      if (statement.else) {
        lintStatementBlock(statement.else.body || [], issues);
      }
    }

    terminated = statementAlwaysStops(statement);
  }
}

function lintActionBlock(statements, issues) {
  let terminated = false;

  for (const statement of statements) {
    if (terminated) {
      issues.push(
        createLintIssue(
          "unreachable-statement",
          "warning",
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

function createLintIssue(code, severity, line, message) {
  return {
    code,
    severity,
    line,
    message,
  };
}

module.exports = {
  lintDocument,
};
