#!/usr/bin/env python3
"""Prepare a same-origin public viewer; run after build_public.py copies the catalogue."""
from pathlib import Path
import json,re,hashlib
ROOT=Path(__file__).resolve().parent
OUT=ROOT/'docs'
P=OUT/'public-data'
VERSION='3.2'
def load(name,default=None):
    path=P/name
    return json.loads(path.read_text()) if path.exists() else default
def js(value):
    return json.dumps(value,ensure_ascii=True,separators=(',',':'))
def replace_once(s,old,new):
    if old not in s:raise ValueError('Missing build source marker: '+old[:80])
    return s.replace(old,new,1)
def edit(name,fn):
    path=OUT/name
    path.write_text(fn(path.read_text()),encoding='utf-8')

def main():
    posters=load('poster-urls.json')
    directory=load('people.json')
    cache=load('image-cache.json',{})
    def checked(ref,prefix):
        if not isinstance(ref,str) or not ref.startswith('./public-data/images/'+prefix+'/'):raise ValueError('Invalid local image reference')
        if not re.fullmatch(r'[a-z0-9-]+\.webp',ref.rsplit('/',1)[-1]):raise ValueError('Unsafe image path')
        if not (OUT/ref[2:]).is_file():raise ValueError('Missing image: '+ref)
        return ref
    posters={key:checked(ref,'posters') for key,ref in posters.items()}
    cache={u:checked(ref,'remote') for u,ref in cache.items()}
    (OUT/'admin.js').write_text("'use strict';\nconst ADMIN_MODE=false,isLoopback=false;\nconst posterAdmin={available:false,authorized:false,job:null,token:''};\nconst publicPosterUrls="+js(posters)+";\nconst publicPeopleDirectory="+js(directory)+";\nconst publicImageMap="+js(cache)+";\nfunction localCover(f){return Object.hasOwn(publicPosterUrls,f.id)?publicPosterUrls[f.id]:'';}\n",encoding='utf-8')
    def app(s):
        start=s.index('const posterCandidates=f=>{');end=s.index('const posterUrl=',start)
        s=s[:start]+"const posterCandidates=f=>{const local=localCover(f);return local?[local]:[];};\n"+s[end:]
        start=s.index('function cinemaBackdropUrl(f){');end=s.index('function cinemaHero(',start)
        s=s[:start]+"function cinemaBackdropUrl(f){return posterUrl(f);}\n"+s[end:]
        s=replace_once(s,"window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));","navigator.serviceWorker.register('./sw.js?v=3.2',{updateViaCache:'none'}).catch(()=>{});")
        return s.replace("v3.0</div></aside>","v3.2</div></aside>")
    edit('app.js',app)
    def enrichment(s):
        s=replace_once(s,'directory:null','directory:publicPeopleDirectory')
        start=s.index('const safePhoto=');end=s.index('const picture=',start)
        s=s[:start]+r"""const safePhoto=url=>{if(typeof url!=='string')return '';if(/^\.\/public-data\/images\/(?:people|remote)\/[a-z0-9-]+\.webp$/.test(url))return url;return Object.hasOwn(publicImageMap,url)?publicImageMap[url]:'';};
"""+s[end:]
        s=re.sub(r' const image=safePhoto\(ep\?\.image\).*?;\n',' const image=safePhoto(ep?.image);\n',s,count=1)
        start=s.index('let metadataTimer=null;');end=s.index("document.addEventListener('input'",start)
        s=s[:start]+"""async function publicJson(path){
 const ctl=new AbortController();const timer=setTimeout(()=>ctl.abort(),12000);
 try{const r=await fetch(path+'?v=3.2',{signal:ctl.signal});if(!r.ok)throw new Error('HTTP '+r.status);return await r.json();}finally{clearTimeout(timer);}
}
async function loadInfoForPage(page){
 if(page.name==='title'&&BY_ID[page.id]&&!information.requested.has(page.id)){
  information.requested.add(page.id);
  try{information.titles[page.id]=await publicJson('./public-data/titles/'+encodeURIComponent(page.id)+'.json');}catch(_){information.titles[page.id]={ready:false,failed:true};}
  if(activePage().name==='title'&&activePage().id===page.id)render();
 }
 if(page.name==='person'&&/^[a-z0-9-]{1,110}$/.test(page.id)&&!information.personRequested.has(page.id)){
  information.personRequested.add(page.id);
  try{information.people[page.id]=await publicJson('./public-data/people/'+encodeURIComponent(page.id)+'.json');}catch(_){information.people[page.id]={failed:true};}
  if(activePage().name==='person'&&activePage().id===page.id)render();
 }
}
document.addEventListener('click',e=>{const b=e.target.closest('[data-retry-info]');if(!b)return;const page=activePage();if(page.name==='title'){information.requested.delete(page.id);delete information.titles[page.id];}else if(page.name==='person'){information.personRequested.delete(page.id);delete information.people[page.id];}else return;render();});
"""+s[end:]
        s=replace_once(s,"if(!p)return ","if(data?.failed)return '<div class=\"metadata-empty\"><p>دریافت اطلاعات ممکن نشد. اتصال اینترنت را بررسی کنید.</p><button class=\"btn btn-outline\" data-retry-info>تلاش دوباره</button></div>';\\n if(!p)return ".replace('\\n','\n'))
        s=replace_once(s,"const meta=titleMetadata(f.id), cast=meta?.cast||[];","const meta=titleMetadata(f.id), cast=meta?.cast||[];if(information.titles[f.id]?.failed)return '<section class=\"cinema-panel metadata-empty\"><p>دریافت اطلاعات اثر ناموفق بود.</p><button class=\"btn btn-outline\" data-retry-info>تلاش دوباره</button></section>';")
        return s
    edit('enrichment.js',enrichment)
    def css(s):
        s=re.sub(r'@font-face\s*\{.*?\}', '',s,count=1,flags=re.S)
        # A locally vendored and licensed font is optional; system fonts never require network access.
        font=P/'fonts'/'Vazirmatn-wght.woff2'
        if font.exists() and (P/'fonts'/'OFL.txt').exists():
            s="@font-face{font-family:Vazirmatn;src:url('./public-data/fonts/Vazirmatn-wght.woff2') format('woff2');font-weight:100 900;font-display:swap;font-style:normal;}\n"+s
        return s
    edit('style.css',css)
    worker="""'use strict';
const CORE='marvel-path-v32-core', DATA='marvel-path-v32-data';
const SHELL=['./','./index.html','./style.css?v=3.2','./data.js?v=3.2','./meta.js?v=3.2','./posters.js?v=3.2','./admin.js?v=3.2','./enrichment.js?v=3.2','./app.js?v=3.2','./assets/favicon.svg'];
self.addEventListener('install',event=>{self.skipWaiting();event.waitUntil(caches.open(CORE).then(c=>c.addAll(SHELL)).catch(()=>{}));});
self.addEventListener('activate',event=>event.waitUntil(Promise.all([self.clients.claim(),caches.keys().then(ks=>Promise.all(ks.filter(k=>k.startsWith('marvel-path-v')&&![CORE,DATA].includes(k)).map(k=>caches.delete(k))))])));
self.addEventListener('fetch',event=>{
 const r=event.request,u=new URL(r.url);if(r.method!=='GET'||u.origin!==self.location.origin)return;
 if(u.pathname.includes('/public-data/')){
  event.respondWith(caches.open(DATA).then(async c=>{const old=await c.match(r);if(old)return old;const res=await fetch(r);if(res.ok)c.put(r,res.clone()).catch(()=>{});return res;}));return;
 }
 if(r.mode==='navigate'||SHELL.some(s=>new URL(s,self.registration.scope).pathname===u.pathname)){
  event.respondWith(fetch(r).then(async res=>{if(res.ok){const c=await caches.open(CORE);c.put(r,res.clone()).catch(()=>{});}return res;}).catch(async()=>{const c=await caches.open(CORE);return await c.match(r)||await c.match(r.mode==='navigate'?'./index.html':r)||Response.error();}));
 }
});
"""
    (OUT/'sw.js').write_text(worker)
    def html(s):
        s=re.sub(r'<meta http-equiv="Content-Security-Policy"[^>]*>', '''<meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; form-action 'self'; upgrade-insecure-requests"/>''',s)
        s=re.sub(r'^\s*<link[^>]+href="https://(?:fonts\.|cdn\.jsdelivr)[^>]*>\s*','\n',s,flags=re.M)
        s=re.sub(r'<!-- Vazirmatn.*?-->','<!-- Public viewer uses only same-origin assets. -->',s)
        s=re.sub(r'(src="(?:data|meta|posters|admin|enrichment|app)\.js|href="style\.css)(")',r'\1?v=3.2\2',s)
        return s
    edit('index.html',html)
    print('Same-origin viewer:',len(posters),'posters;',len(directory['items']),'actors;',len(cache),'localized additional image URLs')
if __name__=='__main__':main()
