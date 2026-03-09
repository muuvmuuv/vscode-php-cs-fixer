import * as assert from 'node:assert'
import { realpathSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { suite, test } from 'mocha'
import { executePhpCsFixer } from '../../process'

/**
 * Unit tests for the executePhpCsFixer process runner.
 * These tests verify that the spawn options (cwd, shell, etc.) are correctly applied.
 */
suite('Process Unit Tests', () => {
	suite('executePhpCsFixer', () => {
		test('should execute a command and capture stdout', async () => {
			const result = await executePhpCsFixer('echo', ['hello'])

			assert.strictEqual(result.exitCode, 0)
			assert.ok(
				result.stdout.includes('hello'),
				`Expected stdout to contain "hello", got: "${result.stdout}"`,
			)
		})

		test('should capture stderr output', async () => {
			const result = await executePhpCsFixer('echo', ['error', '>&2'])

			assert.ok(
				result.stderr.includes('error'),
				`Expected stderr to contain "error", got: "${result.stderr}"`,
			)
		})

		test('should return non-zero exit code on failure', async () => {
			const result = await executePhpCsFixer('exit', ['1'])

			assert.notStrictEqual(result.exitCode, 0)
		})

		test('should use provided cwd as working directory', async () => {
			const expectedCwd = realpathSync(tmpdir())
			const result = await executePhpCsFixer('pwd', [], expectedCwd)

			assert.strictEqual(result.exitCode, 0)
			// pwd output should match the cwd we passed (resolve symlinks for macOS /var -> /private/var)
			const actualCwd = result.stdout.trim()
			assert.strictEqual(
				actualCwd,
				expectedCwd,
				`Expected cwd to be "${expectedCwd}", but process ran in "${actualCwd}"`,
			)
		})

		test('should use default cwd when none is provided', async () => {
			const result = await executePhpCsFixer('pwd', [])

			assert.strictEqual(result.exitCode, 0)
			// Without explicit cwd, should use the current process cwd
			const actualCwd = result.stdout.trim()
			assert.strictEqual(
				actualCwd,
				process.cwd(),
				`Expected default cwd "${process.cwd()}", but process ran in "${actualCwd}"`,
			)
		})

		test('should use different cwd values correctly', async () => {
			const cwd1 = realpathSync(tmpdir())
			const cwd2 = '/'

			const [result1, result2] = await Promise.all([
				executePhpCsFixer('pwd', [], cwd1),
				executePhpCsFixer('pwd', [], cwd2),
			])

			assert.strictEqual(result1.stdout.trim(), cwd1, 'First process should run in tmpdir')
			assert.strictEqual(result2.stdout.trim(), '/', 'Second process should run in root')
		})

		test('should resolve exit code 1 for non-existent commands', async () => {
			const result = await executePhpCsFixer('nonexistent_command_12345', [])

			assert.notStrictEqual(result.exitCode, 0)
		})
	})
})
