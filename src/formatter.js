function formatDocument(ast) {
  const blocks = ast.body.map(formatTopLevelBlock);
  return `${blocks.join("\n\n")}\n`;
}

function formatTopLevelBlock(node) {
  if (node.type === "ProcessNode") {
    return [`process ${node.name}`, "", ...formatStatementBlock(node.body, 1)].join("\n");
  }

  if (node.type === "StateflowNode") {
    return [
      `stateflow ${node.name}`,
      "",
      `${indent(1)}states`,
      ...node.states.map((state) => `${indent(2)}${state.value}`),
      "",
      `${indent(1)}transitions`,
      ...node.transitions.map((edge) => `${indent(2)}${edge.from} -> ${edge.to}`),
    ].join("\n");
  }

  if (node.type === "RuleNode") {
    const lines = [`rule ${node.name}`, ""];

    if (node.appliesTo) {
      lines.push(`${indent(1)}applies to ${node.appliesTo}`, "");
    }

    lines.push(...formatStatementBlock(node.body, 1));
    return lines.join("\n");
  }

  if (node.type === "RoleNode") {
    const lines = [`role ${node.name}`, ""];

    if (node.can.length > 0) {
      lines.push(`${indent(1)}can`);
      lines.push(...node.can.map((permission) => `${indent(2)}${permission.value}`));
    }

    if (node.cannot.length > 0) {
      if (node.can.length > 0) {
        lines.push("");
      }
      lines.push(`${indent(1)}cannot`);
      lines.push(...node.cannot.map((permission) => `${indent(2)}${permission.value}`));
    }

    return lines.join("\n");
  }

  if (node.type === "PolicyNode") {
    const lines = [`policy ${node.name}`, ""];

    node.clauses.forEach((clause, index) => {
      if (index > 0) {
        lines.push("");
      }
      lines.push(`${indent(1)}when ${formatCondition(clause.condition)}`);
      lines.push(`${indent(1)}then`);
      lines.push(...formatActionBlock(clause.body, 2));
    });

    return lines.join("\n");
  }

  if (node.type === "MetricNode") {
    return [
      `metric ${node.name}`,
      "",
      `${indent(1)}formula ${node.formula}`,
      `${indent(1)}owner ${node.owner}`,
      `${indent(1)}target ${node.target}`,
    ].join("\n");
  }

  if (node.type === "EventNode") {
    return [`event ${node.name}`, "", ...formatActionBlock(node.body, 1)].join("\n");
  }

  return `${node.type} ${node.name}`;
}

function formatStatementBlock(statements, level) {
  const lines = [];

  statements.forEach((statement, index) => {
    if (index > 0 && shouldSeparateStatement(statement, statements[index - 1])) {
      lines.push("");
    }

    lines.push(...formatStatement(statement, level));
  });

  return lines;
}

function formatActionBlock(statements, level) {
  return statements.flatMap((statement) => formatActionStatement(statement, level));
}

function formatStatement(statement, level) {
  if (statement.type === "WhenNode") {
    return [`${indent(level)}when ${statement.trigger.path}`];
  }

  if (statement.type === "IfNode") {
    const lines = [`${indent(level)}if ${formatCondition(statement.condition)} then`];
    lines.push(...formatStatementBlock(statement.then, level + 1));

    for (const branch of statement.elseIf) {
      lines.push("");
      lines.push(`${indent(level)}else if ${formatCondition(branch.condition)} then`);
      lines.push(...formatStatementBlock(branch.then, level + 1));
    }

    if (statement.else) {
      lines.push("");
      lines.push(`${indent(level)}else`);
      lines.push(...formatStatementBlock(statement.else.body, level + 1));
    }

    return lines;
  }

  return formatActionStatement(statement, level);
}

function formatActionStatement(statement, level) {
  if (statement.type === "AssignNode") {
    return [`${indent(level)}assign ${statement.target.path} = ${formatExpression(statement.value)}`];
  }

  if (statement.type === "TransitionNode") {
    return [`${indent(level)}transition ${statement.target.path} to ${formatExpression(statement.value)}`];
  }

  if (statement.type === "NotifyNode") {
    return [`${indent(level)}notify ${statement.target} with ${formatString(statement.message)}`];
  }

  if (statement.type === "CreateNode") {
    return [`${indent(level)}create ${statement.entity}`];
  }

  if (statement.type === "UpdateNode") {
    return [`${indent(level)}update ${statement.target.path} = ${formatExpression(statement.value)}`];
  }

  if (statement.type === "RequireNode") {
    return [`${indent(level)}require ${statement.requirement}`];
  }

  if (statement.type === "StopNode") {
    return [`${indent(level)}stop`];
  }

  return [`${indent(level)}${statement.type}`];
}

function formatCondition(condition) {
  if (condition.type === "LogicalConditionNode") {
    return condition.conditions.map(formatCondition).join(` ${condition.operator} `);
  }

  return `${formatExpression(condition.left)} ${condition.operator} ${formatExpression(condition.right)}`;
}

function formatExpression(expression) {
  if (expression.type === "FieldReferenceNode") {
    return expression.path;
  }

  if (expression.type === "IdentifierNode") {
    return expression.value;
  }

  if (expression.type === "LiteralNode") {
    if (expression.valueType === "string") {
      return formatString(expression.value);
    }

    if (expression.valueType === "boolean") {
      return expression.value ? "true" : "false";
    }

    return String(expression.value);
  }

  return String(expression.value);
}

function formatString(value) {
  return `"${String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

function indent(level) {
  return "  ".repeat(level);
}

function shouldSeparateStatement(current, previous) {
  const boundaryTypes = new Set(["WhenNode", "IfNode"]);
  return boundaryTypes.has(current.type) || boundaryTypes.has(previous.type);
}

module.exports = {
  formatDocument,
};
