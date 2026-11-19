"""Browser checks for the public loading shell and progressive fallback."""
import functools, pathlib, subprocess, tempfile, threading, time, urllib.parse, concurrent.futures, re
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
ROOT=pathlib.Path(__file__).resolve().parents[1]/'docs'
CHROME='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
PROBE=b"""const r=document.documentElement;r.dataset.probeBoot=r.dataset.boot;r.dataset.probeStatic=getComputedStyle(document.getElementById('app')).display;r.dataset.probeShell=getComputedStyle(document.getElementById('boot-shell')).display;document.addEventListener('DOMContentLoaded',()=>{r.dataset.probeFinal=r.dataset.boot;r.dataset.probeFinalShell=getComputedStyle(document.getElementById('boot-shell')).display;r.dataset.probeFinalApp=getComputedStyle(document.getElementById('app')).display;r.dataset.probeWidth=String(document.documentElement.scrollWidth<=innerWidth);});"""
def run(mode,viewport,path):
 class Handler(SimpleHTTPRequestHandler):
  def log_message(self,*args):pass
  def do_GET(self):
   u=urllib.parse.urlsplit(self.path)
   if u.path=='/probe.js':
    self.send_response(200);self.send_header('Content-Type','application/javascript');self.end_headers();self.wfile.write(PROBE);return
   if u.path.endswith('/app.js'):
    if mode=='fail':self.send_error(503);return
    time.sleep(.4)
   if u.path in ('/','/archive/','/actors/','/title/xmen/','/person/tom-hiddleston/'):
    p=ROOT/u.path.strip('/')/'index.html'
    s=p.read_text().replace('</body>','<script src="/probe.js"></script></body>')
    b=s.encode();self.send_response(200);self.send_header('Content-Type','text/html; charset=utf-8');self.end_headers();self.wfile.write(b);return
   return super().do_GET()
 class Server(ThreadingHTTPServer):
  def handle_error(self,*a):pass
 server=Server(('127.0.0.1',0),functools.partial(Handler,directory=str(ROOT)))
 threading.Thread(target=server.serve_forever,daemon=True).start()
 try:
  with tempfile.TemporaryDirectory(prefix='mp-boot-') as profile:
   c=[CHROME,'--headless','--disable-gpu','--disable-background-networking','--no-first-run','--no-default-browser-check','--no-proxy-server','--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE localhost, EXCLUDE 127.0.0.1','--user-data-dir='+profile,'--window-size='+viewport,'--dump-dom','--virtual-time-budget=4000',f'http://127.0.0.1:{server.server_port}{path}']
   r=subprocess.run(c,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True,timeout=35)
   assert r.returncode==0
   s=r.stdout
   expected=['data-probe-boot="loading"','data-probe-static="none"','data-probe-shell="block"','data-probe-final-shell="none"','data-probe-final-app="block"']
   expected+=['data-probe-final="fallback"','class="seo-content"'] if mode=='fail' else ['data-probe-final="ready"','class="app-shell"']
   missing=[x for x in expected if x not in s]
   assert not missing,(mode,viewport,path,missing,s[:350])
   print('PASS',mode,viewport,path,flush=True)
 finally:server.shutdown()
if __name__=='__main__':
 cases=[('ok','1440,900','/'),('ok','390,844','/actors/'),('ok','390,844','/title/xmen/'),('ok','1440,900','/person/tom-hiddleston/'),('fail','1440,900','/archive/')]
 for c in cases:run(*c)
