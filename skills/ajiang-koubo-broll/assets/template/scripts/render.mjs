// 成片：node scripts/render.mjs [seg0 seg3 ...] [--conc=10]（不带段名渲全部）
// 输出 out/final/<outName>.mp4：设计 1920×1080 × meta.output.scale（默认 2 → 3840×2160）、H.264 CRF 16、bt709，
//   音频 = 配乐 + 音效（不含口播）；另出 out/final-nobgm/<outName>.mp4：同一画面，只有音效（方便自配音乐）。
// 只改了声音（mix.json / bgm / sfx）时不要重跑这个，用 reaudio.mjs。
import path from 'node:path';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {bundle} from '@remotion/bundler';
import {renderMedia, selectComposition} from '@remotion/renderer';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const T = JSON.parse(fs.readFileSync(path.join(root, 'src/data/timing.json'), 'utf8')).segments;
const META = JSON.parse(fs.readFileSync(path.join(root, 'src/data/meta.json'), 'utf8'));
const opt = Object.fromEntries(process.argv.slice(2).filter((a) => a.startsWith('--')).map((a) => { const [k, v] = a.slice(2).split('='); return [k, v ?? true]; }));
const ids = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const list = ids.length ? ids : Object.keys(T);
for (const d of ['out/final', 'out/final-nobgm', 'out/tmp']) fs.mkdirSync(path.join(root, d), {recursive: true});
const serveUrl = await bundle({entryPoint: path.join(root, 'src/index.tsx'), publicDir: path.join(root, 'public'), outDir: path.join(root, 'out/bundle-all'), enableCaching: false});
for (const id of list) {
  const s = T[id];
  const t0 = Date.now();
  const ip = {audio: true, voice: false, bgm: true};
  const composition = await selectComposition({serveUrl, id, inputProps: ip});
  if (composition.durationInFrames !== s.frames) throw new Error(`${id} 帧数不符`);
  const out = path.join(root, 'out/final', `${s.outName}.mp4`);
  let last = -1;
  await renderMedia({serveUrl, composition, inputProps: ip, codec: 'h264', crf: 16, x264Preset: 'medium', pixelFormat: 'yuv420p', colorSpace: 'bt709', audioCodec: 'aac', audioBitrate: '320k', imageFormat: 'jpeg', jpegQuality: 95, scale: META.output?.scale ?? 2, concurrency: Number(opt.conc ?? 10), outputLocation: out,
    onProgress: ({progress}) => { const p = Math.floor(progress * 10); if (p !== last) { last = p; console.log(`${id} ${p * 10}% ${((Date.now() - t0) / 1000).toFixed(0)}s`); } }});
  // 无配乐版：只重渲音频，再和画面合并
  const ipn = {audio: true, voice: false, bgm: false};
  const compN = await selectComposition({serveUrl, id, inputProps: ipn});
  const wav = path.join(root, 'out/tmp', `${id}-sfx.wav`);
  await renderMedia({serveUrl, composition: compN, inputProps: ipn, codec: 'wav', outputLocation: wav, concurrency: 4});
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', out, '-i', wav, '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '320k', path.join(root, 'out/final-nobgm', `${s.outName}.mp4`)]);
  console.log(`DONE ${id} ${((Date.now() - t0) / 1000).toFixed(0)}s → ${out}`);
}
