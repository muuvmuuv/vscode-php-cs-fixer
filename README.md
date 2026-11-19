![PHP-CS-Fixer](./assets/logo.png)

# PHP Formatter PHP-CS-Fixer

[![Visual Studio Marketplace](https://img.shields.io/visual-studio-marketplace/v/muuvmuuv.vscode-just-php-cs-fixer?style=flat-square&label=VS%20Marketplace)](https://marketplace.visualstudio.com/items?itemName=muuvmuuv.vscode-just-php-cs-fixer)
[![Installs](https://img.shields.io/visual-studio-marketplace/i/muuvmuuv.vscode-just-php-cs-fixer?style=flat-square)](https://marketplace.visualstudio.com/items?itemName=muuvmuuv.vscode-just-php-cs-fixer)
[![License](https://img.shields.io/github/license/muuvmuuv/vscode-php-cs-fixer?style=flat-square)](./LICENSE.md)

A lightweight VS Code extension that formats PHP files using [PHP-CS-Fixer](https://github.com/PHP-CS-Fixer/PHP-CS-Fixer). Zero dependencies, auto-discovers your config and executable.

## Features

- Formats PHP files on demand or on save
- Finds the nearest PHP-CS-Fixer: Composer's bin dir (honors `bin-dir`), `tools/` (phive), or a global installation
- Finds the nearest `.php-cs-fixer.php` or `.php-cs-fixer.dist.php`, so each package of a monorepo uses its own; without one, PHP-CS-Fixer's default rules apply
- Shows the PHP-CS-Fixer and config in use, or why it cannot run, in the language status of PHP files
- Multi-root workspace support, with per-folder settings
- Workspace Trust support: in Restricted Mode the workspace's own PHP-CS-Fixer and config are not run
- Minimal footprint (~4 KB bundled)

## Requirements

- [PHP-CS-Fixer](https://github.com/PHP-CS-Fixer/PHP-CS-Fixer) installed locally or globally
- PHP available in your PATH

### Install PHP-CS-Fixer

```bash
# Local installation (recommended)
composer require --dev friendsofphp/php-cs-fixer

# Global installation
composer global require friendsofphp/php-cs-fixer
```

## Quick Start

1. Install this extension from the [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=muuvmuuv.vscode-just-php-cs-fixer)
2. Install PHP-CS-Fixer via Composer
3. Optionally create a `.php-cs-fixer.php` config file in your project root
4. Set this extension as your default PHP formatter:

```json
{
	"[php]": {
		"editor.defaultFormatter": "muuvmuuv.vscode-just-php-cs-fixer",
		"editor.formatOnSave": true
	}
}
```

## Configuration

| Setting                    | Default     | Description                     |
| -------------------------- | ----------- | ------------------------------- |
| `php-cs-fixer.executable`  | Auto-detect | Path to PHP-CS-Fixer executable |
| `php-cs-fixer.config`      | Auto-detect | Path to config file             |
| `php-cs-fixer.allow-risky` | `false`     | Allow risky rules               |

Relative paths are resolved against the workspace folder of the file being formatted.

### Example Configuration

```json
{
	"php-cs-fixer.executable": "vendor/bin/php-cs-fixer",
	"php-cs-fixer.config": ".php-cs-fixer.php",
	"php-cs-fixer.allow-risky": true,
	"[php]": {
		"editor.defaultFormatter": "muuvmuuv.vscode-just-php-cs-fixer",
		"editor.formatOnSave": true
	}
}
```

### Example PHP-CS-Fixer Config

Create a `.php-cs-fixer.php` file in your project root:

```php
<?php

$finder = PhpCsFixer\Finder::create()
    ->in(__DIR__)
    ->exclude('vendor');

return (new PhpCsFixer\Config())
    ->setRules([
        '@PSR12' => true,
        '@Symfony' => true,
    ])
    ->setFinder($finder);
```

## Why This Extension?

Other PHP formatting extensions tend to be complex, bundle PHP-CS-Fixer themselves, or include HTML formatting that conflicts with PHP-CS-Fixer. This extension:

- Does **one thing well** - runs PHP-CS-Fixer
- Has **zero runtime dependencies**
- Uses **your** PHP-CS-Fixer installation and config
- Works seamlessly with other extensions like [Intelephense](https://marketplace.visualstudio.com/items?itemName=bmewburn.vscode-intelephense-client)

## Troubleshooting

### Formatting not working?

1. Hover the `{}` language status in the status bar of a PHP file: it names the PHP-CS-Fixer and config in use, or the problem
2. Click "Show Log" there (or open "PHP-CS-Fixer" in the Output panel) for details; set the log level to Debug for the full command line

### Common Issues

| Issue                | Solution                                                                                        |
| -------------------- | ----------------------------------------------------------------------------------------------- |
| Executable not found | Install via `composer require --dev friendsofphp/php-cs-fixer` or set `php-cs-fixer.executable` |
| Config not found     | The file set in `php-cs-fixer.config` does not exist; fix the path or remove the setting        |
| Untrusted workspace  | Grant workspace trust or configure settings at user level                                       |

## Development

```bash
# Install dependencies
pnpm install

# Build
pnpm run compile

# Watch mode
pnpm run dev

# Run tests
pnpm test

# Package
pnpm run package
```

## License

[GPLv3](./LICENSE.md)

---

The PHP-CS-Fixer logo is [© Fabien Potencier](https://github.com/PHP-CS-Fixer/logo/blob/master/logo.md)
