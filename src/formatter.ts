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
	workspace,
} from 'vscode'
import { log } from './log'
import { executePhpCsFixer } from './process'
import { notifyOnce, showProblem, showTools } from './status'
import { resolveTools } from './utils'

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

/** Formats PHP documents by running PHP-CS-Fixer on a temporary copy; registered in `activate()`. */
export class DocumentFormattingProvider implements DocumentFormattingEditProvider {
	async provideDocumentFormattingEdits(
		document: TextDocument,
		_options?: FormattingOptions,
		token?: CancellationToken,
	): Promise<TextEdit[] | undefined> {
		if (document.languageId !== 'php') {
			return undefined
		}

		log.info(`Formatting: ${document.uri.fsPath}`)

		const tools = await resolveTools(document.uri)
		showTools(tools)
		if (tools.problem || !tools.executable) {
			notifyOnce(tools.problem ?? 'PHP-CS-Fixer not found.')
			return undefined
		}

		const cwd = workspace.getWorkspaceFolder(document.uri)?.uri.fsPath
		const originalContents = document.getText()

		// PHP-CS-Fixer looks for a config next to the file it fixes, so a private directory keeps it
		// from loading one planted in the shared temp dir when the project has none
		const temporaryDir = await fs.mkdtemp(path.join(tmpdir(), 'php-cs-fixer-'))
		// Keep the file name: rules such as psr_autoloading compare it with the class name
		const temporaryFile = path.join(
			temporaryDir,
			document.isUntitled ? 'untitled.php' : path.basename(document.fileName),
		)

		try {
			await fs.writeFile(temporaryFile, originalContents, 'utf8')

			const allowRisky = workspace
				.getConfiguration('php-cs-fixer', document.uri)
				.get<boolean>('allow-risky')
			const args = [
				'fix',
				'--using-cache=no',
				`--allow-risky=${allowRisky ? 'yes' : 'no'}`,
				'-n', // non-interactive
				'-q', // quiet
				...(tools.config ? [`--config=${tools.config}`] : []),
				temporaryFile,
			]

			log.debug(`Running in ${cwd ?? process.cwd()}: ${tools.executable} ${args.join(' ')}`)

			const result = await executePhpCsFixer(tools.executable, args, cwd, token)

			if (!isSuccessExitCode(result.exitCode)) {
				const message = `PHP-CS-Fixer failed: ${result.stderr.trim() || `exit code ${result.exitCode}`}`
				showProblem(message)
				notifyOnce(message)
				return undefined
			}

			const fixedContents = await fs.readFile(temporaryFile, 'utf8')
			if (fixedContents === originalContents) {
				log.info('No changes needed')
				return undefined
			}

			log.info('File formatted')

			const lastLine = document.lineAt(document.lineCount - 1)
			const range = new Range(new Position(0, 0), lastLine.range.end)

			return [TextEdit.replace(range, fixedContents)]
		} catch (error) {
			const message = `PHP-CS-Fixer error: ${error instanceof Error ? error.message : String(error)}`
			showProblem(message)
			notifyOnce(message)
			return undefined
		} finally {
			await fs.rm(temporaryDir, { recursive: true, force: true })
		}
	}
}
