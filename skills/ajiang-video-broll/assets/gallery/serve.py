"""本地起一个模板库预览服务：构建页面，能生成试听音频就顺手生成，然后用 http.server 打开。

用法：python3 serve.py [--port 8765] [--out 目录] [--audio | --no-audio] [--no-open]
  --out       构建目录，默认系统临时目录下的 broll-gallery
  --audio     强制重新生成试听音频（需要 numpy、scipy、soundfile、pyloudnorm 和 ffmpeg）
  --no-audio  不生成音频；页面照常能看动画，只是没有声音
默认：依赖齐全且还没有音频时自动生成（10 套约 30 秒），缺依赖就跳过并提示。
需要 node（导出每套模板的音效时间线）。"""
import argparse, functools, http.server, importlib.util, os, subprocess, sys, tempfile, webbrowser

HERE = os.path.dirname(os.path.abspath(__file__))
SKILL = os.path.dirname(os.path.dirname(HERE))
ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
ap.add_argument('--port', type=int, default=8765)
ap.add_argument('--out', default=os.path.join(tempfile.gettempdir(), 'broll-gallery'))
g = ap.add_mutually_exclusive_group()
g.add_argument('--audio', action='store_true')
g.add_argument('--no-audio', action='store_true')
ap.add_argument('--no-open', action='store_true')
a = ap.parse_args()
sys.stdout.reconfigure(line_buffering=True)  # 管道里也能及时看到地址
out = os.path.abspath(a.out)

def build():
    subprocess.run([sys.executable, os.path.join(HERE, 'build.py'), out], check=True)

build()
ids = sorted(d for d in os.listdir(os.path.join(out, 'assets', 'audio')) if not d.startswith('.'))
have = all(os.path.exists(os.path.join(out, 'assets', 'audio', i, 'demo.mp3')) for i in ids)
deps = all(importlib.util.find_spec(m) for m in ('numpy', 'scipy', 'soundfile', 'pyloudnorm'))
if not a.no_audio and (a.audio or not have):
    if deps:
        print('生成试听音频…')
        subprocess.run([sys.executable, os.path.join(SKILL, 'scripts', 'theme_demo_audio.py'),
                        os.path.join(out, 'assets', 'audio'), '--theme', *ids], check=True)
        build()
    else:
        print('跳过试听音频：缺 numpy / scipy / soundfile / pyloudnorm（pip install 后重跑即可）。动画照常能看。')

# index.html 是给 Artifact 发布用的页面主体，本地包一层完整文档，并声明 utf-8
body = open(os.path.join(out, 'index.html'), encoding='utf-8').read()
open(os.path.join(out, 'local.html'), 'w', encoding='utf-8').write(
    '<!doctype html><html lang="zh-CN"><head><meta charset="utf-8">'
    '<meta name="viewport" content="width=device-width,initial-scale=1"></head><body>' + body + '</body></html>')

class Handler(http.server.SimpleHTTPRequestHandler):
    extensions_map = {**http.server.SimpleHTTPRequestHandler.extensions_map,
                      '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
                      '.json': 'application/json; charset=utf-8'}
    def do_GET(self):
        if self.path.split('?')[0].split('#')[0] in ('/', '/index.html'):
            self.path = '/local.html' + self.path[len(self.path.split('?')[0].split('#')[0]):]
        return super().do_GET()
    def log_message(self, *args):
        pass

srv = http.server.ThreadingHTTPServer(('127.0.0.1', a.port), functools.partial(Handler, directory=out))
url = f'http://127.0.0.1:{a.port}/'
print(f'模板库：{url}   （?id=<模板id>&t=<秒> 可以直接定位；Ctrl+C 结束）')
if not a.no_open:
    webbrowser.open(url)
try:
    srv.serve_forever()
except KeyboardInterrupt:
    pass
