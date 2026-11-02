// 预览视频（带口播）：node scripts/preview.mjs <seg> [--scale=0.5] [--from=秒 --to=秒]
// 输出 out/preview/<seg>.mp4（960×540、60fps、配乐+音效+口播）
import path from 'node:path';
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import {bundle} from '@remotion/bundler';
import {renderMedia, selectComposition} from '@remotion/renderer';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const id = args[0];
const opt = Object.fromEntries(args.filter((a) => a.startsWith('--')).map((a) => { const [k, v] = a.slice(2).split('='); return [k, v ?? true]; }));
const scale = Number(opt.scale ?? 0.5);
fs.mkdirSync(path.join(root, 'out/preview'), {recursive: true});
const serveUrl = await bundle({entryPoint: path.join(root, `src/entries/${id}.tsx`), publicDir: path.join(root, 'public'), outDir: path.join(root, `out/bundle-${id}`), enableCaching: false});
const inputProps = {audio: true, voice: true};
const composition = await selectComposition({serveUrl, id, inputProps});
const fps = composition.fps;
const fr = opt.from != null ? [Math.round(Number(opt.from) * fps), Math.min(composition.durationInFrames - 1, Math.round(Number(opt.to ?? 1e9) * fps))] : null;
const outputLocation = path.join(root, 'out/preview', `${id}${fr ? `-${opt.from}-${opt.to}` : ''}.mp4`);
const t0 = Date.now();
await renderMedia({serveUrl, composition, inputProps, codec: 'h264', crf: 24, x264Preset: 'veryfast', pixelFormat: 'yuv420p', audioCodec: 'aac', audioBitrate: '160k', imageFormat: 'jpeg', jpegQuality: 85, scale, concurrency: Number(opt.conc ?? 4), frameRange: fr ?? undefined, outputLocation});
console.log('preview →', outputLocation, ((Date.now() - t0) / 1000).toFixed(0) + 's');
