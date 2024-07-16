import { exec } from 'node:child_process'
import fs from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import type { DocumentFormattingEditProvider } from 'vscode'
import {
	type CancellationToken,
	type FormattingOptions,
	Position,
	Range,
	type TextDocument,
	TextEdit,
	window,
	workspace,
} from 'vscode'
import { log } from './log'
import { findPhpCsFixerConfig, findPhpCsFixerExecutable } from './utils'

export class DocumentFormattingProvider implements DocumentFormattingEditProvider {
	readonly tmpDir = tmpdir()

	constructor() {
		log.appendLine(`Temporary directory: ${this.tmpDir}`)
	}

	async provideDocumentFormattingEdits(
		document: TextDocument,
		_?: FormattingOptions,
		token?: CancellationToken,
	): Promise<TextEdit[] | undefined> {
		if (document.languageId !== 'php') {
			return
		}

		const phpCsFixerExecutable = await findPhpCsFixerExecutable(token)
		log.appendLine(`PHP-CS-Fixer executable: ${phpCsFixerExecutable}`)

		const phpCsFixerConfig = await findPhpCsFixerConfig(token)
		log.appendLine(`PHP-CS-Fixer config: ${phpCsFixerConfig}`)

		log.appendLine(`Formatting with PHP-CS-Fixer ${document.uri.fsPath}`)

		const originalContents = document.getText()
		const temporaryFile = path.resolve(this.tmpDir, `pcf-${Date.now()}.php`)
		await fs.writeFile(temporaryFile, originalContents, 'utf8')

		try {
			const command = [
				phpCsFixerExecutable,
				'fix',
				'--using-cache=no',
				workspace.getConfiguration('php-cs-fixer').get('allow-risky')
					? '--allow-risky=yes'
					: '--allow-risky=no',
				'-nq',
				`--config=${phpCsFixerConfig}`,
				temporaryFile,
			]
			const process = exec(command.join(' '), { encoding: 'utf8' })

			token?.onCancellationRequested(() => {
				process.kill()
			})

			await new Promise<void>((resolve, reject) => {
				let stderr = ''
				process.stderr?.on('data', (data) => {
					stderr += data
				})
				process.on('exit', (exitCode) => {
					exitCode === 0 ? resolve() : reject(new Error(stderr))
				})
			})

			const fixedContents = await fs.readFile(temporaryFile, 'utf8')
			if (fixedContents === originalContents) {
				return
			}

			const range = new Range(
				new Position(0, 0),
				document.lineAt(document.lineCount - 1).range.end,
			)
			const textEdit = TextEdit.replace(range, fixedContents)
			return [textEdit]
		} catch (error) {
			if (error instanceof Error) {
				window.showErrorMessage(`Failed executing PHP CS Fixer: ${error.message}`)
				log.appendLine(error.message)
			}
			throw error
		} finally {
			void fs.rm(temporaryFile, { force: true })
		}
	}
}
