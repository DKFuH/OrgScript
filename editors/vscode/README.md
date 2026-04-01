# OrgScript for Visual Studio Code

Official language support for **OrgScript** (`.orgs`) - the human-readable, AI-friendly description language for business logic and operational systems.

## Features

- **Syntax Highlighting**: Comprehensive TextMate grammar for all OrgScript constructs.
- **Language Detection**: Automatically recognizes `.orgs` files.
- **Smart Indentation**: Lightweight configuration for indentation-based logic.
- **Annotation-Aware Highlighting**: Highlights whole-line `# comments` and `@owner "value"`-style metadata.
- **Header-Aware Highlighting**: Highlights `orgscript 1` and document language metadata fields.
- **Snippets**: Core block, comment, and annotation templates for faster authoring.

## Supported Syntax

- **Top-level Blocks**: `process`, `stateflow`, `rule`, `role`, `policy`, `metric`, `event`.
- **Core Statements**: `when`, `if`, `else`, `then`, `assign`, `transition`, `notify`, `create`, `update`, `require`, `stop`.
- **Comments and Annotations**: Whole-line `# comments` and `@owner "value"`-style metadata.
- **Document Metadata Header**: Highlights `orgscript 1`, `source-language`, `comment-language`, `annotation-language`, and `context-language`.
- **Dotted References**: Native support for field paths like `order.status` or `lead.source`.
- **Rich Literals**: Highlights strings, booleans, and numeric values.

## Getting Started

1. Install the extension.
2. Open any `.orgs` file.
3. Enjoy clean, high-contrast highlighting for your organizational logic.

Recommended test file:

- `examples/lead-qualification.orgs`

It exercises:

- the optional document language header
- top-level annotations
- statement-level annotations
- whole-line comments
- strings, operators, and dotted references

## Usage with CLI

The extension works best when used alongside the [OrgScript CLI](https://github.com/DKFuH/OrgScript).

```bash
# Check your logic
orgscript check your-file.orgs

# Export to diagrams
orgscript export mermaid your-file.orgs > diagram.mmd

# Include annotation metadata in generated Markdown or HTML docs
orgscript export markdown your-file.orgs --with-annotations
orgscript export html your-file.orgs --with-annotations

# Export AI/index context with explicit annotation metadata
orgscript export context your-file.orgs
```

Current editor support for annotations:

- whole-line comment highlighting for `# ...`
- TextMate highlighting for whole-line `@name "value"`-style metadata
- snippet helpers for comments, annotations, and top-level blocks

## Snippet Prefixes

- `org-comment`
- `org-annotation`
- `org-header`
- `org-process`
- `org-stateflow`
- `org-rule`
- `org-role`
- `org-policy`
- `org-metric`
- `org-event`

## Local Testing

To test the extension locally without publishing it:

1. Open the `editors/vscode` folder in VS Code.
2. Press **F5** to launch the Extension Development Host (configured in `.vscode/launch.json`).
3. In the new VS Code window, open any `.orgs` file from the repository `examples/` folder (one level up).
4. Use **Developer: Inspect Editor Tokens and Scopes** (via the Command Palette) to verify that tokens receive the expected TextMate scopes.

Recommended test file: `../examples/lead-qualification.orgs` — it exercises the header, annotations, dotted references, operators, and conditional blocks together.

## Contributing

OrgScript is open-source. Join us on [GitHub](https://github.com/DKFuH/OrgScript) to contribute to the language spec or tooling.

Known v1 limits:

- TextMate highlighting only
- no semantic tokens
- no IntelliSense or hover support
- comments are whole-line only in the language and highlighted that way
- snippets are editor productivity helpers and do not imply parser support beyond the current CLI/spec

---
Part of the OrgScript Foundation.
