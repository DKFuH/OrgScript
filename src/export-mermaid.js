function toMermaidMarkdown(model) {
  const sections = [];
  const skipped = [];

  for (const node of model.body) {
    if (node.type === "process") {
      sections.push(renderProcessSection(node, sections.length + 1));
      continue;
    }

    if (node.type === "stateflow") {
      sections.push(renderStateflowSection(node, sections.length + 1));
      continue;
    }

    skipped.push(`${toKindLabel(node.type)} ${node.name}`);
  }

  if (sections.length === 0) {
    throw new Error(
      "No Mermaid-exportable blocks found. Supported block types: process, stateflow."
    );
  }

  const lines = ["# OrgScript Mermaid Export", ""];
  lines.push(...sections.flatMap((section, index) => (index > 0 ? ["", ...section] : section)));

  if (skipped.length > 0) {
    lines.push("");
    lines.push(
      `> Note: Mermaid export currently supports only process and stateflow blocks. Skipped: ${skipped.join(
        ", "
      )}.`
    );
  }

  return `${lines.join("\n")}\n`;
}

function renderProcessSection(node, sectionIndex) {
  const prefix = `p${sectionIndex}`;
  const graph = createFlowchartRenderer(prefix);
  const startId = graph.addNode("start", node.name);
  const exits = graph.renderSequence(node.body || [], [{ id: startId }]);

  if (exits.length > 0) {
    const endId = graph.addNode("end", "done");
    graph.connectIncoming(exits, endId);
  }

  return [
    `## Process: ${node.name}`,
    "",
    "```mermaid",
    "flowchart TD",
    ...graph.renderLines(),
    "",
    "  %% Styling",
    "  classDef trigger fill:#f0f4ff,stroke:#5c7cfa,stroke-width:2px",
    "  classDef decision fill:#fff9db,stroke:#fab005,stroke-width:2px",
    "  classDef action fill:#fff,stroke:#adb5bd,stroke-width:1px",
    "  classDef stop fill:#fff5f5,stroke:#ff8787,stroke-width:2px",
    "  classDef success fill:#f4fce3,stroke:#94d82d,stroke-width:2px",
    "```",
  ];
}

function renderStateflowSection(node, sectionIndex) {
  const prefix = `s${sectionIndex}`;
  const lines = [`## Stateflow: ${node.name}`, "", "```mermaid", "stateDiagram-v2"];
  const aliases = new Map();

  const states = node.states || [];
  states.forEach((state, index) => {
    const alias = `${prefix}_state_${index + 1}`;
    aliases.set(state, alias);
    lines.push(`  state "${escapeMermaidLabel(state)}" as ${alias}`);
    if (index === 0) {
      lines.push(`  [*] --> ${alias}`);
    }
  });

  const outgoingCount = new Map();
  for (const edge of node.transitions || []) {
    const from = aliases.get(edge.from) || `${prefix}_${sanitizeId(edge.from)}`;
    const to = aliases.get(edge.to) || `${prefix}_${sanitizeId(edge.to)}`;
    lines.push(`  ${from} --> ${to}`);
    outgoingCount.set(from, (outgoingCount.get(from) || 0) + 1);
  }

  // Add end markers for terminal states
  for (const [state, alias] of aliases.entries()) {
    if (!outgoingCount.has(alias)) {
      lines.push(`  ${alias} --> [*]`);
    }
  }

  lines.push("```");
  return lines;
}

function createFlowchartRenderer(prefix) {
  const nodes = [];
  const edges = [];
  let counter = 0;

  function addNode(kind, label) {
    counter += 1;
    const id = `${prefix}_${kind}_${counter}`;
    nodes.push(`  ${id}${shapeNode(kind, label)}`);
    nodes.push(`  class ${id} ${formatClass(kind)}`);
    return id;
  }

  function connectIncoming(connectors, targetId) {
    for (const connector of connectors) {
      const label = connector.label ? `|${escapeMermaidEdgeLabel(connector.label)}|` : "";
      edges.push(`  ${connector.id} -->${label} ${targetId}`);
    }
  }

  function renderSequence(statements, incoming) {
    let pending = incoming;

    for (const statement of statements) {
      pending = renderStatement(statement, pending);
    }

    return pending;
  }

  function renderStatement(statement, incoming) {
    if (statement.type === "when") {
      const id = addNode("trigger", `when ${statement.trigger || "unknown"}`);
      connectIncoming(incoming, id);
      return [{ id }];
    }

    if (statement.type === "if") {
      const decisionId = addNode("decision", `if ${formatCondition(statement.condition)}`);
      connectIncoming(incoming, decisionId);

      const exits = [];
      exits.push(...renderSequence(statement.then || [], [{ id: decisionId, label: "yes" }]));

      let falseConnectors = [{ id: decisionId, label: "no" }];

      for (const branch of statement.elseIf || []) {
        const elseIfId = addNode("decision", `if ${formatCondition(branch.condition)}`);
        connectIncoming(falseConnectors, elseIfId);
        exits.push(...renderSequence(branch.then || [], [{ id: elseIfId, label: "yes" }]));
        falseConnectors = [{ id: elseIfId, label: "no" }];
      }

      if (statement.else) {
        exits.push(...renderSequence(statement.else.body || [], falseConnectors));
      } else {
        exits.push(...falseConnectors);
      }

      return exits;
    }

    const id = addNode(statement.type === "stop" ? "stop" : "action", formatAction(statement));
    connectIncoming(incoming, id);
    return statement.type === "stop" ? [] : [{ id }];
  }

  function renderLines() {
    return [...nodes, ...edges];
  }

  return {
    addNode,
    connectIncoming,
    renderLines,
    renderSequence,
  };
}

function shapeNode(kind, label) {
  const safeLabel = escapeMermaidLabel(label);

  if (kind === "start" || kind === "end" || kind === "stop") {
    return `(["${safeLabel}"])`;
  }

  if (kind === "trigger") {
    return `[/ "${safeLabel}" /]`;
  }

  if (kind === "decision") {
    return `{"${safeLabel}"}`;
  }

  return `["${safeLabel}"]`;
}

function formatClass(kind) {
  if (kind === "start" || kind === "end") return "success";
  return kind;
}

function formatAction(statement) {
  if (statement.type === "assign") {
    return `assign ${statement.target || "?"} = ${formatExpression(statement.value)}`;
  }

  if (statement.type === "transition") {
    return `transition ${statement.target || "?"} to ${formatExpression(statement.value)}`;
  }

  if (statement.type === "notify") {
    return `notify ${statement.target} with "${statement.message}"`;
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

  if (statement.type === "stop") {
    return "stop";
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
    return `'${expression.value}'`;
  }

  if (expression.type === "boolean") {
    return expression.value ? "true" : "false";
  }

  return String(expression.value);
}

function toKindLabel(type) {
  return type.replace(/Node$/, "").replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase();
}

function sanitizeId(value) {
  return String(value)
    .replace(/[^A-Za-z0-9_]/g, "_")
    .replace(/^(\d)/, "_$1");
}

function escapeMermaidLabel(value) {
  // Use escaped double quotes for Mermaid labels inside double quotes
  return String(value).replace(/"/g, "#quot;");
}

function escapeMermaidEdgeLabel(value) {
  return String(value).replace(/\|/g, "/");
}

module.exports = {
  toMermaidMarkdown,
};
