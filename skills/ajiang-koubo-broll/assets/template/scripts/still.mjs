// 静帧自检：node scripts/still.mjs <seg|sample> <秒> <秒> ... [--tag=v1] [--scale=0.5] [--guides]
// 输出 out/qa/<seg>/<tag>-<秒>.png 和拼图 out/qa/<seg>/<tag>-sheet.jpg（带时间和安全区）
// 每段一个独立 entry（src/entries/<seg>.tsx）、独立 bundle 目录、enableCaching:false：多个 agent 并行打包互不干扰。
// 机器上同时有多个 agent 时，一次别超过 ~14 帧。
import path from 'node:path';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {bundle} from '@remotion/bundler';
import {renderStill, selectComposition, openBrowser} from '@remotion/renderer';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const id = args[0];
const opt = Object.fromEntries(args.filter((a) => a.startsWith('--')).map((a) => { const [k, v] = a.slice(2).split('='); return [k, v ?? true]; }));
const times = args.slice(1).filter((a) => !a.startsWith('--')).map(Number);
const tag = opt.tag ?? 'qa';
const scale = Number(opt.scale ?? 0.5);
const outDir = path.join(root, 'out/qa', id);
try {
  const tok = JSON.parse(fs.readFileSync(path.join(root, 'src/data/tokens.json'), 'utf8'));
  if (tok._default) console.warn('⚠ src/data/tokens.json 还是模板默认值（不是本期产品的设计）：先跑 <skill>/scripts/extract_tokens.py 抽产品 tokens。');
  try { if (fs.readFileSync(path.join(root, 'public/logo/wordmark.svg'), 'utf8').includes('ajiang-placeholder')) console.warn('⚠ public/logo/wordmark.svg 还是占位字标：extract_tokens.py --wordmark 抽官网字标，或换成产品名的文字 svg。'); } catch {}
} catch {}
fs.mkdirSync(outDir, {recursive: true});
const serveUrl = await bundle({entryPoint: path.join(root, `src/entries/${id}.tsx`), publicDir: path.join(root, 'public'), outDir: path.join(root, `out/bundle-${id}`), enableCaching: false});
const inputProps = {audio: false, guides: !!opt.guides};
const browser = await openBrowser('chrome');
const composition = await selectComposition({serveUrl, id, inputProps, puppeteerInstance: browser});
const files = [];
for (const s of times) {
  const frame = Math.min(composition.durationInFrames - 1, Math.round(s * composition.fps));
  const output = path.join(outDir, `${tag}-${s.toFixed(2)}.png`);
  await renderStill({serveUrl, composition, frame, output, inputProps, scale, puppeteerInstance: browser, overwrite: true});
  files.push(output);
}
await browser.close({silent: true});
execFileSync('python3', [path.join(root, 'scripts/sheet.py'), path.join(outDir, `${tag}-sheet.jpg`), ...files], {stdio: 'inherit'});
console.log('stills:', files.length, '→', path.join(outDir, `${tag}-sheet.jpg`));
