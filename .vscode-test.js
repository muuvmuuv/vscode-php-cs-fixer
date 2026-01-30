const { defineConfig } = require('@vscode/test-cli')

module.exports = defineConfig([
	{
		label: 'unitTests',
		files: 'dist/test/unit/**/*.test.js',
		mocha: {
			ui: 'tdd',
			timeout: 10000,
		},
	},
	{
		label: 'integrationTests',
		files: 'dist/test/integration/**/*.test.js',
		workspaceFolder: 'testProject/no-workspace',
		mocha: {
			ui: 'tdd',
			timeout: 30000,
		},
		launchArgs: [
			'--disable-extensions',
			'--disable-gpu',
			'--disable-telemetry',
			'--disable-workspace-trust',
			'--sync=off',
		],
		env: {
			// Disable MCP registry
			VSCODE_MCP_DISABLE: '1',
			VSCODE_DISABLE_MCP: '1',
			// Disable accounts/auth
			VSCODE_DISABLE_ACCOUNTS: '1',
			// Disable git
			VSCODE_GIT_DISABLE: '1',
		},
	},
])
