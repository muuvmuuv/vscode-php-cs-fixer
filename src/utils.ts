import { execFile } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'
import { type Uri, workspace } from 'vscode'
import { log } from './log'

const isWindows = process.platform === 'win32'

/** Composer and phive install Windows shims as `.bat` files. */
const executableName = isWindows ? 'php-cs-fixer.bat' : 'php-cs-fixer'

/** Config file names in the order PHP-CS-Fixer itself prefers them. */
const configNames = ['.php-cs-fixer.php', '.php-cs-fixer.dist.php']

/** PHP-CS-Fixer executable and config the formatter runs with for one file. */
export interface Tools {
	/** Executable path, or a command found in PATH. */
	executable?: string
	/** Config file; without one PHP-CS-Fixer applies its default rules. */
	config?: string
	/** Why PHP-CS-Fixer cannot run for this file, worded for the user. */
	problem?: string
}

async function fileExists(file: string): Promise<boolean> {
	try {
		await fs.access(file)
		return true
	} catch {
		return false
	}
}

async function commandExists(command: string): Promise<boolean> {
	return new Promise((resolve) => {
		execFile(isWindows ? 'where' : 'which', [command], (error) => {
			resolve(!error)
		})
	})
}

async function findFirst(files: string[]): Promise<string | undefined> {
	for (const file of files) {
		if (await fileExists(file)) {
			return file
		}
	}
	return undefined
}

/**
 * Directories from the file's folder up to its workspace folder, nearest first. Files outside a
 * workspace folder search up to the filesystem root.
 */
function searchDirectories(uri: Uri): string[] {
	if (uri.scheme !== 'file') {
		return []
	}

	const root = workspace.getWorkspaceFolder(uri)?.uri.fsPath
	const directories: string[] = []
	let directory = path.dirname(uri.fsPath)
	for (;;) {
		directories.push(directory)
		const parent = path.dirname(directory)
		if (directory === root || parent === directory) {
			return directories
		}
		directory = parent
	}
}

/** Composer's bin directory of a project folder, honoring `bin-dir` and `vendor-dir` in composer.json. */
async function composerBinDir(directory: string): Promise<string> {
	try {
		const composer = JSON.parse(
			await fs.readFile(path.join(directory, 'composer.json'), 'utf8'),
		) as { config?: { 'bin-dir'?: string; 'vendor-dir'?: string } }
		const config = composer.config ?? {}
		return path.join(
			directory,
			config['bin-dir'] ?? path.join(config['vendor-dir'] ?? 'vendor', 'bin'),
		)
	} catch {
		return path.join(directory, 'vendor', 'bin')
	}
}

/** Resolve a path from settings; relative paths are relative to the file's workspace folder. */
function resolveSetting(value: string, uri: Uri): string {
	const root = workspace.getWorkspaceFolder(uri)?.uri.fsPath
	return root && !path.isAbsolute(value) ? path.join(root, value) : value
}

async function findLocalExecutable(directories: string[]): Promise<string | undefined> {
	for (const directory of directories) {
		const executable = await findFirst([
			path.join(await composerBinDir(directory), executableName),
			path.join(directory, 'tools', executableName),
		])
		if (executable) {
			return executable
		}
	}
	return undefined
}

/**
 * Resolve the PHP-CS-Fixer executable and config for a file. The nearest match wins, so each
 * package of a monorepo uses its own.
 *
 * Executable: `php-cs-fixer.executable` setting, else Composer's bin dir or `tools/` (phive) in
 * the file's folder and its parents up to the workspace folder, else `php-cs-fixer` in PATH.
 *
 * Config: `php-cs-fixer.config` setting, else `.php-cs-fixer.php` or `.php-cs-fixer.dist.php` in
 * the same folders, else none.
 *
 * In Restricted Mode an executable or config found in the workspace is not used, as both are code
 * from the workspace.
 */
export async function resolveTools(uri: Uri): Promise<Tools> {
	const settings = workspace.getConfiguration('php-cs-fixer', uri)
	const directories = searchDirectories(uri)
	const restricted =
		'This workspace is in Restricted Mode. Trust it to run its own PHP-CS-Fixer and config.'

	let executable: string | undefined
	const executableSetting = settings.get<string>('executable')
	if (executableSetting) {
		const resolved = resolveSetting(executableSetting, uri)
		if (await fileExists(resolved)) {
			executable = resolved
		} else if (await commandExists(executableSetting)) {
			executable = executableSetting
		} else {
			return {
				problem: `PHP-CS-Fixer executable not found: ${executableSetting}. Check the php-cs-fixer.executable setting.`,
			}
		}
	} else {
		const local = await findLocalExecutable(directories)
		if (local && !workspace.isTrusted) {
			return { problem: restricted }
		}
		executable = local ?? ((await commandExists('php-cs-fixer')) ? 'php-cs-fixer' : undefined)
		if (!executable) {
			return {
				problem:
					'PHP-CS-Fixer not found. Install it with Composer (vendor/bin/php-cs-fixer) or globally.',
			}
		}
	}

	let config: string | undefined
	const configSetting = settings.get<string>('config')
	if (configSetting) {
		config = resolveSetting(configSetting, uri)
		if (!(await fileExists(config))) {
			return {
				problem: `PHP-CS-Fixer config not found: ${configSetting}. Check the php-cs-fixer.config setting.`,
			}
		}
	} else {
		config = await findFirst(
			directories.flatMap((directory) => configNames.map((name) => path.join(directory, name))),
		)
		if (config && !workspace.isTrusted) {
			return { problem: restricted }
		}
	}

	log.debug(`Executable: ${executable}, config: ${config ?? 'none (default rules)'}`)
	return { executable, config }
}
