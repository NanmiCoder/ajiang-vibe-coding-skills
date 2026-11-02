// 只重做音轨（画面不动）：node scripts/reaudio.mjs [seg0 ...]
// 渲出 带配乐 / 无配乐 两条 wav，用 ffmpeg 复制视频流重新封装到 out/final 与 out/final-nobgm
import path from 'node:path';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {bundle} from '@remotion/bundler';
import {renderMedia, selectComposition} from '@remotion/renderer';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const T = JSON.parse(fs.readFileSync(path.join(root, 'src/data/timing.json'), 'utf8')).segments;
const ids = process.argv.slice(2);
const list = ids.length ? ids : Object.keys(T);
fs.mkdirSync(path.join(root, 'out/tmp'), {recursive: true});
const serveUrl = await bundle({entryPoint: path.join(root, 'src/index.tsx'), publicDir: path.join(root, 'public'), outDir: path.join(root, 'out/bundle-audio'), enableCaching: false});
for (const id of list) {
  const s = T[id];
  const video = path.join(root, 'out/final', `${s.outName}.mp4`);
  for (const [bgm, dir] of [[true, 'out/final'], [false, 'out/final-nobgm']]) {
    const ip = {audio: true, voice: false, bgm};
    const comp = await selectComposition({serveUrl, id, inputProps: ip});
    const wav = path.join(root, 'out/tmp', `${id}-${bgm ? 'mix' : 'sfx'}.wav`);
    await renderMedia({serveUrl, composition: comp, inputProps: ip, codec: 'wav', outputLocation: wav, concurrency: 4});
    const out = path.join(root, dir, `${s.outName}.mp4`);
    const tmp = path.join(root, 'out/tmp', `${id}-${bgm ? 'a' : 'b'}.mp4`);
    execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', video, '-i', wav, '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '320k', tmp]);
    fs.renameSync(tmp, out);
  }
  console.log('audio done', id);
}
