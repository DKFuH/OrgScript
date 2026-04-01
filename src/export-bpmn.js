function toBpmnXml(model) {
  const processes = (model.body || []).filter((node) => node.type === "process");

  if (processes.length === 0) {
    throw new Error("No BPMN-exportable blocks found. Supported block types: process.");
  }

  const definitions = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<bpmn:definitions xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"',
    '  xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"',
    '  id="OrgScriptDefinitions"',
    '  targetNamespace="https://orgscript.org/bpmn">',
  ];

  processes.forEach((processNode, index) => {
    const builder = createBpmnBuilder(`Process_${index + 1}`);
    const startId = builder.addStartEvent(processNode.name);
    const exits = builder.renderSequence(processNode.body || [], [{ id: startId }]);

    if (exits.length > 0) {
      const endId = builder.addEndEvent("done");
      builder.connectIncoming(exits, endId);
    }

    definitions.push(builder.renderProcess(processNode.name));
  });

  definitions.push("</bpmn:definitions>");
  return `${definitions.join("\n")}\n`;
}

function createBpmnBuilder(prefix) {
  const elements = [];
  const flows = [];
  let counter = 0;
  let flowCounter = 0;

  function nextId(kind) {
    counter += 1;
    return sanitizeId(`${prefix}_${kind}_${counter}`);
  }

  function nextFlowId() {
    flowCounter += 1;
    return sanitizeId(`${prefix}_flow_${flowCounter}`);
  }

  function addStartEvent(name) {
    const id = nextId("start");
    elements.push(
      `  <bpmn:startEvent id="${id}" name="${escapeXml(name || "start")}"/>`
    );
    return id;
  }

  function addEndEvent(name) {
    const id = nextId("end");
    elements.push(
      `  <bpmn:endEvent id="${id}" name="${escapeXml(name || "end")}"/>`
    );
    return id;
  }

  function addTask(label) {
    const id = nextId("task");
    elements.push(
      `  <bpmn:serviceTask id="${id}" name="${escapeXml(label)}"/>`
    );
    return id;
  }

  function addIntermediateEvent(label) {
    const id = nextId("event");
    elements.push(
      `  <bpmn:intermediateCatchEvent id="${id}" name="${escapeXml(label)}"/>`
    );
    return id;
  }

  function addGateway(label) {
    const id = nextId("gateway");
    elements.push(
      `  <bpmn:exclusiveGateway id="${id}" name="${escapeXml(label || "decision")}"/>`
    );
    return id;
  }

  function connectIncoming(connectors, targetId) {
    connectors.forEach((connector) => {
      const flowId = nextFlowId();
      const name = connector.label ? ` name="${escapeXml(connector.label)}"` : "";
      flows.push(
        `  <bpmn:sequenceFlow id="${flowId}" sourceRef="${connector.id}" targetRef="${targetId}"${name}/>`
      );
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
      const id = addIntermediateEvent(`when ${statement.trigger || "unknown"}`);
      connectIncoming(incoming, id);
      return [{ id }];
    }

    if (statement.type === "if") {
      const gatewayId = addGateway(`if ${formatCondition(statement.condition)}`);
      connectIncoming(incoming, gatewayId);

      const joinId = addGateway("merge");
      const exits = [];

      exits.push(
        ...renderSequence(statement.then || [], [{ id: gatewayId, label: `if ${formatCondition(statement.condition)}` }])
      );

      for (const branch of statement.elseIf || []) {
        exits.push(
          ...renderSequence(branch.then || [], [{ id: gatewayId, label: `else if ${formatCondition(branch.condition)}` }])
        );
      }

      if (statement.else && (statement.else.body || []).length > 0) {
        exits.push(
          ...renderSequence(statement.else.body || [], [{ id: gatewayId, label: "else" }])
        );
      } else {
        exits.push({ id: gatewayId, label: "else" });
      }

      connectIncoming(exits, joinId);
      return [{ id: joinId }];
    }

    if (statement.type === "stop") {
      const endId = addEndEvent("stop");
      connectIncoming(incoming, endId);
      return [];
    }

    const label = formatAction(statement);
    const id = addTask(label);
    connectIncoming(incoming, id);
    return [{ id }];
  }

  function renderProcess(name) {
    return [
      `  <bpmn:process id="${sanitizeId(prefix)}" name="${escapeXml(name)}" isExecutable="false">`,
      ...elements,
      ...flows,
      "  </bpmn:process>",
    ].join("\n");
  }

  return {
    addStartEvent,
    addEndEvent,
    connectIncoming,
    renderProcess,
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

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

module.exports = {
  toBpmnXml,
};
