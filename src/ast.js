function createDocument(filePath, body, extra = {}) {
  return {
    type: "Document",
    filePath,
    body,
    trailingComments: extra.trailingComments || [],
  };
}

function createBlock(type, name, extra = {}) {
  return {
    type,
    name,
    line: extra.line || 1,
    annotations: extra.annotations || [],
    leadingComments: extra.leadingComments || [],
    trailingComments: extra.trailingComments || [],
    ...extra,
  };
}

function createAction(type, extra = {}) {
  return {
    type,
    line: extra.line || 1,
    annotations: extra.annotations || [],
    leadingComments: extra.leadingComments || [],
    trailingComments: extra.trailingComments || [],
    ...extra,
  };
}

function createAnnotation(key, value, line) {
  return {
    type: "AnnotationNode",
    key,
    value,
    line,
  };
}

function createComment(text, line) {
  return {
    type: "CommentNode",
    text,
    line,
  };
}

module.exports = {
  createAction,
  createAnnotation,
  createBlock,
  createComment,
  createDocument,
};
