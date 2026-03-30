# OrgScript for Visual Studio Code

Official language support for **OrgScript** (`.orgs`) - the human-readable, AI-friendly description language for business logic and operational systems.

## Features

- **Syntax Highlighting**: Comprehensive TextMate grammar for all OrgScript constructs.
- **Language Detection**: Automatically recognizes `.orgs` files.
- **Smart Indentation**: Lightweight configuration for indentation-based logic.

## Supported Syntax

- **Top-level Blocks**: `process`, `stateflow`, `rule`, `role`, `policy`, `metric`, `event`.
- **Core Statements**: `when`, `if`, `else`, `then`, `assign`, `transition`, `notify`, `create`, `update`, `require`, `stop`.
- **Comments and Annotations**: Whole-line `# comments` and `@owner "value"`-style metadata.
- **Dotted References**: Native support for field paths like `order.status` or `lead.source`.
- **Rich Literals**: Highlights strings, booleans, and numeric values.

## Getting Started

1. Install the extension.
2. Open any `.orgs` file.
3. Enjoy clean, high-contrast highlighting for your organizational logic.

Recommended test file:

- `examples/lead-qualification.orgs`

It exercises:

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
```

## Contributing

OrgScript is open-source. Join us on [GitHub](https://github.com/DKFuH/OrgScript) to contribute to the language spec or tooling.

Known v1 limits:

- TextMate highlighting only
- no semantic tokens
- no IntelliSense or hover support
- comments are whole-line only in the language and highlighted that way

---
Part of the OrgScript Foundation.
