'use strict';
const RELEASE="3.5.26", CORE="marvel-path-v3526-core", DATA='marvel-path-v340-data';
const RUNTIME=["/style.v3.5.26.f443846e7161.css", "/data.v3.5.26.ea4a2d6ffb9b.js", "/meta.v3.5.26.6da6e853a2a3.js", "/posters.v3.5.26.c3d5c6ad86fd.js", "/admin.v3.5.26.e54c88d3cfe4.js", "/enrichment.v3.5.26.2acd923cea5a.js", "/app.v3.5.26.044ca3505191.js"];
const EXTRAS=['/assets/favicon.svg','/favicon.ico','/manifest.webmanifest','/assets/icons/icon-192.png','/assets/icons/icon-512.png','/assets/fonts/Vazirmatn-wght.woff2?v=33.003-r2'];
const PAGES=['/','/archive/','/timeline/','/actors/','/settings/','/watchlist/'];
const pageRelease=async r=>r.ok&&(r.headers.get('content-type')||'').includes('text/html')?((await r.clone().text()).match(/<meta name="marvel-release" content="(\d+\.\d+\.\d+)"\s*\/?>/)||[])[1]||'':'';
const releaseHTML=async r=>(await pageRelease(r))===RELEASE;
const older=v=>{if(!v)return true;const a=v.split('.').map(Number),b=RELEASE.split('.').map(Number);for(let i=0;i<3;i++){if(a[i]!==b[i])return a[i]<b[i];}return false;};
const network=r=>fetch(r,{cache:'no-store'});
self.addEventListener('install',e=>e.waitUntil((async()=>{
 const c=await caches.open(CORE);
 await Promise.all(RUNTIME.map(async url=>{const r=await network(url);if(!r.ok)throw Error('Runtime unavailable: '+url);await c.put(url,r);}));
 await Promise.allSettled(EXTRAS.map(async url=>{const r=await network(url);if(r.ok)await c.put(url,r);}));
 await Promise.allSettled(PAGES.map(async url=>{const r=await network(url);if(await releaseHTML(r))await c.put(url,r);}));
 await self.skipWaiting();
})()));
self.addEventListener('activate',e=>e.waitUntil((async()=>{
 // Keep artwork/data and older versioned runtime caches for already-open tabs.
 // Remove stale navigation entries, never localStorage or IndexedDB.
 for(const k of await caches.keys()){
  if(k.startsWith('marvel-path-v')&&k.endsWith('-core')&&k!==CORE){
   const c=await caches.open(k);
   for(const req of await c.keys()){
    const u=new URL(req.url);
    if(!/\.v\d+\.\d+\.\d+\.[0-9a-f]{12}\.(?:js|css)$/.test(u.pathname))await c.delete(req);
   }
   if(!(await c.keys()).length)await caches.delete(k);
  }
 }
 await self.clients.claim();
})()));
self.addEventListener('fetch',e=>{
 const r=e.request,u=new URL(r.url);if(r.method!=='GET'||u.origin!==self.location.origin)return;
 // Streams/range responses are handled by the origin, never cached as whole files.
 if(u.pathname==='/assets/media/doomsday-background.mp4')return;
 if(u.pathname==='/sw.js'||u.pathname==='/release.json'){e.respondWith(network(r));return;}
 if(r.mode==='navigate'){
  e.respondWith((async()=>{
   const c=await caches.open(CORE),key=u.pathname;
   try{const res=await network(r);const version=await pageRelease(res);if(version===RELEASE){await c.put(key,res.clone());return res;}if(res.ok&&older(version)){return await c.match(key)||res;}return res;}
   catch(_){return await c.match(key)||new Response('<!doctype html><html lang="fa" dir="rtl"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>مسیر مارول</title><body style="background:#101116;color:white;font-family:Arial;padding:24px"><h1>این صفحه آفلاین در دسترس نیست</h1><p>به اینترنت وصل شو و دوباره تلاش کن.</p><a style="color:#ef3347" href="/">بازگشت به مسیر مارول</a></body></html>',{status:503,headers:{'Content-Type':'text/html; charset=utf-8'}});}
  })());return;
 }
 if(/\.v\d+\.\d+\.\d+\.[0-9a-f]{12}\.(?:js|css)$/.test(u.pathname)){
  e.respondWith((async()=>{const c=await caches.open(CORE);const old=await caches.match(r);if(old)return old;const x=await network(r);if(x.ok)await c.put(r,x.clone());return x;})());return;
 }
 // Legacy executable URLs must not be pinned to stale CacheStorage entries.
 if(/\.(?:js|css)$/.test(u.pathname)){e.respondWith(network(r));return;}
 if(u.pathname.startsWith('/public-data/')||u.pathname.startsWith('/assets/')||EXTRAS.some(s=>new URL(s,self.location.origin).pathname===u.pathname)){
  e.respondWith((async()=>{const c=await caches.open(u.pathname.startsWith('/public-data/')?DATA:CORE);const old=await c.match(r);if(old)return old;const x=await fetch(r);if(x.ok)await c.put(r,x.clone()).catch(()=>{});return x;})());
 }
});
