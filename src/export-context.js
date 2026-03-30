const { analyzeDocument } = require("./analyze");
const { toMarkdownSummary } = require("./export-markdown");

function toAiContext(model, diagnostics = []) {
  return {
    version: "0.2",
    timestamp: new Date().toISOString(),
    source: {
      model,
      analysis: analyzeDocument(model),
      diagnostics,
      metadata: {
        commentsIncluded: false,
        annotations: collectAnnotationMetadata(model),
      },
    },
    summaries: {
      markdown: toMarkdownSummary(model),
    },
  };
}

function collectAnnotationMetadata(model) {
  const entries = [];

  for (const node of model.body || []) {
    collectNodeAnnotations(node, entries, `${node.type}:${node.name}`);
  }

  return {
    total: entries.length,
    keys: summarizeKeys(entries),
    entries,
  };
}

function collectNodeAnnotations(node, entries, path) {
  pushAnnotations(entries, node.annotations || [], path, "node");

  if (node.type === "process" || node.type === "rule" || node.type === "event") {
    collectStatements(node.body || [], entries, `${path}.body`);
  }

  if (node.type === "policy") {
    (node.clauses || []).forEach((clause, index) => {
      const clausePath = `${path}.clauses[${index}]`;
      pushAnnotations(entries, clause.annotations || [], clausePath, "policy-clause");
      collectStatements(clause.then || [], entries, `${clausePath}.then`);
    });
  }
}

function collectStatements(statements, entries, path) {
  (statements || []).forEach((statement, index) => {
    const statementPath = `${path}[${index}]`;
    pushAnnotations(entries, statement.annotations || [], statementPath, statement.type);

    if (statement.type === "if") {
      collectStatements(statement.then || [], entries, `${statementPath}.then`);

      (statement.elseIf || []).forEach((branch, branchIndex) => {
        const branchPath = `${statementPath}.elseIf[${branchIndex}]`;
        pushAnnotations(entries, branch.annotations || [], branchPath, "elseIf");
        collectStatements(branch.then || [], entries, `${branchPath}.then`);
      });

      if (statement.else) {
        const elsePath = `${statementPath}.else`;
        pushAnnotations(entries, statement.else.annotations || [], elsePath, "else");
        collectStatements(statement.else.body || [], entries, `${elsePath}.body`);
      }
    }
  });
}

function pushAnnotations(entries, annotations, path, targetType) {
  for (const annotation of annotations || []) {
    entries.push({
      key: annotation.key,
      value: annotation.value,
      targetType,
      path,
    });
  }
}

function summarizeKeys(entries) {
  const counts = {};

  for (const entry of entries) {
    counts[entry.key] = (counts[entry.key] || 0) + 1;
  }

  return counts;
}

module.exports = {
  toAiContext,
};
