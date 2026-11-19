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
 const click=async selector=>{const r=await ev('(()=>{const r=document.querySelector('+JSON.stringify(selector)+').getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()');await send('Input.dispatchMouseEvent',{type:'mousePressed',x:r.x,y:r.y,button:'left',clickCount:1});await send('Input.dispatchMouseEvent',{type:'mouseReleased',x:r.x,y:r.y,button:'left',clickCount:1});};
 for(const width of [320,390,430,768,1024,1440]){
  await send('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:width<700});
  await go('/?home-guide-test='+Date.now());
  const result=await ev(`(()=>{
    const rows=[...document.querySelectorAll('.bonus-grid .bonus-title-row')],grid=document.querySelector('.bonus-grid'),guide=document.querySelector('.home-guide'),repo=guide?.querySelector('a');
    if(rows.length!==2||!grid||!guide)return {count:rows.length};
    const g=grid.getBoundingClientRect(),r=rows.map(el=>el.getBoundingClientRect());
    return {count:rows.length,layout:innerWidth>=1024?Math.abs(r[0].top-r[1].top)<2&&r[0].left>=r[1].right-2&&Math.abs(r[0].width-r[1].width)<2&&Math.abs(r[0].width+r[1].width+12-g.width)<2:r[1].top>=r[0].bottom&&r.every(x=>Math.abs(x.width-g.width)<2),fit:rows.every(el=>el.scrollWidth<=el.clientWidth+2),links:rows.every(el=>{const a=el.querySelector('.bonus-title-name'),b=el.querySelector('.bonus-cover-link');return a.getAttribute('href')===b.getAttribute('href')&&a.getAttribute('href').startsWith('/title/')}),guide:guide.querySelectorAll('p').length===3,repo:repo.href==='https://github.com/iMoein/marvel-path'&&repo.rel.includes('noopener'),guideFit:guide.scrollWidth<=guide.clientWidth+2};
  })()`);
  assert(result.count===2&&result.layout&&result.fit&&result.links&&result.guide&&result.repo&&result.guideFit,JSON.stringify(result));
  const interactions=await ev(`(()=>{
    const id=BONUS[0],f=BY_ID[id];const row=()=>document.querySelector('[data-bonus-id="'+id+'"]');
    const watched=done(f),saved=state.saved.mcu.includes(id);
    row().querySelector('[data-action="toggle-save"]').click();const save=state.saved.mcu.includes(id)!==saved;
    row().querySelector('[data-action="toggle-save"]').click();
    row().querySelector('[data-action="toggle-done"]').click();const watch=done(f)!==watched;
    row().querySelector('[data-action="toggle-done"]').click();
    return {save,watch,restored:done(f)===watched&&state.saved.mcu.includes(id)===saved};
  })()`);
  assert(interactions.save&&interactions.watch&&interactions.restored,JSON.stringify(interactions));
  const selector=width<700?'.mobile-logo[data-home-logo]':'.sidebar .logo[data-home-logo]';
  await go('/archive/?logo-test='+Date.now());
  assert(await ev('document.querySelector('+JSON.stringify(selector)+').getAttribute("href")==="/"'),'home href '+width);
  await click(selector);
  let home=false;for(let i=0;i<100;i++){await sleep(100);try{home=await ev('location.pathname==="/"&&document.documentElement.dataset.boot==="ready"&&!!document.querySelector(".home-guide")');if(home)break;}catch(_){}}
  assert(home,'logo opens home '+width);
  if(width<700){await ev('window.scrollTo({top:document.documentElement.scrollHeight,behavior:"instant"})');await sleep(150);assert(await ev('window.scrollY>100'),'test scrolls down');await click(selector);await sleep(300);assert(await ev('window.scrollY<2'),'home logo scrolls to top '+width+' remaining '+await ev('window.scrollY'));}
  console.log('PASS '+width+' bonus rows, card actions, legal guide, home logo');
 }

})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>{ws?.close();chrome?.kill();srv.close();setTimeout(()=>{try{fs.rmSync(tmp,{recursive:true,force:true})}catch(_){}},300);});
