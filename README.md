![PHP-CS-Fixer](./assets/logo.png)

# PHP-CS-Fixer

> Install from here:
> https://marketplace.visualstudio.com/items?itemName=muuvmuuv.vscode-just-php-cs-fixer

Run just the PHP-CS-Fixer with zero dependencies, just ~4 kb!

### How?

Install this extension through the marketplace and install PHP-CS-Fixer with composer locally. If you have PHP-CS-Fixer installed globally, please set the path to the executable in this extension's settings. This extension wont download PHP-CS-Fixer for you, because it is meant to be small and simple.

### Why?

Other extension are way to complex or include HTML formatting, which does not work well with PHP-CS-Fixer.

If you want HTML formatting, download Intelephense and run this extension together with _emeraldwalk.RunOnSave_.

### Development

Extension is bundled with esbuild, see package scripts for cli utilities. VS Code debugger has two options, one for a workspace project and one without.

Releases are made manually; increase the version and publish the package locally. Do not forget to commit all changes before making a release.

---

The PHP-CS-Fixer logo is [© 2010+ Sensio Labs](https://github.com/PHP-CS-Fixer/logo/blob/master/logo.md)
