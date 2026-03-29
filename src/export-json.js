function toCanonicalModel(ast) {
  return {
    version: "0.2",
    type: "document",
    body: ast.body.map(toCanonicalNode),
  };
}

function toCanonicalNode(node) {
  if (node.type === "ProcessNode") {
    return {
      type: "process",
      name: node.name,
      body: node.body.map(toCanonicalStatement),
    };
  }

  if (node.type === "StateflowNode") {
    return {
      type: "stateflow",
      name: node.name,
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
      appliesTo: node.appliesTo,
      body: node.body.map(toCanonicalStatement),
    };
  }

  if (node.type === "RoleNode") {
    return {
      type: "role",
      name: node.name,
      can: node.can.map((permission) => permission.value),
      cannot: node.cannot.map((permission) => permission.value),
    };
  }

  if (node.type === "PolicyNode") {
    return {
      type: "policy",
      name: node.name,
      clauses: node.clauses.map((clause) => ({
        condition: toCanonicalCondition(clause.condition),
        then: clause.body.map(toCanonicalStatement),
      })),
    };
  }

  if (node.type === "MetricNode") {
    return {
      type: "metric",
      name: node.name,
      formula: node.formula,
      owner: node.owner,
      target: node.target,
    };
  }

  if (node.type === "EventNode") {
    return {
      type: "event",
      name: node.name,
      body: node.body.map(toCanonicalStatement),
    };
  }

  return { type: node.type, name: node.name };
}

function toCanonicalStatement(statement) {
  if (statement.type === "WhenNode") {
    return {
      type: "when",
      trigger: statement.trigger ? statement.trigger.path : null,
    };
  }

  if (statement.type === "IfNode") {
    return {
      type: "if",
      condition: toCanonicalCondition(statement.condition),
      then: statement.then.map(toCanonicalStatement),
      elseIf: statement.elseIf.map((branch) => ({
        condition: toCanonicalCondition(branch.condition),
        then: branch.then.map(toCanonicalStatement),
      })),
      else: statement.else ? statement.else.body.map(toCanonicalStatement) : null,
    };
  }

  if (statement.type === "AssignNode") {
    return {
      type: "assign",
      target: statement.target ? statement.target.path : null,
      value: toCanonicalExpression(statement.value),
    };
  }

  if (statement.type === "TransitionNode") {
    return {
      type: "transition",
      target: statement.target ? statement.target.path : null,
      value: toCanonicalExpression(statement.value),
    };
  }

  if (statement.type === "NotifyNode") {
    return {
      type: "notify",
      target: statement.target,
      message: statement.message,
    };
  }

  if (statement.type === "CreateNode") {
    return {
      type: "create",
      entity: statement.entity,
    };
  }

  if (statement.type === "UpdateNode") {
    return {
      type: "update",
      target: statement.target ? statement.target.path : null,
      value: toCanonicalExpression(statement.value),
    };
  }

  if (statement.type === "RequireNode") {
    return {
      type: "require",
      requirement: statement.requirement,
    };
  }

  if (statement.type === "StopNode") {
    return { type: "stop" };
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

module.exports = {
  toCanonicalModel,
};
