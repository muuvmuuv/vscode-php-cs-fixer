const { defineConfig } = require('@vscode/test-cli')

const launchArgs = [
	'--hidden-window',
	'--disable-extensions',
	'--disable-gpu',
	'--disable-telemetry',
	'--disable-workspace-trust',
	'--sync=off',
]

const env = {
	// --disable-extensions leaves built-in extensions running, and it overrides any
	// --disable-extension list; this skips them at scan time instead
	VSCODE_SKIP_BUILTIN_EXTENSIONS: [
		'GitHub.copilot-chat',
		'TypeScriptTeam.jsts-chat-features',
		'vscode.git',
		'vscode.git-base',
		'vscode.github',
		'vscode.github-authentication',
		'vscode.microsoft-authentication',
	].join(','),
}

module.exports = defineConfig([
	{
		label: 'unitTests',
		files: 'dist/test/unit/**/*.test.js',
		mocha: {
			ui: 'tdd',
			timeout: 10000,
		},
		launchArgs,
		env,
	},
	{
		label: 'integrationTests',
		files: 'dist/test/integration/**/*.test.js',
		workspaceFolder: 'testProject/no-workspace',
		mocha: {
			ui: 'tdd',
			timeout: 30000,
		},
		launchArgs,
		env,
	},
])
