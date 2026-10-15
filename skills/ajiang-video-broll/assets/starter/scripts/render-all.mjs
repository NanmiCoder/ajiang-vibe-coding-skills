// 渲染成片：node scripts/render-all.mjs [seg0 seg2 ...]（不带参数渲染全部）
// 输出 out/<outName>.mp4：母版分辨率、H.264 CRF 16、bt709，音频 = 配乐 + 音效（不含口播），
// 帧数严格等于区间长度。文件名来自 segments.json 的 outName（SRT 毫秒时间 + 字幕条号）。
import path from 'node:path';
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import {bundle} from '@remotion/bundler';
import {renderMedia, selectComposition} from '@remotion/renderer';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const data = JSON.parse(fs.readFileSync(path.join(root, 'src/segments.json'), 'utf8'));
const ids = process.argv.slice(2).length ? process.argv.slice(2) : data.segments.map((s) => s.key);
const scale = data.width / 3840;
fs.mkdirSync(path.join(root, 'out'), {recursive: true});
const serveUrl = await bundle({entryPoint: path.join(root, 'src/index.ts'), publicDir: path.join(root, 'public')});
const inputProps = {voice: false};
for (const id of ids) {
  const s = data.segments.find((x) => x.key === id);
  if (!s) throw new Error(`segments.json 里没有 ${id}`);
  const composition = await selectComposition({serveUrl, id, inputProps});
  const outputLocation = path.join(root, 'out', `${s.outName}.mp4`);
  const t0 = Date.now();
  let last = -1;
  await renderMedia({
    serveUrl,
    composition,
    inputProps,
    codec: 'h264',
    crf: 16,
    x264Preset: 'medium',
    pixelFormat: 'yuv420p',
    colorSpace: 'bt709',
    audioCodec: 'aac',
    audioBitrate: '320k',
    imageFormat: 'jpeg',
    jpegQuality: 95,
    scale,
    concurrency: 8,
    outputLocation,
    onProgress: ({progress}) => {
      const p = Math.floor(progress * 10);
      if (p !== last) {
        last = p;
        console.log(`${id} ${p * 10}% ${((Date.now() - t0) / 1000).toFixed(0)}s`);
      }
    },
  });
  console.log(`DONE ${outputLocation} ${((Date.now() - t0) / 1000).toFixed(0)}s`);
}
