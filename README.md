![PHP-CS-Fixer](./assets/logo.png)

# PHP Formatter PHP-CS-Fixer

[![Visual Studio Marketplace](https://img.shields.io/visual-studio-marketplace/v/muuvmuuv.vscode-just-php-cs-fixer?style=flat-square&label=VS%20Marketplace)](https://marketplace.visualstudio.com/items?itemName=muuvmuuv.vscode-just-php-cs-fixer)
[![Installs](https://img.shields.io/visual-studio-marketplace/i/muuvmuuv.vscode-just-php-cs-fixer?style=flat-square)](https://marketplace.visualstudio.com/items?itemName=muuvmuuv.vscode-just-php-cs-fixer)
[![License](https://img.shields.io/github/license/muuvmuuv/vscode-php-cs-fixer?style=flat-square)](./LICENSE.md)

A lightweight VS Code extension that formats PHP files using [PHP-CS-Fixer](https://github.com/PHP-CS-Fixer/PHP-CS-Fixer). Zero dependencies, auto-discovers your config and executable.

## Features

- Formats PHP files on demand or on save
- Auto-discovers `vendor/bin/php-cs-fixer` or falls back to global installation
- Auto-discovers `.php-cs-fixer.php` or `.php-cs-fixer.dist.php` config files
- Multi-root workspace support
- Workspace Trust support for security
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
3. Create a `.php-cs-fixer.php` config file in your project root
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

| Setting | Default | Description |
|---------|---------|-------------|
| `php-cs-fixer.executable` | Auto-detect | Path to PHP-CS-Fixer executable |
| `php-cs-fixer.config` | Auto-detect | Path to config file |
| `php-cs-fixer.allow-risky` | `false` | Allow risky rules |

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

1. Open the Output panel (`View > Output`)
2. Select "PHP-CS-Fixer" from the dropdown
3. Check the logs for errors

### Common Issues

| Issue | Solution |
|-------|----------|
| Executable not found | Install via `composer require --dev friendsofphp/php-cs-fixer` or set `php-cs-fixer.executable` |
| Config not found | Create `.php-cs-fixer.php` in project root or set `php-cs-fixer.config` |
| Untrusted workspace | Grant workspace trust or configure settings at user level |

## Development

```bash
# Install dependencies
npm install

# Build
npm run compile

# Watch mode
npm run dev

# Run tests
npm test

# Package
npm run package
```

## License

[GPLv3](./LICENSE.md)

---

The PHP-CS-Fixer logo is [© Fabien Potencier](https://github.com/PHP-CS-Fixer/logo/blob/master/logo.md)
