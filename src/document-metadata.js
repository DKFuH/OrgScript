const DOCUMENT_HEADER_TEXT = "orgscript 1";

const DOCUMENT_LANGUAGE_KEYS = [
  "source-language",
  "comment-language",
  "annotation-language",
  "context-language",
];

const LANGUAGE_KEY_TO_PROPERTY = {
  "source-language": "source",
  "comment-language": "comments",
  "annotation-language": "annotations",
  "context-language": "context",
};

const PROPERTY_TO_LANGUAGE_KEY = {
  source: "source-language",
  comments: "comment-language",
  annotations: "annotation-language",
  context: "context-language",
};

const SUPPORTED_SOURCE_LANGUAGES = new Set(["en"]);
const LANGUAGE_CODE_PATTERN = /^[a-z]{2,3}(?:-[A-Z]{2})?$/;
const HEADER_LANGUAGE_ORDER = ["source", "comments", "annotations", "context"];

function createDocumentMetadata(languages = {}, extra = {}) {
  const filtered = {};

  for (const property of HEADER_LANGUAGE_ORDER) {
    if (languages[property]) {
      filtered[property] = languages[property];
    }
  }

  return {
    headerVersion: extra.headerVersion || 1,
    languages: filtered,
  };
}

function isDocumentHeaderLine(text) {
  return text === DOCUMENT_HEADER_TEXT;
}

function looksLikeDocumentHeaderLine(text) {
  return /^orgscript\b/.test(text);
}

function isSupportedDocumentLanguageKey(key) {
  return DOCUMENT_LANGUAGE_KEYS.includes(key);
}

function getDocumentLanguageProperty(key) {
  return LANGUAGE_KEY_TO_PROPERTY[key] || null;
}

function getDocumentLanguageKey(property) {
  return PROPERTY_TO_LANGUAGE_KEY[property] || null;
}

function isLanguageCode(value) {
  return LANGUAGE_CODE_PATTERN.test(value);
}

function isSupportedSourceLanguage(value) {
  return SUPPORTED_SOURCE_LANGUAGES.has(value);
}

function getHeaderLanguageEntries(metadata) {
  if (!metadata || !metadata.languages) {
    return [];
  }

  return HEADER_LANGUAGE_ORDER.filter((property) => metadata.languages[property]).map((property) => ({
    key: getDocumentLanguageKey(property),
    property,
    value: metadata.languages[property],
  }));
}

module.exports = {
  DOCUMENT_HEADER_TEXT,
  DOCUMENT_LANGUAGE_KEYS,
  HEADER_LANGUAGE_ORDER,
  createDocumentMetadata,
  getDocumentLanguageKey,
  getDocumentLanguageProperty,
  getHeaderLanguageEntries,
  isDocumentHeaderLine,
  isLanguageCode,
  isSupportedDocumentLanguageKey,
  isSupportedSourceLanguage,
  looksLikeDocumentHeaderLine,
};
