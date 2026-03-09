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
import { executePhpCsFixer } from './process'
import { findPhpCsFixerConfig, findPhpCsFixerExecutable } from './utils'

/**
 * PHP-CS-Fixer exit codes:
 * 0 - OK (no changes)
 * 4 - Some files have invalid syntax (skipped)
 * 8 - Some files were fixed
 * 16 - Configuration error
 * 32 - Fixer error
 *
 * Exit codes are combined with bitwise OR, so:
 * - 0 = success, no changes
 * - 8 = success, files were fixed
 * - Other combinations indicate errors
 */
const EXIT_CODE_OK = 0
const EXIT_CODE_CHANGED = 8

function isSuccessExitCode(code: number): boolean {
	// Success if no error bits are set (only 0 or 8)
	return code === EXIT_CODE_OK || code === EXIT_CODE_CHANGED
}

export class DocumentFormattingProvider implements DocumentFormattingEditProvider {
	readonly tmpDir = tmpdir()

	constructor() {
		log.appendLine(`PHP-CS-Fixer formatter initialized`)
		log.appendLine(`Temporary directory: ${this.tmpDir}`)
	}

	async provideDocumentFormattingEdits(
		document: TextDocument,
		_options?: FormattingOptions,
		token?: CancellationToken,
	): Promise<TextEdit[] | undefined> {
		if (document.languageId !== 'php') {
			return undefined
		}

		log.appendLine('---')
		log.appendLine(`Formatting: ${document.uri.fsPath}`)

		// Resolve workspace folder for cwd
		const workspaceFolder = workspace.getWorkspaceFolder(document.uri)
		const cwd = workspaceFolder?.uri.fsPath
		if (cwd) {
			log.appendLine(`Working directory: ${cwd}`)
		}

		// Find executable
		const phpCsFixerExecutable = await findPhpCsFixerExecutable(token)
		if (!phpCsFixerExecutable) {
			return undefined
		}
		log.appendLine(`Executable: ${phpCsFixerExecutable}`)

		// Find config
		const phpCsFixerConfig = await findPhpCsFixerConfig(token)
		if (!phpCsFixerConfig) {
			return undefined
		}
		log.appendLine(`Config: ${phpCsFixerConfig}`)

		// Write document to temp file
		const originalContents = document.getText()
		const temporaryFile = path.resolve(this.tmpDir, `pcf-${Date.now()}.php`)

		try {
			await fs.writeFile(temporaryFile, originalContents, 'utf8')
			log.appendLine(`Temp file: ${temporaryFile}`)

			// Build command arguments
			const allowRisky = workspace.getConfiguration('php-cs-fixer').get<boolean>('allow-risky')
			const args = [
				'fix',
				'--using-cache=no',
				`--allow-risky=${allowRisky ? 'yes' : 'no'}`,
				'-n', // non-interactive
				'-q', // quiet
				`--config=${phpCsFixerConfig}`,
				temporaryFile,
			]

			log.appendLine(`Running: ${phpCsFixerExecutable} ${args.join(' ')}`)

			// Execute PHP-CS-Fixer using spawn (handles paths with spaces correctly)
			const result = await executePhpCsFixer(phpCsFixerExecutable, args, cwd, token)

			if (!isSuccessExitCode(result.exitCode)) {
				const errorMsg = result.stderr || `Exit code: ${result.exitCode}`
				log.appendLine(`Error: ${errorMsg}`)
				window.showErrorMessage(`PHP-CS-Fixer failed: ${errorMsg}`)
				return undefined
			}

			// Read fixed content
			const fixedContents = await fs.readFile(temporaryFile, 'utf8')

			// Check if content changed
			if (fixedContents === originalContents) {
				log.appendLine('No changes needed')
				return undefined
			}

			log.appendLine('File formatted successfully')

			// Return edit to replace entire document
			const lastLine = document.lineAt(document.lineCount - 1)
			const range = new Range(new Position(0, 0), lastLine.range.end)

			return [TextEdit.replace(range, fixedContents)]
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error)
			log.appendLine(`Error: ${message}`)
			window.showErrorMessage(`PHP-CS-Fixer error: ${message}`)
			return undefined
		} finally {
			// Clean up temp file
			try {
				await fs.rm(temporaryFile, { force: true })
			} catch {
				// Ignore cleanup errors
			}
		}
	}
}
