"""Check the actual shared dropdown logic including real app state updates."""
from pathlib import Path
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from functools import partial
import subprocess,tempfile,threading,re,html,json,os
ROOT=Path(__file__).resolve().parents[1]
DOCS=ROOT/'docs'
CHROME='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
COMPONENT=(ROOT/'app.js').read_text().split('/* Shared accessible select enhancement.',1)[1]
COMPONENT='/* Shared accessible select enhancement.'+COMPONENT
PROBE=r"""
(async()=>{
const $=s=>document.querySelector(s), wait=()=>new Promise(resolve=>setTimeout(resolve,40));
const check=(x,msg)=>{if(!x)throw Error(msg);};
const key=(el,k)=>el.dispatchEvent(new KeyboardEvent('keydown',{key:k,bubbles:true,cancelable:true}));
const button=id=>document.getElementById(id+'-custom');
const show=async(id)=>{const b=button(id);check(b,id+' enhanced');b.scrollIntoView({block:'center',behavior:'instant'});await wait();b.click();await wait();check($('.mp-dd-menu')&&b.getAttribute('aria-expanded')==='true',id+' opens');return b;};
const choose=(i)=>$('.mp-dd-menu [data-index="'+i+'"]').click();
try{
check(document.documentElement.dataset.boot==='ready'||location.pathname==='/fixture','app boots');
if(location.pathname==='/fixture'){
 let changed=[];document.addEventListener('change',e=>changed.push(e.target.value));
 let b=await show('metadata-title-picker');
 const menu=$('.mp-dd-menu'),r=menu.getBoundingClientRect();
 check(menu.dataset.side==='up','opens upwards near bottom');check(r.top>=0&&r.bottom<=innerHeight,'viewport bounds');
 choose(2);await wait();check($('#metadata-title-picker').value==='loki'&&changed.length===1&&changed[0]==='loki','native value & change event');
 check(button('metadata-title-picker').textContent.includes('Loki'),'selected label');
 b=await show('metadata-title-picker');key(b,'Home');key(b,'Enter');check($('#metadata-title-picker').value==='xmen','keyboard selection');
 b=await show('metadata-title-picker');key(b,'Escape');check(!$('.mp-dd-menu'),'escape closes');
 b=await show('metadata-title-picker');document.body.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true}));check(!$('.mp-dd-menu'),'outside closes');
 check(getComputedStyle($('#metadata-title-picker')).display==='none','native not duplicated');
 const old=button('metadata-title-picker');old.parentNode.innerHTML='<select id="metadata-title-picker"><option value="new">New</option></select>';await wait();check(button('metadata-title-picker')&&button('metadata-title-picker')!==old,'re-enhance after render');
 document.documentElement.dataset.theme='light';check(getComputedStyle(button('metadata-title-picker')).color!=='rgb(245, 245, 248)','light theme');
}else{
 let b=await show('status-filter');choose(3);await wait();check($('#status-filter').value==='watched','filter existing change handler');
 b=await show('status-filter');choose(0);await wait();check($('#status-filter').value==='all','restore filter');
 b=await show('page-size');choose(1);await wait();check($('#page-size').value==='20','page size existing change handler');
 const arc=$('[data-action="order"][data-value="arc"]');check(arc,'arc tab');arc.click();await wait();b=await show('arc-pick');const previous=$('#arc-pick').value;
 const opts=[...$('#arc-pick').options];const index=opts.findIndex(o=>o.value!==previous);choose(index);await wait();check($('#arc-pick').value===opts[index].value,'story arc change handler');
 check(!$('.mp-dd-menu'),'menu cleaned after rerender');
}
document.documentElement.dataset.ddResult='PASS';
}catch(e){document.documentElement.dataset.ddResult='FAIL: '+e.message;}
})();
"""
FIXTURE='<!doctype html><html lang="fa" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/style.css"></head><body><div id="app" style="position:fixed;right:10px;left:10px;bottom:12px"><div><select id="metadata-title-picker" aria-label="اثر"><option value="xmen">X-Men</option><option value="disabled" disabled>Disabled</option><option value="loki">Loki</option><option value="thor">Thor</option></select></div></div><script src="/fixture.js"></script><script src="/probe.js"></script></body></html>'
class Handler(SimpleHTTPRequestHandler):
 def log_message(self,*a):pass
 def do_GET(self):
  path=self.path.split('?')[0]
  if path in ['/fixture','/fixture.js','/probe.js','/archive/']:
   if path=='/fixture':s=FIXTURE;typ='text/html'
   elif path=='/fixture.js':s=COMPONENT;typ='application/javascript'
   elif path=='/probe.js':s=PROBE;typ='application/javascript'
   else:s=(DOCS/'archive/index.html').read_text().replace('</body>','<script defer src="/probe.js"></script></body>');typ='text/html'
   b=s.encode();self.send_response(200);self.send_header('Content-Type',typ+'; charset=utf-8');self.send_header('Content-Length',str(len(b)));self.end_headers();self.wfile.write(b);return
  return super().do_GET()
class Server(ThreadingHTTPServer):
 def handle_error(self,*a):pass
server=Server(('127.0.0.1',0),partial(Handler,directory=str(DOCS)))
threading.Thread(target=server.serve_forever,daemon=True).start()
try:
 for route,width in [('/fixture',500),('/fixture',1440),('/archive/',1440),('/archive/',500)]:
  result=''
  for _ in range(2):
   with tempfile.TemporaryDirectory(prefix='marvel-dd-') as profile:
    cmd=[CHROME,'--headless','--disable-gpu','--disable-background-networking','--no-first-run','--no-proxy-server','--disable-extensions','--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE localhost, EXCLUDE 127.0.0.1','--user-data-dir='+profile,'--window-size='+str(width)+',900','--dump-dom','--virtual-time-budget=8000',f'http://127.0.0.1:{server.server_port}{route}']
    r=subprocess.run(cmd,capture_output=True,text=True,timeout=35)
    m=re.search(r'data-dd-result="([^"]+)"',r.stdout)
    result=html.unescape(m.group(1)) if m else 'NO RESULT'
    if result=='PASS':break
  assert result=='PASS',(route,width,result)
  print('PASS',route,width,flush=True)
finally:server.shutdown()
