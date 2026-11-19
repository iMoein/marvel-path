/* Optional offline-after-first-view cache. Never stores watch status or personal data. */
const CORE='marvel-path-v31-core';const IMG='marvel-path-v31-posters';
const SHELL=['./','./index.html','./style.css','./data.js','./meta.js','./posters.js','./app.js','./admin.js','./enrichment.js','./assets/favicon.svg'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CORE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting()).catch(()=>self.skipWaiting()));});
self.addEventListener('activate',event=>{event.waitUntil(Promise.all([caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('marvel-path-v')&&![CORE,IMG].includes(k)).map(k=>caches.delete(k)))),self.clients.claim()]));});
self.addEventListener('fetch',event=>{
 const req=event.request;if(req.method!=='GET')return;
 const url=new URL(req.url);
 const isPoster=req.destination==='image'&&(/image\.tmdb\.org$/.test(url.hostname)||/raw\.githubusercontent\.com$/.test(url.hostname)||/cdn\.jsdelivr\.net$/.test(url.hostname)||/img\.amodb\.dev$/.test(url.hostname)||/cdn\.marvel\.com$/.test(url.hostname)||/lumiere-a\.akamaihd\.net$/.test(url.hostname));
 if(isPoster){event.respondWith(caches.open(IMG).then(async c=>{const cached=await c.match(req);if(cached)return cached;try{const r=await fetch(req);if(r.ok||r.type==='opaque')c.put(req,r.clone()).catch(()=>{});return r}catch(e){return Response.error()}}));return;}
 if(url.origin===self.location.origin&&SHELL.some(s=>new URL(s,self.registration.scope).pathname===url.pathname)){
   event.respondWith(fetch(req).then(async r=>{if(r.ok){const c=await caches.open(CORE);c.put(req,r.clone()).catch(()=>{});}return r}).catch(()=>caches.match(req)));}
});
