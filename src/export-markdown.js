function toMarkdownSummary(model, options = {}) {
  const sections = model.body.map((node) => renderTopLevelNode(node, options)).filter(Boolean);

  if (sections.length === 0) {
    throw new Error("No Markdown-exportable blocks found.");
  }

  const lines = ["# OrgScript Logic Summary", ""];

  appendDocumentMetadata(lines, model, options);

  if (sections.length > 1) {
    lines.push("## Contents");
    lines.push("");
    for (const node of model.body) {
      const section = renderTopLevelNode(node, options);
      if (section) {
        lines.push(`- [${toKindLabel(node.type)}: ${node.name}](#${toAnchor(node)})`);
      }
    }
    lines.push("");
    lines.push("---");
    lines.push("");
  }

  const bodyPart = sections.map((section) => section.replace(/^# /gm, "## ")).join("\n\n---\n\n");
  lines.push(bodyPart);

  return `${lines.join("\n")}\n`;
}

function appendDocumentMetadata(lines, model, options = {}) {
  if (!options.includeAnnotations || !model.metadata || !model.metadata.languages) {
    return;
  }

  const entries = Object.entries(model.metadata.languages);
  if (entries.length === 0) {
    return;
  }

  lines.push("### Document Metadata");
  for (const [key, value] of entries) {
    lines.push(`- **${toDocumentLanguageLabel(key)}**: \`${value}\``);
  }
  lines.push("");
}

function toAnchor(node) {
  const label = `${toKindLabel(node.type)} ${node.name}`;
  return label.toLowerCase().replace(/ /g, "-").replace(/[^a-z0-9-]/g, "");
}

function renderTopLevelNode(node, options) {
  if (node.type === "process") {
    return renderProcess(node, options);
  }

  if (node.type === "stateflow") {
    return renderStateflow(node, options);
  }

  if (node.type === "rule") {
    return renderRule(node, options);
  }

  if (node.type === "role") {
    return renderRole(node, options);
  }

  if (node.type === "policy") {
    return renderPolicy(node, options);
  }

  if (node.type === "event") {
    return renderEvent(node, options);
  }

  if (node.type === "metric") {
    return renderMetric(node, options);
  }

  return null;
}

function renderProcess(node, options) {
  const triggers = (node.body || []).filter((statement) => statement.type === "when");
  const statements = (node.body || []).filter((statement) => statement.type !== "when");
  const summary = summarizeStatementSequence(statements, options);
  const lines = [`# Process: ${node.name}`];

  appendAnnotationSection(lines, node, options);
  lines.push("");
  lines.push("### Trigger");

  if (triggers.length === 0) {
    lines.push("- No explicit trigger defined.");
  } else {
    for (const trigger of triggers) {
      lines.push(`- Triggered when \`${trigger.trigger || "unknown"}\`${formatInlineAnnotations(trigger, options)}.`);
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

function renderStateflow(node, options) {
  const lines = [`# Stateflow: ${node.name}`];
  appendAnnotationSection(lines, node, options);
  lines.push("");
  lines.push("### States");

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

function renderRule(node, options) {
  const lines = [`# Rule: ${node.name}`];

  appendAnnotationSection(lines, node, options);

  if (node.appliesTo) {
    lines.push("");
    lines.push("### Scope");
    lines.push(`- Applies to \`${node.appliesTo}\`.`);
  }

  lines.push("");
  lines.push("### Rule Behavior");

  const summary = summarizeStatementSequence(node.body || [], options);
  if (summary.length === 0) {
    lines.push("- No rule behavior is defined.");
  } else {
    for (const bullet of summary) {
      lines.push(`- ${bullet}`);
    }
  }

  return lines.join("\n");
}

function renderRole(node, options) {
  const lines = [`# Role: ${node.name}`];
  appendAnnotationSection(lines, node, options);
  lines.push("");
  lines.push("### Permissions");

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

function renderPolicy(node, options) {
  const lines = [`# Policy: ${node.name}`];
  appendAnnotationSection(lines, node, options);
  lines.push("");
  lines.push("### Security / SLA Clauses");

  if ((node.clauses || []).length === 0) {
    lines.push("- No policy clauses are defined.");
    return lines.join("\n");
  }

  for (const clause of node.clauses) {
    lines.push(
      `- If ${formatConditionCode(clause.condition)}, then ${formatStatementSequenceInline(
        clause.then || [],
        options
      )}${formatInlineAnnotations(clause, options)}.`
    );
  }

  return lines.join("\n");
}

function renderEvent(node, options) {
  const lines = [`# Event: ${node.name}`];
  appendAnnotationSection(lines, node, options);
  lines.push("");
  lines.push("### Automated Reactions");

  if ((node.body || []).length === 0) {
    lines.push("- No automated reactions are defined.");
  } else {
    for (const bullet of summarizeStatementSequence(node.body || [], options)) {
      lines.push(`- ${bullet}`);
    }
  }

  return lines.join("\n");
}

function renderMetric(node, options) {
  const lines = [`# Metric: ${node.name}`];
  appendAnnotationSection(lines, node, options);
  lines.push("");
  lines.push("### Monitoring Definition");

  lines.push(node.formula ? `- **Formula**: \`${node.formula}\`` : "- No formula defined.");
  lines.push(node.owner ? `- **Owner**: \`${node.owner}\`` : "- No owner assigned.");
  lines.push(node.target ? `- **Target**: \`${node.target}\`` : "- No target defined.");

  return lines.join("\n");
}

function summarizeStatementSequence(statements, options) {
  const bullets = [];
  let buffer = [];

  function flushBufferedActions() {
    if (buffer.length === 0) {
      return;
    }

    const prefix = bullets.length === 0 ? "" : "Then ";
    bullets.push(`${prefix}${formatActionGroup(buffer, options)}.`);
    buffer = [];
  }

  for (const statement of statements) {
    if (statement.type === "if") {
      flushBufferedActions();
      bullets.push(...formatIfBullets(statement, options));
      continue;
    }

    buffer.push(statement);
  }

  flushBufferedActions();
  return bullets;
}

function formatIfBullets(statement, options) {
  const bullets = [];
  bullets.push(
    `If ${formatConditionCode(statement.condition)}, ${formatStatementSequenceInline(
      statement.then || [],
      options
    )}${formatInlineAnnotations(statement, options)}.`
  );

  for (const branch of statement.elseIf || []) {
    bullets.push(
      `Else if ${formatConditionCode(branch.condition)}, ${formatStatementSequenceInline(
        branch.then || [],
        options
      )}${formatInlineAnnotations(branch, options)}.`
    );
  }

  if (statement.else && (statement.else.body || []).length !== 0) {
    bullets.push(`Otherwise, ${formatStatementSequenceInline(statement.else.body, options)}${formatInlineAnnotations(statement.else, options)}.`);
  }

  return bullets;
}

function formatStatementSequenceInline(statements, options) {
  const parts = [];

  for (const statement of statements) {
    if (statement.type === "if") {
      parts.push(...formatIfInlineParts(statement, options));
      continue;
    }

    parts.push(formatActionPhrase(statement, options));
  }

  if (parts.length === 0) {
    return "take no action";
  }

  return joinParts(parts);
}

function formatIfInlineParts(statement, options) {
  const parts = [
    `if ${formatConditionCode(statement.condition)}, ${formatStatementSequenceInline(
      statement.then || [],
      options
    )}${formatInlineAnnotations(statement, options)}`,
  ];

  for (const branch of statement.elseIf || []) {
    parts.push(
      `else if ${formatConditionCode(branch.condition)}, ${formatStatementSequenceInline(
        branch.then || [],
        options
      )}${formatInlineAnnotations(branch, options)}`
    );
  }

  if (statement.else && (statement.else.body || []).length !== 0) {
    parts.push(`else, ${formatStatementSequenceInline(statement.else.body, options)}${formatInlineAnnotations(statement.else, options)}`);
  }

  return parts;
}

function formatActionGroup(statements, options) {
  return joinParts(statements.map((statement) => formatActionPhrase(statement, options)));
}

function formatActionPhrase(statement, options) {
  if (statement.type === "assign") {
    return `assign \`${statement.target || "?"}\` to ${formatExpressionCode(statement.value)}${formatInlineAnnotations(statement, options)}`;
  }

  if (statement.type === "transition") {
    return `transition \`${statement.target || "?"}\` to ${formatExpressionCode(statement.value)}${formatInlineAnnotations(statement, options)}`;
  }

  if (statement.type === "notify") {
    return `notify \`${statement.target}\` with ${formatStringLiteral(statement.message)}${formatInlineAnnotations(statement, options)}`;
  }

  if (statement.type === "create") {
    return `create \`${statement.entity}\`${formatInlineAnnotations(statement, options)}`;
  }

  if (statement.type === "update") {
    return `update \`${statement.target || "?"}\` to ${formatExpressionCode(statement.value)}${formatInlineAnnotations(statement, options)}`;
  }

  if (statement.type === "require") {
    return `require \`${statement.requirement}\`${formatInlineAnnotations(statement, options)}`;
  }

  if (statement.type === "when") {
    return `trigger on \`${statement.trigger || "unknown"}\`${formatInlineAnnotations(statement, options)}`;
  }

  if (statement.type === "stop") {
    return `stop execution${formatInlineAnnotations(statement, options)}`;
  }

  return `handle unsupported action \`${statement.type}\`${formatInlineAnnotations(statement, options)}`;
}

function appendAnnotationSection(lines, node, options = {}) {
  if (!options.includeAnnotations || !(node.annotations || []).length) {
    return;
  }

  lines.push("");
  lines.push("### Metadata");
  for (const annotation of node.annotations) {
    lines.push(`- \`@${annotation.key}\`: \`${annotation.value}\``);
  }
}

function formatInlineAnnotations(node, options = {}) {
  if (!options.includeAnnotations || !(node.annotations || []).length) {
    return "";
  }

  const values = node.annotations.map((annotation) => `@${annotation.key}="${annotation.value}"`);
  return ` (${values.join(", ")})`;
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

  return `${formatExpression(condition.left)} ${condition.operator} ${formatExpression(condition.right)}`;
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

function toDocumentLanguageLabel(key) {
  if (key === "source") {
    return "Source language";
  }

  if (key === "comments") {
    return "Comment language";
  }

  if (key === "annotations") {
    return "Annotation language";
  }

  if (key === "context") {
    return "Context language";
  }

  return key;
}

module.exports = {
  toMarkdownSummary,
};
