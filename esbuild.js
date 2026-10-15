const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

const production = process.argv.includes('--production');
const watch = process.argv.includes('--watch');
const tests = process.argv.includes('--tests');

/**
 * Prints errors in a format the problem matcher in VS Code understands
 * @type {import('esbuild').Plugin}
 */
const esbuildProblemMatcherPlugin = {
	name: 'esbuild-problem-matcher',
	setup(build) {
		build.onStart(() => {
			console.log('[watch] build started');
		});
		build.onEnd((result) => {
			result.errors.forEach(({ text, location }) => {
				console.error(`✘ [ERROR] ${text}`);
				console.error(`    ${location.file}:${location.line}:${location.column}:`);
			});
			console.log('[watch] build finished');
		});
	},
};

const common = {
	bundle: true,
	minify: production,
	sourcemap: !production,
	sourcesContent: false,
	logLevel: 'silent',
	plugins: [esbuildProblemMatcherPlugin],
};

const builds = tests
	? [{
		...common,
		// Unit tests of the shared code, run with node --test
		entryPoints: fs.readdirSync('src/test').filter(f => f.endsWith('.test.ts')).map(f => path.join('src/test', f)),
		format: 'cjs',
		platform: 'node',
		outdir: 'out/test',
	}]
	: [{
		...common,
		// The extension runs in the web worker extension host (VS Code desktop and vscode.dev)
		entryPoints: ['src/web/extension.ts'],
		format: 'cjs',
		platform: 'browser',
		outdir: 'dist/web',
		external: ['vscode'],
		define: { global: 'globalThis' },
	}, {
		...common,
		// The panel script, loaded by the webview
		entryPoints: ['src/webview/main.ts'],
		format: 'iife',
		platform: 'browser',
		outdir: 'dist/webview',
	}];

async function main() {
	const contexts = await Promise.all(builds.map(options => esbuild.context(options)));
	if (watch) {
		await Promise.all(contexts.map(ctx => ctx.watch()));
	} else {
		await Promise.all(contexts.map(ctx => ctx.rebuild()));
		await Promise.all(contexts.map(ctx => ctx.dispose()));
	}
}

main().catch(e => {
	console.error(e);
	process.exit(1);
});
