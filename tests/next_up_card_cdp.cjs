/* Real-time browser checks; avoids virtual-time races while loading large actor pages. */
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),http=require('node:http'),{spawn}=require('node:child_process');
const root=path.resolve(__dirname,'../docs'),tmp=fs.mkdtempSync(path.join(os.tmpdir(),'marvel-cdp-'));

const types={'.html':'text/html; charset=utf-8','.js':'application/javascript','.css':'text/css','.json':'application/json','.webp':'image/webp','.woff2':'font/woff2'};
const srv=http.createServer((req,res)=>{try{const u=new URL(req.url,'http://localhost');let f=path.join(root,decodeURIComponent(u.pathname));if(fs.statSync(f).isDirectory())f=path.join(f,'index.html');res.setHeader('Content-Type',types[path.extname(f)]||'application/octet-stream');fs.createReadStream(f).pipe(res);}catch(_){res.writeHead(404).end();}});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));let chrome,ws,seq=0;const requests=new Map();
async function send(method,params={}){return new Promise((resolve,reject)=>{const id=++seq;requests.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}));});}
async function ev(expression,awaitPromise=false){const x=await send('Runtime.evaluate',{expression,awaitPromise,returnByValue:true});if(x.exceptionDetails)throw Error(x.exceptionDetails.text+' '+JSON.stringify(x.exceptionDetails.exception));return x.result.value;}
(async()=>{
 await new Promise(r=>srv.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+srv.address().port;
 chrome=spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',['--headless','--disable-gpu','--disable-background-networking','--no-first-run','--disable-extensions','--no-proxy-server','--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE localhost, EXCLUDE 127.0.0.1','--remote-debugging-port=0','--user-data-dir='+tmp,'about:blank'],{stdio:'ignore'});
 const portFile=path.join(tmp,'DevToolsActivePort');for(let i=0;i<100&&!fs.existsSync(portFile);i++)await sleep(100);
 const port=fs.readFileSync(portFile,'utf8').split('\n')[0];const tabs=await(await fetch('http://127.0.0.1:'+port+'/json/list')).json();ws=new WebSocket(tabs.find(t=>t.type==='page').webSocketDebuggerUrl);
 await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j;});ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.id){const p=requests.get(m.id);requests.delete(m.id);if(m.error)p?.reject(Error(JSON.stringify(m.error)));else p?.resolve(m.result);}};
 await send('Page.enable');await send('Runtime.enable');await send('Network.enable');await send('Network.setBypassServiceWorker',{bypass:true});
 const assert=(x,m)=>{if(!x)throw Error(m);};
 const go=async(url)=>{await send('Page.navigate',{url:base+url});for(let i=0;i<150;i++){await sleep(100);try{if(await ev('document.documentElement.dataset.boot==="ready"&&location.pathname==='+JSON.stringify(url.split('?')[0])))return;}catch(_){} }throw Error('boot timeout '+url);};
 await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
 for(const width of [320,360,390,430,700,768,1024,1440]){
  await send('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:width<=700});
  await go('/?feature-test='+Date.now());
  await ev(`(()=>{
   state.routeMode='all';const ids=routeIds(),target=ids.indexOf('falcon');
   for(const [i,id] of ids.entries()){const f=BY_ID[id];if(f.episodes)state.episodes[id]=i<target?Array.from({length:f.episodes},(_,n)=>n+1):[];else state.progress[id]=i<target?maxVal(f):0;delete state.watching[id];}
   render();
  })()`);
  for(let i=0;i<40;i++){if(await ev('document.querySelector(".feature-poster img")?.naturalWidth>0'))break;await sleep(100);}
  await sleep(120);
  const m=await ev(`(()=>{
   const $=s=>document.querySelector(s),r=e=>e.getBoundingClientRect(),c=r($('.feature-next')),p=r($('.feature-poster')),h=r($('.feature-identity')),label=r($('.feature-next-label')),summary=r($('.feature-content p')),btn=r($('.feature-ctas .btn-primary')),saveBtn=r($('.feature-save')),img=$('.feature-poster img'),a=r(img);
   return {title:$('.feature h1').textContent,gutter:p.left-c.left,top:p.top-c.top,bottom:c.bottom-p.bottom,ratio:p.width/p.height,loaded:img.naturalWidth>0,filled:Math.abs(p.width-a.width)<=2.1&&Math.abs(p.height-a.height)<=2.1,fit:$('.feature-next').scrollWidth<=$('.feature-next').clientWidth+1&&document.documentElement.scrollWidth<=innerWidth+1,gap:h.left-p.right,labelBefore:label.bottom<=h.top+1,fullSummary:summary.width>=c.width-44,cta:btn.height>=44&&saveBtn.height>=44&&saveBtn.width>=44,contained:btn.left>=c.left&&btn.right<=c.right&&saveBtn.left>=c.left&&saveBtn.right<=c.right,posterLink:$('.feature-poster').getAttribute('href'),titleLink:$('.feature-title-link').getAttribute('href')};
  })()`);
  assert(m.title.includes('Falcon')&&m.loaded&&m.filled&&m.fit&&m.gutter>=12&&m.top>=12&&m.bottom>=12&&Math.abs(m.ratio-2/3)<.01&&m.gap>=8&&m.labelBefore&&m.cta&&m.contained&&m.posterLink===m.titleLink&&m.posterLink==='/title/falcon/',JSON.stringify({width,m}));
  if(width<=700)assert(m.fullSummary,JSON.stringify({width,m}));
  const watchlist=await ev(`(()=>{const b=()=>document.querySelector('.feature-save'),prior=b().getAttribute('aria-pressed');b().click();const changed=b().getAttribute('aria-pressed')!==prior;b().click();return changed&&b().getAttribute('aria-pressed')===prior;})()`);
  assert(watchlist,'watchlist toggle '+width);
  if(width===390||width===1440){
   const rect=await ev(`(()=>{const el=document.querySelector('.feature-next');el.scrollIntoView({block:'center',behavior:'instant'});const r=el.getBoundingClientRect();return {x:r.x,y:r.y+scrollY,width:r.width,height:r.height,scale:1};})()`);
   const shot=await send('Page.captureScreenshot',{format:'png',clip:rect,captureBeyondViewport:true});fs.writeFileSync('/tmp/marvel-next-up-'+width+'.png',Buffer.from(shot.data,'base64'));
  }
  console.log('PASS',width,'gutter',m.gutter.toFixed(1),'poster ratio',m.ratio.toFixed(3),'clickable links and watchlist');
 }
 // Check the longest titles and completed state without touching the real browser storage.
 await send('Emulation.setDeviceMetricsOverride',{width:320,height:844,deviceScaleFactor:1,mobile:true});
 const edge=await ev(`(()=>{
  const box=document.createElement('div');box.style.width='288px';document.body.append(box);
  const titles=FILMS.filter(f=>f.title.length>42);
  const bad=[];for(const f of titles){box.innerHTML=feature(f,'doomsday');let c=box.querySelector('.feature'),p=c.querySelector('.feature-poster');if(c.scrollWidth>c.clientWidth+2||p.getBoundingClientRect().width<70)bad.push(f.title);}
  box.innerHTML=feature(null,'doomsday');const finished=!!box.querySelector('.feature-finished')&&!box.querySelector('.feature-next');box.remove();return {bad,finished,count:titles.length};
 })()`);
 assert(!edge.bad.length&&edge.finished,JSON.stringify(edge));console.log('PASS',edge.count,'long titles and completed state');

})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>{ws?.close();chrome?.kill();srv.close();setTimeout(()=>{try{fs.rmSync(tmp,{recursive:true,force:true})}catch(_){}},300);});
