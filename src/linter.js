const SEVERITY = {
  error: "error",
  warning: "warning",
  info: "info",
};

const SEVERITY_RANK = {
  error: 0,
  warning: 1,
  info: 2,
};

const RULES = {
  "lint.process-missing-trigger": { severity: SEVERITY.warning },
  "lint.process-multiple-triggers": { severity: SEVERITY.error },
  "lint.process-trigger-order": { severity: SEVERITY.info },
  "lint.rule-missing-scope": { severity: SEVERITY.info },
  "lint.state-orphaned": { severity: SEVERITY.warning },
  "lint.state-no-incoming": { severity: SEVERITY.info },
  "lint.role-conflicting-permission": { severity: SEVERITY.error },
  "lint.unreachable-statement": { severity: SEVERITY.warning },
  "lint.comment-hidden-business-rule": { severity: SEVERITY.warning },
  "lint.comment-hidden-requirement": { severity: SEVERITY.warning },
  "lint.comment-hidden-permission": { severity: SEVERITY.warning },
  "lint.comment-language-mismatch": { severity: SEVERITY.warning },
  "lint.annotation-language-mismatch": { severity: SEVERITY.warning },
};

function lintDocument(ast) {
  const findings = [];
  const documentLanguages = ast.metadata ? ast.metadata.languages || {} : {};

  lintComments(ast.trailingComments || [], findings, documentLanguages.comments);

  for (const node of ast.body) {
    lintNode(node, findings, documentLanguages);
  }

  return sortFindings(findings);
}

function summarizeFindings(findings) {
  const summary = {
    error: 0,
    warning: 0,
    info: 0,
  };

  for (const finding of findings) {
    summary[finding.severity] += 1;
  }

  return summary;
}

function renderLintReport(filePath, findings) {
  if (findings.length === 0) {
    return [`LINT ${filePath}`, "  status: passed", "  summary: 0 error(s), 0 warning(s), 0 info"];
  }

  const summary = summarizeFindings(findings);
  const lines = [
    `LINT ${filePath}`,
    `  status: ${summary.error > 0 ? "failed" : "passed"}`,
    `  summary: ${summary.error} error(s), ${summary.warning} warning(s), ${summary.info} info`,
  ];

  for (const finding of findings) {
    lines.push(
      `  ${finding.severity.toUpperCase()} ${finding.code} ${filePath}:${finding.line} ${finding.message}`
    );
  }

  return lines;
}

function lintNode(node, findings, documentLanguages) {
  lintComments(node.leadingComments || [], findings, documentLanguages.comments);
  lintComments(node.trailingComments || [], findings, documentLanguages.comments);
  lintAnnotations(node.annotations || [], findings, documentLanguages.annotations);

  if (node.type === "ProcessNode") {
    lintProcess(node, findings, documentLanguages);
    return;
  }

  if (node.type === "RuleNode") {
    lintRule(node, findings);
    lintStatementBlock(node.body || [], findings, documentLanguages);
    return;
  }

  if (node.type === "EventNode") {
    lintStatementBlock(node.body || [], findings, documentLanguages);
    return;
  }

  if (node.type === "StateflowNode") {
    lintStateflow(node, findings);
    return;
  }

  if (node.type === "RoleNode") {
    lintRole(node, findings);
    return;
  }

  if (node.type === "PolicyNode") {
    for (const clause of node.clauses || []) {
      lintComments(clause.leadingComments || [], findings, documentLanguages.comments);
      lintComments(clause.trailingComments || [], findings, documentLanguages.comments);
      lintAnnotations(clause.annotations || [], findings, documentLanguages.annotations);
      lintActionBlock(clause.body || [], findings, documentLanguages);
    }
  }
}

function lintProcess(node, findings, documentLanguages) {
  const body = node.body || [];
  const triggers = body.filter((statement) => statement.type === "WhenNode");

  if (triggers.length === 0) {
    findings.push(
      createLintIssue(
        "lint.process-missing-trigger",
        node.line || 1,
        `Process \`${node.name}\` has no \`when\` trigger.`
      )
    );
  }

  if (triggers.length > 1) {
    findings.push(
      createLintIssue(
        "lint.process-multiple-triggers",
        triggers[1].line,
        `Process \`${node.name}\` declares multiple \`when\` triggers.`
      )
    );
  }

  const firstNonTriggerIndex = body.findIndex((statement) => statement.type !== "WhenNode");
  if (firstNonTriggerIndex >= 0) {
    for (let index = firstNonTriggerIndex + 1; index < body.length; index += 1) {
      if (body[index].type === "WhenNode") {
        findings.push(
          createLintIssue(
            "lint.process-trigger-order",
            body[index].line,
            `Process \`${node.name}\` declares a \`when\` trigger after operational statements.`
          )
        );
      }
    }
  }

  lintStatementBlock(body, findings, documentLanguages);
}

function lintRule(node, findings) {
  if (!node.appliesTo) {
    findings.push(
      createLintIssue(
        "lint.rule-missing-scope",
        node.line || 1,
        `Rule \`${node.name}\` does not declare an \`applies to\` scope.`
      )
    );
  }
}

function lintStateflow(node, findings) {
  const incoming = new Map();
  const outgoing = new Map();
  const states = node.states || [];
  const transitions = node.transitions || [];

  for (const state of states) {
    incoming.set(state.value, 0);
    outgoing.set(state.value, 0);
  }

  for (const edge of transitions) {
    if (incoming.has(edge.to)) {
      incoming.set(edge.to, incoming.get(edge.to) + 1);
    }
    if (outgoing.has(edge.from)) {
      outgoing.set(edge.from, outgoing.get(edge.from) + 1);
    }
  }

  states.forEach((state, index) => {
    const inCount = incoming.get(state.value) || 0;
    const outCount = outgoing.get(state.value) || 0;

    if (inCount === 0 && outCount === 0) {
      findings.push(
        createLintIssue(
          "lint.state-orphaned",
          state.line,
          `State \`${state.value}\` in stateflow \`${node.name}\` has no incoming or outgoing transitions.`
        )
      );
      return;
    }

    if (index > 0 && inCount === 0) {
      findings.push(
        createLintIssue(
          "lint.state-no-incoming",
          state.line,
          `State \`${state.value}\` in stateflow \`${node.name}\` has no incoming transitions.`
        )
      );
    }
  });
}

function lintRole(node, findings) {
  const can = new Set((node.can || []).map((permission) => permission.value));

  for (const permission of node.cannot || []) {
    if (can.has(permission.value)) {
      findings.push(
        createLintIssue(
          "lint.role-conflicting-permission",
          permission.line,
          `Role \`${node.name}\` declares \`${permission.value}\` in both \`can\` and \`cannot\`.`
        )
      );
    }
  }
}

function lintStatementBlock(statements, findings, documentLanguages) {
  let terminated = false;

  for (const statement of statements) {
    lintComments(statement.leadingComments || [], findings, documentLanguages.comments);
    lintComments(statement.trailingComments || [], findings, documentLanguages.comments);
    lintAnnotations(statement.annotations || [], findings, documentLanguages.annotations);

    if (terminated) {
      findings.push(
        createLintIssue(
          "lint.unreachable-statement",
          statement.line || 1,
          "This statement is unreachable because the previous branch always stops."
        )
      );
    }

    if (statement.type === "IfNode") {
      lintStatementBlock(statement.then || [], findings, documentLanguages);

      for (const branch of statement.elseIf || []) {
        lintComments(branch.leadingComments || [], findings, documentLanguages.comments);
        lintComments(branch.trailingComments || [], findings, documentLanguages.comments);
        lintAnnotations(branch.annotations || [], findings, documentLanguages.annotations);
        lintStatementBlock(branch.then || [], findings, documentLanguages);
      }

      if (statement.else) {
        lintComments(statement.else.leadingComments || [], findings, documentLanguages.comments);
        lintComments(statement.else.trailingComments || [], findings, documentLanguages.comments);
        lintAnnotations(statement.else.annotations || [], findings, documentLanguages.annotations);
        lintStatementBlock(statement.else.body || [], findings, documentLanguages);
      }
    }

    terminated = statementAlwaysStops(statement);
  }
}

function lintActionBlock(statements, findings, documentLanguages) {
  let terminated = false;

  for (const statement of statements) {
    lintComments(statement.leadingComments || [], findings, documentLanguages.comments);
    lintComments(statement.trailingComments || [], findings, documentLanguages.comments);
    lintAnnotations(statement.annotations || [], findings, documentLanguages.annotations);

    if (terminated) {
      findings.push(
        createLintIssue(
          "lint.unreachable-statement",
          statement.line || 1,
          "This statement is unreachable because the previous branch always stops."
        )
      );
    }

    terminated = statementAlwaysStops(statement);
  }
}

function statementAlwaysStops(statement) {
  if (!statement) {
    return false;
  }

  if (statement.type === "StopNode") {
    return true;
  }

  if (statement.type !== "IfNode") {
    return false;
  }

  const thenStops = blockAlwaysStops(statement.then || []);
  const elseIfStops = (statement.elseIf || []).every((branch) => blockAlwaysStops(branch.then || []));
  const elseStops = statement.else ? blockAlwaysStops(statement.else.body || []) : false;

  return thenStops && elseIfStops && elseStops;
}

function blockAlwaysStops(statements) {
  if (statements.length === 0) {
    return false;
  }

  return statementAlwaysStops(statements[statements.length - 1]);
}

function lintComments(comments, findings, expectedLanguage) {
  for (const comment of comments || []) {
    const rule = classifyComment(comment.text || "");
    if (!rule) {
      if (expectedLanguage) {
        const detectedLanguage = detectLanguage(comment.text || "");
        if (detectedLanguage && detectedLanguage !== expectedLanguage) {
          findings.push(
            createLintIssue(
              "lint.comment-language-mismatch",
              comment.line || 1,
              `Comment text looks like \`${detectedLanguage}\`, but the document declares comment-language \`${expectedLanguage}\`.`
            )
          );
        }
      }
      continue;
    }

    findings.push(createLintIssue(rule.code, comment.line || 1, rule.message));
  }
}

function lintAnnotations(annotations, findings, expectedLanguage) {
  if (!expectedLanguage) {
    return;
  }

  for (const annotation of annotations || []) {
    const detectedLanguage = detectLanguage(annotation.value || "");
    if (!detectedLanguage || detectedLanguage === expectedLanguage) {
      continue;
    }

    findings.push(
      createLintIssue(
        "lint.annotation-language-mismatch",
        annotation.line || 1,
        `Annotation value looks like \`${detectedLanguage}\`, but the document declares annotation-language \`${expectedLanguage}\`.`
      )
    );
  }
}

function classifyComment(text) {
  const normalized = text.trim().toLowerCase();
  if (!normalized) {
    return null;
  }

  if (
    /^(only|managers?\b.*may|only .* may|may only|cannot|must not)\b/.test(normalized) ||
    /\b(approve|approval|manager|role|permission)\b/.test(normalized) && /\b(only|may|cannot|must)\b/.test(normalized)
  ) {
    return {
      code: "lint.comment-hidden-permission",
      message:
        "This comment looks like a permission or approval rule. Move it into explicit OrgScript constructs.",
    };
  }

  if (
    /^(must|require|required|always require|never approve|never confirm)\b/.test(normalized) ||
    /\b(require|required|deposit|approval|review|clearance)\b/.test(normalized) && /\b(before|must|always|only)\b/.test(normalized)
  ) {
    return {
      code: "lint.comment-hidden-requirement",
      message:
        "This comment looks like a hidden requirement. Express the requirement in OrgScript instead of a comment.",
    };
  }

  if (
    /^(always|never|if|skip|must|only)\b/.test(normalized) ||
    /\b(notify|transition|assign|update|create|stop)\b/.test(normalized) && /\b(always|must|if|never|only|skip)\b/.test(normalized)
  ) {
    return {
      code: "lint.comment-hidden-business-rule",
      message:
        "This comment looks like normative business logic. Move it into explicit OrgScript statements or rules.",
    };
  }

  return null;
}

function detectLanguage(text) {
  const tokens = tokenizeLanguageText(text);
  if (tokens.length < 2) {
    return null;
  }

  const scores = Object.entries(LANGUAGE_STOPWORDS).map(([language, stopwords]) => ({
    language,
    score: tokens.filter((token) => stopwords.has(token)).length,
  }));

  scores.sort((left, right) => right.score - left.score);

  if (scores[0].score < 2) {
    return null;
  }

  if (scores[1] && scores[0].score === scores[1].score) {
    return null;
  }

  return scores[0].language;
}

function tokenizeLanguageText(text) {
  return String(text)
    .toLowerCase()
    .match(/[a-zA-ZÀ-ÿ]+/g) || [];
}

const LANGUAGE_STOPWORDS = {
  en: new Set(["the", "and", "for", "with", "must", "should", "review", "track", "when", "before", "after", "new", "lead"]),
  de: new Set(["der", "die", "das", "und", "mit", "fuer", "wenn", "muss", "soll", "vor", "nach", "neu", "pruefen", "vertrieb"]),
  es: new Set(["el", "la", "los", "las", "y", "con", "para", "cuando", "debe", "antes", "despues", "nuevo", "revisar"]),
  pt: new Set(["o", "a", "os", "as", "e", "com", "para", "quando", "deve", "antes", "depois", "novo", "revisar"]),
  eo: new Set(["la", "kaj", "kun", "por", "kiam", "devas", "antau", "post", "nova", "revizii"]),
};

function sortFindings(findings) {
  return [...findings].sort((left, right) => {
    if (left.line !== right.line) {
      return left.line - right.line;
    }

    if (SEVERITY_RANK[left.severity] !== SEVERITY_RANK[right.severity]) {
      return SEVERITY_RANK[left.severity] - SEVERITY_RANK[right.severity];
    }

    return left.code.localeCompare(right.code);
  });
}

function createLintIssue(code, line, message) {
  return {
    code,
    severity: RULES[code].severity,
    line,
    message,
  };
}

module.exports = {
  RULES,
  SEVERITY,
  lintDocument,
  renderLintReport,
  summarizeFindings,
};
