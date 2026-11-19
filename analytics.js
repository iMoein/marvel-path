/* Production-only analytics. No watch-state or personal data is read here. */
(()=>{
 'use strict';
 if(location.protocol!=='https:'||location.hostname!=='marvel.imoein.com')return;
 const GA='G-DNZHB15PC5',CF='4c431cd96516423bbc26081118f421bf',KEY='marvel-path-analytics-consent';
 let choice=null,started=false,panel=null,opened=false;
 try{choice=localStorage.getItem(KEY);}catch(_){}
 const readPage=()=>{
  const u=new URL(location.href),clean=new URL(u.origin+u.pathname);
  // Keep standard campaign attribution, never arbitrary query strings or hashes.
  for(const k of ['utm_source','utm_medium','utm_campaign','utm_id','utm_content','utm_term']){
   const v=u.searchParams.get(k);if(v&&/^[a-zA-Z0-9_.+ -]{1,100}$/.test(v))clean.searchParams.set(k,v);
  }
  return clean.href;
 };
 const referrer=()=>{try{const u=new URL(document.referrer);return u.origin+(u.origin===location.origin?u.pathname:'/');}catch(_){return '';}};
 function start(){
  if(started||choice!=='yes')return;
  started=true;
  window['ga-disable-'+GA]=false;
  window.dataLayer=window.dataLayer||[];
  window.gtag=window.gtag||function(){window.dataLayer.push(arguments);};
  window.gtag('consent','default',{analytics_storage:'granted',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'});
  window.gtag('js',new Date());
  window.gtag('config',GA,{send_page_view:false,allow_google_signals:false,allow_ad_personalization_signals:false,cookie_domain:location.hostname,cookie_prefix:'mp',page_location:readPage(),page_referrer:referrer()});
  window.gtag('event','page_view',{send_to:GA,page_location:readPage(),page_title:document.title,page_referrer:referrer()});
  const google=document.createElement('script');google.async=true;google.src='https://www.googletagmanager.com/gtag/js?id='+GA;google.id='mp-ga-tag';document.head.append(google);
  // Avoid a duplicate if an edge-injected beacon is present; use manual mode in Cloudflare.
  if(!document.querySelector('script[src*="static.cloudflareinsights.com/beacon.min.js"]')){
   const cf=document.createElement('script');cf.type='module';cf.id='mp-cf-beacon';cf.src='https://static.cloudflareinsights.com/beacon.min.js?token='+CF;cf.setAttribute('data-cf-beacon',JSON.stringify({token:CF}));document.head.append(cf);
  }
 }
 function clearCookies(){
  for(const raw of document.cookie.split(';')){
   const name=raw.trim().split('=')[0];
   if(!/^mp_ga(?:_|$)/.test(name))continue;
   for(const domain of ['', '; domain='+location.hostname])document.cookie=name+'=; Max-Age=0; path=/'+domain+'; Secure; SameSite=Lax';
  }
 }
 function setChoice(value){
  const wasStarted=started;choice=value;
  try{localStorage.setItem(KEY,value);}catch(_){}
  opened=false;sync();
  if(value==='yes')start();
  else if(wasStarted){
   window['ga-disable-'+GA]=true;
   window.gtag?.('consent','update',{analytics_storage:'denied',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'});
   clearCookies();location.reload();
  }
 }
 function sync(){
  const footer=document.querySelector('.viewer-footer');
  if(footer&&!footer.querySelector('[data-analytics-settings]')){
   const b=document.createElement('button');b.type='button';b.className='mp-analytics-settings';b.dataset.analyticsSettings='';b.textContent='تنظیمات حریم خصوصی';footer.append(b);
  }
  if(!panel){
   panel=document.createElement('section');panel.className='mp-analytics-panel';panel.setAttribute('role','region');panel.setAttribute('aria-label','تنظیمات آمار بازدید');
   panel.innerHTML='<div class="mp-analytics-copy"><strong>حریم خصوصی و آمار بازدید</strong><p>با اجازه تو، Google Analytics و Cloudflare Web Analytics برای سنجش بازدید و عملکرد سایت فعال می‌شوند. اطلاعات تماشای شخصی و یادداشت‌ها به عنوان رویداد ارسال نمی‌شوند.</p></div><div class="mp-analytics-actions"><button type="button" class="btn btn-outline" data-analytics-choice="no">رد کردن</button><button type="button" class="btn btn-primary" data-analytics-choice="yes">پذیرفتن</button></div>';
   document.body.append(panel);
  }
  panel.hidden=!opened&&(choice==='yes'||choice==='no');
 }
 document.addEventListener('click',e=>{
  if(e.target.closest('[data-analytics-settings]')){opened=true;sync();return;}
  const b=e.target.closest('[data-analytics-choice]');if(b)setChoice(b.dataset.analyticsChoice);
 });
 const app=document.getElementById('app');
 if(app)new MutationObserver(sync).observe(app,{childList:true});
 sync();start();
})();
