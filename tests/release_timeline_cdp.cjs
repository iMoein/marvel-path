/* Actor profile layout: translated, original and missing biographies. */
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


 const click=(action,value)=>ev(`document.querySelector('[data-action="${action}"][data-value="${value}"]').click()`);
 const select=(id,value)=>ev(`(()=>{const el=document.getElementById(${JSON.stringify(id)});el.value=${JSON.stringify(value)};el.dispatchEvent(new Event('change',{bubbles:true}));})()`);
 for(const width of [320,390,768,1024,1440,1577]){
  await send('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:width<=700});
  await go('/timeline/?test='+Date.now());
  let r=await ev(`(()=>{const cards=[...document.querySelectorAll('.release-entry')],planned=cards.filter(x=>x.classList.contains('release-planned')),nav=document.querySelector(widthTest());function widthTest(){return innerWidth<=700?'.mobile-nav':'.nav-column'}return {total:cards.length,future:planned.length,source:planned.every(x=>x.querySelector('.release-source')?.href.startsWith('https://')),noProgress:planned.every(x=>!x.querySelector('[data-action=toggle-done]')),unique:new Set(cards.map(x=>x.dataset.releaseId)).size,fit:document.documentElement.scrollWidth<=innerWidth+2&&cards.every(x=>x.scrollWidth<=x.clientWidth+2),nav:nav.querySelector('a[href="/timeline/"]')?.getAttribute('aria-current'),navFit:nav.scrollWidth<=nav.clientWidth+2,core:MCU.length}})()`);
  assert(r.total===97&&r.future===13&&r.unique===r.total&&r.core===83&&r.source&&r.noProgress&&r.fit&&r.nav==='page'&&r.navFit,JSON.stringify({width,...r}));
  await click('release-filter','planned');
  assert(await ev('document.querySelectorAll(".release-entry").length===13&&!document.querySelector(".release-entry:not(.release-planned)")'),'future filter');
  await select('release-type','movie');
  assert(await ev('document.querySelectorAll(".release-entry").length===5'),'film filter');
  await select('release-year','2028');
  assert(await ev('document.querySelectorAll(".release-entry").length===3'),'year filter');
  await select('release-year','2008');
  assert(await ev('!!document.querySelector(".empty")&&!document.querySelector(".release-entry")'),'zero state');
  await select('release-type','all');await select('release-year','all');await click('release-filter','released');
  assert(await ev('document.querySelectorAll(".release-entry").length===84&&!document.querySelector(".release-planned")'),'history filter');
  await click('release-filter','all');
  console.log('PASS timeline',width,'all filters and no overflow');
 }
 assert(await ev(`(()=>{
 const items=releaseRecords(),released=items.filter(r=>r.status==='released'&&!r.variantOf);
 const encore=items.find(r=>r.id==='endgame-encore');
 const e=document.querySelector('[data-release-id="endgame-encore"]');
 return released.length===MCU.length&&released.every(r=>BY_ID[r.id])&&
 !BY_ID['endgame-encore']&&encore.variantOf==='endgame'&&encore.minutes===185&&
 encore.streamDate==='2026-11-13'&&e.querySelector('.release-title').getAttribute('href')==='/title/endgame/'&&e.textContent.includes('انتشار مجدد')&&
 BY_ID['xmen97-1'].episodes===10&&BY_ID['xmen97-2'].episodes===9&&!BY_ID['doomsday-film']&&formatYear(2026)==='۲۰۲۶';
 })()`),'catalogue identity and release variant isolation');
 await go('/title/endgame/?encore-test='+Date.now());
 assert(await ev('!!document.querySelector(".encore-info")&&document.querySelector(".encore-info").textContent.includes("۱۳ نوامبر ۲۰۲۶")'),'encore detail');
 for(const [id,count] of [['xmen97-1',10],['xmen97-2',9]]){
  await go('/title/'+id+'/?season-test='+Date.now());
  assert(await ev('document.querySelectorAll(".cinema-episode-grid .episode").length==='+count),'season episode tracking '+id);
 }
 console.log('PASS shared catalogue, Encore details and X-Men season tracking');
 console.log('PASS isolation and ungrouped years');
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>{ws?.close();chrome?.kill();srv.close();setTimeout(()=>{try{fs.rmSync(tmp,{recursive:true,force:true})}catch(_){}},300);});
