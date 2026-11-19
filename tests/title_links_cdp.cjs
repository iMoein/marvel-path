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
 for(const width of [390,1440]){
  await send('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:width<700});
  await send('Emulation.setTouchEmulationEnabled',{enabled:width<700});
  for(const selector of ['.feature-title-link','.feature a.feature-poster']){
   await go('/?feature-test='+Date.now());
   const result=await ev(`(()=>{
    const a=document.querySelector(${JSON.stringify(selector)}),h=document.querySelector('.feature h1'),label=document.querySelector('.feature-next-label'),c=document.querySelector('.feature-identity');
    if(!a||!h||!label)return null;
    const lb=label.getBoundingClientRect(),hb=h.getBoundingClientRect(),cb=c.getBoundingClientRect(),st=getComputedStyle(c),edge=cb.right-parseFloat(st.paddingRight);
    const aligned=Math.abs(lb.right-edge)<3&&Math.abs(hb.right-edge)<3&&lb.bottom<=hb.top+1&&getComputedStyle(label).direction==='rtl';
    a.scrollIntoView({block:'center',behavior:'instant'});
    const r=a.getBoundingClientRect(),x=r.left+r.width/2,y=r.top+r.height/2;
    return {aligned,href:a.getAttribute('href'),x,y,hit:a.contains(document.elementFromPoint(x,y)),width:r.width};
   })()`);
   assert(result&&result.aligned&&result.href.startsWith('/title/')&&result.width>0,JSON.stringify(result));
   // A wrapped inline title can have gaps between line boxes; choose the actual first text box.
   const hit=await ev(`(()=>{const a=document.querySelector(${JSON.stringify(selector)});const r=a.getClientRects()[0];const x=r.left+r.width/2,y=r.top+r.height/2;return {x,y,ok:a.contains(document.elementFromPoint(x,y))}})()`);
   assert(hit.ok,'click target '+selector+' '+JSON.stringify(hit));
   if(width<700){await send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:hit.x,y:hit.y}]});await send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}
   else {await send('Input.dispatchMouseEvent',{type:'mousePressed',x:hit.x,y:hit.y,button:'left',clickCount:1});await send('Input.dispatchMouseEvent',{type:'mouseReleased',x:hit.x,y:hit.y,button:'left',clickCount:1});}
   let loaded=false;
   for(let i=0;i<100;i++){await sleep(100);try{loaded=await ev('location.pathname==='+JSON.stringify(result.href)+'&&document.documentElement.dataset.boot==="ready"&&!!document.querySelector(".title-external-links")');if(loaded)break;}catch(_){}}
   assert(loaded,'detail navigation '+selector);
   console.log('PASS '+width+' '+selector+' label and navigation');
  }
  const links=await ev(`(()=>{
   const nodes=[...document.querySelectorAll('.title-external-links a')];
   const safe=nodes.every(a=>a.target==='_blank'&&a.rel.includes('noopener')&&a.rel.includes('noreferrer'));
   const all=FILMS.every(f=>typeof OFFICIAL_TITLE_LINKS[f.id]?.url==='string'&&OFFICIAL_TITLE_LINKS[f.id].url.startsWith('https://')&&titleExternalLinks(f).includes('google.com/search?q=')&&titleExternalLinks(f).includes(OFFICIAL_TITLE_LINKS[f.id].url));
   return {safe,all,count:FILMS.length,links:nodes.map(a=>a.href)};
  })()`);
  assert(links.safe&&links.all&&links.count===86,JSON.stringify(links));console.log('PASS '+width+' official and Google URLs for '+links.count+' titles');
 }

})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>{ws?.close();chrome?.kill();srv.close();setTimeout(()=>{try{fs.rmSync(tmp,{recursive:true,force:true})}catch(_){}},300);});
