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
 for(const [width,route] of [[320,'falcon'],[390,'falcon'],[768,'xmen'],[1024,'falcon'],[1440,'xmen'],[1440,'falcon']]){
  await send('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:width<=700});
  await go('/title/'+route+'/?sticky-test='+Date.now());
  await sleep(250);
  if(width<=700)await ev('document.documentElement.style.setProperty("--mp-safe-top","59px")');
  const initial=await ev(`(()=>{
   const n=document.querySelector('.cinema-section-nav'),h=document.querySelector('.topbar');
   return {top:n.getBoundingClientRect().top,header:h.getBoundingClientRect().bottom,css:getComputedStyle(n).position,width:n.clientWidth,scrollWidth:n.scrollWidth};
  })()`);
  assert(initial.css==='sticky'&&initial.top>initial.header,JSON.stringify(initial));
  await ev('window.scrollTo(0,window.scrollY+document.querySelector(".cinema-section-nav").getBoundingClientRect().top+150)');
  await sleep(100);
  const pinned=await ev(`(()=>{const n=document.querySelector('.cinema-section-nav'),h=document.querySelector('.topbar'),r=n.getBoundingClientRect();return {top:r.top,header:h.getBoundingClientRect().bottom,hit:n.contains(document.elementFromPoint(r.right-18,r.top+12))}})()`);
  assert(Math.abs(pinned.top-pinned.header)<2&&pinned.hit,JSON.stringify({width,route,pinned}));
  for(const target of ['watch-progress','story-info','my-notes','title-cast']){
   await ev('document.querySelector(".cinema-section-nav button[data-value="+JSON.stringify('+JSON.stringify(target)+')+"]").click()');
   await sleep(100);
   const result=await ev(`(()=>{const n=document.querySelector('.cinema-section-nav'),b=n.querySelector('.active'),r=n.getBoundingClientRect(),t=document.getElementById(b.dataset.value).getBoundingClientRect(),br=b.getBoundingClientRect();return {active:b.dataset.value,aria:b.getAttribute('aria-current'),gap:t.top-r.bottom,visible:br.left>=r.left-1&&br.right<=r.right+1,header:document.querySelector('.topbar').getBoundingClientRect().bottom,nav:r.top}})()`);
   assert(result.active===target&&result.aria==='true'&&result.gap>=-1&&result.visible&&Math.abs(result.header-result.nav)<2,JSON.stringify({width,route,target,result}));
  }
  await ev('render()');await sleep(100);
  assert(await ev('document.querySelector(".cinema-section-nav .active").dataset.value==="title-cast"'),'selected section retained on rerender');
  await ev('window.scrollTo(0,0)');await sleep(100);
  assert(await ev('document.querySelector(".cinema-section-nav").getBoundingClientRect().top>document.querySelector(".topbar").getBoundingClientRect().bottom'),'unsticks at top');
  console.log('PASS',width,route,'sticky, safe area, jump targets, active section and horizontal navigation');
 }
 await go('/archive/?sticky-test='+Date.now());assert(await ev('!document.querySelector(".cinema-section-nav")'),'other routes unaffected');
 console.log('PASS archive unaffected');

})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>{ws?.close();chrome?.kill();srv.close();setTimeout(()=>{try{fs.rmSync(tmp,{recursive:true,force:true})}catch(_){}},300);});
