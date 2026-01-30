import { exec } from 'node:child_process'
import fs from 'node:fs/promises'
import { type CancellationToken, RelativePattern, type Uri, window, workspace } from 'vscode'
import { type PathCacheKey, pathCache } from './cache'
import { log } from './log'

/**
 * Check if a file exists and is accessible
 */
async function fileExists(path: string): Promise<boolean> {
	try {
		await fs.access(path)
		return true
	} catch {
		return false
	}
}

/**
 * Check if a command exists in PATH
 */
async function commandExists(command: string): Promise<boolean> {
	return new Promise((resolve) => {
		const checkCommand = process.platform === 'win32' ? 'where' : 'which'
		exec(`${checkCommand} ${command}`, (error) => {
			resolve(!error)
		})
	})
}

/**
 * Find a file in the workspace matching the given pattern
 */
export async function getWorkspaceFile(
	pattern: string,
	excludePattern?: string,
	cancellationToken?: CancellationToken | undefined,
): Promise<Uri | undefined> {
	log.appendLine(`Searching for workspace file: ${pattern}`)

	if (!window.activeTextEditor) {
		log.appendLine('No active text editor')
		return undefined
	}

	const activeDocument = window.activeTextEditor.document
	log.appendLine(`Active document: ${activeDocument.uri.fsPath}`)

	const workspaceFolder = workspace.getWorkspaceFolder(activeDocument.uri)
	if (!workspaceFolder) {
		log.appendLine('No workspace folder found - single file mode not supported')
		return undefined
	}
	log.appendLine(
		`Workspace (${workspaceFolder.index}) '${workspaceFolder.name}': ${workspaceFolder.uri.fsPath}`,
	)

	const cacheKey: PathCacheKey = { workspaceFolder, pattern, excludePattern }

	const cached = pathCache.get(cacheKey)
	if (cached) {
		// Verify cached file still exists
		if (await fileExists(cached.fsPath)) {
			log.appendLine(`Using cached path: ${cached.fsPath}`)
			return cached
		}
		// Cache is stale, remove it
		log.appendLine(`Cached path no longer exists, removing: ${cached.fsPath}`)
		pathCache.delete(cacheKey)
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
			log.appendLine(`No files found matching: ${pattern}`)
			return undefined
		}

		const [file] = files
		log.appendLine(`Found file: ${file.fsPath}`)
		pathCache.set(cacheKey, file)

		return file
	} catch (error) {
		log.appendLine(`Error searching for file: ${error}`)
		return undefined
	}
}

/**
 * Find the PHP-CS-Fixer executable
 * Priority:
 * 1. User-configured path
 * 2. Local vendor/bin/php-cs-fixer
 * 3. Global php-cs-fixer in PATH
 */
export async function findPhpCsFixerExecutable(
	cancellationToken?: CancellationToken | undefined,
): Promise<string | undefined> {
	// 1. Check user-configured executable
	const userExecutable = workspace.getConfiguration('php-cs-fixer').get<string>('executable')
	if (userExecutable) {
		log.appendLine(`Using user-configured executable: ${userExecutable}`)
		// Validate it exists
		if (await fileExists(userExecutable)) {
			return userExecutable
		}
		// Maybe it's a command in PATH
		if (await commandExists(userExecutable)) {
			return userExecutable
		}
		log.appendLine(`User-configured executable not found: ${userExecutable}`)
		window.showErrorMessage(
			`PHP-CS-Fixer executable not found: ${userExecutable}. Please check your settings.`,
		)
		return undefined
	}

	// 2. Look for local vendor/bin/php-cs-fixer
	const executableExtension = process.platform === 'win32' ? '.bat' : ''
	const executableName = `php-cs-fixer${executableExtension}`
	const executablePattern = `**/vendor/bin/${executableName}`

	const localExecutable = await getWorkspaceFile(
		executablePattern,
		undefined,
		cancellationToken,
	)
	if (localExecutable) {
		log.appendLine(`Found local executable: ${localExecutable.fsPath}`)
		return localExecutable.fsPath
	}

	// 3. Fall back to global php-cs-fixer
	log.appendLine('Local executable not found, checking for global php-cs-fixer...')
	if (await commandExists('php-cs-fixer')) {
		log.appendLine('Found global php-cs-fixer in PATH')
		return 'php-cs-fixer'
	}

	log.appendLine('No PHP-CS-Fixer executable found')
	window.showErrorMessage(
		'PHP-CS-Fixer executable not found. Install it via Composer (vendor/bin/php-cs-fixer) or globally.',
	)
	return undefined
}

/**
 * Find the PHP-CS-Fixer configuration file
 * Priority:
 * 1. User-configured path
 * 2. .php-cs-fixer.php or .php-cs-fixer.dist.php in workspace
 */
export async function findPhpCsFixerConfig(
	cancellationToken?: CancellationToken | undefined,
): Promise<string | undefined> {
	// 1. Check user-configured config
	const userConfig = workspace.getConfiguration('php-cs-fixer').get<string>('config')
	if (userConfig) {
		log.appendLine(`Using user-configured config: ${userConfig}`)
		if (await fileExists(userConfig)) {
			return userConfig
		}
		log.appendLine(`User-configured config not found: ${userConfig}`)
		window.showErrorMessage(
			`PHP-CS-Fixer config not found: ${userConfig}. Please check your settings.`,
		)
		return undefined
	}

	// 2. Look for config file in workspace
	// Try specific names first for better performance
	const configPatterns = [
		'.php-cs-fixer.php',
		'.php-cs-fixer.dist.php',
		'**/.php-cs-fixer*.php',
	]

	for (const pattern of configPatterns) {
		const configFile = await getWorkspaceFile(pattern, '**/vendor/**', cancellationToken)
		if (configFile) {
			log.appendLine(`Found config file: ${configFile.fsPath}`)
			return configFile.fsPath
		}
	}

	log.appendLine('No PHP-CS-Fixer config found')
	window.showErrorMessage(
		'PHP-CS-Fixer config not found. Create a .php-cs-fixer.php file in your project root.',
	)
	return undefined
}
