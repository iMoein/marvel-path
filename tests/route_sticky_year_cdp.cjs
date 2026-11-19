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
 for(const width of [320,390,700,701,768,850,851,1024,1280,1440,1577]){
  await send('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:width<=700});
  await go('/?route-test='+Date.now());
  if(width<=700)await ev('document.documentElement.style.setProperty("--mp-safe-top","59px")');
  for(const mode of ['all','disney']){
   await ev(`document.querySelector('[data-action="route-mode"][data-value="${mode}"]').click();window.scrollTo(0,0)`);
   await sleep(80);
   const initial=await ev(`(()=>{const c=document.querySelector('.route-mode-switch'),r=c.getBoundingClientRect(),h=document.querySelector('.topbar').getBoundingClientRect();return {top:r.top,header:h.bottom,fit:c.scrollWidth<=c.clientWidth+2&&document.documentElement.scrollWidth<=innerWidth+2,position:getComputedStyle(c).position,year:document.querySelector('.row-description>span')?.textContent,grouped:/[۰-۹]٬[۰-۹]{3}/.test([...document.querySelectorAll('.row-description>span')].map(e=>e.textContent).join(' '))}})()`);
   assert(initial.top>initial.header&&initial.fit&&initial.position==='sticky'&&!initial.grouped&&/[۰-۹]{4}/.test(initial.year),JSON.stringify({width,mode,initial}));
   await ev('window.scrollTo(0,window.scrollY+document.querySelector(".route-mode-switch").getBoundingClientRect().top+250)');
   await sleep(80);
   const pinned=await ev(`(()=>{const c=document.querySelector('.route-mode-switch'),r=c.getBoundingClientRect(),h=document.querySelector('.topbar').getBoundingClientRect(),b=c.querySelector('button').getBoundingClientRect();return {top:r.top,header:h.bottom,hit:c.contains(document.elementFromPoint(b.x+b.width/2,b.y+b.height/2)),selected:c.querySelector('[aria-pressed=true]').dataset.value}})()`);
   assert(Math.abs(pinned.top-pinned.header)<2&&pinned.hit&&pinned.selected===mode,JSON.stringify({width,mode,pinned}));
  }
  console.log('PASS sticky both modes',width);
 }
 await ev("document.querySelector('[data-action=route-mode][data-value=all]').click()");
 assert(await ev("formatYear(2021)==='۲۰۲۱'&&formatYear('2021')==='۲۰۲۱'&&formatYear(null)==='—'&&num(2021)==='۲٬۰۲۱'"),'year helper vs ordinary numbers');
 await go('/archive/?year-test='+Date.now());
 for(const view of ['grid','list']){
  await ev(`document.querySelector('[data-action="view"][data-value="${view}"]').click()`);
  assert(await ev(`[...document.querySelectorAll('#archive-results ${view==='grid'?'.card-top-meta>span:first-child':'.row-description>span'}')].every(e=>/[۰-۹]{4}/.test(e.textContent)&&!/[۰-۹]٬[۰-۹]{3}/.test(e.textContent))`),'archive year '+view);
 }
 console.log('PASS archive years in grid and list');
 await go('/title/falcon/?year-test='+Date.now());
 assert(await ev("document.querySelector('.cinema-facts-panel dd').textContent==='۲۰۲۱'&&document.querySelector('.cinema-pretitle').textContent.includes('۲۰۲۱')"),'title years');
 console.log('PASS title year');
 await go('/person/stan-lee/?year-test='+Date.now());
 for(let i=0;i<80;i++){if(await ev('!!document.querySelector(".person-film-grid .title-card")'))break;await sleep(100);}
 assert(await ev("[...document.querySelectorAll('.person-film-grid .card-top-meta>span:first-child')].length>0&&[...document.querySelectorAll('.person-film-grid .card-top-meta>span:first-child')].every(x=>/[۰-۹]{4}/.test(x.textContent)&&!/[۰-۹]٬[۰-۹]{3}/.test(x.textContent))"),'person credit years');
 console.log('PASS person years');
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>{ws?.close();chrome?.kill();srv.close();setTimeout(()=>{try{fs.rmSync(tmp,{recursive:true,force:true})}catch(_){}},300);});
