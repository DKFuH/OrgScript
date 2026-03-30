function analyzeDocument(model) {
  const analysis = {
    summary: {
      totalBlocks: model.body.length,
      kinds: {},
    },
    blocks: [],
  };

  for (const node of model.body) {
    analysis.summary.kinds[node.type] = (analysis.summary.kinds[node.type] || 0) + 1;
    analysis.blocks.push(analyzeNode(node));
  }

  return analysis;
}

function analyzeNode(node) {
  const base = {
    type: node.type,
    name: node.name,
  };

  if (node.type === "process") {
    const stmts = flattenStatements(node.body);
    return {
      ...base,
      metrics: {
        triggers: node.body.filter(s => s.type === "when").length,
        statements: stmts.length,
        conditions: stmts.filter(s => s.type === "if").length,
      }
    };
  }

  if (node.type === "stateflow") {
    return {
      ...base,
      metrics: {
        states: node.states.length,
        transitions: node.transitions.length,
      }
    };
  }

  if (node.type === "role") {
    return {
      ...base,
      metrics: {
        allowedActions: node.can.length,
        deniedActions: (node.cannot || []).length,
      }
    };
  }

  if (node.type === "rule") {
    return {
      ...base,
      metrics: {
        appliesTo: node.appliesTo,
        statements: flattenStatements(node.body).length,
      }
    };
  }

  return base;
}

function flattenStatements(body) {
  let result = [];
  for (const stmt of body) {
    result.push(stmt);
    if (stmt.type === "if") {
      result = result.concat(flattenStatements(stmt.then));
      for (const branch of stmt.elseIf) {
        result = result.concat(flattenStatements(branch.then));
      }
      if (stmt.else) {
        result = result.concat(flattenStatements(stmt.else.body || []));
      }
    }
  }
  return result;
}

function renderTextAnalysis(analysis, filePath) {
  const lines = [`ANALYSIS ${filePath}`];
  lines.push(`  Blocks: ${analysis.summary.totalBlocks}`);
  
  for (const [kind, count] of Object.entries(analysis.summary.kinds)) {
    lines.push(`    - ${kind}: ${count}`);
  }

  lines.push("");
  for (const block of analysis.blocks) {
    lines.push(`[${block.type}] ${block.name}`);
    if (block.metrics) {
      for (const [metric, value] of Object.entries(block.metrics)) {
        lines.push(`  - ${metric}: ${value}`);
      }
    }
  }

  return lines.join("\n");
}

module.exports = {
  analyzeDocument,
  renderTextAnalysis,
};
