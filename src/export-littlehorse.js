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
    const workflowName = toKebabName(processNode.name);
    lines.push(`public final class ${className}Workflow {`);
    lines.push("  // TODO: adapt this skeleton to your LittleHorse SDK version.");
    lines.push("  public static Workflow getWorkflow() {");
    lines.push(`    return new WorkflowImpl("${workflowName}", wf -> {`);
    lines.push(`      // Process: ${processNode.name}`);
    const declarations = renderDeclarations(processNode.body || [], 6);
    if (declarations.length > 0) {
      lines.push("      // TODO: declare variables and task definitions");
      lines.push(...declarations);
      lines.push("");
    } else {
      lines.push("      // TODO: declare variables and task definitions");
    }

    const bodyLines = renderStatements(processNode.body || [], 6);
    if (bodyLines.length > 0) {
      lines.push(...bodyLines);
    } else {
      lines.push("      // TODO: add workflow steps");
    }

    lines.push("    });");
    lines.push("  }");
    lines.push("}");
    lines.push("");
  });

  return `${lines.join("\n").trimEnd()}\n`;
}

function renderDeclarations(statements, indentSize) {
  const indent = " ".repeat(indentSize);
  const entries = collectFieldUsage(statements);
  const lines = [];

  for (const entry of entries) {
    const decl = renderDeclaration(entry);
    if (decl) {
      lines.push(`${indent}${decl}`);
    }
  }

  return lines;
}

function collectFieldUsage(statements, usage = new Map()) {
  for (const statement of statements) {
    if (statement.type === "when") {
      continue;
    }

    if (statement.type === "if") {
      collectConditionUsage(statement.condition, usage);
      collectFieldUsage(statement.then || [], usage);
      for (const branch of statement.elseIf || []) {
        collectConditionUsage(branch.condition, usage);
        collectFieldUsage(branch.then || [], usage);
      }
      if (statement.else && Array.isArray(statement.else.body)) {
        collectFieldUsage(statement.else.body, usage);
      }
      continue;
    }

    if (statement.type === "assign" || statement.type === "transition" || statement.type === "update") {
      recordField(usage, statement.target, statement.value);
      continue;
    }

    if (statement.type === "notify") {
      continue;
    }

    if (statement.type === "create") {
      continue;
    }

    if (statement.type === "require") {
      continue;
    }
  }

  return Array.from(usage.values());
}

function collectConditionUsage(condition, usage) {
  if (!condition) {
    return;
  }

  if (condition.type === "logical") {
    for (const child of condition.conditions || []) {
      collectConditionUsage(child, usage);
    }
    return;
  }

  if (condition.left && condition.left.type === "field") {
    recordField(usage, condition.left.path, condition.right);
  }
}

function recordField(usage, path, value) {
  if (!path) {
    return;
  }
  const key = String(path);
  const existing = usage.get(key);
  const inferred = inferType(value);
  if (!existing) {
    usage.set(key, {
      path: key,
      type: inferred,
    });
    return;
  }
  existing.type = mergeTypes(existing.type, inferred);
}

function inferType(value) {
  if (!value) {
    return "string";
  }
  if (value.type === "number") {
    return "number";
  }
  if (value.type === "boolean") {
    return "boolean";
  }
  if (value.type === "string") {
    return "string";
  }
  return "string";
}

function mergeTypes(existing, incoming) {
  if (existing === incoming) {
    return existing;
  }
  if (existing === "number" || incoming === "number") {
    return "number";
  }
  if (existing === "boolean" || incoming === "boolean") {
    return "boolean";
  }
  return "string";
}

function renderDeclaration(entry) {
  const variableName = toVariableName(entry.path);
  if (!variableName) {
    return null;
  }

  const typeSuffix = entry.type === "number" ? "Double" : entry.type === "boolean" ? "Boolean" : "Str";
  return `var ${variableName} = wf.declare${typeSuffix}("${variableName}");`;
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
      lines.push(`${indent}wf.doIf(/* ${formatCondition(statement.condition)} */, ifBody -> {`);
      lines.push(...renderStatements(statement.then || [], indentSize + 2));
      lines.push(`${indent}})`);

      const elseIfBranches = statement.elseIf || [];
      for (const branch of elseIfBranches) {
        lines.push(`${indent}.doElseIf(/* ${formatCondition(branch.condition)} */, elseIfBody -> {`);
        lines.push(...renderStatements(branch.then || [], indentSize + 2));
        lines.push(`${indent}})`);
      }

      if (statement.else && (statement.else.body || []).length > 0) {
        lines.push(`${indent}.doElse(elseBody -> {`);
        lines.push(...renderStatements(statement.else.body || [], indentSize + 2));
        lines.push(`${indent}});`);
      } else {
        lines.push(`${indent};`);
      }
      continue;
    }

    if (statement.type === "stop") {
      lines.push(`${indent}// stop`);
      continue;
    }

    const action = formatAction(statement);
    if (action) {
      lines.push(`${indent}${action}`);
      continue;
    }

    lines.push(`${indent}// ${statement.type}`);
  }

  return lines;
}

function formatAction(statement) {
  if (statement.type === "assign") {
    return `// assign ${statement.target || "?"} = ${formatExpression(statement.value)}`;
  }

  if (statement.type === "transition") {
    return `// transition ${statement.target || "?"} -> ${formatExpression(statement.value)}`;
  }

  if (statement.type === "notify") {
    const target = statement.target || "target";
    const message = statement.message ? `"${statement.message}"` : "\"message\"";
    return `wf.execute("notify", "${target}", ${message});`;
  }

  if (statement.type === "create") {
    const entity = statement.entity || "entity";
    return `wf.execute("create", "${entity}");`;
  }

  if (statement.type === "update") {
    return `wf.execute("update", "${statement.target || "target"}", ${formatExpression(statement.value)});`;
  }

  if (statement.type === "require") {
    const requirement = statement.requirement || "requirement";
    return `wf.execute("require", "${requirement}");`;
  }

  return null;
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

function toKebabName(value) {
  const raw = String(value || "workflow").trim();
  if (!raw) {
    return "workflow";
  }
  const spaced = raw.replace(/([a-z0-9])([A-Z])/g, "$1 $2");
  return spaced
    .replace(/[^A-Za-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

function toVariableName(path) {
  const value = String(path || "").trim();
  if (!value) {
    return null;
  }
  const sanitized = value.replace(/[^A-Za-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  if (!sanitized) {
    return null;
  }
  if (/^[A-Za-z_]/.test(sanitized)) {
    return sanitized;
  }
  return `var_${sanitized}`;
}

module.exports = {
  toLittleHorseSkeleton,
};
