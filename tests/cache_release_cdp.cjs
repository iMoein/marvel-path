/* Real-time browser checks; avoids virtual-time races while loading large actor pages. */
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),http=require('node:http'),{spawn}=require('node:child_process');
const root=path.resolve(__dirname,'../docs'),tmp=fs.mkdtempSync(path.join(os.tmpdir(),'marvel-cdp-'));
let mode='current';const oldHTML=require('node:child_process').execFileSync('git',['show','2e410f8f:docs/index.html'],{cwd:path.resolve(root,'..'),encoding:'utf8'});const currentHTML=fs.readFileSync(path.join(root,'index.html'),'utf8');
const types={'.html':'text/html; charset=utf-8','.js':'application/javascript','.css':'text/css','.json':'application/json','.webp':'image/webp','.woff2':'font/woff2'};
const srv=http.createServer((req,res)=>{try{const u=new URL(req.url,'http://localhost');res.setHeader('Cache-Control','no-store');if(u.pathname==='/'&&mode!=='current'){res.setHeader('Content-Type','text/html; charset=utf-8');return res.end(mode==='stale'?oldHTML:currentHTML.replace('name="marvel-release" content="3.5.6"','name="marvel-release" content="3.5.7"'));}let f=path.join(root,decodeURIComponent(u.pathname));if(fs.statSync(f).isDirectory())f=path.join(f,'index.html');res.setHeader('Content-Type',types[path.extname(f)]||'application/octet-stream');fs.createReadStream(f).pipe(res);}catch(_){res.writeHead(404).end();}});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));let chrome,ws,seq=0;const requests=new Map();
async function send(method,params={}){return new Promise((resolve,reject)=>{const id=++seq;requests.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}));});}
async function ev(expression,awaitPromise=false){const x=await send('Runtime.evaluate',{expression,awaitPromise,returnByValue:true});if(x.exceptionDetails)throw Error(x.exceptionDetails.text+' '+JSON.stringify(x.exceptionDetails.exception));return x.result.value;}
(async()=>{
 await new Promise(r=>srv.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+srv.address().port;
 chrome=spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',['--headless','--disable-gpu','--disable-background-networking','--no-first-run','--disable-extensions','--no-proxy-server','--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE localhost, EXCLUDE 127.0.0.1','--remote-debugging-port=0','--user-data-dir='+tmp,'about:blank'],{stdio:'ignore'});
 const portFile=path.join(tmp,'DevToolsActivePort');for(let i=0;i<100&&!fs.existsSync(portFile);i++)await sleep(100);
 const port=fs.readFileSync(portFile,'utf8').split('\n')[0];const tabs=await(await fetch('http://127.0.0.1:'+port+'/json/list')).json();ws=new WebSocket(tabs.find(t=>t.type==='page').webSocketDebuggerUrl);
 await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j;});ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.id){const p=requests.get(m.id);requests.delete(m.id);if(m.error)p?.reject(Error(JSON.stringify(m.error)));else p?.resolve(m.result);}};
 await send('Page.enable');await send('Runtime.enable');await send('Network.enable');
 const assert=(x,m)=>{if(!x)throw Error(m);};
 const wait=async(expr)=>{for(let i=0;i<150;i++){await sleep(100);try{if(await ev(expr))return;}catch(_){} }throw Error('timeout '+expr);};
 const go=async()=>{await send('Page.navigate',{url:base+'/?cache-test='+Date.now()});await sleep(250);await wait('document.documentElement.dataset.boot==="ready"');};
 await go();await wait('!!navigator.serviceWorker.controller');
 assert(await ev('navigator.serviceWorker.controller.scriptURL.endsWith("/sw.js")'),'stable worker');
 await ev('localStorage.setItem("mp-cache-test","keep");save()');
 const before=await ev('localStorage.getItem("marvel-path-tracker-v2")');
 await wait('document.querySelector(".sidebar-end").textContent.includes("3.5.6")');
 console.log('PASS current release and active service worker');
 mode='stale';await go();assert(await ev('document.querySelector("meta[name=marvel-release]").content==="3.5.6"'),'stale response rejected');console.log('PASS stale HTML uses correct cached release');
 mode='future';await go();assert(await ev('document.querySelector("meta[name=marvel-release]").content==="3.5.7"'),'new version not masked');console.log('PASS next release is not masked by old worker');
 mode='current';await go();assert(await ev('localStorage.getItem("mp-cache-test")==="keep"'),'localStorage preserved');assert(await ev('localStorage.getItem("marvel-path-tracker-v2")')===before,'watch state preserved');
 console.log('PASS viewing state remains intact');

})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>{ws?.close();chrome?.kill();srv.close();setTimeout(()=>{try{fs.rmSync(tmp,{recursive:true,force:true})}catch(_){}},300);});
