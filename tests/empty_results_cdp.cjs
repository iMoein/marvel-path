/* Archive and actor empty-search layout and result recovery. */
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


 const noMatch='zzzz-no-match-987654321';
 const setSearch=(id,value)=>ev(`(()=>{const input=document.getElementById(${JSON.stringify(id)});input.value=${JSON.stringify(value)};input.dispatchEvent(new Event('input',{bubbles:true}));})()`);
 const geometry=sel=>ev(`(()=>{const grid=document.querySelector(${JSON.stringify(sel)}),empty=grid?.querySelector('.empty');if(!empty)return {exists:false};const g=grid.getBoundingClientRect(),e=empty.getBoundingClientRect();return {exists:true,full:Math.abs(g.width-e.width)<3,center:Math.abs((g.left+g.right-e.left-e.right)/2)<2,role:empty.getAttribute('role'),fit:document.documentElement.scrollWidth<=innerWidth+2,contents:[...empty.children].every(n=>Math.abs((n.getBoundingClientRect().left+n.getBoundingClientRect().right-e.left-e.right)/2)<2)};})()`);
 for(const width of [320,390,768,1024,1440,1577]){
   await send('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:width<=700});
   await go('/archive/?empty-test='+Date.now());
   for(const view of ['grid','list']){
     await ev(`document.querySelector('[data-action="view"][data-value="${view}"]').click()`);
     await setSearch('search',noMatch);
     let r=await geometry('#archive-results');
     assert(r.exists&&r.full&&r.center&&r.fit&&r.contents&&r.role==='status',JSON.stringify({width,view,...r}));
     assert(await ev('document.querySelector(".pagination").hidden&&document.querySelector(".listing-actions").hidden&&getComputedStyle(document.querySelector(".pagination")).display==="none"'),'empty pagination');
     await ev(`document.querySelector('[data-action="view"][data-value="${view}"]').click()`);
     r=await geometry('#archive-results');
     assert(r.exists&&r.full&&r.center,'empty after render');
     await setSearch('search','');
     assert(await ev('!document.querySelector("#archive-results .empty")&&document.querySelector("#archive-results").children.length>0&&!document.querySelector(".pagination").hidden&&!document.querySelector(".listing-actions").hidden'),'clear restores results');
     console.log('PASS archive',width,view);
   }
   await go('/actors/?empty-test='+Date.now());
   for(let i=0;i<80;i++){if(await ev('!!document.querySelector("#people-results .people-card")'))break;await sleep(100);}
   await setSearch('people-search',noMatch);
   const r=await geometry('#people-results');assert(r.exists&&r.full&&r.center&&r.fit&&r.contents,JSON.stringify({width,...r}));
   await setSearch('people-search','');
   assert(await ev('!!document.querySelector("#people-results .people-card")&&!document.querySelector("#people-results .empty")'),'actor results restored');
   console.log('PASS actors',width);
 }
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>{ws?.close();chrome?.kill();srv.close();setTimeout(()=>{try{fs.rmSync(tmp,{recursive:true,force:true})}catch(_){}},300);});
