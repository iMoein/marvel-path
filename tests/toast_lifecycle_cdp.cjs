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
 for(const width of [390,1440]){
  await send('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:width<700});
  await send('Emulation.setTouchEmulationEnabled',{enabled:width<700});
  await send('Page.navigate',{url:base+'/?toast-test='+Date.now()});
  for(let i=0;i<150;i++){await sleep(100);try{if(await ev('document.documentElement.dataset.boot==="ready"&&!!document.querySelector("[data-action=toggle-done]")'))break;}catch(_){}if(i===149)throw Error('boot timeout');}
  assert(await ev(`(()=>{
   const ids=routeIds().slice(0,7);for(const id of ids)if(done(BY_ID[id]))setComplete(BY_ID[id],false);dismissToast();for(const id of ids){const b=document.querySelector('[data-action="toggle-done"][data-id="'+id+'"]');if(!b)return false;b.click();}
   return ids.every(id=>done(BY_ID[id]))&&document.querySelectorAll('#toasts .toast').length===1;
  })()`),'rapid real watched toggles should produce one toast');
  await sleep(350);
  const hit=await ev(`(()=>{
   const t=document.querySelector('#toasts .toast'),r=t.getBoundingClientRect(),x=r.left+r.width/2,y=r.top+r.height/2;
   const target=document.createElement('button');target.id='toast-hit-test';target.textContent='test';Object.assign(target.style,{position:'fixed',left:r.left+'px',top:r.top+'px',width:r.width+'px',height:r.height+'px',zIndex:90});document.body.append(target);
   target.addEventListener('click',()=>target.dataset.hit='true');
   return {x,y,pass:document.elementFromPoint(x,y)===target,style:getComputedStyle(t).pointerEvents};
  })()`);
  assert(hit.pass&&hit.style==='none','toast must not intercept pointer');
  if(width<700){await send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:hit.x,y:hit.y}]});await send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}
  else {await send('Input.dispatchMouseEvent',{type:'mousePressed',x:hit.x,y:hit.y,button:'left',clickCount:1});await send('Input.dispatchMouseEvent',{type:'mouseReleased',x:hit.x,y:hit.y,button:'left',clickCount:1});}
  await sleep(100);assert(await ev('document.getElementById("toast-hit-test").dataset.hit==="true"'),'underlying click/touch received');
  await ev('document.getElementById("toast-hit-test").remove()');
  // Replace while previous toast is fading: the old callback must not remove the new one.
  await ev('toast("first")');await sleep(2050);
  assert(await ev('!!document.querySelector("#toasts .toast.fade")'),'fade starts');
  await ev('toast("second")');await sleep(350);
  assert(await ev('document.querySelector("#toasts .toast").textContent==="second"'),'new toast survives old timer');
  await sleep(2000);assert(await ev('!document.querySelector("#toasts .toast")'),'all toasts removed');
  await ev('toast("error","error");toast("success")');
  assert(await ev('document.querySelector("#toasts .toast").textContent==="error"'),'error priority');
  await sleep(4500);assert(await ev('!document.querySelector("#toasts .toast")'),'error expires');
  await ev('toast("background");window.dispatchEvent(new Event("pagehide"))');
  assert(await ev('!document.querySelector("#toasts .toast")'),'pagehide clears');
  console.log('PASS '+width+' rapid watched toggles, click-through, fade, replacement, error priority, pagehide');
 }

})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>{ws?.close();chrome?.kill();srv.close();setTimeout(()=>{try{fs.rmSync(tmp,{recursive:true,force:true})}catch(_){}},300);});
