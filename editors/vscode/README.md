# OrgScript VS Code scaffold

This folder contains a minimal VS Code language contribution for `.orgs` files.

## What is included

- `package.json` registers the `OrgScript` language and the `.orgs` extension
- `syntaxes/orgscript.tmLanguage.json` provides TextMate syntax highlighting
- `language-configuration.json` adds lightweight editor behavior for quotes and brackets

## What is highlighted

- top-level blocks such as `process`, `stateflow`, `rule`, `role`, `policy`, `metric`, and `event`
- core keywords such as `when`, `if`, `then`, `else`, `assign`, `transition`, `notify`, `create`, `update`, `require`, and `stop`
- strings, numbers, and operators

OrgScript does not define a comment syntax in the language spec yet, so this scaffold intentionally does not add comment highlighting.

## Use locally

1. Open `editors/vscode/` in VS Code.
2. Open a `.orgs` file from the repo, or create a new one in that folder.
3. If needed, select `OrgScript` from the language mode picker in the bottom-right corner.

## Notes

- This is a syntax-highlighting scaffold only.
- It does not add CLI commands, formatting, linting, or diagnostics.
