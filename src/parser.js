const { createAction, createBlock, createDocument } = require("./ast");

const TOP_LEVEL_KEYWORDS = new Set([
  "process",
  "stateflow",
  "rule",
  "role",
  "policy",
  "metric",
  "event",
]);

function createSyntaxIssue(line, message) {
  return { line, message };
}

function parseDocument(tokens, filePath) {
  const state = {
    tokens,
    index: 0,
    issues: [],
  };
  const body = [];

  while (!isAtEnd(state)) {
    const line = peek(state);

    if (line.level !== 0) {
      state.issues.push(
        createSyntaxIssue(line.line, "Indented content must belong to a top-level block.")
      );
      advance(state);
      continue;
    }

    const node = parseTopLevelBlock(state);
    if (node) {
      body.push(node);
    }
  }

  return {
    ast: createDocument(filePath, body),
    issues: state.issues,
  };
}

function parseTopLevelBlock(state) {
  const line = advance(state);
  const match = line.text.match(
    /^(process|stateflow|rule|role|policy|metric|event)\s+([A-Za-z_][A-Za-z0-9_.-]*)$/
  );

  if (!match) {
    const keyword = firstWord(line.text);
    const message = TOP_LEVEL_KEYWORDS.has(keyword)
      ? `Top-level ${keyword} block requires a name.`
      : `Unknown top-level block \`${keyword || line.text}\`.`;
    state.issues.push(createSyntaxIssue(line.line, message));
    skipNestedBlock(state, 0);
    return null;
  }

  const [, kind, name] = match;

  if (kind === "process") {
    return createBlock("ProcessNode", name, {
      body: parseStatementBlock(state, 1, "process"),
    });
  }

  if (kind === "stateflow") {
    return parseStateflowBlock(state, name);
  }

  if (kind === "rule") {
    return parseRuleBlock(state, name);
  }

  if (kind === "role") {
    return parseRoleBlock(state, name);
  }

  if (kind === "policy") {
    return parsePolicyBlock(state, name);
  }

  if (kind === "metric") {
    return parseMetricBlock(state, name);
  }

  if (kind === "event") {
    return createBlock("EventNode", name, {
      body: parseActionBlock(state, 1, "event"),
    });
  }

  return null;
}

function parseRuleBlock(state, name) {
  let appliesTo = null;

  if (checkLevel(state, 1) && peek(state).text.startsWith("applies to ")) {
    const line = advance(state);
    const match = line.text.match(/^applies to ([A-Za-z_][A-Za-z0-9_.-]*)$/);

    if (!match) {
      state.issues.push(
        createSyntaxIssue(line.line, "`applies to` must reference a single entity identifier.")
      );
    } else {
      appliesTo = match[1];
    }
  }

  return createBlock("RuleNode", name, {
    appliesTo,
    body: parseStatementBlock(state, 1, "rule"),
  });
}

function parseStateflowBlock(state, name) {
  const states = [];
  const transitions = [];

  while (!isAtEnd(state) && peek(state).level > 0) {
    const line = peek(state);

    if (line.level !== 1) {
      state.issues.push(
        createSyntaxIssue(line.line, "Unexpected indentation inside stateflow block.")
      );
      advance(state);
      continue;
    }

    if (line.text === "states") {
      advance(state);
      states.push(...parseStateList(state, 2));
      continue;
    }

    if (line.text === "transitions") {
      advance(state);
      transitions.push(...parseTransitionList(state, 2));
      continue;
    }

    state.issues.push(
      createSyntaxIssue(
        line.line,
        "Stateflow blocks may only contain `states` and `transitions` sections."
      )
    );
    advance(state);
  }

  return createBlock("StateflowNode", name, { states, transitions });
}

function parseRoleBlock(state, name) {
  const can = [];
  const cannot = [];

  while (!isAtEnd(state) && peek(state).level > 0) {
    const line = peek(state);

    if (line.level !== 1) {
      state.issues.push(createSyntaxIssue(line.line, "Unexpected indentation inside role block."));
      advance(state);
      continue;
    }

    if (line.text === "can" || line.text === "cannot") {
      advance(state);
      const target = line.text === "can" ? can : cannot;
      target.push(...parsePermissionList(state, 2));
      continue;
    }

    state.issues.push(
      createSyntaxIssue(line.line, "Role blocks may only contain `can` and `cannot` sections.")
    );
    advance(state);
  }

  return createBlock("RoleNode", name, { can, cannot });
}

function parsePolicyBlock(state, name) {
  const clauses = [];

  while (!isAtEnd(state) && peek(state).level > 0) {
    const line = peek(state);

    if (line.level !== 1) {
      state.issues.push(createSyntaxIssue(line.line, "Unexpected indentation inside policy block."));
      advance(state);
      continue;
    }

    const match = line.text.match(/^when (.+)$/);
    if (!match) {
      state.issues.push(
        createSyntaxIssue(line.line, "Policy blocks must start clauses with `when <condition>`.")
      );
      advance(state);
      continue;
    }

    advance(state);
    const condition = parseCondition(match[1], line.line, state.issues);

    const thenLine = peek(state);
    if (!thenLine || thenLine.level !== 1 || thenLine.text !== "then") {
      state.issues.push(
        createSyntaxIssue(line.line, "Policy `when` must be followed by a `then` line.")
      );
      continue;
    }

    advance(state);
    const body = parseActionBlock(state, 2, "policy");
    clauses.push({
      type: "PolicyClauseNode",
      condition,
      body,
      line: line.line,
    });
  }

  return createBlock("PolicyNode", name, { clauses });
}

function parseMetricBlock(state, name) {
  let formula = null;
  let owner = null;
  let target = null;

  while (!isAtEnd(state) && peek(state).level > 0) {
    const line = peek(state);

    if (line.level !== 1) {
      state.issues.push(createSyntaxIssue(line.line, "Unexpected indentation inside metric block."));
      advance(state);
      continue;
    }

    if (line.text.startsWith("formula ")) {
      advance(state);
      formula = line.text.slice("formula ".length);
      continue;
    }

    if (line.text.startsWith("owner ")) {
      advance(state);
      owner = line.text.slice("owner ".length);
      continue;
    }

    if (line.text.startsWith("target ")) {
      advance(state);
      target = line.text.slice("target ".length);
      continue;
    }

    state.issues.push(
      createSyntaxIssue(line.line, "Metric blocks may only contain `formula`, `owner`, and `target`.")
    );
    advance(state);
  }

  return createBlock("MetricNode", name, { formula, owner, target });
}

function parseStateList(state, expectedLevel) {
  const items = [];

  while (!isAtEnd(state) && peek(state).level > 1) {
    const line = peek(state);
    if (line.level !== expectedLevel) {
      break;
    }

    items.push({
      type: "StateNode",
      value: line.text,
      line: line.line,
    });
    advance(state);
  }

  return items;
}

function parseTransitionList(state, expectedLevel) {
  const items = [];

  while (!isAtEnd(state) && peek(state).level > 1) {
    const line = peek(state);
    if (line.level !== expectedLevel) {
      break;
    }

    const match = line.text.match(
      /^([A-Za-z_][A-Za-z0-9_.-]*)\s*->\s*([A-Za-z_][A-Za-z0-9_.-]*)$/
    );

    if (!match) {
      state.issues.push(
        createSyntaxIssue(line.line, "Transition lines must use the form `source -> target`.")
      );
      advance(state);
      continue;
    }

    items.push({
      type: "TransitionEdgeNode",
      from: match[1],
      to: match[2],
      line: line.line,
    });
    advance(state);
  }

  return items;
}

function parsePermissionList(state, expectedLevel) {
  const items = [];

  while (!isAtEnd(state) && peek(state).level > 1) {
    const line = peek(state);
    if (line.level !== expectedLevel) {
      break;
    }

    items.push({
      type: "PermissionNode",
      value: line.text,
      line: line.line,
    });
    advance(state);
  }

  return items;
}

function parseStatementBlock(state, expectedLevel, context) {
  const body = [];

  while (!isAtEnd(state)) {
    const line = peek(state);

    if (line.level < expectedLevel) {
      break;
    }

    if (line.level > expectedLevel) {
      state.issues.push(
        createSyntaxIssue(line.line, "Unexpected indentation. Missing parent statement or section.")
      );
      advance(state);
      continue;
    }

    if (line.text === "else" || line.text.startsWith("else if ")) {
      break;
    }

    if (line.text === "then") {
      state.issues.push(
        createSyntaxIssue(line.line, "`then` may only appear as its own line inside a policy block.")
      );
      advance(state);
      continue;
    }

    if (line.text.startsWith("when ")) {
      if (context !== "process") {
        state.issues.push(
          createSyntaxIssue(line.line, "`when` statements are only allowed in `process` blocks.")
        );
        advance(state);
        continue;
      }

      body.push(parseWhenStatement(state));
      continue;
    }

    if (line.text.startsWith("if ")) {
      body.push(parseIfStatement(state, expectedLevel, context));
      continue;
    }

    const action = parseActionStatement(state, line);
    if (action) {
      body.push(action);
      advance(state);
      continue;
    }

    state.issues.push(
      createSyntaxIssue(line.line, `Unexpected statement \`${firstWord(line.text)}\` in ${context} block.`)
    );
    advance(state);
  }

  return body;
}

function parseActionBlock(state, expectedLevel, context) {
  const body = [];

  while (!isAtEnd(state)) {
    const line = peek(state);

    if (line.level < expectedLevel) {
      break;
    }

    if (line.level > expectedLevel) {
      state.issues.push(
        createSyntaxIssue(line.line, "Unexpected indentation. Missing parent statement or section.")
      );
      advance(state);
      continue;
    }

    if (line.text === "else" || line.text.startsWith("else if ") || line.text === "then") {
      break;
    }

    const action = parseActionStatement(state, line);
    if (!action) {
      state.issues.push(
        createSyntaxIssue(line.line, `Expected an action statement in ${context} block.`)
      );
      advance(state);
      continue;
    }

    body.push(action);
    advance(state);
  }

  return body;
}

function parseWhenStatement(state) {
  const line = advance(state);
  const match = line.text.match(/^when ([A-Za-z_][A-Za-z0-9_.-]*)$/);

  if (!match) {
    state.issues.push(
      createSyntaxIssue(line.line, "Process `when` must declare a single event trigger like `lead.created`.")
    );
    return {
      type: "WhenNode",
      trigger: null,
      line: line.line,
    };
  }

  return {
    type: "WhenNode",
    trigger: createFieldReferenceNode(match[1]),
    line: line.line,
  };
}

function parseIfStatement(state, expectedLevel, context) {
  const line = advance(state);
  const match = line.text.match(/^if (.+) then$/);

  if (!match) {
    state.issues.push(
      createSyntaxIssue(line.line, "`if` statements must use the form `if <condition> then`.")
    );
    return {
      type: "IfNode",
      condition: null,
      then: [],
      elseIf: [],
      else: null,
      line: line.line,
    };
  }

  const thenBody = parseStatementBlock(state, expectedLevel + 1, context);
  const elseIf = [];
  let elseNode = null;

  while (!isAtEnd(state) && checkLevel(state, expectedLevel) && peek(state).text.startsWith("else if ")) {
    const elseIfLine = advance(state);
    const elseIfMatch = elseIfLine.text.match(/^else if (.+) then$/);

    if (!elseIfMatch) {
      state.issues.push(
        createSyntaxIssue(elseIfLine.line, "`else if` statements must use the form `else if <condition> then`.")
      );
      continue;
    }

    elseIf.push({
      type: "ElseIfNode",
      condition: parseCondition(elseIfMatch[1], elseIfLine.line, state.issues),
      then: parseStatementBlock(state, expectedLevel + 1, context),
      line: elseIfLine.line,
    });
  }

  if (!isAtEnd(state) && checkLevel(state, expectedLevel) && peek(state).text === "else") {
    const elseLine = advance(state);
    elseNode = {
      type: "ElseNode",
      body: parseStatementBlock(state, expectedLevel + 1, context),
      line: elseLine.line,
    };
  }

  return {
    type: "IfNode",
    condition: parseCondition(match[1], line.line, state.issues),
    then: thenBody,
    elseIf,
    else: elseNode,
    line: line.line,
  };
}

function parseActionStatement(state, line) {
  if (line.text.startsWith("assign ")) {
    const match = line.text.match(/^assign ([A-Za-z_][A-Za-z0-9_.-]*) = (.+)$/);
    if (!match) {
      state.issues.push(createSyntaxIssue(line.line, "`assign` must use the form `assign field = value`."));
      return createAction("AssignNode", { target: null, value: null, line: line.line });
    }

    return createAction("AssignNode", {
      target: createFieldReferenceNode(match[1]),
      value: parseExpression(match[2]),
      line: line.line,
    });
  }

  if (line.text.startsWith("transition ")) {
    const match = line.text.match(/^transition ([A-Za-z_][A-Za-z0-9_.-]*) to (.+)$/);
    if (!match) {
      state.issues.push(
        createSyntaxIssue(line.line, "`transition` must use the form `transition field to value`.")
      );
      return createAction("TransitionNode", { target: null, value: null, line: line.line });
    }

    return createAction("TransitionNode", {
      target: createFieldReferenceNode(match[1]),
      value: parseExpression(match[2]),
      line: line.line,
    });
  }

  if (line.text.startsWith("notify ")) {
    const match = line.text.match(/^notify ([A-Za-z_][A-Za-z0-9_.-]*) with "([^"]*)"$/);
    if (!match) {
      state.issues.push(
        createSyntaxIssue(line.line, "`notify` must use the form `notify target with \"message\"`.")
      );
      return createAction("NotifyNode", { target: null, message: null, line: line.line });
    }

    return createAction("NotifyNode", {
      target: match[1],
      message: match[2],
      line: line.line,
    });
  }

  if (line.text.startsWith("create ")) {
    const match = line.text.match(/^create ([A-Za-z_][A-Za-z0-9_.-]*)$/);
    if (!match) {
      state.issues.push(createSyntaxIssue(line.line, "`create` must reference a single entity identifier."));
      return createAction("CreateNode", { entity: null, line: line.line });
    }

    return createAction("CreateNode", {
      entity: match[1],
      line: line.line,
    });
  }

  if (line.text.startsWith("update ")) {
    const match = line.text.match(/^update ([A-Za-z_][A-Za-z0-9_.-]*) = (.+)$/);
    if (!match) {
      state.issues.push(createSyntaxIssue(line.line, "`update` must use the form `update field = value`."));
      return createAction("UpdateNode", { target: null, value: null, line: line.line });
    }

    return createAction("UpdateNode", {
      target: createFieldReferenceNode(match[1]),
      value: parseExpression(match[2]),
      line: line.line,
    });
  }

  if (line.text.startsWith("require ")) {
    const match = line.text.match(/^require ([A-Za-z_][A-Za-z0-9_.-]*)$/);
    if (!match) {
      state.issues.push(
        createSyntaxIssue(line.line, "`require` must reference a single named requirement token.")
      );
      return createAction("RequireNode", { requirement: null, line: line.line });
    }

    return createAction("RequireNode", {
      requirement: match[1],
      line: line.line,
    });
  }

  if (line.text === "stop") {
    return createAction("StopNode", { line: line.line });
  }

  return null;
}

function parseCondition(text, line, issues) {
  const parts = text.split(/\s+(and|or)\s+/);
  const conditions = [];
  let logicalOperator = null;

  for (let index = 0; index < parts.length; index += 1) {
    if (index % 2 === 1) {
      if (!logicalOperator) {
        logicalOperator = parts[index];
      }
      continue;
    }

    conditions.push(parseComparison(parts[index], line, issues));
  }

  if (conditions.length === 1) {
    return conditions[0];
  }

  return {
    type: "LogicalConditionNode",
    operator: logicalOperator || "and",
    conditions,
    line,
  };
}

function parseComparison(text, line, issues) {
  const match = text.match(/^(.*?)\s*(=|!=|<=|>=|<|>)\s*(.*?)$/);

  if (!match) {
    issues.push(createSyntaxIssue(line, "Conditions must use a comparison operator."));
    return {
      type: "ComparisonConditionNode",
      left: null,
      operator: null,
      right: null,
      line,
    };
  }

  return {
    type: "ComparisonConditionNode",
    left: parseExpression(match[1].trim()),
    operator: match[2],
    right: parseExpression(match[3].trim()),
    line,
  };
}

function parseExpression(text) {
  if (/^"([^"]*)"$/.test(text)) {
    return { type: "LiteralNode", valueType: "string", value: text.slice(1, -1) };
  }

  if (/^-?\d+(\.\d+)?$/.test(text)) {
    return { type: "LiteralNode", valueType: "number", value: Number(text) };
  }

  if (text === "true" || text === "false") {
    return { type: "LiteralNode", valueType: "boolean", value: text === "true" };
  }

  if (/^[A-Za-z_][A-Za-z0-9_.-]*$/.test(text)) {
    if (text.includes(".")) {
      return createFieldReferenceNode(text);
    }

    return { type: "IdentifierNode", value: text };
  }

  return { type: "LiteralNode", valueType: "raw", value: text };
}

function createFieldReferenceNode(path) {
  return {
    type: "FieldReferenceNode",
    path,
  };
}

function skipNestedBlock(state, level) {
  while (!isAtEnd(state) && peek(state).level > level) {
    advance(state);
  }
}

function firstWord(text) {
  const match = text.match(/^([A-Za-z_][A-Za-z0-9_-]*)/);
  return match ? match[1] : "";
}

function peek(state) {
  return state.tokens[state.index];
}

function advance(state) {
  const token = state.tokens[state.index];
  state.index += 1;
  return token;
}

function isAtEnd(state) {
  return state.index >= state.tokens.length;
}

function checkLevel(state, level) {
  return !isAtEnd(state) && peek(state).level === level;
}

module.exports = {
  parseDocument,
};
