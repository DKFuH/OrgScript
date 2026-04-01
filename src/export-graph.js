function toGraphJson(model) {
  const nodes = [];
  const edges = [];
  const processBlocks = (model.body || []).filter((node) => node.type === "process");
  const stateflows = (model.body || []).filter((node) => node.type === "stateflow");

  if (processBlocks.length === 0 && stateflows.length === 0) {
    throw new Error(
      "No graph-exportable blocks found. Supported block types: process, stateflow."
    );
  }

  processBlocks.forEach((processNode) => {
    const graph = createProcessGraph(processNode);
    nodes.push(...graph.nodes);
    edges.push(...graph.edges);
  });

  stateflows.forEach((stateflow) => {
    const graph = createStateflowGraph(stateflow);
    nodes.push(...graph.nodes);
    edges.push(...graph.edges);
  });

  return `${JSON.stringify(
    {
      version: "0.1",
      type: "graph",
      nodes,
      edges,
    },
    null,
    2
  )}\n`;
}

function createProcessGraph(processNode) {
  const nodes = [];
  const edges = [];
  let counter = 0;

  function addNode(kind, label) {
    counter += 1;
    const id = `process:${processNode.name}:${kind}:${counter}`;
    nodes.push({
      id,
      kind,
      label,
      group: `process:${processNode.name}`,
    });
    return id;
  }

  function addEdge(from, to, label) {
    edges.push({
      from,
      to,
      label,
    });
  }

  function connectIncoming(connectors, targetId) {
    connectors.forEach((connector) => addEdge(connector.id, targetId, connector.label));
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
      const id = addNode("when", `when ${statement.trigger || "unknown"}`);
      connectIncoming(incoming, id);
      return [{ id }];
    }

    if (statement.type === "if") {
      const decisionId = addNode("if", `if ${formatCondition(statement.condition)}`);
      connectIncoming(incoming, decisionId);

      const exits = [];
      exits.push(...renderSequence(statement.then || [], [{ id: decisionId, label: "yes" }]));

      let falseConnectors = [{ id: decisionId, label: "no" }];

      for (const branch of statement.elseIf || []) {
        const elseIfId = addNode("if", `if ${formatCondition(branch.condition)}`);
        connectIncoming(falseConnectors, elseIfId);
        exits.push(...renderSequence(branch.then || [], [{ id: elseIfId, label: "yes" }]));
        falseConnectors = [{ id: elseIfId, label: "no" }];
      }

      if (statement.else && (statement.else.body || []).length > 0) {
        exits.push(...renderSequence(statement.else.body || [], falseConnectors));
      } else {
        exits.push(...falseConnectors);
      }

      return exits;
    }

    if (statement.type === "stop") {
      const id = addNode("stop", "stop");
      connectIncoming(incoming, id);
      return [];
    }

    const id = addNode(statement.type, formatAction(statement));
    connectIncoming(incoming, id);
    return [{ id }];
  }

  const startId = addNode("start", processNode.name);
  const exits = renderSequence(processNode.body || [], [{ id: startId }]);
  if (exits.length > 0) {
    const endId = addNode("end", "done");
    connectIncoming(exits, endId);
  }

  return { nodes, edges };
}

function createStateflowGraph(stateflow) {
  const nodes = [];
  const edges = [];
  const group = `stateflow:${stateflow.name}`;

  (stateflow.states || []).forEach((state) => {
    nodes.push({
      id: `stateflow:${stateflow.name}:state:${state}`,
      kind: "state",
      label: state,
      group,
    });
  });

  (stateflow.transitions || []).forEach((edge) => {
    edges.push({
      from: `stateflow:${stateflow.name}:state:${edge.from}`,
      to: `stateflow:${stateflow.name}:state:${edge.to}`,
      label: "transition",
    });
  });

  return { nodes, edges };
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

module.exports = {
  toGraphJson,
};
