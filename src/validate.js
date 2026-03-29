const fs = require("fs");
const { lex } = require("./lexer");
const { parseDocument } = require("./parser");
const { validateDocument } = require("./semantic-validation");

function buildModel(filePath) {
  const source = fs.readFileSync(filePath, "utf8");
  const lexResult = lex(source);

  if (lexResult.issues.length > 0) {
    return {
      ok: false,
      ast: null,
      syntaxIssues: lexResult.issues,
      semanticIssues: [],
    };
  }

  const parseResult = parseDocument(lexResult.lines, filePath);

  if (parseResult.issues.length > 0) {
    return {
      ok: false,
      ast: parseResult.ast,
      syntaxIssues: parseResult.issues,
      semanticIssues: [],
    };
  }

  const semanticIssues = validateDocument(parseResult.ast);

  return {
    ok: semanticIssues.length === 0,
    ast: parseResult.ast,
    syntaxIssues: [],
    semanticIssues,
  };
}

function validateFile(filePath) {
  const result = buildModel(filePath);
  const issues = [...result.syntaxIssues, ...result.semanticIssues];

  return {
    ok: result.ok,
    ast: result.ast,
    syntaxIssues: result.syntaxIssues,
    semanticIssues: result.semanticIssues,
    issues,
    summary: result.ast
      ? {
          topLevelBlocks: result.ast.body.length,
          statements: countStatements(result.ast.body),
        }
      : {
          topLevelBlocks: 0,
          statements: 0,
        },
  };
}

function countStatements(nodes) {
  let count = 0;

  for (const node of nodes) {
    if (node.body) {
      count += countBodyStatements(node.body);
    }

    if (node.clauses) {
      for (const clause of node.clauses) {
        count += countBodyStatements(clause.body || []);
      }
    }

    if (node.states) {
      count += node.states.length;
    }

    if (node.transitions) {
      count += node.transitions.length;
    }

    if (node.can) {
      count += node.can.length;
    }

    if (node.cannot) {
      count += node.cannot.length;
    }

    if (node.formula) {
      count += 1;
    }

    if (node.owner) {
      count += 1;
    }

    if (node.target) {
      count += 1;
    }
  }

  return count;
}

function countBodyStatements(statements) {
  let count = 0;

  for (const statement of statements) {
    count += 1;

    if (statement.type === "IfNode") {
      count += countBodyStatements(statement.then || []);

      for (const branch of statement.elseIf || []) {
        count += 1;
        count += countBodyStatements(branch.then || []);
      }

      if (statement.else) {
        count += 1;
        count += countBodyStatements(statement.else.body || []);
      }
    }
  }

  return count;
}

module.exports = {
  buildModel,
  validateFile,
};
