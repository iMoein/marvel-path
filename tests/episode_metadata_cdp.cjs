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

 for(const width of [320,390,430,768,1024,1280,1440,1577]){
  await send('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:width<=700});
  await go('/title/falcon/?episode-meta='+Date.now());
  for(const theme of ['dark','light']){
   await ev('document.documentElement.dataset.theme='+JSON.stringify(theme));
   const r=await ev(`(()=>{
    const cards=[...document.querySelectorAll('.cinema-episode-grid .episode-rich')];
    return {count:cards.length,fit:document.documentElement.scrollWidth<=innerWidth+2,valid:cards.every(card=>{
      const heading=card.querySelector('.episode-heading'),title=heading.querySelector('h4'),en=heading.querySelector('.episode-original-name'),meta=card.querySelector('.episode-meta'),parts=[...meta.children],badge=card.querySelector('.ep-number');
      const head=card.querySelector('.ep-rich-head').getBoundingClientRect(),h=heading.getBoundingClientRect(),t=title.getBoundingClientRect(),e=en?.getBoundingClientRect(),m=meta.getBoundingClientRect(),b=badge.getBoundingClientRect();
      const fields=parts.map(x=>x.getBoundingClientRect());
      return !!e&&e.top>=t.bottom+2&&m.top>=Math.max(e.bottom,b.bottom)+2&&Math.abs(m.width-head.width)<2&&parts.length===3&&getComputedStyle(en).direction==='ltr'&&getComputedStyle(parts[2]).direction==='ltr'&&getComputedStyle(meta).direction==='rtl'&&Math.abs(b.top-h.top)<2&&fields.every(f=>f.left>=m.left-1&&f.right<=m.right+1)&&fields.every((f,i)=>fields.slice(i+1).every(g=>f.bottom<=g.top||g.bottom<=f.top||f.right<=g.left||g.right<=f.left))&&card.scrollWidth<=card.clientWidth+2;
    })};
   })()`);
   assert(r.count===6&&r.fit&&r.valid,JSON.stringify({width,theme,...r}));
   console.log('PASS',width,theme,'three distinct episode rows');
  }
 }
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>{ws?.close();chrome?.kill();srv.close();setTimeout(()=>{try{fs.rmSync(tmp,{recursive:true,force:true})}catch(_){}},300);});
