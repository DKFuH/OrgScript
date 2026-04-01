function toBpmnXml(model) {
  const processes = (model.body || []).filter((node) => node.type === "process");

  if (processes.length === 0) {
    throw new Error("No BPMN-exportable blocks found. Supported block types: process.");
  }

  const definitions = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<bpmn:definitions xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"',
    '  xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"',
    '  xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"',
    '  xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"',
    '  xmlns:di="http://www.omg.org/spec/DD/20100524/DI"',
    '  id="OrgScriptDefinitions"',
    '  targetNamespace="https://orgscript.org/bpmn">',
  ];
  const diagrams = [];

  processes.forEach((processNode, index) => {
    const builder = createBpmnBuilder(`Process_${index + 1}`);
    const startId = builder.addStartEvent(processNode.name);
    const exits = builder.renderSequence(processNode.body || [], [{ id: startId }]);

    if (exits.length > 0) {
      const endId = builder.addEndEvent("done");
      builder.connectIncoming(exits, endId);
    }

    definitions.push(builder.renderProcess(processNode.name));
    diagrams.push(builder.renderDiagram(index + 1));
  });

  definitions.push(...diagrams);
  definitions.push("</bpmn:definitions>");
  return `${definitions.join("\n")}\n`;
}

function createBpmnBuilder(prefix) {
  const nodes = [];
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
    nodes.push({
      id,
      type: "startEvent",
      name: name || "start",
    });
    return id;
  }

  function addEndEvent(name) {
    const id = nextId("end");
    nodes.push({
      id,
      type: "endEvent",
      name: name || "end",
    });
    return id;
  }

  function addTask(label) {
    const id = nextId("task");
    nodes.push({
      id,
      type: "serviceTask",
      name: label,
    });
    return id;
  }

  function addIntermediateEvent(label) {
    const id = nextId("event");
    nodes.push({
      id,
      type: "intermediateCatchEvent",
      name: label,
    });
    return id;
  }

  function addGateway(label) {
    const id = nextId("gateway");
    nodes.push({
      id,
      type: "exclusiveGateway",
      name: label || "decision",
    });
    return id;
  }

  function connectIncoming(connectors, targetId) {
    connectors.forEach((connector) => {
      const flowId = nextFlowId();
      flows.push({
        id: flowId,
        sourceRef: connector.id,
        targetRef: targetId,
        name: connector.label || null,
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
    const elementLines = nodes.map((node) => renderNodeXml(node));
    const flowLines = flows.map((flow) => renderFlowXml(flow));

    return [
      `  <bpmn:process id="${sanitizeId(prefix)}" name="${escapeXml(name)}" isExecutable="false">`,
      ...elementLines,
      ...flowLines,
      "  </bpmn:process>",
    ].join("\n");
  }

  function renderDiagram(processIndex) {
    const planeId = `${sanitizeId(prefix)}_di`;
    const diagramId = `${sanitizeId(prefix)}_diagram`;
    const layout = layoutNodes(nodes, processIndex);
    const shapeLines = layout.shapes.map(renderShapeXml);
    const edgeLines = flows.map((flow) => renderEdgeXml(flow, layout.centers));

    return [
      `  <bpmndi:BPMNDiagram id="${diagramId}">`,
      `    <bpmndi:BPMNPlane id="${planeId}" bpmnElement="${sanitizeId(prefix)}">`,
      ...shapeLines,
      ...edgeLines,
      "    </bpmndi:BPMNPlane>",
      "  </bpmndi:BPMNDiagram>",
    ].join("\n");
  }

  return {
    addStartEvent,
    addEndEvent,
    connectIncoming,
    renderProcess,
    renderDiagram,
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

function renderNodeXml(node) {
  const name = node.name ? ` name="${escapeXml(node.name)}"` : "";
  return `  <bpmn:${node.type} id="${node.id}"${name}/>`;
}

function renderFlowXml(flow) {
  const name = flow.name ? ` name="${escapeXml(flow.name)}"` : "";
  return `  <bpmn:sequenceFlow id="${flow.id}" sourceRef="${flow.sourceRef}" targetRef="${flow.targetRef}"${name}/>`;
}

function layoutNodes(nodes, processIndex) {
  const shapes = [];
  const centers = new Map();
  const baseX = 120;
  const baseY = 120 + (processIndex - 1) * 220;
  const spacingX = 180;

  nodes.forEach((node, index) => {
    const size = resolveNodeSize(node.type);
    const x = baseX + index * spacingX;
    const y = baseY;
    shapes.push({
      id: `${node.id}_di`,
      bpmnElement: node.id,
      x,
      y,
      width: size.width,
      height: size.height,
    });
    centers.set(node.id, {
      x: x + size.width / 2,
      y: y + size.height / 2,
    });
  });

  return { shapes, centers };
}

function resolveNodeSize(type) {
  if (type === "startEvent" || type === "endEvent" || type === "intermediateCatchEvent") {
    return { width: 36, height: 36 };
  }
  if (type === "exclusiveGateway") {
    return { width: 50, height: 50 };
  }
  return { width: 120, height: 80 };
}

function renderShapeXml(shape) {
  return `      <bpmndi:BPMNShape id="${shape.id}" bpmnElement="${shape.bpmnElement}">
        <dc:Bounds x="${shape.x}" y="${shape.y}" width="${shape.width}" height="${shape.height}"/>
      </bpmndi:BPMNShape>`;
}

function renderEdgeXml(flow, centers) {
  const from = centers.get(flow.sourceRef);
  const to = centers.get(flow.targetRef);
  if (!from || !to) {
    return "";
  }
  return `      <bpmndi:BPMNEdge id="${flow.id}_di" bpmnElement="${flow.id}">
        <di:waypoint x="${from.x}" y="${from.y}"/>
        <di:waypoint x="${to.x}" y="${to.y}"/>
      </bpmndi:BPMNEdge>`;
}

module.exports = {
  toBpmnXml,
};
