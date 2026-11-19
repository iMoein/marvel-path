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
 for(const width of [320,390,430,768,1024,1150,1280,1440]){
  await send('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:width<=700});
  await go('/title/falcon/?detail-test='+Date.now());
  for(let i=0;i<40;i++){if(await ev('document.querySelector(".cinema-cover-pane img")?.naturalWidth>0'))break;await sleep(100);}
  const result=await ev(`(()=>{
   const pane=document.querySelector('.cinema-cover-pane'),poster=pane.querySelector('.poster-art'),img=poster.querySelector('img'),facts=document.querySelector('.cinema-facts-panel'),links=document.querySelector('.title-external-links'),grid=document.querySelector('.cinema-episode-grid');
   const p=pane.getBoundingClientRect(),r=poster.getBoundingClientRect(),i=img.getBoundingClientRect(),f=facts.getBoundingClientRect(),l=links.getBoundingClientRect(),cols=getComputedStyle(grid).gridTemplateColumns.split(' ').length;
   const anchor=[...links.querySelectorAll('a')];
   return {width:innerWidth,columns:cols,episodes:grid.children.length,loaded:img.naturalWidth>0,posterFills:Math.abs(i.width-r.width)<1&&Math.abs(i.height-r.height)<1&&Math.abs(i.left-r.left)<1,centered:Math.abs((p.left+p.right-r.left-r.right)/2)<2,ratio:r.width/r.height,below:l.top>=f.bottom-1&&Math.abs(l.width-f.width)<2,heroEmpty:!document.querySelector('.cinema-hero .title-external-links'),links:anchor.map(a=>a.href),safe:anchor.every(a=>a.target==='_blank'&&a.rel.includes('noopener')&&a.rel.includes('noreferrer')),cardFit:[...grid.children].every(x=>x.scrollWidth<=x.clientWidth+2),overflow:[...grid.children].filter(x=>x.scrollWidth>x.clientWidth+2).map(x=>({w:x.clientWidth,sw:x.scrollWidth,children:[...x.querySelectorAll("*")].filter(e=>e.scrollWidth>e.clientWidth+2).slice(0,12).map(e=>[e.className.baseVal??e.className,e.clientWidth,e.scrollWidth])})),pageFit:document.documentElement.scrollWidth<=innerWidth+2};
  })()`);
  const expected=width>=1024?3:width<=700?1:2;
  assert(result.columns===expected&&result.episodes===6&&result.loaded&&result.below&&result.heroEmpty&&result.safe&&result.cardFit&&result.pageFit,JSON.stringify(result));
  if(width<=700)assert(result.posterFills&&result.centered&&Math.abs(result.ratio-2/3)<.01,JSON.stringify(result));
  assert(result.links.some(u=>u.startsWith('https://www.google.com/search'))&&result.links.some(u=>u.startsWith('https://www.marvel.com/tv-shows/'))&&result.links.some(u=>u.startsWith('https://press.disneyplus.com/media-kits/')),JSON.stringify(result));
  const interaction=await ev(`(()=>{const get=()=>document.querySelector('.episode-watch-button');const before=get().getAttribute('aria-checked');get().click();const switched=get().getAttribute('aria-checked')!==before;get().click();return switched&&get().getAttribute('aria-checked')===before})()`);
  assert(interaction,'episode state toggle');
  console.log('PASS',width,result.columns+' columns', 'cover '+result.ratio.toFixed(3), 'source placement and episode state');
 }
 await go('/title/xmen/?film-test='+Date.now());
 assert(await ev('!!document.querySelector(".cinema-facts-group>.title-external-links")&&!document.querySelector(".cinema-episode-grid")'),'film layout');
 console.log('PASS standalone movie');

})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>{ws?.close();chrome?.kill();srv.close();setTimeout(()=>{try{fs.rmSync(tmp,{recursive:true,force:true})}catch(_){}},300);});
