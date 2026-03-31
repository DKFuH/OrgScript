function toCanonicalModel(ast) {
  const model = {
    version: "0.4",
    type: "document",
    body: ast.body.map(toCanonicalNode),
  };

  if (ast.metadata && ast.metadata.languages && Object.keys(ast.metadata.languages).length > 0) {
    model.metadata = {
      headerVersion: ast.metadata.headerVersion || 1,
      languages: { ...ast.metadata.languages },
    };
  }

  return model;
}

function toCanonicalNode(node) {
  if (node.type === "ProcessNode") {
    return {
      type: "process",
      name: node.name,
      annotations: toCanonicalAnnotations(node.annotations),
      body: node.body.map(toCanonicalStatement),
    };
  }

  if (node.type === "StateflowNode") {
    return {
      type: "stateflow",
      name: node.name,
      annotations: toCanonicalAnnotations(node.annotations),
      states: node.states.map((state) => state.value),
      transitions: node.transitions.map((edge) => ({
        from: edge.from,
        to: edge.to,
      })),
    };
  }

  if (node.type === "RuleNode") {
    return {
      type: "rule",
      name: node.name,
      annotations: toCanonicalAnnotations(node.annotations),
      appliesTo: node.appliesTo,
      body: node.body.map(toCanonicalStatement),
    };
  }

  if (node.type === "RoleNode") {
    return {
      type: "role",
      name: node.name,
      annotations: toCanonicalAnnotations(node.annotations),
      can: node.can.map((permission) => permission.value),
      cannot: node.cannot.map((permission) => permission.value),
    };
  }

  if (node.type === "PolicyNode") {
    return {
      type: "policy",
      name: node.name,
      annotations: toCanonicalAnnotations(node.annotations),
      clauses: node.clauses.map((clause) => ({
        annotations: toCanonicalAnnotations(clause.annotations),
        condition: toCanonicalCondition(clause.condition),
        then: clause.body.map(toCanonicalStatement),
      })),
    };
  }

  if (node.type === "MetricNode") {
    return {
      type: "metric",
      name: node.name,
      annotations: toCanonicalAnnotations(node.annotations),
      formula: node.formula,
      owner: node.owner,
      target: node.target,
    };
  }

  if (node.type === "EventNode") {
    return {
      type: "event",
      name: node.name,
      annotations: toCanonicalAnnotations(node.annotations),
      body: node.body.map(toCanonicalStatement),
    };
  }

  return { type: node.type, name: node.name };
}

function toCanonicalStatement(statement) {
  if (statement.type === "WhenNode") {
    return {
      type: "when",
      annotations: toCanonicalAnnotations(statement.annotations),
      trigger: statement.trigger ? statement.trigger.path : null,
    };
  }

  if (statement.type === "IfNode") {
    return {
      type: "if",
      annotations: toCanonicalAnnotations(statement.annotations),
      condition: toCanonicalCondition(statement.condition),
      then: statement.then.map(toCanonicalStatement),
      elseIf: statement.elseIf.map((branch) => ({
        annotations: toCanonicalAnnotations(branch.annotations),
        condition: toCanonicalCondition(branch.condition),
        then: branch.then.map(toCanonicalStatement),
      })),
      else: statement.else
        ? {
            annotations: toCanonicalAnnotations(statement.else.annotations),
            body: statement.else.body.map(toCanonicalStatement),
          }
        : null,
    };
  }

  if (statement.type === "AssignNode") {
    return {
      type: "assign",
      annotations: toCanonicalAnnotations(statement.annotations),
      target: statement.target ? statement.target.path : null,
      value: toCanonicalExpression(statement.value),
    };
  }

  if (statement.type === "TransitionNode") {
    return {
      type: "transition",
      annotations: toCanonicalAnnotations(statement.annotations),
      target: statement.target ? statement.target.path : null,
      value: toCanonicalExpression(statement.value),
    };
  }

  if (statement.type === "NotifyNode") {
    return {
      type: "notify",
      annotations: toCanonicalAnnotations(statement.annotations),
      target: statement.target,
      message: statement.message,
    };
  }

  if (statement.type === "CreateNode") {
    return {
      type: "create",
      annotations: toCanonicalAnnotations(statement.annotations),
      entity: statement.entity,
    };
  }

  if (statement.type === "UpdateNode") {
    return {
      type: "update",
      annotations: toCanonicalAnnotations(statement.annotations),
      target: statement.target ? statement.target.path : null,
      value: toCanonicalExpression(statement.value),
    };
  }

  if (statement.type === "RequireNode") {
    return {
      type: "require",
      annotations: toCanonicalAnnotations(statement.annotations),
      requirement: statement.requirement,
    };
  }

  if (statement.type === "StopNode") {
    return {
      type: "stop",
      annotations: toCanonicalAnnotations(statement.annotations),
    };
  }

  return { type: statement.type };
}

function toCanonicalCondition(condition) {
  if (!condition) {
    return null;
  }

  if (condition.type === "LogicalConditionNode") {
    return {
      type: "logical",
      operator: condition.operator,
      conditions: condition.conditions.map(toCanonicalCondition),
    };
  }

  return {
    type: "comparison",
    left: toCanonicalExpression(condition.left),
    operator: condition.operator,
    right: toCanonicalExpression(condition.right),
  };
}

function toCanonicalExpression(expression) {
  if (!expression) {
    return null;
  }

  if (expression.type === "FieldReferenceNode") {
    return {
      type: "field",
      path: expression.path,
    };
  }

  if (expression.type === "IdentifierNode") {
    return {
      type: "identifier",
      value: expression.value,
    };
  }

  return {
    type: expression.valueType || expression.type,
    value: expression.value,
  };
}

function toCanonicalAnnotations(annotations = []) {
  if (!annotations || annotations.length === 0) {
    return [];
  }

  return annotations.map((annotation) => ({
    key: annotation.key,
    value: annotation.value,
  }));
}

module.exports = {
  toCanonicalModel,
};
