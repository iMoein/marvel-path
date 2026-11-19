'use strict';
const CORE='marvel-path-v342-core', DATA='marvel-path-v340-data';
const SHELL=['/','/archive/','/actors/','/settings/','/watchlist/','/style.css?v=3.4.2','/data.js?v=3.4.2','/meta.js?v=3.4.2','/posters.js?v=3.4.2','/admin.js?v=3.4.2','/enrichment.js?v=3.4.2','/app.js?v=3.4.2','/assets/favicon.svg','/favicon.ico','/manifest.webmanifest','/assets/icons/icon-192.png','/assets/icons/icon-512.png','/assets/fonts/Vazirmatn-wght.woff2?v=33.003-r2'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CORE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting()));});
self.addEventListener('activate',e=>e.waitUntil(Promise.all([self.clients.claim(),caches.keys().then(ks=>Promise.all(ks.filter(k=>k.startsWith('marvel-path-v')&&![CORE,DATA].includes(k)).map(k=>caches.delete(k))))])));
self.addEventListener('fetch',e=>{
 const r=e.request,u=new URL(r.url);if(r.method!=='GET'||u.origin!==self.location.origin)return;
 if(r.mode==='navigate'){e.respondWith((async()=>{const c=await caches.open(CORE);try{const x=await fetch(r);if(x.ok)await c.put(r,x.clone());return x;}catch(_){return await c.match(r)||await c.match(u.pathname)||await c.match('/')||Response.error();}})());return;}
 if(u.pathname.startsWith('/public-data/')||u.pathname.startsWith('/assets/')||SHELL.some(s=>new URL(s,self.location.origin).pathname===u.pathname)){e.respondWith((async()=>{const c=await caches.open(u.pathname.startsWith('/public-data/')?DATA:CORE);const old=await c.match(r);if(old)return old;const x=await fetch(r);if(x.ok)c.put(r,x.clone()).catch(()=>{});return x;})());}
});
