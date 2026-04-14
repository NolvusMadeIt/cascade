import * as esbuild from 'esbuild';

const watch = process.argv.includes('--watch');

const baseOpts = {
  bundle: true,
  minify: !watch,
  sourcemap: true,
  logLevel: 'info',
};

// Extension host (Node context, external vscode)
const extBuild = esbuild.build({
  ...baseOpts,
  entryPoints: ['src/extension.ts'],
  platform: 'node',
  target: 'node18',
  outfile: 'dist/extension.js',
  external: ['vscode'],
});

// Webview (browser context)
const webBuild = esbuild.build({
  ...baseOpts,
  entryPoints: ['src/webview/chat.ts'],
  platform: 'browser',
  target: 'es2020',
  outfile: 'dist/chat.js',
  define: { global: 'globalThis' },
});

if (watch) {
  const [extCtx, webCtx] = await Promise.all([
    esbuild.context({ ...baseOpts, entryPoints: ['src/extension.ts'], platform: 'node', target: 'node18', outfile: 'dist/extension.js', external: ['vscode'] }),
    esbuild.context({ ...baseOpts, entryPoints: ['src/webview/chat.ts'], platform: 'browser', target: 'es2020', outfile: 'dist/chat.js', define: { global: 'globalThis' } }),
  ]);
  await Promise.all([extCtx.watch(), webCtx.watch()]);
  console.log('Watching...');
} else {
  await Promise.all([extBuild, webBuild]);
}
