const { buildModel, validateFile } = require("./validate");
const { lintDocument, summarizeFindings } = require("./linter");
const { toCanonicalModel } = require("./export-json");
const { toMarkdownSummary } = require("./export-markdown");
const { toMermaidMarkdown } = require("./export-mermaid");
const { toHtmlDocumentation } = require("./export-html");
const { toBpmnXml } = require("./export-bpmn");
const { toLittleHorseSkeleton } = require("./export-littlehorse");
const { toGraphJson } = require("./export-graph");
const { analyzeDocument } = require("./analyze");
const { toAiContext } = require("./export-context");
const { formatDocument } = require("./formatter");

module.exports = {
  // Core
  buildModel,
  validateFile,
  lintDocument,
  summarizeFindings,
  formatDocument,

  // Analysis
  analyzeDocument,

  // Exporters
  toCanonicalModel,
  toMarkdownSummary,
  toMermaidMarkdown,
  toHtmlDocumentation,
  toBpmnXml,
  toLittleHorseSkeleton,
  toGraphJson,
  toAiContext,
};
