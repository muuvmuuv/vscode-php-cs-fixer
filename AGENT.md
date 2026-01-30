# Agent Context: vscode-php-cs-fixer

## Overview

**Name:** PHP Formatter PHP-CS-Fixer (`vscode-just-php-cs-fixer`)  
**Version:** 1.2.0  
**Author:** Marvin Heilemann (muuvmuuv)  
**License:** GPLv3

A minimalist VS Code extension that integrates [PHP-CS-Fixer](https://github.com/PHP-CS-Fixer/PHP-CS-Fixer) as a document formatter for PHP files. Philosophy: "zero dependencies" - does one thing well without bundling PHP-CS-Fixer itself.

## Key Features

- Document formatting provider for PHP files
- Single-folder and multi-root workspace support
- Auto-discovers `vendor/bin/php-cs-fixer` executable (with global fallback)
- Auto-discovers `.php-cs-fixer.php` and `.php-cs-fixer.dist.php` configuration files
- Configurable risky rules support
- Logging via VS Code Output Channel ("PHP-CS-Fixer")
- Caches file lookups for performance (with validation)
- Workspace Trust support (restricted mode for untrusted workspaces)

## File Structure

```
vscode-php-cs-fixer/
├── src/                           # TypeScript source
│   ├── extension.ts               # Entry point - registers formatter
│   ├── formatter.ts               # DocumentFormattingProvider implementation
│   ├── utils.ts                   # File discovery (executable, config)
│   ├── cache.ts                   # Path caching system (string-keyed)
│   ├── log.ts                     # Output channel logging
│   └── test/
│       └── extension.test.ts      # Integration tests
├── assets/
│   ├── logo.png                   # Extension icon
│   └── logo.afphoto               # Source design file
├── testProject/                   # Development test fixtures
│   ├── no-workspace/              # Single folder test project
│   ├── ws-project-1/              # Multi-root workspace folder 1
│   ├── ws-project-2/              # Multi-root workspace folder 2
│   └── ws-project.code-workspace  # Multi-root workspace config
├── dist/                          # Bundled output (production)
├── out/                           # TypeScript compiled output (tests)
├── package.json                   # Extension manifest
├── tsconfig.json                  # TypeScript config
├── biome.json                     # Biome linter/formatter (v2)
├── esbuild.mjs                    # Build script
├── lefthook.yml                   # Git hooks
└── .vscode-test.mjs               # Test runner config
```

## Source Files

### `src/extension.ts` (Entry Point)

Minimal entry point that registers `DocumentFormattingProvider` for PHP language.

### `src/formatter.ts` (Core Logic)

`DocumentFormattingProvider` class workflow:
1. Validate document is PHP
2. Find PHP-CS-Fixer executable (user config > local vendor/bin > global PATH)
3. Find PHP-CS-Fixer config (user config > workspace .php-cs-fixer*.php)
4. Write document content to temp file (`/tmp/pcf-<timestamp>.php`)
5. Execute via `spawn`: `php-cs-fixer fix --using-cache=no --allow-risky=yes|no -n -q --config=<config> <tempfile>`
6. Handle exit codes correctly (0=no changes, 8=fixed, others=error)
7. Read fixed content from temp file
8. Return `TextEdit` replacing entire document
9. Clean up temp file

### `src/utils.ts` (File Discovery)

- `fileExists(path)` - Check if file is accessible
- `commandExists(command)` - Check if command exists in PATH
- `getWorkspaceFile(pattern, excludePattern?, token?)` - Find files in workspace with caching
- `findPhpCsFixerExecutable(token?)` - Priority: user config > vendor/bin > global PATH
- `findPhpCsFixerConfig(token?)` - Priority: user config > .php-cs-fixer.php > .php-cs-fixer.dist.php

### `src/cache.ts` (Caching)

String-keyed Map cache (`workspaceUri::pattern::excludePattern`). Validates cached paths still exist before returning.

### `src/log.ts` (Logging)

Dedicated "PHP-CS-Fixer" output channel for debugging.

## User Configuration

Settings under `php-cs-fixer.*`:

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `php-cs-fixer.executable` | `string` | auto-detect | Path to PHP-CS-Fixer executable |
| `php-cs-fixer.config` | `string` | auto-detect | Path to config file |
| `php-cs-fixer.allow-risky` | `boolean` | `false` | Enable risky rules |

**Note:** `executable` and `config` are restricted in untrusted workspaces (Workspace Trust).

Example usage:
```json
{
    "php-cs-fixer.allow-risky": true,
    "[php]": {
        "editor.defaultFormatter": "muuvmuuv.vscode-just-php-cs-fixer",
        "editor.formatOnSave": true
    }
}
```

## Commands

**None.** Integrates with VS Code's built-in formatting:
- `Format Document` (Shift+Alt+F)
- `Format Document With...`
- `editor.formatOnSave`

## Build & Development

### Scripts

```bash
npm run dev          # Watch mode
npm run compile      # One-time build
npm run package      # Production build (minified)
npm run check        # Biome lint check
npm run format       # Biome format
npm test             # Run tests
```

### Build System

- **Bundler:** esbuild
- **Entry:** `src/extension.ts`
- **Output:** `dist/extension.js` (CommonJS)
- **External:** `vscode` (provided by VS Code runtime)

### Code Quality

- **Biome v2** - Linting and formatting
- **Commitlint** - Conventional commits
- **Lefthook** - Git hooks (pre-commit, commit-msg)

### Testing

- Framework: `@vscode/test-cli` + `@vscode/test-electron`
- Test workspace: `testProject/no-workspace`

### Debug Configurations

1. **Run Extension** - Opens `testProject/no-workspace`
2. **Run Extension Workspaced** - Opens multi-root workspace

## Dependencies

### Dev Dependencies Only (Zero Runtime)

| Package | Purpose |
|---------|---------|
| `@biomejs/biome` | Linting/formatting |
| `@commitlint/cli` | Commit linting |
| `@vscode/test-cli` | Test runner |
| `esbuild` | Bundler |
| `typescript` | Compiler |

### External Requirements (User Must Install)

- **PHP** - Must be in PATH
- **PHP-CS-Fixer** - Via Composer: `composer require --dev friendsofphp/php-cs-fixer`

## Architecture Decisions

1. **Minimalist Design** - No bundled PHP-CS-Fixer, no custom commands
2. **Multi-Root Workspace Support** - Cache is workspace-folder-aware
3. **Graceful Degradation** - Auto-discovers executables/configs, falls back to global, shows helpful errors
4. **Cross-Platform** - Handles Windows `.bat` extension, uses `spawn` with `shell: true`
5. **Cancellation Support** - Respects `CancellationToken`, kills process on cancel
6. **Lazy Activation** - Only activates on `onLanguage:php`
7. **Workspace Trust** - `executable` and `config` settings restricted in untrusted workspaces
8. **Proper Exit Codes** - Handles PHP-CS-Fixer exit code 8 (files fixed) as success

## Release Process (Manual)

1. Increment version in `package.json`
2. Commit changes
3. Build: `npm run package`
4. Publish: `vsce publish`

## Test Projects

Each test project in `testProject/` contains:
- Composer dependency on `friendsofphp/php-cs-fixer`
- `.php-cs-fixer.php` with PSR-12 + Symfony rules
- VS Code settings enabling the formatter

## Quick Reference

| Action | Command/Location |
|--------|-----------------|
| Build | `npm run compile` |
| Package | `npm run package` |
| Test | `npm test` |
| Debug | F5 in VS Code |
| Main logic | `src/formatter.ts` |
| Config | `package.json` contributes section |
| Logs | Output panel > "PHP-CS-Fixer" |

## Troubleshooting

1. **Formatting not working**: Check Output panel > "PHP-CS-Fixer" for logs
2. **Executable not found**: Install via `composer require --dev friendsofphp/php-cs-fixer` or set `php-cs-fixer.executable`
3. **Config not found**: Create `.php-cs-fixer.php` in project root or set `php-cs-fixer.config`
4. **Untrusted workspace**: Grant trust or configure settings at user level
