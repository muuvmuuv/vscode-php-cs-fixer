import { defineConfig } from '@vscode/test-cli'

export default defineConfig([
	{
		label: 'unitTests',
		files: 'out/test/unit/**/*.test.js',
		mocha: {
			ui: 'tdd',
			timeout: 10000,
		},
	},
	{
		label: 'integrationTests',
		files: 'out/test/integration/**/*.test.js',
		workspaceFolder: 'testProject/no-workspace',
		mocha: {
			ui: 'tdd',
			timeout: 30000,
		},
	},
])
