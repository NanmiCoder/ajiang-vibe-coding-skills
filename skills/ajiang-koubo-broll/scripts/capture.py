#!/usr/bin/env python3
"""用 ego-browser 截真实网页：2x 整页（CDP dpr=2）+ 关键元素的页面坐标，自动登记到工程的 src/data/pages.json。

  python3 capture.py --project <工程> --space "<本期任务空间名>" --name det-api --url https://example.com/tool
  python3 capture.py --project <工程> --space "<同上>" --name det-filled \\
      --before 'await page.fill("loc=css:input[placeholder=\\"模型 ID\\"]", "claude-opus-5-5"); await page.waitForTimeout(2500);'
  python3 capture.py --project <工程> --space "<同上>" --name det-group --viewport --before 'await page.click("loc=role:button[name=\\"交流群\\"]");'
  python3 capture.py --space "<同上>" --finish        # 全部截完：结束任务空间（ego-browser 要求只 finish 一次）

输出
  public/st/<name>.jpg          2x 截图（像素 = 页面 CSS px × 2；Window 组件按 CSS px 排版）
  src/data/pages.json           {"st/<name>.jpg": {w, h, url, els: {"h2:标题": [x, y, w, h], "button:开始": [...], ...}}}
  out/capture/<name>-preview.jpg 缩到 1000 宽的预览（用 Read 看全貌），<name>.layout.txt 元素坐标表（人读）

要点（第 3 期踩过）
  - ego-browser 的 page.screenshot 默认按 CSS 像素出 1x 图，推近就糊：这里用 Emulation.setDeviceMetricsOverride(dpr 2)
    + Page.captureScreenshot(captureBeyondViewport, clip.scale=1)。脚本会校验输出宽度 = 2×CSS 宽，不是就报错。
  - 先滚回顶部再截，否则 sticky 头会出现在页面中间；页面上临时报错（如 HTTP 530 提示）用 --before 隐藏后再截。
  - 默认只量可见的标题/按钮/输入框/tab/表单/带 aria-label 的区块；需要精确元素就用 --el 名字=CSS 选择器 追加。
  - 截完自动用 OpenCV（有的话）扫二维码，发现就提示去 mosaic.py 打码；后台、邮箱、消费额等隐私页面不要截。
"""
import argparse
import json
import os
import re
import subprocess
import sys
import tempfile

JS = r"""
const fs = await import('node:fs/promises');
const SPACE = __SPACE__;
const task = await taskSpace(SPACE);
const page = task.page('p1');
console.log('@@SPACE ' + task.spaceId);
await page.cdp('Emulation.setDeviceMetricsOverride', { width: __WIDTH__, height: __VH__, deviceScaleFactor: 2, mobile: false });
const URL_ = __URL__;
if (URL_) { await page.goto(URL_); }
await page.waitForTimeout(__WAIT__);
__BEFORE__
if (!__KEEP_SCROLL__) { await page.evaluate(() => window.scrollTo(0, 0)); await page.waitForTimeout(400); }
// 整页：宽 = clientWidth（去掉滚动条），clip 从 0 开始、captureBeyondViewport；视口（弹窗/浮层）：不传 clip，宽 = innerWidth。
const W = __VIEWPORT__ ? await page.evaluate(() => window.innerWidth) : await page.evaluate(() => document.documentElement.clientWidth);
const fullH = await page.evaluate(() => Math.max(document.documentElement.scrollHeight, document.body ? document.body.scrollHeight : 0));
const H = __VIEWPORT__ ? await page.evaluate(() => window.innerHeight) : Math.min(fullH, __MAXH__);
const r = __VIEWPORT__
  ? await page.cdp('Page.captureScreenshot', { format: 'png' })
  : await page.cdp('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip: { x: 0, y: 0, width: W, height: H, scale: 1 } });
await fs.writeFile(__OUT__, Buffer.from(r.data, 'base64'));
const els = await page.evaluate(({ extra, maxH, viewport }) => {
  const out = {};
  const oy = viewport ? 0 : window.scrollY;
  const put = (k, el) => {
    if (!el) return;
    const b = el.getBoundingClientRect();
    if (b.width < 2 || b.height < 2) return;
    const y = Math.round(b.top + oy);
    if (y > maxH || y + b.height < 0) return;
    let key = k, i = 2;
    while (out[key]) key = k + '#' + i++;
    out[key] = [Math.round(b.left), y, Math.round(b.width), Math.round(b.height)];
  };
  const txt = (el) => (el.getAttribute('aria-label') || el.innerText || el.placeholder || el.value || el.getAttribute('title') || '').replace(/\s+/g, ' ').trim().slice(0, 28);
  document.querySelectorAll('h1,h2,h3,h4,button,a[href],input,textarea,select,[role=tab],[role=button],form,section[aria-label],[aria-label]').forEach((el) => {
    const s = getComputedStyle(el);
    if (s.visibility === 'hidden' || s.display === 'none' || +s.opacity === 0) return;
    const t = txt(el);
    if (!t && !['FORM', 'INPUT', 'TEXTAREA'].includes(el.tagName)) return;
    put(el.tagName.toLowerCase() + ':' + t, el);
  });
  for (const [k, sel] of Object.entries(extra)) { try { put(k, document.querySelector(sel)); } catch (e) {} }
  return out;
}, { extra: __EXTRA__, maxH: H, viewport: __VIEWPORT__ });
const loc = await page.evaluate(() => location.host + location.pathname.replace(/\/$/, ''));
await page.cdp('Emulation.clearDeviceMetricsOverride', {});
console.log('@@RESULT ' + JSON.stringify({ W, H, fullH, url: loc, els }));
"""


def qr_scan(path):
    try:
        import cv2  # noqa
    except Exception:
        return None
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    from mosaic import detect
    return detect(path)

def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument('--project')
    p.add_argument('--space', required=True, help='任务空间名（整期只用一个，例如 "broll-<期名>"）或数字 id')
    p.add_argument('--name', help='输出名（不带扩展名），如 det-api')
    p.add_argument('--url', help='不给就截当前页面（接着上一步的操作状态）')
    p.add_argument('--width', type=int, default=1600, help='视口 CSS 宽（默认 1600，滚动条占掉约 15px）')
    p.add_argument('--vh', type=int, default=1000, help='视口 CSS 高')
    p.add_argument('--max-h', type=int, default=4000, help='整页最多截多高（CSS px，太高的图解码慢且没人看）')
    p.add_argument('--wait', type=int, default=1500, help='打开后等多少毫秒')
    p.add_argument('--before', default='', help='截图前执行的 ego-browser JS（page.click / page.fill / page.evaluate …）')
    p.add_argument('--viewport', action='store_true', help='只截当前视口（弹窗、浮层）')
    p.add_argument('--keep-scroll', action='store_true', help='不滚回顶部')
    p.add_argument('--el', action='append', default=[], help='追加元素：名字=CSS 选择器（可多次）')
    p.add_argument('--note', default='', help='写进 pages.json 的说明（这张图是什么状态）')
    p.add_argument('--quality', type=int, default=90)
    p.add_argument('--finish', action='store_true', help='结束任务空间（全部截完后调用一次）')
    a = p.parse_args()
    space = a.space if not a.space.isdigit() else int(a.space)

    if a.finish:
        js = f"const task = await taskSpace({json.dumps(space)});\nawait task.finish({{ keep: [] }});\nconsole.log('finished', task.spaceId);\n"
        r = subprocess.run(['ego-browser', 'nodejs'], input=js, text=True, capture_output=True)
        print(r.stdout + r.stderr)
        return
    if not (a.project and a.name):
        raise SystemExit('需要 --project 和 --name')
    proj = os.path.abspath(a.project)
    st = os.path.join(proj, 'public', 'st')
    cap = os.path.join(proj, 'out', 'capture')
    os.makedirs(st, exist_ok=True)
    os.makedirs(cap, exist_ok=True)
    png = os.path.join(cap, a.name + '.png')
    extra = dict(x.split('=', 1) for x in a.el)
    js = (JS.replace('__SPACE__', json.dumps(space)).replace('__WIDTH__', str(a.width)).replace('__VH__', str(a.vh))
          .replace('__URL__', json.dumps(a.url or '')).replace('__WAIT__', str(a.wait)).replace('__BEFORE__', a.before)
          .replace('__KEEP_SCROLL__', 'true' if a.keep_scroll else 'false').replace('__VIEWPORT__', 'true' if a.viewport else 'false')
          .replace('__MAXH__', str(a.max_h)).replace('__OUT__', json.dumps(png)).replace('__EXTRA__', json.dumps(extra, ensure_ascii=False)))
    with tempfile.NamedTemporaryFile('w', suffix='.mjs', delete=False) as f:
        f.write(js)
        jsf = f.name
    r = subprocess.run(['ego-browser', 'nodejs'], stdin=open(jsf), text=True, capture_output=True)
    outtxt = r.stdout + r.stderr
    for line in outtxt.splitlines():
        if line.startswith('[ego-browser:notice]'):
            print(line, '\n  （有升级提示：做完这批截图后先问用户，再决定要不要 ego-browser upgrade）')
    m = re.search(r'@@RESULT (\{.*\})', outtxt)
    if r.returncode != 0 or not m:
        raise SystemExit('ego-browser 执行失败：\n' + outtxt[-3000:] + f'\n（脚本在 {jsf}）')
    sp = re.search(r'@@SPACE (\S+)', outtxt)
    res = json.loads(m.group(1))

    from PIL import Image
    Image.MAX_IMAGE_PIXELS = None
    im = Image.open(png).convert('RGB')
    if abs(im.width - 2 * res['W']) > 2:
        raise SystemExit(f"截图宽 {im.width}px，不是 2×{res['W']}：dpr=2 没生效（会糊），检查 Emulation.setDeviceMetricsOverride")
    jpg = os.path.join(st, a.name + '.jpg')
    im.save(jpg, quality=a.quality)
    pv = im.resize((1000, max(1, round(im.height * 1000 / im.width))))
    pv.save(os.path.join(cap, a.name + '-preview.jpg'), quality=80)

    pages_p = os.path.join(proj, 'src', 'data', 'pages.json')
    pages = json.load(open(pages_p)) if os.path.exists(pages_p) else {}
    key = f'st/{a.name}.jpg'
    pages[key] = {'w': res['W'], 'h': res['H'], 'url': res['url'], 'els': res['els']}
    if a.note:
        pages[key]['note'] = a.note
    if a.viewport:
        pages[key]['viewport'] = True
    json.dump(pages, open(pages_p, 'w'), ensure_ascii=False, indent=1)
    with open(os.path.join(cap, a.name + '.layout.txt'), 'w') as f:
        f.write(f"{key}  CSS {res['W']}×{res['H']}（整页 {res['fullH']}）  {res['url']}\n")
        for k, b in sorted(res['els'].items(), key=lambda kv: (kv[1][1], kv[1][0])):
            f.write(f'  [{b[0]:>5},{b[1]:>5},{b[2]:>5},{b[3]:>4}]  {k}\n')
    os.remove(png)
    os.remove(jsf)
    print(f"✓ {jpg}  {im.width}×{im.height}px = CSS {res['W']}×{res['H']}（整页 {res['fullH']}）  元素 {len(res['els'])} 个  space={sp.group(1) if sp else '?'}")
    print(f"  坐标表 out/capture/{a.name}.layout.txt   预览 out/capture/{a.name}-preview.jpg")
    q = qr_scan(jpg)
    if q:
        print(f'  ⚠ 发现二维码 {q}（原图像素）：现在就打码（入库即处理，别等到预览）：mosaic.py --project <工程> public/st/{a.name}.jpg --auto')
    elif q is None:
        print('  （没装 OpenCV，没自动扫二维码：现在就跑 uv run --with opencv-python-headless --with pillow --with numpy python mosaic.py --project <工程> --scan）')
    print('  再用 Read 看一眼 preview：邮箱 / 手机号 / Key / 消费额 / 不该露的产品名，扫描器认不出')


if __name__ == '__main__':
    main()
