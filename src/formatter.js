const {
  DOCUMENT_HEADER_TEXT,
  getHeaderLanguageEntries,
} = require("./document-metadata");

function formatDocument(ast) {
  const lines = [];
  const blocks = ast.body || [];

  if (ast.metadata && getHeaderLanguageEntries(ast.metadata).length > 0) {
    lines.push(DOCUMENT_HEADER_TEXT);
    lines.push("");

    for (const entry of getHeaderLanguageEntries(ast.metadata)) {
      lines.push(`${entry.key} ${formatString(entry.value)}`);
    }

    if (blocks.length > 0 || (ast.trailingComments || []).length > 0) {
      lines.push("");
    }
  }

  blocks.forEach((block, index) => {
    if (index > 0 || (index === 0 && lines.length > 0 && lines[lines.length - 1] !== "")) {
      lines.push("");
    }
    lines.push(...formatTopLevelBlock(block));
  });

  if ((ast.trailingComments || []).length > 0) {
    if (lines.length > 0) {
      lines.push("");
    }
    lines.push(...formatComments(ast.trailingComments, 0));
  }

  return `${lines.join("\n")}\n`;
}

function formatTopLevelBlock(node) {
  const lines = [
    ...formatDecorators(node, 0),
    `${indent(0)}${formatTopLevelHeader(node)}`,
  ];

  if (node.type === "ProcessNode" || node.type === "EventNode") {
    const body = formatBodyWithTrailingComments(node.body || [], node.trailingComments || [], 1, "statement");
    if (body.length > 0) {
      lines.push("");
      lines.push(...body);
    }
    return lines;
  }

  if (node.type === "StateflowNode") {
    lines.push("");
    lines.push(`${indent(1)}states`);
    lines.push(...node.states.map((state) => `${indent(2)}${state.value}`));
    lines.push("");
    lines.push(`${indent(1)}transitions`);
    lines.push(...node.transitions.map((edge) => `${indent(2)}${edge.from} -> ${edge.to}`));
    return lines;
  }

  if (node.type === "RuleNode") {
    lines.push("");

    if (node.appliesTo) {
      lines.push(`${indent(1)}applies to ${node.appliesTo}`);
      lines.push("");
    }

    lines.push(...formatBodyWithTrailingComments(node.body || [], node.trailingComments || [], 1, "statement"));
    return lines;
  }

  if (node.type === "RoleNode") {
    lines.push("");

    if ((node.can || []).length > 0) {
      lines.push(`${indent(1)}can`);
      lines.push(...node.can.map((permission) => `${indent(2)}${permission.value}`));
    }

    if ((node.cannot || []).length > 0) {
      if ((node.can || []).length > 0) {
        lines.push("");
      }
      lines.push(`${indent(1)}cannot`);
      lines.push(...node.cannot.map((permission) => `${indent(2)}${permission.value}`));
    }

    return lines;
  }

  if (node.type === "PolicyNode") {
    lines.push("");

    (node.clauses || []).forEach((clause, index) => {
      if (index > 0) {
        lines.push("");
      }
      lines.push(...formatDecorators(clause, 1));
      lines.push(`${indent(1)}when ${formatCondition(clause.condition)}`);
      lines.push(`${indent(1)}then`);
      lines.push(...formatBodyWithTrailingComments(clause.body || [], clause.trailingComments || [], 2, "action"));
    });

    if ((node.trailingComments || []).length > 0) {
      lines.push("");
      lines.push(...formatComments(node.trailingComments, 1));
    }

    return lines;
  }

  if (node.type === "MetricNode") {
    lines.push("");
    lines.push(`${indent(1)}formula ${node.formula}`);
    lines.push(`${indent(1)}owner ${node.owner}`);
    lines.push(`${indent(1)}target ${node.target}`);
    return lines;
  }

  return lines;
}

function formatTopLevelHeader(node) {
  const type = node.type.replace("Node", "").toLowerCase();
  return `${type} ${node.name}`;
}

function formatBodyWithTrailingComments(statements, trailingComments, level, kind) {
  const lines = [];

  statements.forEach((statement, index) => {
    if (index > 0 && shouldSeparateStatement(statement, statements[index - 1])) {
      lines.push("");
    }

    lines.push(...formatStatementLike(statement, level, kind));
  });

  if ((trailingComments || []).length > 0) {
    if (lines.length > 0) {
      lines.push("");
    }
    lines.push(...formatComments(trailingComments, level));
  }

  return lines;
}

function formatStatementLike(statement, level, kind) {
  if (kind === "statement") {
    return formatStatement(statement, level);
  }

  return formatActionStatement(statement, level);
}

function formatStatement(statement, level) {
  if (statement.type === "WhenNode") {
    return [
      ...formatDecorators(statement, level),
      `${indent(level)}when ${statement.trigger.path}`,
    ];
  }

  if (statement.type === "IfNode") {
    const lines = [
      ...formatDecorators(statement, level),
      `${indent(level)}if ${formatCondition(statement.condition)} then`,
    ];

    lines.push(...formatBodyWithTrailingComments(statement.then || [], statement.trailingComments || [], level + 1, "statement"));

    for (const branch of statement.elseIf || []) {
      lines.push("");
      lines.push(...formatDecorators(branch, level));
      lines.push(`${indent(level)}else if ${formatCondition(branch.condition)} then`);
      lines.push(...formatBodyWithTrailingComments(branch.then || [], branch.trailingComments || [], level + 1, "statement"));
    }

    if (statement.else) {
      lines.push("");
      lines.push(...formatDecorators(statement.else, level));
      lines.push(`${indent(level)}else`);
      lines.push(...formatBodyWithTrailingComments(statement.else.body || [], statement.else.trailingComments || [], level + 1, "statement"));
    }

    return lines;
  }

  return formatActionStatement(statement, level);
}

function formatActionStatement(statement, level) {
  const lines = [...formatDecorators(statement, level)];

  if (statement.type === "AssignNode") {
    lines.push(`${indent(level)}assign ${statement.target.path} = ${formatExpression(statement.value)}`);
    return lines;
  }

  if (statement.type === "TransitionNode") {
    lines.push(`${indent(level)}transition ${statement.target.path} to ${formatExpression(statement.value)}`);
    return lines;
  }

  if (statement.type === "NotifyNode") {
    lines.push(`${indent(level)}notify ${statement.target} with ${formatString(statement.message)}`);
    return lines;
  }

  if (statement.type === "CreateNode") {
    lines.push(`${indent(level)}create ${statement.entity}`);
    return lines;
  }

  if (statement.type === "UpdateNode") {
    lines.push(`${indent(level)}update ${statement.target.path} = ${formatExpression(statement.value)}`);
    return lines;
  }

  if (statement.type === "RequireNode") {
    lines.push(`${indent(level)}require ${statement.requirement}`);
    return lines;
  }

  if (statement.type === "StopNode") {
    lines.push(`${indent(level)}stop`);
    return lines;
  }

  lines.push(`${indent(level)}${statement.type}`);
  return lines;
}

function formatDecorators(node, level) {
  return [
    ...formatComments(node.leadingComments || [], level),
    ...formatAnnotations(node.annotations || [], level),
  ];
}

function formatComments(comments, level) {
  return (comments || []).map((comment) => {
    const suffix = comment.text ? ` ${comment.text}` : "";
    return `${indent(level)}#${suffix}`;
  });
}

function formatAnnotations(annotations, level) {
  return (annotations || []).map(
    (annotation) => `${indent(level)}@${annotation.key} ${formatString(annotation.value)}`
  );
}

function formatCondition(condition) {
  if (!condition) {
    return "<invalid-condition>";
  }

  if (condition.type === "LogicalConditionNode") {
    return condition.conditions.map(formatCondition).join(` ${condition.operator} `);
  }

  return `${formatExpression(condition.left)} ${condition.operator} ${formatExpression(condition.right)}`;
}

function formatExpression(expression) {
  if (!expression) {
    return "<invalid-expression>";
  }

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
