import { mkdir, copyFile, stat } from 'node:fs/promises';
import path from 'node:path';

// Cloudflare Pages は output ディレクトリ直下の `_worker.js` を Functions として扱えるため、
// OpenNext の出力 `./.open-next/worker.js` を `./.open-next/assets/_worker.js` にコピーする。
const src = path.resolve('.open-next', 'worker.js');
const dstDir = path.resolve('.open-next', 'assets');
const dst = path.resolve(dstDir, '_worker.js');

async function main() {
  await stat(src); // throws if missing
  await mkdir(dstDir, { recursive: true });
  await copyFile(src, dst);
  // eslint-disable-next-line no-console
  console.log(`[cf-pages] copied ${src} -> ${dst}`);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('[cf-pages] failed to prepare _worker.js', err);
  process.exitCode = 1;
});

