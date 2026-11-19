import { commands, type ExtensionContext, languages, window, workspace } from 'vscode'
import { DocumentFormattingProvider } from './formatter'
import { log } from './log'
import { SHOW_LOG_COMMAND, showTools, status } from './status'
import { resolveTools } from './utils'

/** Show in the status item which PHP-CS-Fixer and config the active PHP file would use. */
async function refreshStatus(): Promise<void> {
	const document = window.activeTextEditor?.document
	if (document?.languageId === 'php') {
		showTools(await resolveTools(document.uri))
	}
}

export function activate(context: ExtensionContext): void {
	context.subscriptions.push(
		log,
		status,
		languages.registerDocumentFormattingEditProvider(
			{ language: 'php' },
			new DocumentFormattingProvider(),
		),
		commands.registerCommand(SHOW_LOG_COMMAND, () => log.show()),
		window.onDidChangeActiveTextEditor(() => void refreshStatus()),
		workspace.onDidGrantWorkspaceTrust(() => void refreshStatus()),
		workspace.onDidChangeConfiguration((event) => {
			if (event.affectsConfiguration('php-cs-fixer')) {
				void refreshStatus()
			}
		}),
	)

	void refreshStatus()
}
