function toLittleHorseSkeleton(model) {
  const processes = (model.body || []).filter((node) => node.type === "process");

  if (processes.length === 0) {
    throw new Error("No LittleHorse-exportable blocks found. Supported block types: process.");
  }

  const lines = [
    "// OrgScript -> LittleHorse workflow skeleton",
    "// This is a scaffold. Translate it to your LittleHorse SDK and task definitions.",
    "",
  ];

  processes.forEach((processNode) => {
    const className = sanitizeClassName(processNode.name);
    lines.push(`public class ${className}Workflow {`);
    lines.push("  // TODO: adapt this skeleton to your LittleHorse SDK version.");
    lines.push("  public void buildWorkflow() {");
    lines.push(`    // Process: ${processNode.name}`);
    lines.push("    // TODO: declare variables and task definitions");

    const bodyLines = renderStatements(processNode.body || [], 4);
    if (bodyLines.length > 0) {
      lines.push(...bodyLines);
    } else {
      lines.push("    // TODO: add workflow steps");
    }

    lines.push("  }");
    lines.push("}");
    lines.push("");
  });

  return `${lines.join("\n").trimEnd()}\n`;
}

function renderStatements(statements, indentSize) {
  const lines = [];
  const indent = " ".repeat(indentSize);

  for (const statement of statements) {
    if (statement.type === "when") {
      lines.push(`${indent}// when ${statement.trigger || "unknown"}`);
      continue;
    }

    if (statement.type === "if") {
      lines.push(`${indent}// if ${formatCondition(statement.condition)}:`);
      lines.push(...renderStatements(statement.then || [], indentSize + 2));

      for (const branch of statement.elseIf || []) {
        lines.push(`${indent}// else if ${formatCondition(branch.condition)}:`);
        lines.push(...renderStatements(branch.then || [], indentSize + 2));
      }

      if (statement.else && (statement.else.body || []).length > 0) {
        lines.push(`${indent}// else:`);
        lines.push(...renderStatements(statement.else.body || [], indentSize + 2));
      }
      continue;
    }

    if (statement.type === "stop") {
      lines.push(`${indent}// stop`);
      continue;
    }

    lines.push(`${indent}// ${formatAction(statement)}`);
  }

  return lines;
}

function formatAction(statement) {
  if (statement.type === "assign") {
    return `assign ${statement.target || "?"} = ${formatExpression(statement.value)}`;
  }

  if (statement.type === "transition") {
    return `transition ${statement.target || "?"} -> ${formatExpression(statement.value)}`;
  }

  if (statement.type === "notify") {
    return `notify ${statement.target} "${statement.message}"`;
  }

  if (statement.type === "create") {
    return `create ${statement.entity}`;
  }

  if (statement.type === "update") {
    return `update ${statement.target || "?"} = ${formatExpression(statement.value)}`;
  }

  if (statement.type === "require") {
    return `require ${statement.requirement}`;
  }

  return statement.type;
}

function formatCondition(condition) {
  if (!condition) {
    return "unknown condition";
  }

  if (condition.type === "logical") {
    return condition.conditions.map(formatCondition).join(` ${condition.operator} `);
  }

  return `${formatExpression(condition.left)} ${condition.operator} ${formatExpression(condition.right)}`;
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

function sanitizeClassName(value) {
  const safe = String(value || "Workflow").replace(/[^A-Za-z0-9_]/g, "");
  if (safe.length === 0) {
    return "Workflow";
  }
  if (/^[A-Z]/.test(safe)) {
    return safe;
  }
  return safe.charAt(0).toUpperCase() + safe.slice(1);
}

module.exports = {
  toLittleHorseSkeleton,
};
