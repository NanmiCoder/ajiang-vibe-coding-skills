// 导出检查用截图：node scripts/stills.mjs seg2-case02:300,600 seg3-case03:540
import path from 'node:path';
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import {bundle} from '@remotion/bundler';
import {renderStill, selectComposition} from '@remotion/renderer';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'out/stills');
fs.mkdirSync(outDir, {recursive: true});
const scale = Number(process.env.SCALE ?? 0.5);
const serveUrl = await bundle({entryPoint: path.join(root, 'src/index.ts'), publicDir: path.join(root, 'public')});
for (const arg of process.argv.slice(2)) {
  const [id, frames] = arg.split(':');
  const composition = await selectComposition({serveUrl, id});
  for (const fr of frames.split(',').map(Number)) {
    const output = path.join(outDir, `${id}_${String(fr).padStart(4, '0')}.jpg`);
    await renderStill({serveUrl, composition, frame: fr, output, scale, imageFormat: 'jpeg', jpegQuality: 85});
    console.log(output);
  }
}
