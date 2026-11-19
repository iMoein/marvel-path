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
 for(const width of [320,390,700,768,1024,1100,1440,1787]){
  await send('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:width<=700});
  await go('/?countdown-test='+Date.now());
  for(const mode of ['all','disney']){
   await ev(`document.querySelector('[data-action="route-mode"][data-value="${mode}"]').click()`);
   for(const theme of ['dark','light']){
    await sleep(80);
    await ev('document.documentElement.dataset.theme='+JSON.stringify(theme));
    const r=await ev(`(()=>{const card=document.querySelector('.doomsday-countdown'),clock=card.querySelector('.countdown-clock'),sw=document.querySelector('.route-mode-switch'),rect=card.getBoundingClientRect(),feature=document.querySelector('.feature').getBoundingClientRect();return {date:card.querySelector('time').dateTime,mode:sw.querySelector('[aria-pressed=true]').dataset.value,fit:card.scrollWidth<=card.clientWidth+2&&document.documentElement.scrollWidth<=innerWidth+2,aligned:Math.abs(rect.left-feature.left)<2&&Math.abs(rect.right-feature.right)<2,static:getComputedStyle(card).position!=='sticky'&&getComputedStyle(sw).position==='sticky',units:clock.children.length,heightMatch:innerWidth<=700?rect.height>=220&&rect.height<=301:Math.abs(rect.height-feature.height)<2,order:card.nextElementSibling?.matches('.home-guide')&&card.nextElementSibling.nextElementSibling?.matches('.footnote'),size:parseFloat(getComputedStyle(clock.querySelector('strong')).fontSize)>=33,clean:!card.querySelector('button')&&!card.querySelector('.countdown-note')&&!card.innerText.includes('UTC')&&!card.innerText.includes('Avengers Countdown')}})()`);
    assert(r.date==='2026-12-18T05:00:00Z'&&r.mode===mode&&r.fit&&r.aligned&&r.static&&r.clean&&r.heightMatch&&r.order&&r.size&&r.units===4,JSON.stringify({width,theme,...r}));
   }
  }
  console.log('PASS',width,'both modes and themes');
 }
 const math=await ev(`(()=>{const t=Date.parse('2026-12-18T05:00:00Z');return [doomsdayRemaining(t-90061000),doomsdayRemaining(t),doomsdayRemaining(t+1000)]})()`);
 assert(math[0].days===1&&math[0].hours===1&&math[0].minutes===1&&math[0].seconds===1&&math[1].total===0&&math[2].total===0,'countdown boundaries');
 await ev("window.__realNow=Date.now;Date.now=()=>Date.parse('2026-12-18T04:59:58Z');render()");
 assert(await ev("document.querySelector('[data-countdown-unit=seconds]').textContent==='۰۲'&&countdownTimer!==null"),'live timer initial');
 await ev("Date.now=()=>Date.parse('2026-12-18T05:00:00Z')");
 await sleep(1300);
 assert(await ev("document.querySelector('.countdown-clock').hidden&&countdownTimer===null"),'deadline reached');
 await ev("Date.now=window.__realNow;render()");
 assert(await ev("!document.querySelector('.countdown-video').getAttribute('src')&&document.querySelector('.countdown-video').hidden"),'reduced motion no video request');
 await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'no-preference'}]});
 await go('/?autoplay-test='+Date.now());
 await ev("document.querySelector('.doomsday-countdown').scrollIntoView({block:'center',behavior:'instant'})");
 for(let i=0;i<50;i++){if(await ev("document.querySelector('.countdown-video').readyState>=2"))break;await sleep(100);}
 assert(await ev("document.querySelector('.countdown-video').readyState>=2&&document.querySelector('.countdown-video').muted&&document.querySelector('.countdown-video').autoplay&&document.querySelector('.countdown-video').loop&&!document.querySelector('.countdown-video').paused&&document.querySelector('.countdown-video').getAttribute('src').split('?')[0]==='/assets/media/doomsday-background.mp4'"),'same-origin playable MP4');
 await ev("document.querySelector('.countdown-video').currentTime=document.querySelector('.countdown-video').duration-0.4");
 await sleep(1300);
 assert(await ev("document.querySelector('.countdown-video').currentTime<3&&!document.querySelector('.countdown-video').paused"),'automatic loop wraps at end');
 await ev("window.__video=document.querySelector('.countdown-video');render()");
 await sleep(300);
 assert(await ev("window.__video===document.querySelector('.countdown-video')&&!document.querySelector('.countdown-video').paused&&!document.querySelector('.doomsday-countdown button')"),'keeps playing on rerender without controls');
 await go('/archive/?countdown-test');
 assert(await ev("!document.querySelector('.doomsday-countdown')&&countdownTimer===null"),'no timer on archive');
 console.log('PASS timer, expiry and navigation');
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>{ws?.close();chrome?.kill();srv.close();setTimeout(()=>{try{fs.rmSync(tmp,{recursive:true,force:true})}catch(_){}},300);});
