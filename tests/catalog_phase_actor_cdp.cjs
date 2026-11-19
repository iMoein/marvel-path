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


 await go('/archive/?phase-audit');
 const audit=await ev(`(()=>{
   const groups=[
    'iron-man incredible-hulk iron-man-2 thor cap-first avengers',
    'iron-man-3 thor-dark cap-winter guardians-1 avengers-ultron ant-man all-hail',
    'civil-war doctor-strange guardians-2 spider-home thor-ragnarok black-panther infinity-war antman-wasp captain-marvel endgame spider-far',
    'black-widow shang-chi eternals spider-no strange-mom thor-love wakanda wandavision falcon loki-1 whatif-1 hawkeye moon-knight ms-marvel groot-1 she-hulk werewolf guardians-holiday',
    'quantumania guardians-3 marvels deadpool-wolverine cap-brave thunderbolts loki-2 whatif-2 secret-invasion groot-2 echo agatha whatif-3 friendly-spider-1 daredevil-born-1 ironheart',
    'fantastic-four spider-brand eyes-wakanda marvel-zombies wonder-man daredevil-born-2 visionquest punisher-special'
   ];
   const expected=Object.fromEntries(groups.flatMap((ids,index)=>ids.split(' ').map(id=>[id,index+1])));
   const bad=FILMS.filter(f=>f.phase!==(expected[f.id]||0)).map(f=>[f.id,f.phase,expected[f.id]]);
   const arcErrors=Object.entries(STORY_ARCS).flatMap(([k,a])=>a.items.filter((id,i)=>!BY_ID[id]||a.items.indexOf(id)!==i).map(id=>[k,id]));
   return {total:FILMS.length,movies:FILMS.filter(f=>f.type==='movie'&&f.universe==='mcu').length,bad,arcErrors,arcs:Object.keys(STORY_ARCS).length};
 })()`);
 assert(audit.total===88&&audit.movies===38&&audit.bad.length===0&&audit.arcErrors.length===0,JSON.stringify(audit));
 console.log('PASS phase audit of all 88 records and '+audit.arcs+' arcs');
 const arcs=await ev('Object.keys(STORY_ARCS)');
 await ev("document.querySelector('[data-action=order][data-value=arc]').click()");
 await ev("(()=>{const el=document.querySelector('#page-size');el.value='all';el.dispatchEvent(new Event('change',{bubbles:true}))})()");
 for(const arc of arcs){
   await ev(`(()=>{const el=document.querySelector('#arc-pick');el.value=${JSON.stringify(arc)};el.dispatchEvent(new Event('change',{bubbles:true}))})()`);
   for(const view of ['grid','list']){
     await ev(`document.querySelector('[data-action=view][data-value=${view}]').click()`);
     const r=await ev(`(()=>{const cards=[...document.querySelector('#archive-results').children],items=filterMCU();return {count:cards.length,expected:items.length,valid:cards.every((c,i)=>{const t=c.querySelector('.card-top-meta>span,.row-description>span').textContent,f=items[i];return t.includes('گام '+num(arcStep(f)))&&t.includes(phaseLabel(f))&&!t.includes('فصل ')})}})()`);
     assert(r.count===r.expected&&r.valid,JSON.stringify({arc,view,...r}));
   }
   console.log('PASS arc',arc,'grid and list');
 }
 for(const width of [320,390,768,1024,1440,1577]){
   await send('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:width<=700});
   await go('/person/chris-hemsworth/?actor-card-test='+Date.now());
   for(let i=0;i<80;i++){if(await ev('!!document.querySelector(".person-film-grid .title-card")'))break;await sleep(100);}
   const r=await ev(`(()=>{
    const g=document.querySelector('.person-film-grid'),cards=[...g.querySelectorAll('.title-card')];
    return {count:cards.length,cols:getComputedStyle(g).gridTemplateColumns.split(' ').length,pageFit:document.documentElement.scrollWidth<=innerWidth+2,fit:cards.every(c=>c.scrollWidth<=c.clientWidth+2),valid:cards.every(c=>{const f=BY_ID[c.id.slice(5)],meta=c.querySelector('.card-top-meta>span').textContent;return !!f&&meta.includes(phaseLabel(f))&&!meta.includes('گام ')&&!meta.includes('فصل ')&&!!c.querySelector('.card-actor-role')&&!!c.querySelector('.poster-art')&&c.querySelector('.card-name').href.includes('/title/'+f.id+'/')})};
   })()`);
   assert(r.count===10&&r.cols>=2&&r.fit&&r.valid&&r.pageFit,JSON.stringify({width,...r}));
   const toggle=await ev(`(()=>{const pick=()=>document.querySelector('.person-film-grid [data-action=toggle-done]'),b=pick().classList.contains('is-done');pick().click();const changed=pick().classList.contains('is-done')!==b;pick().click();return changed&&pick().classList.contains('is-done')===b})()`);
   assert(toggle,'actor watch state');
   console.log('PASS actor unified cards',width,r.cols,'columns');
 }
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>{ws?.close();chrome?.kill();srv.close();setTimeout(()=>{try{fs.rmSync(tmp,{recursive:true,force:true})}catch(_){}},300);});
