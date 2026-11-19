/* Real-time browser checks; avoids virtual-time races while loading large actor pages. */
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),https=require('node:https'),{spawn,execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'../docs'),tmp=fs.mkdtempSync(path.join(os.tmpdir(),'marvel-cdp-'));

const types={'.html':'text/html; charset=utf-8','.js':'application/javascript','.css':'text/css','.json':'application/json','.webp':'image/webp','.mp4':'video/mp4','.jpg':'image/jpeg','.woff2':'font/woff2'};
execFileSync('openssl',['req','-x509','-newkey','rsa:2048','-keyout',path.join(tmp,'key.pem'),'-out',path.join(tmp,'cert.pem'),'-days','1','-nodes','-subj','/CN=marvel.imoein.com'],{stdio:'ignore'});
const srv=https.createServer({key:fs.readFileSync(path.join(tmp,'key.pem')),cert:fs.readFileSync(path.join(tmp,'cert.pem'))},(req,res)=>{try{const u=new URL(req.url,'http://localhost');let f=path.join(root,decodeURIComponent(u.pathname));if(fs.statSync(f).isDirectory())f=path.join(f,'index.html');res.setHeader('Content-Type',types[path.extname(f)]||'application/octet-stream');fs.createReadStream(f).pipe(res);}catch(_){res.writeHead(404).end();}});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));let chrome,ws,seq=0;const requests=new Map();
async function send(method,params={}){return new Promise((resolve,reject)=>{const id=++seq;requests.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}));});}
async function ev(expression,awaitPromise=false){const x=await send('Runtime.evaluate',{expression,awaitPromise,returnByValue:true});if(x.exceptionDetails)throw Error(x.exceptionDetails.text+' '+JSON.stringify(x.exceptionDetails.exception));return x.result.value;}
(async()=>{
 await new Promise(r=>srv.listen(0,'127.0.0.1',r));const base='https://marvel.imoein.com:'+srv.address().port;
 chrome=spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',['--headless','--disable-gpu','--disable-background-networking','--no-first-run','--disable-extensions','--no-proxy-server','--ignore-certificate-errors','--host-resolver-rules=MAP marvel.imoein.com 127.0.0.1, MAP * ~NOTFOUND, EXCLUDE localhost, EXCLUDE 127.0.0.1','--remote-debugging-port=0','--user-data-dir='+tmp,'about:blank'],{stdio:'ignore'});
 const portFile=path.join(tmp,'DevToolsActivePort');for(let i=0;i<100&&!fs.existsSync(portFile);i++)await sleep(100);
 const port=fs.readFileSync(portFile,'utf8').split('\n')[0];const tabs=await(await fetch('http://127.0.0.1:'+port+'/json/list')).json();ws=new WebSocket(tabs.find(t=>t.type==='page').webSocketDebuggerUrl);
 await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j;});const hits=[];ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.method==='Fetch.requestPaused'){const r=m.params;hits.push(r.request.url);const js=r.request.url.includes('googletagmanager.com')?'window.__gaLoaded=true;':'window.__cfLoaded=true;';send('Fetch.fulfillRequest',{requestId:r.requestId,responseCode:200,responseHeaders:[{name:'Content-Type',value:'application/javascript'},{name:'Access-Control-Allow-Origin',value:'*'}],body:Buffer.from(js).toString('base64')});}if(m.id){const p=requests.get(m.id);requests.delete(m.id);if(m.error)p?.reject(Error(JSON.stringify(m.error)));else p?.resolve(m.result);}};
 await send('Page.enable');await send('Runtime.enable');await send('Network.enable');await send('Network.setBypassServiceWorker',{bypass:true});await send('Fetch.enable',{patterns:[{urlPattern:'https://www.googletagmanager.com/*'},{urlPattern:'https://static.cloudflareinsights.com/*'}]});
 const assert=(x,m)=>{if(!x)throw Error(m);};
 const go=async(url)=>{await send('Page.navigate',{url:base+url});for(let i=0;i<150;i++){await sleep(100);try{if(await ev('document.documentElement.dataset.boot==="ready"&&location.pathname==='+JSON.stringify(url.split('?')[0])))return;}catch(_){} }throw Error('boot timeout '+url);};




 const wait=async expr=>{for(let i=0;i<80;i++){if(await ev(expr))return;await sleep(100);}throw Error('timeout: '+expr);};
 await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
 await go('/?utm_source=linkedin&private=not-for-analytics');
 await wait("!!document.querySelector('.mp-analytics-panel')");
 assert(await ev("!document.querySelector('.mp-analytics-panel').hidden&&!window.gtag"),'default no measurement');
 assert(hits.length===0,'no third-party request before choice');
 const box=await ev("(()=>{const b=document.querySelector('.mp-analytics-panel').getBoundingClientRect(),n=document.querySelector('.mobile-nav').getBoundingClientRect();return {fit:b.left>=0&&b.right<=innerWidth,bottom:b.bottom<=n.top+1}})()");
 assert(box.fit&&box.bottom,JSON.stringify(box));
 await ev("document.querySelector('[data-analytics-choice=no]').click()");
 assert(await ev("document.querySelector('.mp-analytics-panel').hidden&&localStorage.getItem('marvel-path-analytics-consent')==='no'"),'decline saved');
 await go('/archive/');
 assert(hits.length===0&&await ev("document.querySelector('.mp-analytics-panel').hidden&&!window.gtag"),'decline persists');
 await ev("document.querySelector('[data-analytics-settings]').click();document.querySelector('[data-analytics-choice=yes]').click()");
 await wait("window.__gaLoaded&&window.__cfLoaded");
 assert(hits.length===2,'one request per service '+JSON.stringify(hits));
 assert(await ev("Array.from(dataLayer).filter(x=>x[0]==='event'&&x[1]==='page_view').length===1"),'single explicit page view');
 assert(await ev("Array.from(dataLayer).find(x=>x[0]==='config')[2].allow_google_signals===false"),'advertising signals disabled');
 await ev('render();render()');await sleep(200);assert(hits.length===2,'rerenders not counted again');
 await go('/title/iron-man/?utm_source=linkedin&private=not-for-analytics');
 await wait("window.__gaLoaded&&window.__cfLoaded");
 assert(hits.length===4,'accept persists across pages');
 assert(await ev("(()=>{const p=Array.from(dataLayer).find(x=>x[0]==='event')[2];return p.page_location.includes('utm_source=linkedin')&&!p.page_location.includes('private=')})()"),'campaign allowlist only');
 await ev("document.querySelector('[data-analytics-settings]').click();document.querySelector('[data-analytics-choice=no]').click()");
 await sleep(500);await wait("document.documentElement.dataset.boot==='ready'&&!!document.querySelector('.mp-analytics-panel')");
 assert(hits.length===4&&await ev("!window.gtag&&localStorage.getItem('marvel-path-analytics-consent')==='no'&&document.querySelector('.mp-analytics-panel').hidden"),'withdraw stops future collection');
 console.log('PASS production-domain mocked requests, consent, persistence, campaign sanitization, deduplication, mobile layout, withdrawal');
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>{ws?.close();chrome?.kill();srv.close();setTimeout(()=>{try{fs.rmSync(tmp,{recursive:true,force:true})}catch(_){}},300);});
