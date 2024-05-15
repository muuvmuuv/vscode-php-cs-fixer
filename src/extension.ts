import { exec } from 'node:child_process'
import fs from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import {
	type CancellationToken,
	type ExtensionContext,
	type FormattingOptions,
	Position,
	Range,
	RelativePattern,
	type TextDocument,
	TextEdit,
	type Uri,
	type WorkspaceConfiguration,
	type WorkspaceFolder,
	commands,
	languages,
	window,
	workspace,
} from 'vscode'

interface PathCacheKey {
	workspaceFolder: WorkspaceFolder
	pattern: string
	excludePattern?: string
}
/** Stores file path in combination with its workspace. */
const pathCache = new Map<PathCacheKey, Uri>()

let extensionConfiguration!: WorkspaceConfiguration
let cancellationToken: CancellationToken | undefined

const log = window.createOutputChannel('PHP-CS-Fixer')

async function getWorkspaceFile(pattern: string, excludePattern?: string): Promise<Uri> {
	if (!window.activeTextEditor) {
		throw new Error('No active text editor')
	}

	const activeDocument = window.activeTextEditor.document
	const workspaceFolder = workspace.getWorkspaceFolder(activeDocument.uri)

	if (!workspaceFolder) {
		// TODO: Single file not supported yet.
		window.showWarningMessage(
			'PHP CS Fixer only works when a workspace is opened. Open a ticket, if you need support for single files.',
		)
		throw new Error('No workspace folder found.')
	}

	const cacheKey: PathCacheKey = { workspaceFolder, pattern, excludePattern }

	if (pathCache.has(cacheKey)) {
		return pathCache.get(cacheKey) as Uri
	}

	try {
		const relativePattern = new RelativePattern(workspaceFolder, pattern)

		const files = await workspace.findFiles(
			relativePattern,
			excludePattern,
			1,
			cancellationToken,
		)

		if (files.length === 0) {
			throw new Error('No file found.')
		}
		const [file] = files

		pathCache.set(cacheKey, file)

		return file
	} catch (error) {
		if (error instanceof Error) {
			window.showErrorMessage(`Failed searching for file: ${error.message}`)
		}
		throw error
	}
}

async function findPhpCsFixerExecutable(): Promise<string> {
	const userExecutable = extensionConfiguration.get<string>('executable')
	if (userExecutable) {
		return userExecutable
	}

	const executableExtension = process.platform === 'win32' ? '.bat' : ''
	const executableName = `php-cs-fixer${executableExtension}`
	const executablePattern = `**/vendor/bin/${executableName}`
	const file = await getWorkspaceFile(executablePattern)

	return file.fsPath
}

async function findPhpCsFixerConfig(): Promise<string> {
	const userConfig = extensionConfiguration.get<string>('config')
	if (userConfig) {
		return userConfig
	}

	const file = await getWorkspaceFile('**/.php-cs-fixer.php', '**/vendor/**')

	return file.fsPath
}

async function provideDocumentFormattingEdits(
	document: TextDocument,
	_?: FormattingOptions,
	token?: CancellationToken,
): Promise<TextEdit[] | undefined> {
	if (document.languageId !== 'php' || cancellationToken !== undefined) {
		return
	}

	cancellationToken = token

	const phpCsFixerExecutable = await findPhpCsFixerExecutable()
	log.appendLine(`PHP-CS-Fixer executable: ${phpCsFixerExecutable}`)

	const phpCsFixerConfig = await findPhpCsFixerConfig()
	log.appendLine(`PHP-CS-Fixer config: ${phpCsFixerConfig}`)

	log.appendLine(`Formatting with PHP-CS-Fixer ${document.uri.fsPath}`)

	const originalContents = document.getText()
	const temporaryFile = path.resolve(tmpdir(), `pcf-${Date.now()}.php`)
	await fs.writeFile(temporaryFile, originalContents, 'utf8')

	try {
		const command = [
			phpCsFixerExecutable,
			'fix',
			'--using-cache=no',
			extensionConfiguration.get('allow-risky') ? '--allow-risky=yes' : '--allow-risky=no',
			'-nq',
			`--config=${phpCsFixerConfig}`,
			temporaryFile,
		]
		const process = exec(command.join(' '), { encoding: 'utf8' })

		token?.onCancellationRequested(() => {
			process.kill()
			cancellationToken = undefined
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
		cancellationToken = undefined
	}
}

export function activate(context: ExtensionContext): void {
	extensionConfiguration = workspace.getConfiguration('php-cs-fixer')

	workspace.onDidChangeConfiguration((event) => {
		if (event.affectsConfiguration('php-cs-fixer')) {
			log.appendLine('Configuration changed. Updating...')
			extensionConfiguration = workspace.getConfiguration('php-cs-fixer')
		}
	})

	context.subscriptions.push(
		commands.registerCommand('php-cs-fixer.fix', async () => {
			const document = window.activeTextEditor?.document
			if (!document) {
				window.showErrorMessage('No active document.')
				return
			}
			if (!window.activeTextEditor) {
				return
			}
			const edits = await provideDocumentFormattingEdits(document)
			if (edits) {
				window.activeTextEditor.edit((editBuilder) => {
					for (const edit of edits) editBuilder.replace(edit.range, edit.newText)
				})
			}
		}),
		languages.registerDocumentFormattingEditProvider(
			{ language: 'php' },
			{ provideDocumentFormattingEdits },
		),
	)
}
