'use strict';
const CORE='marvel-path-v33-core', DATA='marvel-path-v33-data';
const SHELL=['./','./index.html','./style.css?v=3.3','./data.js?v=3.3','./meta.js?v=3.3','./posters.js?v=3.3','./admin.js?v=3.3','./enrichment.js?v=3.3','./app.js?v=3.3','./assets/favicon.svg','./assets/fonts/Vazirmatn-wght.woff2?v=33.003'];
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
