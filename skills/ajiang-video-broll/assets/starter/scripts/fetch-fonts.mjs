// 把 src 里用到的所有字符做成子集，从 Google Fonts 下载 woff2 到 public/fonts。
// 改了上屏文案后重新跑一次：node scripts/fetch-fonts.mjs
import fs from 'node:fs';
import path from 'node:path';

import {fileURLToPath} from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const walk = (d) => fs.readdirSync(d, {withFileTypes: true}).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));
let chars = new Set();
for (const f of walk(path.join(root, 'src'))) for (const c of fs.readFileSync(f, 'utf8')) chars.add(c);
for (let i = 32; i < 127; i++) chars.add(String.fromCharCode(i));
['×', '→', '·', '“', '”', '，', '、', '：', '↑'].forEach((c) => chars.add(c));
const text = [...chars].filter((c) => c.codePointAt(0) >= 32).join('');

const families = [
  {family: 'Noto Sans SC', file: 'noto-sans-sc', weights: [500, 700, 900], italic: false},
  {family: 'Geist', file: 'geist', weights: [300, 500, 600, 700], italic: false},
  {family: 'Geist Mono', file: 'geist-mono', weights: [400, 500], italic: false},
  {family: 'Instrument Serif', file: 'instrument-serif', weights: [400], italic: true},
];
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36';
const out = path.join(root, 'public/fonts');
fs.mkdirSync(out, {recursive: true});
const manifest = [];
for (const fam of families) {
  for (const w of fam.weights) {
    const axis = fam.italic ? `ital,wght@1,${w}` : `wght@${w}`;
    const url = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fam.family)}:${axis}&text=${encodeURIComponent(text)}&display=block`;
    const css = await (await fetch(url, {headers: {'User-Agent': UA}})).text();
    const m = css.match(/url\((https:[^)]+)\)/);
    if (!m) throw new Error(`no font url for ${fam.family} ${w}\n${css.slice(0, 300)}`);
    const buf = Buffer.from(await (await fetch(m[1])).arrayBuffer());
    const name = `${fam.file}-${w}${fam.italic ? 'i' : ''}.woff2`;
    fs.writeFileSync(path.join(out, name), buf);
    manifest.push({family: fam.family, weight: String(w), style: fam.italic ? 'italic' : 'normal', file: name});
    console.log(name, buf.length);
  }
}
fs.writeFileSync(path.join(root, 'src/fonts.json'), JSON.stringify(manifest, null, 2));
console.log('chars', text.length);
