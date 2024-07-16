import { type CancellationToken, RelativePattern, type Uri, window, workspace } from 'vscode'
import { type PathCacheKey, pathCache } from './cache'
import { log } from './log'

export async function getWorkspaceFile(
	pattern: string,
	excludePattern?: string,
	cancellationToken?: CancellationToken | undefined,
): Promise<Uri> {
	log.appendLine(`Get workspace file: ${pattern}`)

	if (!window.activeTextEditor) {
		throw new Error('No active text editor')
	}

	const activeDocument = window.activeTextEditor.document
	log.appendLine(`Active document: ${activeDocument.uri}`)

	const workspaceFolder = workspace.getWorkspaceFolder(activeDocument.uri)
	if (!workspaceFolder) {
		// TODO: Single opened file not supported yet because there is no actual folder
		// We could do: activeDocument.uri.fsPath.substring(0, activeDocument.uri.fsPath.lastIndexOf('/'));
		window.showWarningMessage(
			'PHP CS Fixer only works when a workspace or folder is opened. Open a ticket, if you need support for single files.',
		)
		throw new Error('No workspace folder found.')
	}
	log.appendLine(
		`Workspace (${workspaceFolder.index}) '${workspaceFolder.name}': ${workspaceFolder.uri}`,
	)

	const cacheKey: PathCacheKey = { workspaceFolder, pattern, excludePattern }

	if (pathCache.has(cacheKey)) {
		const cached = pathCache.get(cacheKey) as Uri
		log.appendLine(`Return cached: ${cached.path}`)
		return cached
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

		log.appendLine(`Found file: ${file.path}`)
		pathCache.set(cacheKey, file)

		return file
	} catch (error) {
		if (error instanceof Error) {
			window.showErrorMessage(`Failed searching for file: ${error.message}`)
		}
		throw error
	}
}

export async function findPhpCsFixerExecutable(
	cancellationToken?: CancellationToken | undefined,
): Promise<string> {
	const userExecutable = workspace.getConfiguration('php-cs-fixer').get<string>('executable')
	if (userExecutable) {
		return userExecutable
	}

	const executableExtension = process.platform === 'win32' ? '.bat' : ''
	const executableName = `php-cs-fixer${executableExtension}`
	const executablePattern = `**/vendor/bin/${executableName}`
	const file = await getWorkspaceFile(executablePattern, undefined, cancellationToken)

	return file.fsPath
}

export async function findPhpCsFixerConfig(
	cancellationToken?: CancellationToken | undefined,
): Promise<string> {
	const userConfig = workspace.getConfiguration('php-cs-fixer').get<string>('config')
	if (userConfig) {
		return userConfig
	}

	const file = await getWorkspaceFile(
		'**/.php-cs-fixer*.php',
		'**/vendor/**',
		cancellationToken,
	)

	return file.fsPath
}
