import { spawn } from 'node:child_process'
import type { CancellationToken } from 'vscode'

export interface ProcessResult {
	exitCode: number
	stdout: string
	stderr: string
}

/**
 * Execute PHP-CS-Fixer as a child process.
 *
 * @param executable - Path to the PHP-CS-Fixer executable
 * @param args - Command-line arguments
 * @param cwd - Working directory for the process (should be the workspace folder
 *   so PHP-CS-Fixer can resolve composer.json and other project files)
 * @param token - Optional cancellation token
 */
export function executePhpCsFixer(
	executable: string,
	args: string[],
	cwd?: string,
	token?: CancellationToken,
): Promise<ProcessResult> {
	return new Promise((resolve) => {
		const process = spawn(executable, args, {
			shell: true, // Needed for Windows batch files and PATH resolution
			cwd, // Run in workspace folder so PHP-CS-Fixer resolves composer.json correctly
		})

		let stdout = ''
		let stderr = ''

		process.stdout?.on('data', (data: Buffer) => {
			stdout += data.toString()
		})

		process.stderr?.on('data', (data: Buffer) => {
			stderr += data.toString()
		})

		// Handle cancellation
		const cancelListener = token?.onCancellationRequested(() => {
			process.kill()
		})

		process.on('close', (code) => {
			cancelListener?.dispose()
			resolve({
				exitCode: code ?? 1,
				stdout,
				stderr,
			})
		})

		process.on('error', (err) => {
			cancelListener?.dispose()
			resolve({
				exitCode: 1,
				stdout,
				stderr: err.message,
			})
		})
	})
}
