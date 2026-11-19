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
 for(const width of [320,360,375,390,430,1440]){
  await send('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:width<=700});
  await send('Page.navigate',{url:base+'/?header-test='+Date.now()});
  for(let i=0;i<150;i++){await sleep(100);try{if(await ev('document.documentElement.dataset.boot==="ready"&&!!document.querySelector("[data-global-search]")'))break;}catch(_){}if(i===149)throw Error('boot timeout');}
  const result=await ev(`(()=>{
   const root=document.documentElement,bar=document.querySelector('.topbar'),search=bar.querySelector('.mp-search-launch'),status=bar.querySelector('.top-status'),logo=bar.querySelector('.mobile-logo');
   const mobile=innerWidth<=700;root.style.setProperty('--mp-safe-top',mobile?'59px':'0px','important');
   const measure=()=>{const b=bar.getBoundingClientRect(),s=search.getBoundingClientRect(),l=logo.getBoundingClientRect(),t=status.getBoundingClientRect(),cs=getComputedStyle(bar);return {width:innerWidth,barHeight:b.height,barTop:b.top,searchWidth:s.width,searchHeight:s.height,searchTop:s.top,logoTop:l.top,statusWidth:t.width,blur:cs.backdropFilter,bg:cs.backgroundColor,overflow:bar.scrollWidth>bar.clientWidth+1,nonOverlap:!mobile||s.right<=l.left+1,visible:getComputedStyle(search.querySelector('span')).display!=='none'};};
   const first=measure();window.scrollTo(0,500);const after=measure();window.scrollTo(0,0);
   return {first,after};
  })()`);
  const x=result.first;
  assert(!x.overflow&&x.nonOverlap&&x.visible,JSON.stringify(result));
  if(width<=700){assert(x.barHeight===133&&x.searchHeight>=44&&x.searchWidth>=100&&x.searchTop>=69&&x.statusWidth<=20&&x.blur==='none',JSON.stringify(result));assert(result.after.barTop>=-1,JSON.stringify(result));}
  else assert(x.searchWidth>=160&&x.statusWidth<=22,JSON.stringify(result));
  await ev('save()');assert(await ev('document.querySelector(".top-status").dataset.storageOk==="true"'),'storage status');
  console.log('PASS '+width+' '+JSON.stringify(x));
 }

})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>{ws?.close();chrome?.kill();srv.close();setTimeout(()=>{try{fs.rmSync(tmp,{recursive:true,force:true})}catch(_){}},300);});
