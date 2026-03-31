const {
  DOCUMENT_LANGUAGE_KEYS,
  isDocumentHeaderLine,
  looksLikeDocumentHeaderLine,
} = require("./document-metadata");

function createSyntaxIssue(line, code, message) {
  return { line, code, message };
}

function lex(source) {
  const rawLines = source.split(/\r?\n/);
  const lines = [];
  const issues = [];

  for (let index = 0; index < rawLines.length; index += 1) {
    const raw = rawLines[index];
    const lineNumber = index + 1;

    if (raw.includes("\t")) {
      issues.push(
        createSyntaxIssue(
          lineNumber,
          "syntax.tabs-not-allowed",
          "Tabs are not allowed. Use spaces for indentation."
        )
      );
    }

    if (!raw.trim()) {
      lines.push({
        type: "BlankLineToken",
        line: lineNumber,
      });
      continue;
    }

    let indent = 0;
    while (indent < raw.length && raw[indent] === " ") {
      indent += 1;
    }

    if (indent % 2 !== 0) {
      issues.push(
        createSyntaxIssue(
          lineNumber,
          "syntax.invalid-indentation",
          "Indentation must use multiples of two spaces."
        )
      );
    }

    const trimmed = raw.trim();
    const level = Math.floor(indent / 2);

    if (trimmed.startsWith("#")) {
      lines.push({
        type: "CommentToken",
        line: lineNumber,
        indent,
        level,
        text: trimmed.slice(1).trimStart(),
      });
      continue;
    }

    if (isDocumentHeaderLine(trimmed)) {
      lines.push({
        type: "DocumentHeaderToken",
        line: lineNumber,
        indent,
        level,
        version: 1,
        text: trimmed,
      });
      continue;
    }

    if (looksLikeDocumentHeaderLine(trimmed)) {
      lines.push({
        type: "InvalidLineToken",
        line: lineNumber,
        indent,
        level,
        code: "syntax.invalid-document-header",
        message: "Document header must use the exact form `orgscript 1` on its own line.",
        text: trimmed,
      });
      continue;
    }

    const metadataMatch = trimmed.match(
      /^([a-z][a-z-]*)\s+"((?:[^"\\]|\\.)*)"$/
    );

    if (metadataMatch && DOCUMENT_LANGUAGE_KEYS.includes(metadataMatch[1])) {
      lines.push({
        type: "DocumentMetadataToken",
        line: lineNumber,
        indent,
        level,
        key: metadataMatch[1],
        value: unescapeString(metadataMatch[2]),
      });
      continue;
    }

    if (DOCUMENT_LANGUAGE_KEYS.some((key) => trimmed.startsWith(`${key} `) || trimmed === key)) {
      lines.push({
        type: "InvalidLineToken",
        line: lineNumber,
        indent,
        level,
        code: "syntax.invalid-document-metadata",
        message:
          "Document language metadata must use the form `key \"value\"` with a supported language key.",
        text: trimmed,
      });
      continue;
    }

    if (trimmed.startsWith("@")) {
      const match = trimmed.match(/^@([a-z][a-z0-9_]*)\s+"((?:[^"\\]|\\.)*)"$/);

      if (!match) {
        lines.push({
          type: "InvalidLineToken",
          line: lineNumber,
          indent,
          level,
          code: "syntax.invalid-annotation",
          message:
            "Annotations must use the form `@key \"value\"` with a lowercase allowlisted key.",
          text: trimmed,
        });
        continue;
      }

      lines.push({
        type: "AnnotationToken",
        line: lineNumber,
        indent,
        level,
        key: match[1],
        value: unescapeString(match[2]),
      });
      continue;
    }

    const inlineCommentIndex = findInlineCommentIndex(raw.slice(indent));
    if (inlineCommentIndex >= 0) {
      lines.push({
        type: "InvalidLineToken",
        line: lineNumber,
        indent,
        level,
        code: "syntax.inline-comments-not-supported",
        message:
          "Inline `#` comments are not supported in v1. Place comments on their own line.",
        text: trimmed,
      });
      continue;
    }

    lines.push({
      type: "LineToken",
      line: lineNumber,
      indent,
      level,
      text: trimmed,
    });
  }

  return {
    lines,
    issues,
  };
}

function findInlineCommentIndex(text) {
  let inString = false;
  let escaped = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];

    if (escaped) {
      escaped = false;
      continue;
    }

    if (character === "\\") {
      escaped = true;
      continue;
    }

    if (character === '"') {
      inString = !inString;
      continue;
    }

    if (character === "#" && !inString) {
      return index;
    }
  }

  return -1;
}

function unescapeString(text) {
  return text.replace(/\\"/g, '"').replace(/\\\\/g, "\\");
}

module.exports = {
  lex,
};
