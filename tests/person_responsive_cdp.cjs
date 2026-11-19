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

 for(const [slug,kind,widths] of [
  ['stan-lee','translated',[320,390,700,701,768,800,801,1024,1280,1440]],
  ['chris-evans','translated',[390,1440]],
  ['aaron-himelstein','original',[390,1440]],
  ['aaron-matthews','missing',[390,1440]]
 ]){
  for(const width of widths){
   await send('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:width<=700});
   await go('/person/'+slug+'/?actor-test='+Date.now());
   for(let i=0;i<80;i++){if(await ev('!!document.querySelector(".person-intro")'))break;await sleep(100);}
   const r=await ev(`(()=>{
    const hero=document.querySelector('.person-hero'),photo=hero.querySelector('.person-portrait'),intro=hero.querySelector('.person-intro');
    const h=hero.getBoundingClientRect(),p=photo.getBoundingClientRect(),i=intro.getBoundingClientRect();
    const bio=intro.querySelector('.person-bio-fa'),details=intro.querySelector('.untranslated-source');
    if(details)details.open=true;
    const paragraphs=[...intro.querySelectorAll('p')];
    return {width:innerWidth,cols:getComputedStyle(hero).gridTemplateColumns.split(' ').length,
      heroFit:hero.scrollWidth<=hero.clientWidth+2,pageFit:document.documentElement.scrollWidth<=innerWidth+2,
      textFit:intro.scrollWidth<=intro.clientWidth+2,
      fullText:paragraphs.every(n=>Math.abs(n.getBoundingClientRect().width-i.width)<2&&getComputedStyle(n).maxWidth==='none'),
      topAligned:Math.abs(p.top-i.top)<2,photoRight:p.left>=i.right-1,
      stacked:i.top>=p.bottom-1,centered:Math.abs((p.left+p.right-h.left-h.right)/2)<2,
      kind:bio?'translated':details?'original':'missing',
      counter:!!intro.querySelector('.person-counter'),credit:!!bio?.querySelector('.translation-credit'),
      imageRatio:p.width/p.height
    };
   })()`);
   assert(r.heroFit&&r.pageFit&&r.textFit&&r.fullText&&r.counter&&r.kind===kind&&Math.abs(r.imageRatio-.75)<.02,JSON.stringify({slug,...r}));
   if(kind==='translated')assert(r.credit,JSON.stringify({slug,...r}));
   assert(width<=700?r.cols===1&&r.stacked&&r.centered:r.cols===2&&r.topAligned&&r.photoRight,JSON.stringify({slug,...r}));
   console.log('PASS',slug,width,kind,r.cols+' columns');
  }
 }
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>{ws?.close();chrome?.kill();srv.close();setTimeout(()=>{try{fs.rmSync(tmp,{recursive:true,force:true})}catch(_){}},300);});
