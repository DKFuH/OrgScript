function createSemanticIssue(line, code, message) {
  return { line, code, message };
}

const ALLOWED_ANNOTATION_KEYS = new Set([
  "note",
  "owner",
  "todo",
  "source",
  "status",
  "review",
]);
const {
  HEADER_LANGUAGE_ORDER,
  isLanguageCode,
  isSupportedSourceLanguage,
} = require("./document-metadata");

function validateDocument(ast) {
  const issues = [];
  const seenTopLevel = new Map();

  validateDocumentMetadata(ast, issues);

  for (const node of ast.body) {
    const key = `${node.type}:${node.name}`;
    if (seenTopLevel.has(key)) {
      issues.push(
        createSemanticIssue(
          node.line || 1,
          "semantic.duplicate-top-level-name",
          `Duplicate top-level ${node.type} name \`${node.name}\`.`
        )
      );
    } else {
      seenTopLevel.set(key, true);
    }

    validateAnnotations(node, issues, `top-level ${node.type.replace("Node", "").toLowerCase()} \`${node.name}\``);
    validateNode(node, issues);
  }

  return issues;
}

function validateDocumentMetadata(ast, issues) {
  if (!ast.metadata || !ast.metadata.languages) {
    return;
  }

  for (const property of HEADER_LANGUAGE_ORDER) {
    const value = ast.metadata.languages[property];
    if (!value) {
      continue;
    }

    const line = findDocumentMetadataLine(ast, property);

    if (!isLanguageCode(value)) {
      issues.push(
        createSemanticIssue(
          line,
          "semantic.invalid-document-language-code",
          `Document language \`${value}\` is not a supported ISO-style language code.`
        )
      );
      continue;
    }

    if (property === "source" && !isSupportedSourceLanguage(value)) {
      issues.push(
        createSemanticIssue(
          line,
          "semantic.unsupported-source-language",
          `Unsupported source-language \`${value}\`. OrgScript source keywords remain canonical English in v1.`
        )
      );
    }
  }
}

function findDocumentMetadataLine(ast, property) {
  const entries = ast.metadataEntries || [];
  const match = entries.find((entry) => entry.property === property);
  return match ? match.line : 1;
}

function validateNode(node, issues) {
  if (node.type === "ProcessNode" || node.type === "RuleNode" || node.type === "EventNode") {
    if (!node.body || node.body.length === 0) {
      issues.push(
        createSemanticIssue(
          node.line || 1,
          "semantic.empty-block",
          `${node.type.replace("Node", "")} \`${node.name}\` must not be empty.`
        )
      );
    }

    validateStatements(node.body || [], issues);
    return;
  }

  if (node.type === "StateflowNode") {
    validateStateflow(node, issues);
    return;
  }

  if (node.type === "PolicyNode") {
    if (!node.clauses || node.clauses.length === 0) {
      issues.push(
        createSemanticIssue(
          node.line || 1,
          "semantic.empty-policy",
          `Policy \`${node.name}\` must contain at least one clause.`
        )
      );
    }

    for (const clause of node.clauses || []) {
      validateAnnotations(clause, issues, `policy clause in \`${node.name}\``);
      if (!clause.body || clause.body.length === 0) {
        issues.push(
          createSemanticIssue(
            clause.line,
            "semantic.empty-policy-then",
            "Policy clauses must contain at least one action in their `then` block."
          )
        );
      }
      validateActionStatements(clause.body || [], issues);
    }
    return;
  }

  if (node.type === "RoleNode") {
    if ((node.can || []).length === 0 && (node.cannot || []).length === 0) {
      issues.push(
        createSemanticIssue(
          node.line || 1,
          "semantic.empty-role",
          `Role \`${node.name}\` must define at least one permission.`
        )
      );
    }
    return;
  }

  if (node.type === "MetricNode") {
    if (!node.formula || !node.owner || !node.target) {
      issues.push(
        createSemanticIssue(
          node.line || 1,
          "semantic.incomplete-metric",
          `Metric \`${node.name}\` must define formula, owner, and target.`
        )
      );
    }
  }
}

function validateStateflow(node, issues) {
  if ((node.states || []).length === 0) {
    issues.push(
      createSemanticIssue(
        node.line || 1,
        "semantic.empty-stateflow",
        `Stateflow \`${node.name}\` must define at least one state.`
      )
    );
  }

  const stateNames = new Set();
  for (const state of node.states || []) {
    if (stateNames.has(state.value)) {
      issues.push(
        createSemanticIssue(
          state.line,
          "semantic.duplicate-state",
          `Duplicate state \`${state.value}\` in stateflow \`${node.name}\`.`
        )
      );
    }
    stateNames.add(state.value);
  }

  const transitionKeys = new Set();
  for (const edge of node.transitions || []) {
    if (!stateNames.has(edge.from)) {
      issues.push(
        createSemanticIssue(
          edge.line,
          "semantic.transition-source-undeclared",
          `Transition source \`${edge.from}\` is not declared in stateflow \`${node.name}\`.`
        )
      );
    }

    if (!stateNames.has(edge.to)) {
      issues.push(
        createSemanticIssue(
          edge.line,
          "semantic.transition-target-undeclared",
          `Transition target \`${edge.to}\` is not declared in stateflow \`${node.name}\`.`
        )
      );
    }

    const key = `${edge.from}->${edge.to}`;
    if (transitionKeys.has(key)) {
      issues.push(
        createSemanticIssue(
          edge.line,
          "semantic.duplicate-transition",
          `Duplicate transition \`${key}\` in stateflow \`${node.name}\`.`
        )
      );
    }
    transitionKeys.add(key);
  }
}

function validateStatements(statements, issues) {
  for (const statement of statements) {
    validateAnnotations(statement, issues, `${statement.type.replace("Node", "")} statement`);

    if (statement.type !== "IfNode") {
      continue;
    }

    if (!statement.then || statement.then.length === 0) {
      issues.push(
        createSemanticIssue(
          statement.line,
          "semantic.empty-if-then",
          "`if` statements must contain at least one statement in their `then` block."
        )
      );
    }

    validateStatements(statement.then || [], issues);

    for (const branch of statement.elseIf || []) {
      validateAnnotations(branch, issues, "`else if` branch");
      if (!branch.then || branch.then.length === 0) {
        issues.push(
          createSemanticIssue(
            branch.line,
            "semantic.empty-else-if-then",
            "`else if` statements must contain at least one statement in their `then` block."
          )
        );
      }
      validateStatements(branch.then || [], issues);
    }

    if (statement.else) {
      validateAnnotations(statement.else, issues, "`else` branch");
      if (!statement.else.body || statement.else.body.length === 0) {
        issues.push(
          createSemanticIssue(
            statement.else.line,
            "semantic.empty-else",
            "`else` blocks must contain at least one statement."
          )
        );
      }
      validateStatements(statement.else.body || [], issues);
    }
  }
}

function validateActionStatements(statements, issues) {
  for (const statement of statements) {
    if (!statement || !statement.type) {
      issues.push(
        createSemanticIssue(1, "semantic.invalid-action-statement", "Invalid action statement.")
      );
      continue;
    }

    validateAnnotations(statement, issues, `${statement.type.replace("Node", "")} statement`);
  }
}

function validateAnnotations(node, issues, targetLabel) {
  const annotations = node.annotations || [];
  const seen = new Set();

  for (const annotation of annotations) {
    if (!ALLOWED_ANNOTATION_KEYS.has(annotation.key)) {
      issues.push(
        createSemanticIssue(
          annotation.line || node.line || 1,
          "semantic.unsupported-annotation-key",
          `Unsupported annotation key \`@${annotation.key}\` on ${targetLabel}.`
        )
      );
    }

    if (seen.has(annotation.key)) {
      issues.push(
        createSemanticIssue(
          annotation.line || node.line || 1,
          "semantic.duplicate-annotation-key",
          `Duplicate annotation key \`@${annotation.key}\` on ${targetLabel}.`
        )
      );
    } else {
      seen.add(annotation.key);
    }
  }
}

module.exports = {
  ALLOWED_ANNOTATION_KEYS,
  validateDocument,
};
