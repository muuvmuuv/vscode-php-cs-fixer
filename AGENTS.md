# Agent Context: vscode-php-cs-fixer

## Overview

**Name:** PHP Formatter PHP-CS-Fixer (`vscode-just-php-cs-fixer`)  
**Version:** 1.4.0  
**Author:** Marvin Heilemann (muuvmuuv)  
**License:** GPL-3.0-only

A minimalist VS Code extension that integrates [PHP-CS-Fixer](https://github.com/PHP-CS-Fixer/PHP-CS-Fixer) as a document formatter for PHP files. Philosophy: "zero dependencies" - does one thing well without bundling PHP-CS-Fixer itself.

## Important Guidelines

### Git & Releases

- **Do NOT commit without explicit approval** from the user
- **Do NOT delete git tags** - if a tag was already created/pushed, create a new patch/minor version instead
- Use conventional commits (enforced by commitlint)
- Use SPDX-compliant license identifiers (e.g., `GPL-3.0-only`, not `GPLv3`)

### VS Code Extension Constraints

- **Uses pnpm** - vsce cannot walk pnpm's `node_modules`, but esbuild inlines every dependency, so every `vsce package`/`publish` call passes `--no-dependencies`
- **CommonJS output required** - VS Code does not support ESM extensions yet
- Use `spawn`/`exec` for external tools (allowed and standard practice)
- Declare Workspace Trust capabilities when executing workspace code

### TypeScript Configuration

- Use `module: "ES2022"` with `moduleResolution: "bundler"` (no `.js` extensions needed)
- esbuild handles bundling to CommonJS for VS Code runtime
- Keep build scripts (esbuild.js, .vscode-test.js) as CommonJS

### Lint & Format Configuration

- **oxlint** for linting (`.oxlintrc.json`), **oxfmt** for formatting (`.oxfmtrc.json`, respects `.editorconfig`)
- Type-aware linting and type checking run inside oxlint on the **tsrs** backend (`typeAware`/`typeCheck`); there is no separate `tsc` step
- tsconfig lists `types: ["node", "mocha"]` explicitly - TypeScript 7 no longer includes `@types/*` automatically
- Exclude testProject from linting/formatting

### Testing

- Disable AI features, git and the welcome page in test workspace settings; application-scoped settings (`update.mode`, `telemetry.telemetryLevel`, …) do not work there
- `.vscode-test.js` runs the instance with `--hidden-window` (no visible window, VS Code ≥1.147) and skips built-in AI, git and auth extensions via `VSCODE_SKIP_BUILTIN_EXTENSIONS`, since `--disable-extensions` only covers non-built-in ones
- Tests output to `dist/test/`, mark `mocha` as external in esbuild

## Key Features

- Document formatting provider for PHP files
- Single-folder and multi-root workspace support (settings are resource-scoped)
- Finds the nearest executable and config, walking up from the formatted file's folder to its workspace folder (monorepo-friendly); no config means PHP-CS-Fixer's default rules
- Configurable risky rules support
- Language status item for PHP files: executable and config in use, or the problem
- Logging via a `LogOutputChannel` ("PHP-CS-Fixer"); error notifications are shown once per message and session
- Workspace Trust support: in Restricted Mode a workspace-local executable or config is never run

## File Structure

```
vscode-php-cs-fixer/
├── src/                           # TypeScript source
│   ├── extension.ts               # Entry point - registers formatter, status refresh
│   ├── formatter.ts               # DocumentFormattingProvider implementation
│   ├── utils.ts                   # Tool resolution (executable, config)
│   ├── process.ts                 # Runs PHP-CS-Fixer (spawn)
│   ├── status.ts                  # Language status item, notify-once errors
│   ├── log.ts                     # LogOutputChannel
│   └── test/
│       ├── unit/                  # Unit tests (tool resolution, process, exit codes)
│       └── integration/           # Integration tests (formatting)
├── assets/
│   └── logo.png                   # Extension icon
├── testProject/                   # Development test fixtures
│   ├── no-workspace/              # Single folder test project
│   ├── ws-project-1/              # Multi-root workspace folder 1
│   ├── ws-project-2/              # Multi-root workspace folder 2
│   └── ws-project.code-workspace  # Multi-root workspace config
├── dist/                          # Bundled output (extension + tests)
├── package.json                   # Extension manifest
├── tsconfig.json                  # TypeScript config
├── .oxlintrc.json                 # oxlint config (type-aware via tsrs)
├── .oxfmtrc.json                  # oxfmt config
├── esbuild.js                     # Build script (CommonJS)
├── .vscode-test.js                # Test runner config (CommonJS)
└── lefthook.yml                   # Git hooks
```

## Source Files

### `src/extension.ts` (Entry Point)

Registers `DocumentFormattingProvider` for PHP, the language status item, the internal `php-cs-fixer.showLog` command, and refreshes the status on editor, settings and trust changes.

### `src/formatter.ts` (Core Logic)

`DocumentFormattingProvider` class workflow:

1. Validate document is PHP
2. `resolveTools(document.uri)` - executable and config for this file; a problem is shown in the status item and notified once
3. Write document content to a private temp dir (`mkdtemp`), keeping the file name (`psr_autoloading` compares it with the class name)
4. Execute via `spawn`: `php-cs-fixer fix --using-cache=no --allow-risky=yes|no -n -q [--config=<config>] <tempfile>`
5. Handle exit codes correctly (0=no changes, 8=fixed, others=error)
6. Read fixed content from temp file
7. Return `TextEdit` replacing entire document
8. Remove the temp dir

### `src/utils.ts` (Tool Resolution)

`resolveTools(uri)` searches the file's folder and its parents up to the workspace folder (filesystem root outside one), nearest first:

- Executable: `php-cs-fixer.executable` setting > Composer bin dir (`bin-dir`/`vendor-dir` from `composer.json`, else `vendor/bin`) > `tools/php-cs-fixer` (phive) > `php-cs-fixer` in PATH
- Config: `php-cs-fixer.config` setting > `.php-cs-fixer.php` > `.php-cs-fixer.dist.php` > none (default rules)
- Relative setting paths resolve against the file's workspace folder
- Restricted Mode: a workspace-local executable or config yields a problem instead of being used

No caching: the walk is a handful of `fs.access` calls, and a fresh `composer install` is picked up at once.

### `src/process.ts` (Process)

Spawns without a shell, so paths with spaces stay one argument; only on Windows a shell runs Composer's `.bat` shims, with every argument quoted.

### `src/status.ts` (Status)

Language status item (`languages.createLanguageStatusItem`) for PHP and `notifyOnce()` for error notifications.

### `src/log.ts` (Logging)

"PHP-CS-Fixer" `LogOutputChannel`; command lines and resolution details log at Debug level.

## User Configuration

Settings under `php-cs-fixer.*`:

| Setting                    | Type      | Default     | Description                     |
| -------------------------- | --------- | ----------- | ------------------------------- |
| `php-cs-fixer.executable`  | `string`  | auto-detect | Path to PHP-CS-Fixer executable |
| `php-cs-fixer.config`      | `string`  | auto-detect | Path to config file             |
| `php-cs-fixer.allow-risky` | `boolean` | `false`     | Enable risky rules              |

**Note:** `executable` and `config` are restricted in untrusted workspaces (Workspace Trust).

## Commands

**None contributed.** The status item uses the internal `php-cs-fixer.showLog`. Integrates with VS Code's built-in formatting:

- `Format Document` (Shift+Alt+F)
- `Format Document With...`
- `editor.formatOnSave`

## Build & Development

### Scripts

```bash
pnpm run dev          # Watch mode
pnpm run compile      # One-time build
pnpm run package      # Production build (minified)
pnpm run check        # oxlint (incl. type check) and oxfmt check
pnpm run format       # oxlint --fix and oxfmt
pnpm test             # Run tests (unit + integration)
```

### Build System

- **Bundler:** esbuild (CommonJS output)
- **Entry:** `src/extension.ts` → `dist/extension.js`
- **Tests:** `src/test/**/*.test.ts` → `dist/test/**/*.test.js`
- **External:** `vscode`, `mocha` (provided at runtime)

### Code Quality

- **oxlint** + **tsrs** - Linting, type-aware rules and type checking
- **oxfmt** - Formatting
- **Commitlint** - Conventional commits
- **Lefthook** - Git hooks (pre-commit, commit-msg)

### Testing

- **Unit tests:** `dist/test/unit/*.test.js` - Tool resolution, process, exit codes
- **Integration tests:** `dist/test/integration/*.test.js` - Formatting in VS Code
- Test workspace: `testProject/no-workspace`

## Dependencies

### Dev Dependencies Only (Zero Runtime)

| Package            | Purpose        |
| ------------------ | -------------- |
| `oxlint`           | Linting        |
| `tsrs`             | Type checking  |
| `oxfmt`            | Formatting     |
| `@commitlint/cli`  | Commit linting |
| `@vscode/test-cli` | Test runner    |
| `esbuild`          | Bundler        |

### External Requirements (User Must Install)

- **PHP** - Must be in PATH
- **PHP-CS-Fixer** - Via Composer: `composer require --dev friendsofphp/php-cs-fixer`

## Architecture Decisions

1. **Minimalist Design** - No bundled PHP-CS-Fixer, no custom commands
2. **Multi-Root Workspace Support** - Tools resolve per file (nearest first); settings are resource-scoped
3. **Graceful Degradation** - Auto-discovers executables/configs, falls back to global, shows helpful errors
4. **Cross-Platform** - Handles Windows `.bat` shims (shell with quoted args there), spawns without a shell elsewhere
5. **Cancellation Support** - Respects `CancellationToken`, kills process on cancel
6. **Lazy Activation** - Only activates on `onLanguage:php`
7. **Workspace Trust** - `executable` and `config` settings restricted in untrusted workspaces; a workspace-local executable or config is never run in Restricted Mode
8. **Proper Exit Codes** - Handles PHP-CS-Fixer exit code 8 (files fixed) as success

## Release Process

1. Update version in `package.json`
2. Commit: `git commit -m "chore: release vX.Y.Z"`
3. Tag: `git tag -a vX.Y.Z -m "vX.Y.Z\n\n## What's Changed\n..."`
4. Publish: `pnpx @vscode/vsce publish --no-dependencies`

**Note:** Ensure PAT (Personal Access Token) is valid before publishing.

## Quick Reference

| Action     | Command/Location                   |
| ---------- | ---------------------------------- |
| Build      | `pnpm run compile`                 |
| Package    | `pnpm run package`                 |
| Test       | `pnpm test`                        |
| Debug      | F5 in VS Code                      |
| Main logic | `src/formatter.ts`                 |
| Config     | `package.json` contributes section |
| Logs       | Output panel > "PHP-CS-Fixer"      |

## Troubleshooting

1. **Formatting not working**: Check Output panel > "PHP-CS-Fixer" for logs
2. **Executable not found**: Install via `composer require --dev friendsofphp/php-cs-fixer` or set `php-cs-fixer.executable`
3. **Config not found**: Create `.php-cs-fixer.php` in project root or set `php-cs-fixer.config`
4. **Untrusted workspace**: Grant trust or configure settings at user level
5. **Tests hanging**: Ensure AI/MCP/accounts disabled in test settings
