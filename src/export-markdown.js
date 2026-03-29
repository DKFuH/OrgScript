function toMarkdownSummary(model) {
  const sections = model.body
    .map((node) => renderTopLevelNode(node))
    .filter(Boolean);

  if (sections.length === 0) {
    throw new Error("No Markdown-exportable blocks found.");
  }

  const lines = ["# OrgScript Logic Summary", ""];

  if (sections.length > 1) {
    lines.push("## Contents");
    lines.push("");
    for (const node of model.body) {
      const section = renderTopLevelNode(node);
      if (section) {
        lines.push(`- [${toKindLabel(node.type)}: ${node.name}](#${toAnchor(node)})`);
      }
    }
    lines.push("");
    lines.push("---");
    lines.push("");
  }

  // Use H2 for individual blocks since the file has an H1
  const bodyPart = sections
    .map((s) => s.replace(/^# /mg, "## "))
    .join("\n\n---\n\n");

  lines.push(bodyPart);

  return `${lines.join("\n")}\n`;
}

function toAnchor(node) {
  const label = `${toKindLabel(node.type)} ${node.name}`;
  return label
    .toLowerCase()
    .replace(/ /g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

function renderTopLevelNode(node) {
  if (node.type === "process") {
    return renderProcess(node);
  }

  if (node.type === "stateflow") {
    return renderStateflow(node);
  }

  if (node.type === "rule") {
    return renderRule(node);
  }

  if (node.type === "role") {
    return renderRole(node);
  }

  if (node.type === "policy") {
    return renderPolicy(node);
  }

  if (node.type === "event") {
    return renderEvent(node);
  }

  if (node.type === "metric") {
    return renderMetric(node);
  }

  return null;
}

function renderProcess(node) {
  const triggers = (node.body || []).filter((statement) => statement.type === "when");
  const statements = (node.body || []).filter((statement) => statement.type !== "when");
  const summary = summarizeStatementSequence(statements);
  const lines = [`# Process: ${node.name}`, "", "### Trigger"];

  if (triggers.length === 0) {
    lines.push("- No explicit trigger defined.");
  } else {
    for (const trigger of triggers) {
      lines.push(`- Triggered when \`${trigger.trigger || "unknown"}\`.`);
    }
  }

  lines.push("");
  lines.push("### Flow Summary");

  if (summary.length === 0) {
    lines.push("- No operational behavior is defined.");
  } else {
    for (const bullet of summary) {
      lines.push(`- ${bullet}`);
    }
  }

  return lines.join("\n");
}

function renderStateflow(node) {
  const lines = [`# Stateflow: ${node.name}`, "", "### States"];

  if ((node.states || []).length === 0) {
    lines.push("- No states are defined.");
  } else {
    for (const state of node.states) {
      lines.push(`- \`${state}\``);
    }
  }

  lines.push("");
  lines.push("### Transitions");

  if ((node.transitions || []).length === 0) {
    lines.push("- No transitions are defined.");
  } else {
    for (const edge of node.transitions) {
      lines.push(`- From \`${edge.from}\` to \`${edge.to}\`.`);
    }
  }

  return lines.join("\n");
}

function renderRule(node) {
  const lines = [`# Rule: ${node.name}`];

  if (node.appliesTo) {
    lines.push("");
    lines.push("### Scope");
    lines.push(`- Applies to \`${node.appliesTo}\`.`);
  }

  lines.push("");
  lines.push("### Rule Behavior");

  const summary = summarizeStatementSequence(node.body || []);
  if (summary.length === 0) {
    lines.push("- No rule behavior is defined.");
  } else {
    for (const bullet of summary) {
      lines.push(`- ${bullet}`);
    }
  }

  return lines.join("\n");
}

function renderRole(node) {
  const lines = [`# Role: ${node.name}`, "", "### Permissions"];

  if ((node.can || []).length === 0) {
    lines.push("- No assigned permissions.");
  } else {
    for (const permission of node.can) {
      lines.push(`- **Can** perform \`${permission}\`.`);
    }
  }

  if ((node.cannot || []).length > 0) {
    for (const permission of node.cannot) {
      lines.push(`- **Cannot** perform \`${permission}\`.`);
    }
  }

  return lines.join("\n");
}

function renderPolicy(node) {
  const lines = [`# Policy: ${node.name}`, "", "### Security / SLA Clauses"];

  if ((node.clauses || []).length === 0) {
    lines.push("- No policy clauses are defined.");
    return lines.join("\n");
  }

  for (const clause of node.clauses) {
    lines.push(
      `- If ${formatConditionCode(clause.condition)}, then ${formatStatementSequenceInline(
        clause.then || []
      )}.`
    );
  }

  return lines.join("\n");
}

function renderEvent(node) {
  const lines = [`# Event: ${node.name}`, "", "### Automated Reactions"];

  if ((node.body || []).length === 0) {
    lines.push("- No automated reactions are defined.");
  } else {
    for (const bullet of summarizeStatementSequence(node.body || [])) {
      lines.push(`- ${bullet}`);
    }
  }

  return lines.join("\n");
}

function renderMetric(node) {
  const lines = [`# Metric: ${node.name}`, "", "### Monitoring Definition"];

  lines.push(node.formula ? `- **Formula**: \`${node.formula}\`` : "- No formula defined.");
  lines.push(node.owner ? `- **Owner**: \`${node.owner}\`` : "- No owner assigned.");
  lines.push(node.target ? `- **Target**: \`${node.target}\`` : "- No target defined.");

  return lines.join("\n");
}

function summarizeStatementSequence(statements) {
  const bullets = [];
  let buffer = [];

  function flushBufferedActions() {
    if (buffer.length === 0) {
      return;
    }

    const prefix = bullets.length === 0 ? "" : "Then ";
    bullets.push(`${prefix}${formatActionGroup(buffer)}.`);
    buffer = [];
  }

  for (const statement of statements) {
    if (statement.type === "if") {
      flushBufferedActions();
      bullets.push(...formatIfBullets(statement));
      continue;
    }

    buffer.push(statement);
  }

  flushBufferedActions();
  return bullets;
}

function formatIfBullets(statement) {
  const bullets = [];
  bullets.push(
    `If ${formatConditionCode(statement.condition)}, ${formatStatementSequenceInline(
      statement.then || []
    )}.`
  );

  for (const branch of statement.elseIf || []) {
    bullets.push(
      `Else if ${formatConditionCode(branch.condition)}, ${formatStatementSequenceInline(
        branch.then || []
      )}.`
    );
  }

  if (statement.else && (statement.else.body || []).length !== 0) {
    bullets.push(`Otherwise, ${formatStatementSequenceInline(statement.else.body)}.`);
  }

  return bullets;
}

function formatStatementSequenceInline(statements) {
  const parts = [];

  for (const statement of statements) {
    if (statement.type === "if") {
      parts.push(...formatIfInlineParts(statement));
      continue;
    }

    parts.push(formatActionPhrase(statement));
  }

  if (parts.length === 0) {
    return "take no action";
  }

  return joinParts(parts);
}

function formatIfInlineParts(statement) {
  const parts = [
    `if ${formatConditionCode(statement.condition)}, ${formatStatementSequenceInline(
      statement.then || []
    )}`,
  ];

  for (const branch of statement.elseIf || []) {
    parts.push(
      `else if ${formatConditionCode(branch.condition)}, ${formatStatementSequenceInline(
        branch.then || []
      )}`
    );
  }

  if (statement.else && (statement.else.body || []).length !== 0) {
    parts.push(`else, ${formatStatementSequenceInline(statement.else.body)}`);
  }

  return parts;
}

function formatActionGroup(statements) {
  return joinParts(statements.map((statement) => formatActionPhrase(statement)));
}

function formatActionPhrase(statement) {
  if (statement.type === "assign") {
    return `assign \`${statement.target || "?"}\` to ${formatExpressionCode(statement.value)}`;
  }

  if (statement.type === "transition") {
    return `transition \`${statement.target || "?"}\` to ${formatExpressionCode(statement.value)}`;
  }

  if (statement.type === "notify") {
    return `notify \`${statement.target}\` with ${formatStringLiteral(statement.message)}`;
  }

  if (statement.type === "create") {
    return `create \`${statement.entity}\``;
  }

  if (statement.type === "update") {
    const val = formatExpressionCode(statement.value);
    return `update \`${statement.target || "?"}\` to ${val}`;
  }

  if (statement.type === "require") {
    return `require \`${statement.requirement}\``;
  }

  if (statement.type === "when") {
    return `trigger on \`${statement.trigger || "unknown"}\``;
  }

  if (statement.type === "stop") {
    return "stop execution";
  }

  return `handle unsupported action \`${statement.type}\``;
}

function formatConditionCode(condition) {
  return `\`${formatCondition(condition)}\``;
}

function formatCondition(condition) {
  if (!condition) {
    return "unknown condition";
  }

  if (condition.type === "logical") {
    return condition.conditions.map((entry) => formatCondition(entry)).join(` ${condition.operator} `);
  }

  return `${formatExpression(condition.left)} ${condition.operator} ${formatExpression(
    condition.right
  )}`;
}

function formatExpressionCode(expression) {
  return `\`${formatExpression(expression)}\``;
}

function formatExpression(expression) {
  if (!expression) {
    return "?";
  }

  if (expression.type === "field") {
    return expression.path;
  }

  if (expression.type === "identifier") {
    return expression.value;
  }

  if (expression.type === "string") {
    return `"${expression.value}"`;
  }

  if (expression.type === "boolean") {
    return expression.value ? "true" : "false";
  }

  return String(expression.value);
}

function formatStringLiteral(value) {
  return `\`${JSON.stringify(value)}\``;
}

function joinParts(parts) {
  if (parts.length === 0) {
    return "";
  }

  if (parts.length === 1) {
    return parts[0];
  }

  if (parts.length === 2) {
    return `${parts[0]} and ${parts[1]}`;
  }

  return `${parts.slice(0, -1).join(", ")}, and ${parts[parts.length - 1]}`;
}

function toKindLabel(type) {
  return type.replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase();
}

module.exports = {
  toMarkdownSummary,
};
