function createDocument(filePath, body) {
  return {
    type: "Document",
    filePath,
    body,
  };
}

function createBlock(type, name, extra = {}) {
  return {
    type,
    name,
    ...extra,
  };
}

function createAction(type, extra = {}) {
  return {
    type,
    ...extra,
  };
}

module.exports = {
  createAction,
  createBlock,
  createDocument,
};
