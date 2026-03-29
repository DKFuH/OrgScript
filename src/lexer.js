function createSyntaxIssue(line, message) {
  return { line, message };
}

function lex(source) {
  const rawLines = source.split(/\r?\n/);
  const lines = [];
  const issues = [];

  for (let index = 0; index < rawLines.length; index += 1) {
    const raw = rawLines[index];
    const lineNumber = index + 1;

    if (raw.includes("\t")) {
      issues.push(createSyntaxIssue(lineNumber, "Tabs are not allowed. Use spaces for indentation."));
    }

    if (!raw.trim()) {
      continue;
    }

    let indent = 0;
    while (indent < raw.length && raw[indent] === " ") {
      indent += 1;
    }

    if (indent % 2 !== 0) {
      issues.push(createSyntaxIssue(lineNumber, "Indentation must use multiples of two spaces."));
    }

    lines.push({
      type: "LineToken",
      line: lineNumber,
      indent,
      level: Math.floor(indent / 2),
      text: raw.trim(),
    });
  }

  return {
    lines,
    issues,
  };
}

module.exports = {
  lex,
};
