/* Real-time browser checks; avoids virtual-time races while loading large actor pages. */
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),http=require('node:http'),{spawn}=require('node:child_process');
const root=path.resolve(__dirname,'../docs'),tmp=fs.mkdtempSync(path.join(os.tmpdir(),'marvel-cdp-'));

const types={'.html':'text/html; charset=utf-8','.js':'application/javascript','.css':'text/css','.json':'application/json','.webp':'image/webp','.mp4':'video/mp4','.jpg':'image/jpeg','.woff2':'font/woff2'};
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



 await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
 for(const width of [320,390,430,700,768,1440]){
  await send('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:width<=700});
  await go('/?pwa-test='+Date.now());
  const r=await ev(`(()=>{const b=document.querySelector('[data-pwa-install]'),f=b.closest('footer'),m=document.querySelector('.main-content'),last=m.lastElementChild;return {gap:f.getBoundingClientRect().top-last.getBoundingClientRect().bottom,fit:f.scrollWidth<=f.clientWidth+1,touch:b.getBoundingClientRect().height>=44,available:!b.disabled}})()`);
  assert(r.gap<=30&&r.gap>=0&&r.fit&&r.touch&&r.available,JSON.stringify({width,...r}));
  if(width<=700){
   await ev('window.scrollTo({top:document.documentElement.scrollHeight,behavior:"instant"})');
   assert(await ev("document.querySelector('[data-pwa-install]').getBoundingClientRect().bottom<=document.querySelector('.mobile-nav').getBoundingClientRect().top"),'install button above mobile nav at bottom');
  }
  await ev("document.querySelector('[data-pwa-install]').click()");
  assert(await ev("document.querySelector('#pwa-install-dialog').open&&document.querySelector('#pwa-install-dialog ol').children.length>=2"),'fallback guide opens');
  await ev("document.querySelector('[data-pwa-close]').click()");
  assert(await ev("!document.querySelector('#pwa-install-dialog').open"),'guide closes');
  console.log('PASS footer, spacing and guide',width);
 }
 assert(await ev("pwaPlatform('iPhone',1)==='ios'&&pwaPlatform('Macintosh Safari',5)==='ios'&&pwaPlatform('Macintosh Safari',0)==='mac-safari'&&pwaPlatform('Android Chrome',1)==='android'&&pwaPlatform('Windows Chrome',0)==='desktop'"),'platform detection');
 await ev("window.__promptCount=0;const e=new Event('beforeinstallprompt',{cancelable:true});e.prompt=()=>{window.__promptCount++;return Promise.resolve()};e.userChoice=Promise.resolve({outcome:'accepted'});window.dispatchEvent(e)");
 assert(await ev("window.__promptCount===0"),'not automatic');
 await ev("document.querySelector('[data-pwa-install]').click()");
 assert(await ev("window.__promptCount===1"),'native prompt on explicit click');
 await ev("window.dispatchEvent(new Event('appinstalled'));render()");
 assert(await ev("document.querySelector('[data-pwa-install]').disabled&&document.querySelector('[data-pwa-install]').textContent.includes('نصب شده')"),'installed state survives rerender');
 console.log('PASS platform detection, prompt, installed state');
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>{ws?.close();chrome?.kill();srv.close();setTimeout(()=>{try{fs.rmSync(tmp,{recursive:true,force:true})}catch(_){}},300);});
