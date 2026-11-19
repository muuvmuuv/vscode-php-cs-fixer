import * as assert from 'node:assert'
import fs from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { suite, suiteSetup, suiteTeardown, test } from 'mocha'
import { Uri } from 'vscode'
import { resolveTools } from '../../utils'

/**
 * Unit tests for resolveTools: the nearest executable and config win, starting from the file's
 * folder. The test window has no workspace folder, so the search runs up to the filesystem root.
 */
suite('Tool Resolution Unit Tests', () => {
	let root: string

	async function touch(...segments: string[]): Promise<string> {
		const file = path.join(root, ...segments)
		await fs.mkdir(path.dirname(file), { recursive: true })
		await fs.writeFile(file, '')
		return file
	}

	suiteSetup(async () => {
		root = await fs.realpath(await fs.mkdtemp(path.join(tmpdir(), 'resolve-tools-')))
		await fs.writeFile(
			path.join(root, 'composer.json'),
			JSON.stringify({ config: { 'bin-dir': 'bin' } }),
		)
		await touch('bin', 'php-cs-fixer')
		await touch('.php-cs-fixer.dist.php')
		await touch('packages', 'a', '.php-cs-fixer.php')
		await touch('packages', 'a', 'tools', 'php-cs-fixer')
	})

	suiteTeardown(async () => {
		await fs.rm(root, { recursive: true, force: true })
	})

	test('uses Composer bin-dir and the root config for a file without closer ones', async () => {
		const tools = await resolveTools(Uri.file(path.join(root, 'src', 'Foo.php')))

		assert.strictEqual(tools.problem, undefined)
		assert.strictEqual(tools.executable, path.join(root, 'bin', 'php-cs-fixer'))
		assert.strictEqual(tools.config, path.join(root, '.php-cs-fixer.dist.php'))
	})

	test('prefers the executable and config of the nearest package', async () => {
		const tools = await resolveTools(Uri.file(path.join(root, 'packages', 'a', 'src', 'Bar.php')))

		assert.strictEqual(tools.executable, path.join(root, 'packages', 'a', 'tools', 'php-cs-fixer'))
		assert.strictEqual(tools.config, path.join(root, 'packages', 'a', '.php-cs-fixer.php'))
	})
})
