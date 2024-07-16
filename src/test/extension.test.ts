import * as assert from 'node:assert'
import * as vscode from 'vscode'

suite('Extension Test Suite', () => {
	vscode.window.showInformationMessage('Start all tests.')

	const workspaceFolder = vscode.workspace.workspaceFolders?.[0] as vscode.WorkspaceFolder

	test('Format PHP File', async () => {
		const phpFilePath = './test.php'
		const phpContent = '<?php  echo "Hello, world!"; ?>'

		const expectedPhpContent = "<?php\n\necho 'Hello, world!';\n"

		const fileUri = vscode.Uri.joinPath(workspaceFolder.uri, phpFilePath)
		const phpDocument = await vscode.workspace.openTextDocument(fileUri)
		const phpEditor = await vscode.window.showTextDocument(phpDocument)

		await phpEditor.edit((editBuilder) => {
			const fullRange = new vscode.Range(
				new vscode.Position(0, 0),
				phpDocument.lineAt(phpDocument.lineCount - 1).range.end,
			)
			editBuilder.delete(fullRange)
			editBuilder.insert(new vscode.Position(0, 0), phpContent)
		})
		await phpDocument.save()

		// await new Promise((resolve) => setTimeout(resolve, 100_000))

		await vscode.commands.executeCommand('editor.action.formatDocument')

		const formattedContent = phpDocument.getText()
		assert.strictEqual(formattedContent, expectedPhpContent)
	})
})
