const {
  createAction,
  createAnnotation,
  createBlock,
  createComment,
  createDocument,
} = require("./ast");

const TOP_LEVEL_KEYWORDS = new Set([
  "process",
  "stateflow",
  "rule",
  "role",
  "policy",
  "metric",
  "event",
]);

function createSyntaxIssue(line, code, message) {
  return { line, code, message };
}

function parseDocument(tokens, filePath) {
  const state = {
    tokens,
    index: 0,
    issues: [],
  };
  const body = [];
  const trailingComments = [];

  while (!isAtEnd(state)) {
    const metadata = consumeMetadata(state, 0);

    if (isAtEnd(state)) {
      trailingComments.push(...metadata.comments);
      pushDanglingAnnotationIssues(state, metadata.annotations);
      break;
    }

    const line = peek(state);

    if (line.type === "BlankLineToken") {
      advance(state);
      continue;
    }

    if (line.level !== 0) {
      pushUnsupportedTargetIssues(state, metadata, line, "top-level block");
      state.issues.push(
        createSyntaxIssue(
          line.line,
          "syntax.indented-content-without-block",
          "Indented content must belong to a top-level block."
        )
      );
      advance(state);
      continue;
    }

    const node = parseTopLevelBlock(state, metadata);
    if (node) {
      body.push(node);
    }
  }

  return {
    ast: createDocument(filePath, body, { trailingComments }),
    issues: state.issues,
  };
}

function parseTopLevelBlock(state, metadata) {
  const line = advance(state);
  const match = line.text.match(
    /^(process|stateflow|rule|role|policy|metric|event)\s+([A-Za-z_][A-Za-z0-9_.-]*)$/
  );

  if (!match) {
    const keyword = firstWord(line.text);
    const message = TOP_LEVEL_KEYWORDS.has(keyword)
      ? `Top-level ${keyword} block requires a name.`
      : `Unknown top-level block \`${keyword || line.text}\`.`;
    state.issues.push(
      createSyntaxIssue(
        line.line,
        TOP_LEVEL_KEYWORDS.has(keyword)
          ? "syntax.top-level-name-required"
          : "syntax.unknown-top-level-block",
        message
      )
    );
    skipNestedBlock(state, 0);
    return null;
  }

  const [, kind, name] = match;
  const base = {
    line: line.line,
    annotations: metadata.annotations,
    leadingComments: metadata.comments,
  };

  if (kind === "process") {
    const bodyResult = parseStatementBlock(state, 1, "process");
    return createBlock("ProcessNode", name, {
      ...base,
      body: bodyResult.body,
      trailingComments: bodyResult.trailingComments,
    });
  }

  if (kind === "stateflow") {
    return parseStateflowBlock(state, name, base);
  }

  if (kind === "rule") {
    return parseRuleBlock(state, name, base);
  }

  if (kind === "role") {
    return parseRoleBlock(state, name, base);
  }

  if (kind === "policy") {
    return parsePolicyBlock(state, name, base);
  }

  if (kind === "metric") {
    return parseMetricBlock(state, name, base);
  }

  if (kind === "event") {
    const bodyResult = parseActionBlock(state, 1, "event");
    return createBlock("EventNode", name, {
      ...base,
      body: bodyResult.body,
      trailingComments: bodyResult.trailingComments,
    });
  }

  return null;
}

function parseRuleBlock(state, name, base) {
  let appliesTo = null;

  const scopeMetadata = consumeMetadata(state, 1);
  if (!isAtEnd(state) && checkLevel(state, 1) && peek(state).text.startsWith("applies to ")) {
    pushUnsupportedTargetIssues(state, scopeMetadata, peek(state), "`applies to` declarations");
    const line = advance(state);
    const match = line.text.match(/^applies to ([A-Za-z_][A-Za-z0-9_.-]*)$/);

    if (!match) {
      state.issues.push(
        createSyntaxIssue(
          line.line,
          "syntax.invalid-rule-scope",
          "`applies to` must reference a single entity identifier."
        )
      );
    } else {
      appliesTo = match[1];
    }
  } else {
    trailingOnlyMetadata(state, scopeMetadata);
  }

  const bodyResult = parseStatementBlock(state, 1, "rule");
  return createBlock("RuleNode", name, {
    ...base,
    appliesTo,
    body: bodyResult.body,
    trailingComments: bodyResult.trailingComments,
  });
}

function parseStateflowBlock(state, name, base) {
  const states = [];
  const transitions = [];

  while (!isAtEnd(state)) {
    const metadata = consumeMetadata(state, 1);

    if (isAtEnd(state) || !checkLevel(state, 1)) {
      trailingOnlyMetadata(state, metadata);
      break;
    }

    const line = peek(state);

    if (line.level !== 1) {
      pushUnsupportedTargetIssues(state, metadata, line, "stateflow sections");
      state.issues.push(
        createSyntaxIssue(
          line.line,
          "syntax.unexpected-stateflow-indentation",
          "Unexpected indentation inside stateflow block."
        )
      );
      advance(state);
      continue;
    }

    if (line.text === "states") {
      pushUnsupportedTargetIssues(state, metadata, line, "`states` sections");
      advance(state);
      states.push(...parseStateList(state, 2));
      continue;
    }

    if (line.text === "transitions") {
      pushUnsupportedTargetIssues(state, metadata, line, "`transitions` sections");
      advance(state);
      transitions.push(...parseTransitionList(state, 2));
      continue;
    }

    pushUnsupportedTargetIssues(state, metadata, line, "stateflow sections");
    state.issues.push(
      createSyntaxIssue(
        line.line,
        "syntax.invalid-stateflow-section",
        "Stateflow blocks may only contain `states` and `transitions` sections."
      )
    );
    advance(state);
  }

  return createBlock("StateflowNode", name, { ...base, states, transitions });
}

function parseRoleBlock(state, name, base) {
  const can = [];
  const cannot = [];

  while (!isAtEnd(state)) {
    const metadata = consumeMetadata(state, 1);

    if (isAtEnd(state) || !checkLevel(state, 1)) {
      trailingOnlyMetadata(state, metadata);
      break;
    }

    const line = peek(state);

    if (line.level !== 1) {
      pushUnsupportedTargetIssues(state, metadata, line, "role sections");
      state.issues.push(
        createSyntaxIssue(
          line.line,
          "syntax.unexpected-role-indentation",
          "Unexpected indentation inside role block."
        )
      );
      advance(state);
      continue;
    }

    if (line.text === "can" || line.text === "cannot") {
      pushUnsupportedTargetIssues(state, metadata, line, "permission sections");
      advance(state);
      const target = line.text === "can" ? can : cannot;
      target.push(...parsePermissionList(state, 2));
      continue;
    }

    pushUnsupportedTargetIssues(state, metadata, line, "role sections");
    state.issues.push(
      createSyntaxIssue(
        line.line,
        "syntax.invalid-role-section",
        "Role blocks may only contain `can` and `cannot` sections."
      )
    );
    advance(state);
  }

  return createBlock("RoleNode", name, { ...base, can, cannot });
}

function parsePolicyBlock(state, name, base) {
  const clauses = [];
  const trailingComments = [];

  while (!isAtEnd(state)) {
    const metadata = consumeMetadata(state, 1);

    if (isAtEnd(state) || !checkLevel(state, 1)) {
      trailingComments.push(...metadata.comments);
      pushDanglingAnnotationIssues(state, metadata.annotations);
      break;
    }

    const line = peek(state);

    if (line.level !== 1) {
      pushUnsupportedTargetIssues(state, metadata, line, "policy clauses");
      state.issues.push(
        createSyntaxIssue(
          line.line,
          "syntax.unexpected-policy-indentation",
          "Unexpected indentation inside policy block."
        )
      );
      advance(state);
      continue;
    }

    const match = line.text.match(/^when (.+)$/);
    if (!match) {
      pushUnsupportedTargetIssues(state, metadata, line, "policy clauses");
      state.issues.push(
        createSyntaxIssue(
          line.line,
          "syntax.policy-clause-must-start-with-when",
          "Policy blocks must start clauses with `when <condition>`."
        )
      );
      advance(state);
      continue;
    }

    advance(state);
    const condition = parseCondition(match[1], line.line, state.issues);

    const thenMetadata = consumeMetadata(state, 1);
    const thenLine = peek(state);
    if (!thenLine || thenLine.level !== 1 || thenLine.text !== "then") {
      pushUnsupportedTargetIssues(
        state,
        thenMetadata,
        thenLine || line,
        "policy clause targets"
      );
      state.issues.push(
        createSyntaxIssue(
          line.line,
          "syntax.policy-missing-then",
          "Policy `when` must be followed by a `then` line."
        )
      );
      continue;
    }

    pushUnsupportedTargetIssues(state, thenMetadata, thenLine, "`then` lines");
    advance(state);
    const bodyResult = parseActionBlock(state, 2, "policy");
    clauses.push({
      type: "PolicyClauseNode",
      condition,
      body: bodyResult.body,
      line: line.line,
      annotations: metadata.annotations,
      leadingComments: metadata.comments,
      trailingComments: bodyResult.trailingComments,
    });
  }

  return createBlock("PolicyNode", name, { ...base, clauses, trailingComments });
}

function parseMetricBlock(state, name, base) {
  let formula = null;
  let owner = null;
  let target = null;

  while (!isAtEnd(state)) {
    const metadata = consumeMetadata(state, 1);

    if (isAtEnd(state) || !checkLevel(state, 1)) {
      trailingOnlyMetadata(state, metadata);
      break;
    }

    const line = peek(state);

    if (line.level !== 1) {
      pushUnsupportedTargetIssues(state, metadata, line, "metric fields");
      state.issues.push(
        createSyntaxIssue(
          line.line,
          "syntax.unexpected-metric-indentation",
          "Unexpected indentation inside metric block."
        )
      );
      advance(state);
      continue;
    }

    pushUnsupportedTargetIssues(state, metadata, line, "metric fields");

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
      createSyntaxIssue(
        line.line,
        "syntax.invalid-metric-section",
        "Metric blocks may only contain `formula`, `owner`, and `target`."
      )
    );
    advance(state);
  }

  return createBlock("MetricNode", name, { ...base, formula, owner, target });
}

function parseStateList(state, expectedLevel) {
  const items = [];

  while (!isAtEnd(state)) {
    const metadata = consumeMetadata(state, expectedLevel);

    if (isAtEnd(state) || !checkLevel(state, expectedLevel)) {
      trailingOnlyMetadata(state, metadata);
      break;
    }

    const line = peek(state);
    if (line.level !== expectedLevel) {
      pushUnsupportedTargetIssues(state, metadata, line, "state declarations");
      break;
    }

    pushUnsupportedTargetIssues(state, metadata, line, "state declarations");
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

  while (!isAtEnd(state)) {
    const metadata = consumeMetadata(state, expectedLevel);

    if (isAtEnd(state) || !checkLevel(state, expectedLevel)) {
      trailingOnlyMetadata(state, metadata);
      break;
    }

    const line = peek(state);
    if (line.level !== expectedLevel) {
      pushUnsupportedTargetIssues(state, metadata, line, "transition declarations");
      break;
    }

    pushUnsupportedTargetIssues(state, metadata, line, "transition declarations");

    const match = line.text.match(
      /^([A-Za-z_][A-Za-z0-9_.-]*)\s*->\s*([A-Za-z_][A-Za-z0-9_.-]*)$/
    );

    if (!match) {
      state.issues.push(
        createSyntaxIssue(
          line.line,
          "syntax.invalid-transition-line",
          "Transition lines must use the form `source -> target`."
        )
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

  while (!isAtEnd(state)) {
    const metadata = consumeMetadata(state, expectedLevel);

    if (isAtEnd(state) || !checkLevel(state, expectedLevel)) {
      trailingOnlyMetadata(state, metadata);
      break;
    }

    const line = peek(state);
    if (line.level !== expectedLevel) {
      pushUnsupportedTargetIssues(state, metadata, line, "permission declarations");
      break;
    }

    pushUnsupportedTargetIssues(state, metadata, line, "permission declarations");
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
  const trailingComments = [];

  while (!isAtEnd(state)) {
    const metadata = consumeMetadata(state, expectedLevel);
    const line = peek(state);

    if (!line || line.level < expectedLevel) {
      trailingComments.push(...metadata.comments);
      pushDanglingAnnotationIssues(state, metadata.annotations);
      break;
    }

    if (line.level > expectedLevel) {
      trailingComments.push(...metadata.comments);
      pushDanglingAnnotationIssues(state, metadata.annotations);
      state.issues.push(
        createSyntaxIssue(
          line.line,
          "syntax.unexpected-indentation",
          "Unexpected indentation. Missing parent statement or section."
        )
      );
      advance(state);
      continue;
    }

    if (line.text === "else" || line.text.startsWith("else if ")) {
      pushUnsupportedTargetIssues(state, metadata, line, "`else` branches");
      break;
    }

    if (line.text === "then") {
      pushUnsupportedTargetIssues(state, metadata, line, "`then` lines");
      state.issues.push(
        createSyntaxIssue(
          line.line,
          "syntax.unexpected-then",
          "`then` may only appear as its own line inside a policy block."
        )
      );
      advance(state);
      continue;
    }

    if (line.text.startsWith("when ")) {
      if (context !== "process") {
        pushUnsupportedTargetIssues(state, metadata, line, "`when` statements");
        state.issues.push(
          createSyntaxIssue(
            line.line,
            "syntax.when-only-in-process",
            "`when` statements are only allowed in `process` blocks."
          )
        );
        advance(state);
        continue;
      }

      body.push(parseWhenStatement(state, metadata));
      continue;
    }

    if (line.text.startsWith("if ")) {
      body.push(parseIfStatement(state, expectedLevel, context, metadata));
      continue;
    }

    const action = parseActionStatement(state, line, metadata);
    if (action) {
      body.push(action);
      advance(state);
      continue;
    }

    pushUnsupportedTargetIssues(state, metadata, line, `${context} statements`);
    state.issues.push(
      createSyntaxIssue(
        line.line,
        "syntax.unexpected-statement",
        `Unexpected statement \`${firstWord(line.text)}\` in ${context} block.`
      )
    );
    advance(state);
  }

  return { body, trailingComments };
}

function parseActionBlock(state, expectedLevel, context) {
  const body = [];
  const trailingComments = [];

  while (!isAtEnd(state)) {
    const metadata = consumeMetadata(state, expectedLevel);
    const line = peek(state);

    if (!line || line.level < expectedLevel) {
      trailingComments.push(...metadata.comments);
      pushDanglingAnnotationIssues(state, metadata.annotations);
      break;
    }

    if (line.level > expectedLevel) {
      trailingComments.push(...metadata.comments);
      pushDanglingAnnotationIssues(state, metadata.annotations);
      state.issues.push(
        createSyntaxIssue(
          line.line,
          "syntax.unexpected-indentation",
          "Unexpected indentation. Missing parent statement or section."
        )
      );
      advance(state);
      continue;
    }

    if (line.text === "else" || line.text.startsWith("else if ") || line.text === "then") {
      pushUnsupportedTargetIssues(state, metadata, line, `${context} action targets`);
      break;
    }

    const action = parseActionStatement(state, line, metadata);
    if (!action) {
      pushUnsupportedTargetIssues(state, metadata, line, `${context} action targets`);
      state.issues.push(
        createSyntaxIssue(
          line.line,
          "syntax.expected-action-statement",
          `Expected an action statement in ${context} block.`
        )
      );
      advance(state);
      continue;
    }

    body.push(action);
    advance(state);
  }

  return { body, trailingComments };
}

function parseWhenStatement(state, metadata) {
  const line = advance(state);
  const match = line.text.match(/^when ([A-Za-z_][A-Za-z0-9_.-]*)$/);

  if (!match) {
    state.issues.push(
      createSyntaxIssue(
        line.line,
        "syntax.invalid-process-when",
        "Process `when` must declare a single event trigger like `lead.created`."
      )
    );
    return createAction("WhenNode", {
      trigger: null,
      line: line.line,
      annotations: metadata.annotations,
      leadingComments: metadata.comments,
    });
  }

  return createAction("WhenNode", {
    trigger: createFieldReferenceNode(match[1]),
    line: line.line,
    annotations: metadata.annotations,
    leadingComments: metadata.comments,
  });
}

function parseIfStatement(state, expectedLevel, context, metadata) {
  const line = advance(state);
  const match = line.text.match(/^if (.+) then$/);

  if (!match) {
    state.issues.push(
      createSyntaxIssue(
        line.line,
        "syntax.invalid-if-statement",
        "`if` statements must use the form `if <condition> then`."
      )
    );
    return createAction("IfNode", {
      condition: null,
      then: [],
      elseIf: [],
      else: null,
      line: line.line,
      annotations: metadata.annotations,
      leadingComments: metadata.comments,
    });
  }

  const thenBody = parseStatementBlock(state, expectedLevel + 1, context);
  const elseIf = [];
  let elseNode = null;

  while (!isAtEnd(state) && isElseIfLine(state, expectedLevel)) {
    const branchMetadata = consumeMetadata(state, expectedLevel);
    const elseIfLine = advance(state);
    const elseIfMatch = elseIfLine.text.match(/^else if (.+) then$/);

    if (!elseIfMatch) {
      state.issues.push(
        createSyntaxIssue(
          elseIfLine.line,
          "syntax.invalid-else-if-statement",
          "`else if` statements must use the form `else if <condition> then`."
        )
      );
      continue;
    }

    const branchBody = parseStatementBlock(state, expectedLevel + 1, context);
    elseIf.push({
      type: "ElseIfNode",
      condition: parseCondition(elseIfMatch[1], elseIfLine.line, state.issues),
      then: branchBody.body,
      line: elseIfLine.line,
      annotations: branchMetadata.annotations,
      leadingComments: branchMetadata.comments,
      trailingComments: branchBody.trailingComments,
    });
  }

  if (!isAtEnd(state) && isElseLine(state, expectedLevel)) {
    const elseMetadata = consumeMetadata(state, expectedLevel);
    const elseLine = advance(state);
    const elseBody = parseStatementBlock(state, expectedLevel + 1, context);
    elseNode = {
      type: "ElseNode",
      body: elseBody.body,
      line: elseLine.line,
      annotations: elseMetadata.annotations,
      leadingComments: elseMetadata.comments,
      trailingComments: elseBody.trailingComments,
    };
  }

  return createAction("IfNode", {
    condition: parseCondition(match[1], line.line, state.issues),
    then: thenBody.body,
    elseIf,
    else: elseNode,
    line: line.line,
    annotations: metadata.annotations,
    leadingComments: metadata.comments,
    trailingComments: thenBody.trailingComments,
  });
}

function parseActionStatement(state, line, metadata) {
  if (line.text.startsWith("assign ")) {
    const match = line.text.match(/^assign ([A-Za-z_][A-Za-z0-9_.-]*) = (.+)$/);
    if (!match) {
      state.issues.push(
        createSyntaxIssue(
          line.line,
          "syntax.invalid-assign-statement",
          "`assign` must use the form `assign field = value`."
        )
      );
      return createAction("AssignNode", {
        target: null,
        value: null,
        line: line.line,
        annotations: metadata.annotations,
        leadingComments: metadata.comments,
      });
    }

    return createAction("AssignNode", {
      target: createFieldReferenceNode(match[1]),
      value: parseExpression(match[2]),
      line: line.line,
      annotations: metadata.annotations,
      leadingComments: metadata.comments,
    });
  }

  if (line.text.startsWith("transition ")) {
    const match = line.text.match(/^transition ([A-Za-z_][A-Za-z0-9_.-]*) to (.+)$/);
    if (!match) {
      state.issues.push(
        createSyntaxIssue(
          line.line,
          "syntax.invalid-transition-statement",
          "`transition` must use the form `transition field to value`."
        )
      );
      return createAction("TransitionNode", {
        target: null,
        value: null,
        line: line.line,
        annotations: metadata.annotations,
        leadingComments: metadata.comments,
      });
    }

    return createAction("TransitionNode", {
      target: createFieldReferenceNode(match[1]),
      value: parseExpression(match[2]),
      line: line.line,
      annotations: metadata.annotations,
      leadingComments: metadata.comments,
    });
  }

  if (line.text.startsWith("notify ")) {
    const match = line.text.match(/^notify ([A-Za-z_][A-Za-z0-9_.-]*) with "([^"]*)"$/);
    if (!match) {
      state.issues.push(
        createSyntaxIssue(
          line.line,
          "syntax.invalid-notify-statement",
          "`notify` must use the form `notify target with \"message\"`."
        )
      );
      return createAction("NotifyNode", {
        target: null,
        message: null,
        line: line.line,
        annotations: metadata.annotations,
        leadingComments: metadata.comments,
      });
    }

    return createAction("NotifyNode", {
      target: match[1],
      message: match[2],
      line: line.line,
      annotations: metadata.annotations,
      leadingComments: metadata.comments,
    });
  }

  if (line.text.startsWith("create ")) {
    const match = line.text.match(/^create ([A-Za-z_][A-Za-z0-9_.-]*)$/);
    if (!match) {
      state.issues.push(
        createSyntaxIssue(
          line.line,
          "syntax.invalid-create-statement",
          "`create` must reference a single entity identifier."
        )
      );
      return createAction("CreateNode", {
        entity: null,
        line: line.line,
        annotations: metadata.annotations,
        leadingComments: metadata.comments,
      });
    }

    return createAction("CreateNode", {
      entity: match[1],
      line: line.line,
      annotations: metadata.annotations,
      leadingComments: metadata.comments,
    });
  }

  if (line.text.startsWith("update ")) {
    const match = line.text.match(/^update ([A-Za-z_][A-Za-z0-9_.-]*) = (.+)$/);
    if (!match) {
      state.issues.push(
        createSyntaxIssue(
          line.line,
          "syntax.invalid-update-statement",
          "`update` must use the form `update field = value`."
        )
      );
      return createAction("UpdateNode", {
        target: null,
        value: null,
        line: line.line,
        annotations: metadata.annotations,
        leadingComments: metadata.comments,
      });
    }

    return createAction("UpdateNode", {
      target: createFieldReferenceNode(match[1]),
      value: parseExpression(match[2]),
      line: line.line,
      annotations: metadata.annotations,
      leadingComments: metadata.comments,
    });
  }

  if (line.text.startsWith("require ")) {
    const match = line.text.match(/^require ([A-Za-z_][A-Za-z0-9_.-]*)$/);
    if (!match) {
      state.issues.push(
        createSyntaxIssue(
          line.line,
          "syntax.invalid-require-statement",
          "`require` must reference a single named requirement token."
        )
      );
      return createAction("RequireNode", {
        requirement: null,
        line: line.line,
        annotations: metadata.annotations,
        leadingComments: metadata.comments,
      });
    }

    return createAction("RequireNode", {
      requirement: match[1],
      line: line.line,
      annotations: metadata.annotations,
      leadingComments: metadata.comments,
    });
  }

  if (line.text === "stop") {
    return createAction("StopNode", {
      line: line.line,
      annotations: metadata.annotations,
      leadingComments: metadata.comments,
    });
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
    issues.push(
      createSyntaxIssue(
        line,
        "syntax.invalid-condition",
        "Conditions must use a comparison operator."
      )
    );
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

function consumeMetadata(state, level) {
  const comments = [];
  const annotations = [];

  while (!isAtEnd(state)) {
    const token = peek(state);

    if (token.type === "BlankLineToken") {
      if (annotations.length > 0) {
        pushDanglingAnnotationIssues(state, annotations);
        annotations.length = 0;
      }
      advance(state);
      continue;
    }

    if (token.type === "InvalidLineToken") {
      state.issues.push(createSyntaxIssue(token.line, token.code, token.message));
      advance(state);
      continue;
    }

    if (token.level !== level) {
      break;
    }

    if (token.type === "CommentToken") {
      comments.push(createComment(token.text, token.line));
      advance(state);
      continue;
    }

    if (token.type === "AnnotationToken") {
      annotations.push(createAnnotation(token.key, token.value, token.line));
      advance(state);
      continue;
    }

    break;
  }

  return { comments, annotations };
}

function pushDanglingAnnotationIssues(state, annotations) {
  for (const annotation of annotations) {
    state.issues.push(
      createSyntaxIssue(
        annotation.line,
        "syntax.dangling-annotation",
        "Annotations must attach directly to the following supported block or statement."
      )
    );
  }
}

function pushUnsupportedTargetIssues(state, metadata, line, targetDescription) {
  for (const comment of metadata.comments || []) {
    state.issues.push(
      createSyntaxIssue(
        comment.line,
        "syntax.comment-target-not-supported",
        `Comments may only attach to top-level blocks and statement lines in v1, not to ${targetDescription}.`
      )
    );
  }

  for (const annotation of metadata.annotations || []) {
    state.issues.push(
      createSyntaxIssue(
        annotation.line,
        "syntax.annotation-target-not-supported",
        `Annotations may only attach to top-level blocks and statement lines in v1, not to ${targetDescription}.`
      )
    );
  }
}

function trailingOnlyMetadata(state, metadata) {
  pushDanglingAnnotationIssues(state, metadata.annotations || []);
}

function skipNestedBlock(state, level) {
  while (!isAtEnd(state)) {
    const token = peek(state);
    if (token.type === "BlankLineToken") {
      advance(state);
      continue;
    }

    if (token.level <= level) {
      break;
    }

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
  return !isAtEnd(state) && peek(state).type !== "BlankLineToken" && peek(state).level === level;
}

function isElseIfLine(state, level) {
  return (
    checkLevel(state, level) &&
    peek(state).type === "LineToken" &&
    peek(state).text.startsWith("else if ")
  );
}

function isElseLine(state, level) {
  return checkLevel(state, level) && peek(state).type === "LineToken" && peek(state).text === "else";
}

module.exports = {
  parseDocument,
};
