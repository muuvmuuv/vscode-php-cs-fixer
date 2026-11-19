import { window } from 'vscode'

/** The extension's "PHP-CS-Fixer" log in the Output panel; debug lines show at log level Debug. */
export const log = window.createOutputChannel('PHP-CS-Fixer', { log: true })
