"""Exercise actual public search modal and input focus styles using Chromium."""
from pathlib import Path
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from functools import partial
import subprocess,tempfile,threading,re,html
ROOT=Path(__file__).resolve().parents[1];DOCS=ROOT/'docs'
CHROME='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
PROBE=r"""
(async()=>{
const $=s=>document.querySelector(s),wait=()=>new Promise(r=>setTimeout(r,40)),check=(b,m)=>{if(!b)throw Error(m)};
const shortcut=()=>document.dispatchEvent(new KeyboardEvent('keydown',{key:'k',ctrlKey:true,bubbles:true,cancelable:true}));
const key=(el,k)=>el.dispatchEvent(new KeyboardEvent('keydown',{key:k,bubbles:true,cancelable:true}));
const before=location.pathname;
const query=async(q)=>{const i=$('#mp-gs-query');i.value=q;i.dispatchEvent(new Event('input',{bubbles:true}));await wait();return i};
try{
 for(let attempt=0;attempt<100&&document.documentElement.dataset.boot!=='ready';attempt++)await new Promise(r=>setTimeout(r,80));
 check(document.documentElement.dataset.boot==='ready','boot '+document.documentElement.dataset.boot+' app='+!!document.querySelector('.app-shell')+' error='+document.documentElement.dataset.testError);
 check($('[data-global-search]'),'launcher on '+before);
 const header=$('.topbar');check(header.scrollWidth<=header.clientWidth+2,'topbar fits '+header.scrollWidth+'/'+header.clientWidth);
 if(before==='/archive/'){const i=$('#search');i.focus();check(getComputedStyle(i).outlineStyle==='none','single input focus ring');check(getComputedStyle(i.parentElement).borderTopColor!==getComputedStyle(i.parentElement).backgroundColor,'outer focus border');}
 shortcut();await wait();
 check($('#mp-global-search').open&&location.pathname===before,'shortcut opens without changing page');
 if(before==='/'){let i=await query('Chris Hemsworth');let row=$('[data-gs-result]');check(row?.dataset.kind==='person'&&/hemsworth/.test(row.dataset.id),'exact actor first');check($('[data-gs-result][data-kind="title"]'),'actor related titles');
 i=await query('لوکی');check($('[data-kind="title"][data-gs-result]'),'Persian title match');
 i=await query('Loki');check($('[data-kind="title"][data-gs-result]'),'series match');
 i=await query('Iron Man');check($('[data-kind="title"][data-gs-result]'),'film match');
 key(i,'ArrowDown');check(document.activeElement.matches('[data-gs-result]'),'keyboard focus result');
 $('[data-gs-filter="people"]').click();await query('Chris Hemsworth');check(!$('[data-kind="title"][data-gs-result]')&&$('[data-kind="person"][data-gs-result]'),'actor filter');
 check($('[data-kind="person"][data-gs-result]').getAttribute('href').startsWith('/person/'),'canonical result link');
 await query('zzzznonexistentzzzz');check(!$('[data-gs-result]'),'no results');
 }
 $('[data-gs-close]').click();await wait();check(!$('#mp-global-search').open,'close');
 $('[data-global-search]').click();await wait();check($('#mp-global-search').open,'touch launcher');
 await query('Iron Man');check($('[data-kind="title"][data-gs-result]').getAttribute('href').startsWith('/title/'),'title link');
 document.documentElement.dataset.ddResult='PASS';
}catch(e){document.documentElement.dataset.ddResult='FAIL: '+e.message;}
})();
"""
class Handler(SimpleHTTPRequestHandler):
 def log_message(self,*a):pass
 def do_GET(self):
  path=self.path.split('?')[0]
  if path=='/early.js':s='window.addEventListener(\'error\',e=>{if(e.message)document.documentElement.dataset.testError=e.message});';typ='application/javascript'
  elif path=='/probe.js':s=PROBE;typ='application/javascript'
  elif path.endswith('/') and (DOCS/path.strip('/')/'index.html').exists():
   s=(DOCS/path.strip('/')/'index.html').read_text().replace('</head>','<script src="/early.js"></script></head>').replace('</body>','<script defer src="/probe.js"></script></body>');typ='text/html'
  else:return super().do_GET()
  b=s.encode();self.send_response(200);self.send_header('Content-Type',typ+'; charset=utf-8');self.send_header('Content-Length',str(len(b)));self.end_headers();self.wfile.write(b)
class Server(ThreadingHTTPServer):
 def handle_error(self,*a):pass
server=Server(('127.0.0.1',0),partial(Handler,directory=str(DOCS)));threading.Thread(target=server.serve_forever,daemon=True).start()
try:
 for route,width in [('/',1440),('/archive/',1440),('/actors/',500),('/title/xmen/',500),('/person/tom-hiddleston/',1440),('/settings/',500),('/watchlist/',500),('/',390)]:
  result=''
  for _ in range(2):
   with tempfile.TemporaryDirectory(prefix='marvel-gs-') as profile:
    cmd=[CHROME,'--headless','--disable-gpu','--disable-background-networking','--no-first-run','--no-proxy-server','--disable-extensions','--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE localhost, EXCLUDE 127.0.0.1','--user-data-dir='+profile,'--window-size='+str(width)+',900','--dump-dom','--virtual-time-budget=16000',f'http://127.0.0.1:{server.server_port}{route}']
    r=subprocess.run(cmd,capture_output=True,text=True,timeout=35)
    m=re.search(r'data-dd-result="([^"]+)"',r.stdout);result=html.unescape(m.group(1)) if m else 'NO RESULT'
    if result=='PASS':break
  assert result=='PASS',(route,width,result)
  print('PASS',route,width,flush=True)
finally:server.shutdown()
