import { type ExtensionContext, languages } from 'vscode'
import { DocumentFormattingProvider } from './formatter'

export function activate(context: ExtensionContext): void {
	const provider = new DocumentFormattingProvider()

	context.subscriptions.push(
		languages.registerDocumentFormattingEditProvider(
			{
				language: 'php',
			},
			provider,
		),
	)
}
