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
		// Composer's Windows shims are .bat files, which need a shell; the shell joins arguments
		// unescaped, so they are quoted there. Elsewhere spawn directly so paths with spaces stay intact.
		const child =
			process.platform === 'win32'
				? spawn([executable, ...args].map((arg) => `"${arg}"`).join(' '), { shell: true, cwd })
				: spawn(executable, args, { cwd })

		let stdout = ''
		let stderr = ''

		child.stdout?.on('data', (data: Buffer) => {
			stdout += data.toString()
		})

		child.stderr?.on('data', (data: Buffer) => {
			stderr += data.toString()
		})

		const cancelListener = token?.onCancellationRequested(() => {
			child.kill()
		})

		child.on('close', (code) => {
			cancelListener?.dispose()
			resolve({
				exitCode: code ?? 1,
				stdout,
				stderr,
			})
		})

		child.on('error', (err) => {
			cancelListener?.dispose()
			resolve({
				exitCode: 1,
				stdout,
				stderr: err.message,
			})
		})
	})
}
