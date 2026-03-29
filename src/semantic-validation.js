function validateDocument(ast) {
  const issues = [];
  const seenTopLevel = new Map();

  for (const node of ast.body) {
    const key = `${node.type}:${node.name}`;
    if (seenTopLevel.has(key)) {
      issues.push({
        line: 1,
        message: `Duplicate top-level ${node.type} name \`${node.name}\`.`,
      });
    } else {
      seenTopLevel.set(key, true);
    }

    validateNode(node, issues);
  }

  return issues;
}

function validateNode(node, issues) {
  if (node.type === "ProcessNode" || node.type === "RuleNode" || node.type === "EventNode") {
    if (!node.body || node.body.length === 0) {
      issues.push({
        line: 1,
        message: `${node.type.replace("Node", "")} \`${node.name}\` must not be empty.`,
      });
    }

    validateStatements(node.body || [], issues);
    return;
  }

  if (node.type === "StateflowNode") {
    validateStateflow(node, issues);
    return;
  }

  if (node.type === "PolicyNode") {
    if (!node.clauses || node.clauses.length === 0) {
      issues.push({
        line: 1,
        message: `Policy \`${node.name}\` must contain at least one clause.`,
      });
    }

    for (const clause of node.clauses || []) {
      if (!clause.body || clause.body.length === 0) {
        issues.push({
          line: clause.line,
          message: "Policy clauses must contain at least one action in their `then` block.",
        });
      }
      validateActionStatements(clause.body || [], issues);
    }
    return;
  }

  if (node.type === "RoleNode") {
    if ((node.can || []).length === 0 && (node.cannot || []).length === 0) {
      issues.push({
        line: 1,
        message: `Role \`${node.name}\` must define at least one permission.`,
      });
    }
    return;
  }

  if (node.type === "MetricNode") {
    if (!node.formula || !node.owner || !node.target) {
      issues.push({
        line: 1,
        message: `Metric \`${node.name}\` must define formula, owner, and target.`,
      });
    }
  }
}

function validateStateflow(node, issues) {
  if ((node.states || []).length === 0) {
    issues.push({
      line: 1,
      message: `Stateflow \`${node.name}\` must define at least one state.`,
    });
  }

  const stateNames = new Set();
  for (const state of node.states || []) {
    if (stateNames.has(state.value)) {
      issues.push({
        line: state.line,
        message: `Duplicate state \`${state.value}\` in stateflow \`${node.name}\`.`,
      });
    }
    stateNames.add(state.value);
  }

  const transitionKeys = new Set();
  for (const edge of node.transitions || []) {
    if (!stateNames.has(edge.from)) {
      issues.push({
        line: edge.line,
        message: `Transition source \`${edge.from}\` is not declared in stateflow \`${node.name}\`.`,
      });
    }

    if (!stateNames.has(edge.to)) {
      issues.push({
        line: edge.line,
        message: `Transition target \`${edge.to}\` is not declared in stateflow \`${node.name}\`.`,
      });
    }

    const key = `${edge.from}->${edge.to}`;
    if (transitionKeys.has(key)) {
      issues.push({
        line: edge.line,
        message: `Duplicate transition \`${key}\` in stateflow \`${node.name}\`.`,
      });
    }
    transitionKeys.add(key);
  }
}

function validateStatements(statements, issues) {
  for (const statement of statements) {
    if (statement.type !== "IfNode") {
      continue;
    }

    if (!statement.then || statement.then.length === 0) {
      issues.push({
        line: statement.line,
        message: "`if` statements must contain at least one statement in their `then` block.",
      });
    }

    validateStatements(statement.then || [], issues);

    for (const branch of statement.elseIf || []) {
      if (!branch.then || branch.then.length === 0) {
        issues.push({
          line: branch.line,
          message: "`else if` statements must contain at least one statement in their `then` block.",
        });
      }
      validateStatements(branch.then || [], issues);
    }

    if (statement.else) {
      if (!statement.else.body || statement.else.body.length === 0) {
        issues.push({
          line: statement.else.line,
          message: "`else` blocks must contain at least one statement.",
        });
      }
      validateStatements(statement.else.body || [], issues);
    }
  }
}

function validateActionStatements(statements, issues) {
  for (const statement of statements) {
    if (!statement || !statement.type) {
      issues.push({
        line: 1,
        message: "Invalid action statement.",
      });
    }
  }
}

module.exports = {
  validateDocument,
};
