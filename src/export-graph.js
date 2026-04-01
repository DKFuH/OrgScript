function toGraphJson(model) {
  const nodes = [];
  const edges = [];
  const supported = (model.body || []).filter(
    (node) => node.type === "process" || node.type === "stateflow"
  );

  if (supported.length === 0) {
    throw new Error(
      "No graph-exportable blocks found. Supported block types: process, stateflow."
    );
  }

  supported.forEach((node, index) => {
    if (node.type === "process") {
      renderProcessGraph(node, index + 1, nodes, edges);
      return;
    }

    if (node.type === "stateflow") {
      renderStateflowGraph(node, index + 1, nodes, edges);
    }
  });

  return {
    version: "0.1",
    type: "graph",
    nodes,
    edges,
  };
}

function renderProcessGraph(node, index, nodes, edges) {
  const groupId = `process:${node.name}`;
  const prefix = `p${index}`;
  nodes.push({
    id: groupId,
    type: "process",
    label: node.name,
  });

  const builder = createGraphBuilder(prefix, groupId, nodes, edges);
  const startId = builder.addNode("start", node.name || "start");
  const exits = builder.renderSequence(node.body || [], [{ id: startId }]);

  if (exits.length > 0) {
    const endId = builder.addNode("end", "done");
    builder.connectIncoming(exits, endId);
  }
}

function renderStateflowGraph(node, index, nodes, edges) {
  const groupId = `stateflow:${node.name}`;
  nodes.push({
    id: groupId,
    type: "stateflow",
    label: node.name,
  });

  const prefix = `s${index}`;
  const stateIds = new Map();
  (node.states || []).forEach((state, stateIndex) => {
    const id = `${prefix}_state_${stateIndex + 1}`;
    stateIds.set(state, id);
    nodes.push({
      id,
      type: "state",
      label: state,
      group: groupId,
    });
  });

  (node.transitions || []).forEach((edge) => {
    const from = stateIds.get(edge.from) || `${prefix}_${sanitizeId(edge.from)}`;
    const to = stateIds.get(edge.to) || `${prefix}_${sanitizeId(edge.to)}`;
    edges.push({
      from,
      to,
      label: "",
      type: "transition",
      group: groupId,
    });
  });
}

function createGraphBuilder(prefix, groupId, nodes, edges) {
  let counter = 0;

  function addNode(type, label) {
    counter += 1;
    const id = `${prefix}_${type}_${counter}`;
    nodes.push({
      id,
      type,
      label,
      group: groupId,
    });
    return id;
  }

  function connectIncoming(connectors, targetId) {
    connectors.forEach((connector) => {
      edges.push({
        from: connector.id,
        to: targetId,
        label: connector.label || "",
        type: "flow",
        group: groupId,
      });
    });
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
      exits.push(
        ...renderSequence(statement.then || [], [
          { id: decisionId, label: `if ${formatCondition(statement.condition)}` },
        ])
      );

      for (const branch of statement.elseIf || []) {
        exits.push(
          ...renderSequence(branch.then || [], [
            { id: decisionId, label: `else if ${formatCondition(branch.condition)}` },
          ])
        );
      }

      if (statement.else && (statement.else.body || []).length > 0) {
        exits.push(...renderSequence(statement.else.body || [], [{ id: decisionId, label: "else" }]));
      } else {
        exits.push({ id: decisionId, label: "else" });
      }

      const joinId = addNode("merge", "merge");
      connectIncoming(exits, joinId);
      return [{ id: joinId }];
    }

    if (statement.type === "stop") {
      const endId = addNode("stop", "stop");
      connectIncoming(incoming, endId);
      return [];
    }

    const id = addNode("action", formatAction(statement));
    connectIncoming(incoming, id);
    return [{ id }];
  }

  return {
    addNode,
    connectIncoming,
    renderSequence,
  };
}

function formatAction(statement) {
  if (statement.type === "assign") {
    return `assign ${statement.target || "?"} = ${formatExpression(statement.value)}`;
  }

  if (statement.type === "transition") {
    return `transition ${statement.target || "?"} to ${formatExpression(statement.value)}`;
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

function sanitizeId(value) {
  return String(value)
    .replace(/[^A-Za-z0-9_]/g, "_")
    .replace(/^(\d)/, "_$1");
}

module.exports = {
  toGraphJson,
};
