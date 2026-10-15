// 只改了声音（音效 / 配乐 / 增益）时用：重渲音轨，再无损替换进现有 mp4（视频流直接复制，几秒一段）。
// node scripts/render-audio.mjs [seg0 ...]
import path from 'node:path';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {bundle} from '@remotion/bundler';
import {renderMedia, selectComposition} from '@remotion/renderer';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const data = JSON.parse(fs.readFileSync(path.join(root, 'src/segments.json'), 'utf8'));
const ids = process.argv.slice(2).length ? process.argv.slice(2) : data.segments.map((s) => s.key);
const serveUrl = await bundle({entryPoint: path.join(root, 'src/index.ts'), publicDir: path.join(root, 'public')});
const inputProps = {voice: false};
const tmpDir = path.join(root, 'out', '.audio');
fs.mkdirSync(tmpDir, {recursive: true});
for (const id of ids) {
  const s = data.segments.find((x) => x.key === id);
  const mp4 = path.join(root, 'out', `${s.outName}.mp4`);
  if (!fs.existsSync(mp4)) throw new Error(`还没有成片，先跑 render-all：${mp4}`);
  const composition = await selectComposition({serveUrl, id, inputProps});
  const wav = path.join(tmpDir, `${id}.wav`);
  await renderMedia({serveUrl, composition, inputProps, codec: 'wav', outputLocation: wav});
  const tmp = path.join(tmpDir, `${id}.mp4`);
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', mp4, '-i', wav, '-map', '0:v:0', '-map', '1:a:0', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '320k', '-movflags', '+faststart', tmp]);
  fs.renameSync(tmp, mp4);
  console.log('DONE', id);
}
fs.rmSync(tmpDir, {recursive: true, force: true});
