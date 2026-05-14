function toLittleHorseSkeleton(model, options = {}) {
  const realCode = options.realCode === true;
  const processes = (model.body || []).filter((node) => node.type === "process");

  if (processes.length === 0) {
    throw new Error("No LittleHorse-exportable blocks found. Supported block types: process.");
  }

  const lines = [];
  if (!realCode) {
    lines.push(
      "// OrgScript -> LittleHorse workflow skeleton",
      "// This is a scaffold. Translate it to your LittleHorse SDK and task definitions.",
      ""
    );
  }

  processes.forEach((processNode) => {
    const className = sanitizeClassName(processNode.name);
    const workflowName = toKebabName(processNode.name);
    lines.push(`public final class ${className}Workflow {`);
    if (!realCode) {
      lines.push("  // TODO: adapt this skeleton to your LittleHorse SDK version.");
    }
    lines.push("  public static Workflow getWorkflow() {");
    lines.push(`    return new WorkflowImpl("${workflowName}", wf -> {`);
    if (!realCode) {
      lines.push(`      // Process: ${processNode.name}`);
    }
    const declarations = renderDeclarations(processNode.body || [], 6);
    if (declarations.length > 0) {
      if (!realCode) {
        lines.push("      // TODO: declare variables and task definitions");
      }
      lines.push(...declarations);
      if (!realCode) {
        lines.push("");
      }
    } else {
      if (!realCode) {
        lines.push("      // TODO: declare variables and task definitions");
      }
    }

    const bodyLines = renderStatements(processNode.body || [], 6, { realCode });
    if (bodyLines.length > 0) {
      lines.push(...bodyLines);
    } else {
      if (!realCode) {
        lines.push("      // TODO: add workflow steps");
      }
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

  const typeSuffix = entry.type === "number" ? "Double" : entry.type === "boolean" ? "Bool" : "Str";
  return `var ${variableName} = wf.declare${typeSuffix}("${variableName}");`;
}

function renderStatements(statements, indentSize, options = {}) {
  const lines = [];
  const indent = " ".repeat(indentSize);
  const realCode = options.realCode === true;
  const threadName = options.threadName || "wf";

  for (const statement of statements) {
    if (statement.type === "when") {
      if (!realCode) {
        lines.push(`${indent}// when ${statement.trigger || "unknown"}`);
      }
      continue;
    }

    if (statement.type === "if") {
      lines.push(`${indent}${threadName}.doIf(${renderConditionExpression(statement.condition)}, ifBody -> {`);
      lines.push(
        ...renderStatements(statement.then || [], indentSize + 2, {
          ...options,
          threadName: "ifBody",
        })
      );
      lines.push(`${indent}})`);

      const elseIfBranches = statement.elseIf || [];
      for (const branch of elseIfBranches) {
        lines.push(
          `${indent}.doElseIf(${renderConditionExpression(branch.condition)}, elseIfBody -> {`
        );
        lines.push(
          ...renderStatements(branch.then || [], indentSize + 2, {
            ...options,
            threadName: "elseIfBody",
          })
        );
        lines.push(`${indent}})`);
      }

      if (statement.else && (statement.else.body || []).length > 0) {
        lines.push(`${indent}.doElse(elseBody -> {`);
        lines.push(
          ...renderStatements(statement.else.body || [], indentSize + 2, {
            ...options,
            threadName: "elseBody",
          })
        );
        lines.push(`${indent}});`);
      } else {
        const lastIndex = lines.length - 1;
        lines[lastIndex] = `${lines[lastIndex]};`;
      }
      continue;
    }

    if (statement.type === "stop") {
      if (!realCode) {
        lines.push(`${indent}// stop`);
      }
      continue;
    }

    const action = formatAction(statement, { realCode, threadName });
    if (action && (!realCode || !action.startsWith("//"))) {
      lines.push(`${indent}${action}`);
      continue;
    }

    if (!realCode) {
      lines.push(`${indent}// ${statement.type}`);
    }
  }

  return lines;
}

function formatAction(statement, options = {}) {
  const realCode = options.realCode === true;
  const threadName = options.threadName || "wf";
  if (statement.type === "assign") {
    return `// assign ${statement.target || "?"} = ${formatExpression(statement.value)}`;
  }

  if (statement.type === "transition") {
    return `// transition ${statement.target || "?"} -> ${formatExpression(statement.value)}`;
  }

  if (statement.type === "notify") {
    const target = statement.target || "target";
    const message = statement.message ? `"${statement.message}"` : "\"message\"";
    return `${threadName}.execute("notify", "${target}", ${message});`;
  }

  if (statement.type === "create") {
    const entity = statement.entity || "entity";
    return `${threadName}.execute("create", "${entity}");`;
  }

  if (statement.type === "update") {
    return `${threadName}.execute("update", "${statement.target || "target"}", ${formatExpression(statement.value)});`;
  }

  if (statement.type === "require") {
    const requirement = statement.requirement || "requirement";
    return `${threadName}.execute("require", "${requirement}");`;
  }

  if (!realCode) {
    return `// ${statement.type}`;
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
  const parts = value
    .split(/[^A-Za-z0-9]+/g)
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length === 0) {
    return null;
  }

  const sanitizedParts = parts.map((part) => {
    if (/^\d+$/.test(part)) {
      return `n${part}`;
    }
    return part;
  });
  const sanitized = sanitizedParts
    .map((part, index) => {
      const lower = part.toLowerCase();
      if (index === 0) {
        return lower;
      }
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join("");
  if (!sanitized) {
    return null;
  }
  if (/^[A-Za-z_]/.test(sanitized)) {
    return sanitized;
  }
  return `var${sanitized.charAt(0).toUpperCase()}${sanitized.slice(1)}`;
}

function renderConditionExpression(condition) {
  const rendered = formatLittleHorseCondition(condition);
  if (rendered) {
    return rendered;
  }
  return `/* ${formatCondition(condition)} */`;
}

function formatLittleHorseCondition(condition) {
  if (!condition) {
    return null;
  }

  if (condition.type === "logical") {
    const renderedConditions = (condition.conditions || [])
      .map(formatLittleHorseCondition)
      .filter(Boolean);
    if (renderedConditions.length === 0) {
      return null;
    }
    if (renderedConditions.length === 1) {
      return renderedConditions[0];
    }

    const joiner = condition.operator === "or" ? ".or(" : ".and(";
    return `${renderedConditions[0]}${renderedConditions
      .slice(1)
      .map((entry) => `${joiner}${entry})`)
      .join("")}`;
  }

  if (!condition.left || condition.left.type !== "field") {
    return null;
  }

  const left = toVariableName(condition.left.path);
  const right = formatLittleHorseValue(condition.right);
  if (!left || right == null) {
    return null;
  }

  switch (condition.operator) {
    case "=":
      return `${left}.isEqualTo(${right})`;
    case "!=":
      return `${left}.isNotEqualTo(${right})`;
    case "<":
      return `${left}.isLessThan(${right})`;
    case "<=":
      return `${left}.isLessThanOrEqualTo(${right})`;
    case ">":
      return `${left}.isGreaterThan(${right})`;
    case ">=":
      return `${left}.isGreaterThanOrEqualTo(${right})`;
    default:
      return null;
  }
}

function formatLittleHorseValue(expression) {
  if (!expression) {
    return null;
  }

  if (expression.type === "field") {
    return toVariableName(expression.path);
  }

  if (expression.type === "identifier") {
    return `"${expression.value}"`;
  }

  if (expression.type === "string") {
    return `"${expression.value}"`;
  }

  if (expression.type === "boolean") {
    return expression.value ? "true" : "false";
  }

  if (expression.type === "number") {
    return String(expression.value);
  }

  return null;
}

module.exports = {
  toLittleHorseSkeleton,
};
