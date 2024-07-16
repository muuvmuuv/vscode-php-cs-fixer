import { mkdir, rmdir } from 'node:fs/promises'
import esbuild from 'esbuild'
import pkg from './package.json' with { type: 'json' }

const production = process.argv.includes('--production')
const watch = process.argv.includes('--watch')

async function main() {
	const banner = `/**
 * ${pkg.displayName} (${pkg.name})
 *
 * ${pkg.description}
 *
 * @version ${pkg.version}
 * @license ${pkg.license}
 * @author ${pkg.author.name} <${pkg.author.email}>
 * @pkg ${pkg.homepage}
 */`

	await rmdir('./dist', { recursive: true })
	await mkdir('./dist')

	const ctx = await esbuild.context({
		entryPoints: ['src/extension.ts'],
		bundle: true,
		format: 'cjs',
		minify: production,
		sourcemap: !production,
		sourcesContent: false,
		platform: 'node',
		outfile: './dist/extension.js',
		external: ['vscode'],
		logLevel: 'silent',
		banner: { js: banner },
		plugins: [esbuildProblemMatcherPlugin],
	})

	if (watch) {
		await ctx.watch()
	} else {
		await ctx.rebuild()
		await ctx.dispose()
	}
}

/**
 * So we can use VS Code debugger we need some log help.
 *
 * @see https://github.com/connor4312/esbuild-problem-matchers/blob/main/package.json#L51
 *
 * @type {import('esbuild').Plugin}
 */
const esbuildProblemMatcherPlugin = {
	name: 'esbuild-problem-matcher',
	setup(build) {
		build.onStart(() => {
			console.log('[watch] build started')
		})
		build.onEnd((result) => {
			for (const { text, location } of result.errors) {
				console.error(`✘ [ERROR] ${text}`)
				console.error(`    ${location.file}:${location.line}:${location.column}:`)
			}
			console.log('[watch] build finished')
		})
	},
}

await main()
