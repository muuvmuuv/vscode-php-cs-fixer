import * as assert from 'node:assert'
import { suite, suiteSetup, suiteTeardown, test } from 'mocha'
import * as vscode from 'vscode'

/**
 * Integration tests for the PHP-CS-Fixer formatter.
 * These tests run in a VS Code Extension Host with full API access.
 */
suite('Formatter Integration Tests', () => {
	let workspaceFolder: vscode.WorkspaceFolder

	suiteSetup(async () => {
		// Ensure we have a workspace
		const folders = vscode.workspace.workspaceFolders
		assert.ok(folders && folders.length > 0, 'No workspace folder found')
		workspaceFolder = folders[0]

		// Wait for extension to activate
		const extension = vscode.extensions.getExtension('muuvmuuv.vscode-just-php-cs-fixer')
		if (extension && !extension.isActive) {
			await extension.activate()
		}
	})

	suiteTeardown(() => {
		vscode.window.showInformationMessage('All formatter tests completed.')
	})

	/**
	 * Helper to create/update a PHP file with content and format it.
	 */
	async function formatPhpContent(
		fileName: string,
		content: string,
	): Promise<{ original: string; formatted: string }> {
		const fileUri = vscode.Uri.joinPath(workspaceFolder.uri, fileName)
		const document = await vscode.workspace.openTextDocument(fileUri)
		const editor = await vscode.window.showTextDocument(document)

		// Replace document content
		await editor.edit((editBuilder) => {
			const fullRange = new vscode.Range(
				new vscode.Position(0, 0),
				document.lineAt(document.lineCount - 1).range.end,
			)
			editBuilder.replace(fullRange, content)
		})
		await document.save()

		const original = document.getText()

		// Execute format command
		await vscode.commands.executeCommand('editor.action.formatDocument')

		// Small delay to ensure formatting completes
		await new Promise((resolve) => setTimeout(resolve, 100))

		const formatted = document.getText()

		return { original, formatted }
	}

	suite('Basic Formatting', () => {
		test('should format simple PHP file', async () => {
			const input = '<?php  echo "Hello, world!"; ?>'
			const expected = "<?php\n\necho 'Hello, world!';\n"

			const { formatted } = await formatPhpContent('test.php', input)

			assert.strictEqual(
				formatted,
				expected,
				'PHP file should be formatted according to PSR-12/Symfony rules',
			)
		})

		test('should convert double quotes to single quotes where applicable', async () => {
			const input = '<?php $x = "simple string";'
			const expected = "<?php\n\n$x = 'simple string';\n"

			const { formatted } = await formatPhpContent('test.php', input)

			assert.strictEqual(formatted, expected)
		})

		test('should not change already formatted code', async () => {
			const input = "<?php\n\necho 'Already formatted';\n"

			const { original, formatted } = await formatPhpContent('test.php', input)

			assert.strictEqual(formatted, original, 'Already formatted code should remain unchanged')
		})
	})

	suite('Indentation', () => {
		test('should use tabs for indentation (per config)', async () => {
			const input = '<?php\nfunction test() {\n    return true;\n}'

			const { formatted } = await formatPhpContent('test.php', input)

			assert.ok(formatted.includes('\treturn'), 'Should use tabs for indentation')
			assert.ok(!formatted.includes('    return'), 'Should not use spaces for indentation')
		})
	})

	suite('Class Formatting', () => {
		test('should format class with proper spacing', async () => {
			const input = '<?php class Foo{public function bar(){return true;}}'

			const { formatted } = await formatPhpContent('test.php', input)

			// Should have newlines and proper structure
			assert.ok(formatted.includes('class Foo'), 'Should preserve class name')
			assert.ok(formatted.includes('public function bar()'), 'Should preserve method')
			assert.ok(formatted.includes('\n'), 'Should have newlines')
		})
	})

	suite('Array Formatting', () => {
		test('should format arrays with short syntax', async () => {
			const input = '<?php $arr = array(1, 2, 3);'

			const { formatted } = await formatPhpContent('test.php', input)

			// Symfony rules convert array() to []
			assert.ok(formatted.includes('[1, 2, 3]'), 'Should convert to short array syntax')
		})
	})

	suite('Edge Cases', () => {
		test('should handle empty PHP file', async () => {
			const input = '<?php\n'

			const { formatted } = await formatPhpContent('test.php', input)

			assert.ok(formatted.startsWith('<?php'), 'Should preserve PHP tag')
		})

		test('should handle PHP file with only comments', async () => {
			const input = '<?php\n// This is a comment\n'

			const { formatted } = await formatPhpContent('test.php', input)

			assert.ok(formatted.includes('// This is a comment'), 'Should preserve comments')
		})

		test('should preserve string content with special characters', async () => {
			const input = '<?php $x = "Hello\\nWorld";'

			const { formatted } = await formatPhpContent('test.php', input)

			// Double quotes preserved when string contains escape sequences
			assert.ok(formatted.includes('"Hello\\nWorld"'), 'Should preserve escaped characters')
		})
	})
})
