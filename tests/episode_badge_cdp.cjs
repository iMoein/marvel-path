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
 for(const width of [320,390,768,1024,1440]){
  await send('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:width<=700});
  await go('/title/falcon/?ep-badge='+Date.now());
  for(const theme of ['dark','light']){
   await ev('document.documentElement.dataset.theme='+JSON.stringify(theme));
   const result=await ev(`(()=>{
    const grid=document.querySelector('.cinema-episode-grid'), badges=[...grid.querySelectorAll('.ep-number')];
    const check=badge=>{
     const b=badge.getBoundingClientRect(),l=badge.querySelector('.ep-number-label'),v=badge.querySelector('.ep-number-value'),x=l.getBoundingClientRect(),y=v.getBoundingClientRect();
     return b.width===42&&b.height===44&&x.bottom<=y.top&&x.top>=b.top&&y.bottom<=b.bottom&&Math.abs((x.left+x.right-b.left-b.right)/2)<1&&Math.abs((y.left+y.right-b.left-b.right)/2)<1&&getComputedStyle(l).color===getComputedStyle(v).color&&badge.scrollWidth<=badge.clientWidth+1&&badge.scrollHeight<=badge.clientHeight+1;
    };
    const fit=badges.every(check);const btn=()=>grid.querySelector('.episode-watch-button'),before=btn().getAttribute('aria-checked'),color=getComputedStyle(badges[0]).color;
    btn().click();const fresh=document.querySelector('.cinema-episode-grid .ep-number'),after=getComputedStyle(fresh).color,valid=check(fresh);
    document.querySelector('.cinema-episode-grid .episode-watch-button').click();
    return {count:badges.length,fit,valid,colorChange:color!==after,restored:document.querySelector('.cinema-episode-grid .episode-watch-button').getAttribute('aria-checked')===before};
   })()`);
   assert(result.count===6&&result.fit&&result.valid&&result.colorChange&&result.restored,JSON.stringify({width,theme,result}));
   console.log('PASS',width,theme,'episode badge alignment and state');
  }
 }

})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>{ws?.close();chrome?.kill();srv.close();setTimeout(()=>{try{fs.rmSync(tmp,{recursive:true,force:true})}catch(_){}},300);});
