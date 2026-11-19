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
  await send('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:width<=700});
  await go('/title/falcon/?fa-test='+Date.now());
  const result=await ev(`(()=>{
    const q=s=>document.querySelector(s),all=s=>[...document.querySelectorAll(s)];
    return {overview:q('.original-plot[lang=fa]')?.textContent.includes('سم ویلسون'),episodes:all('.ep-synopsis[lang=fa]').length,headlines:all('.ep-rich-head h4[lang=fa]').length,cast:all('.cast-actor').some(e=>e.textContent.includes('آنتونی مکی')),roles:all('.cast-character').some(e=>e.textContent.includes('سم ویلسون')),fit:document.documentElement.scrollWidth<=innerWidth+2};
  })()`);
  assert(result.overview&&result.episodes===6&&result.headlines===6&&result.cast&&result.roles&&result.fit,JSON.stringify(result));
  await go('/person/tom-hiddleston/?fa-test='+Date.now());
  assert(await ev('document.querySelector(".person-intro h1").textContent.includes("تام هیدلستون")&&document.querySelectorAll(".person-bio-fa p[lang=fa]").length===3&&!!document.querySelector(".translation-credit")'),'localized actor profile');
  await go('/person/chris-hemsworth/?fa-test='+Date.now());
  assert(await ev('document.querySelector(".person-intro").textContent.includes("هنوز بیوگرافی این بازیگر در منبع ثبت نشده است")'),'missing biography explicitly labeled');
  await go('/actors/?fa-test='+Date.now());
  for(const query of ['تام هیدلستون','Tom Hiddleston']){
    assert(await ev(`(()=>{const i=document.querySelector('#people-search');i.value=${JSON.stringify(query)};i.dispatchEvent(new Event('input',{bubbles:true}));return !!document.querySelector('.people-card[href="/person/tom-hiddleston/"]')})()`),'directory search '+query);
  }
  await ev('document.querySelector("[data-global-search]").click()');
  await ev('(()=>{const i=document.querySelector("#mp-gs-query");i.value="آنتونی مکی";i.dispatchEvent(new Event("input",{bubbles:true}));})()');
  await sleep(100);
  assert(await ev('!!document.querySelector("[data-gs-result][data-id=anthony-mackie]")'),'global Persian search');
  console.log('PASS',width,'title, episodes, cast, biography, missing bio and bilingual search');
 }
 await go('/title/defenders/?fa-test='+Date.now());
 assert(await ev('document.querySelector("#story-info").textContent.includes("نیاز به بازبینی")&&!document.querySelector(".cast-card")&&!document.querySelector(".ep-synopsis[lang=en]")'),'mismatched original withheld');
 console.log('PASS incorrect source withheld');

})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>{ws?.close();chrome?.kill();srv.close();setTimeout(()=>{try{fs.rmSync(tmp,{recursive:true,force:true})}catch(_){}},300);});
