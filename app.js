'use strict';
/* Marvel Path v2.6.1: centralized cover management, local-first data model. */
const KEY='marvel-path-tracker-v2', OLD_KEY='marvel-path-tracker-v1';
const ICON={
 users:'<circle cx="8" cy="9" r="3"/><path d="M2 20v-2a6 6 0 0 1 12 0v2M17 8a3 3 0 0 1 0 6m0 2c2.5 0 4 1.6 4 4"/>',
 grid:'<rect x="3" y="3" width="7" height="7" rx="1.6"/><rect x="14" y="3" width="7" height="7" rx="1.6"/><rect x="3" y="14" width="7" height="7" rx="1.6"/><rect x="14" y="14" width="7" height="7" rx="1.6"/>',
 target:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
 bookmark:'<path d="M5 5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16l-7-5-7 5z"/>',
 clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
 check:'<path d="m5 12 4 4L19 6"/>',
 play:'<path d="m8 5 11 7-11 7z"/>',
 film:'<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M7 3v18M17 3v18M3 8h4m-4 8h4m10-8h4m-4 8h4"/>',
 arrow:'<path d="m15 18-6-6 6-6"/>',
 search:'<circle cx="11" cy="11" r="7"/><path d="m16.6 16.6 4.2 4.2"/>',
 settings:'<path d="M12 2v3m0 14v3M4.93 4.93l2.12 2.12m9.9 9.9 2.12 2.12M2 12h3m14 0h3M4.93 19.07l2.12-2.12m9.9-9.9 2.12-2.12"/><circle cx="12" cy="12" r="4"/>',
 download:'<path d="M12 3v12m-5-5 5 5 5-5M4 18v3h16v-3"/>',
 upload:'<path d="M12 21V9m-5 5 5-5 5 5M4 6V3h16v3"/>',
 info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 7h.01"/>',
 list:'<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
 layers:'<path d="m12 3 9 5-9 5-9-5 9-5zm-9 10 9 5 9-5m-18 5 9 5 9-5"/>',
 spark:'<path d="m12 2 2.4 7.6L22 12l-7.6 2.4L12 22l-2.4-7.6L2 12l7.6-2.4z"/>',
 plus:'<path d="M12 5v14M5 12h14"/>',
 minus:'<path d="M5 12h14"/>',
 chevron:'<path d="m9 18 6-6-6-6"/>',
 back:'<path d="m9 18 6-6-6-6"/>',
 dots:'<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
 x:'<path d="M18 6 6 18M6 6l12 12"/>',
 monitor:'<rect x="2" y="3" width="20" height="15" rx="2"/><path d="M8 22h8m-4-4v4"/>',
 external:'<path d="M13 5h6v6M19 5l-9 9"/><path d="M19 13v6H5V5h6"/>',
 menu:'<path d="M3 6h18M3 12h18M3 18h18"/>'
};
const ico=(n,s=18)=>`<svg viewBox="0 0 24 24" width="${s}" height="${s}" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICON[n]||ICON.grid}</svg>`;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num=n=>Number(n||0).toLocaleString('fa-IR');
const formatYear=y=>y!=null&&/^[0-9]{4}$/.test(String(y))?Number(y).toLocaleString('fa-IR',{useGrouping:false}):'—';
const phaseLabel=f=>f.phase?'فاز '+num(f.phase):f.universe==='fox'?'جهان مستقل':f.universe==='animation'?'جهان موازی':'بدون فاز رسمی';
const catalogMeta=(f,step=0)=>[step?'گام '+num(step):'',phaseLabel(f),formatYear(f.year),kind(f)].filter(Boolean).join(' · ');
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const duration=m=>m==null?'زمان نامشخص':m>=60?`${num(Math.floor(m/60))} ساعت${m%60?' و '+num(Math.round(m%60))+' دقیقه':''}`:`${num(Math.round(m))} دقیقه`;
const isAnimation=f=>!!META[f.id]?.animation;
const kind=f=>isAnimation(f)?'انیمیشن':f.type==='movie'?'فیلم سینمایی':f.type==='series'?'سریال':f.id==='all-hail'?'فیلم کوتاه':'ویژه‌برنامه';
const seasonCount=f=>f.episodes||0;
const maxVal=f=>f.episodes||f.minutes||1;
const posterCandidates=f=>{
 const custom=state?.customPosters?.[f.id]||'';
 const main=META[f.id]?.poster||'';
 const secondary=POSTER_BACKUPS[f.id]||'';
 const extra=POSTER_EXTRA[f.id]||[];
 const local=localCover(f);
 const candidates=[local,custom];
 // Broken covers observed by the user: try a verified, different picture/host before the old one.
 if(extra.length)candidates.push(...extra);
 candidates.push(main,secondary);
 // An independent image CDN host for *all* TMDB picture paths. No API key is required.
 const tmdbUrls=[main,...extra].filter(u=>u.startsWith('https://image.tmdb.org/t/p/'));
 for(const url of tmdbUrls){
   candidates.push(url.replace('https://image.tmdb.org/t/p/','https://img.amodb.dev/t/p/'));
   candidates.push(url.replace(/\/t\/p\/w(?:185|342|500|780)\//,'/t/p/w342/'));
 }
 for(const url of [main,secondary]){
   if(url.includes('raw.githubusercontent.com/HaithamAmireh/MCU/main/'))
     candidates.push(url.replace('https://raw.githubusercontent.com/HaithamAmireh/MCU/main/','https://cdn.jsdelivr.net/gh/HaithamAmireh/MCU@main/'));
 }
 return [...new Set(candidates.filter(u=>u===local&&!!local || /^https:\/\//.test(u)))];
};
const posterUrl=f=>posterCandidates(f)[0]||'';
function blank(){const progress={};for(const id of SEEN){const f=BY_ID[id];if(f&& !f.episodes)progress[id]=maxVal(f)}const episodes={};for(const id of SEEN){const f=BY_ID[id];if(f?.episodes)episodes[id]=Array.from({length:f.episodes},(_,i)=>i+1)}return {schema:2,order:'story',arc:'main',mcuFilter:'all',mcuStatus:'all',mcuView:'grid',mcuPage:0,mcuPageSize:10,routeMode:'all',routeStatus:'all',routeFilter:'all',theme:'dark',progress,episodes,watching:{},saved:{doomsday:[],mcu:[]},notes:{},customPosters:{}}}
const safeIds=arr=>Array.isArray(arr)?[...new Set(arr.filter(id=>!!BY_ID[id]))]:[];
function normalize(data){const out=blank();if(!data||typeof data!=='object')return out;
 out.order=['story','release','arc'].includes(data.order)?data.order:out.order;
 out.arc=Object.hasOwn(STORY_ARCS,data.arc)?data.arc:'main';
 out.mcuFilter=['all','movie','series','animation','special'].includes(data.mcuFilter)?data.mcuFilter:out.mcuFilter;
 out.mcuStatus=['all','remaining','watched','inprogress'].includes(data.mcuStatus)?data.mcuStatus:out.mcuStatus;
 out.mcuView=['grid','list'].includes(data.mcuView)?data.mcuView:out.mcuView;
 out.routeMode=['all','disney'].includes(data.routeMode)?data.routeMode:(data.routeFilter==='official'?'disney':'all');
 out.routeStatus=['all','remaining','watched'].includes(data.routeStatus)?data.routeStatus:(['remaining','watched'].includes(data.routeFilter)?data.routeFilter:'all');
 out.routeFilter=['all','remaining','watched','official'].includes(data.routeFilter)?data.routeFilter:'all';
 out.mcuPageSize=[10,20,50,'all'].includes(data.mcuPageSize)?data.mcuPageSize:10;
 out.theme=['dark','light'].includes(data.theme)?data.theme:out.theme;
 out.mcuPage=clamp(Number(data.mcuPage)||0,0,100);
 out.progress={};for(const [id,v] of Object.entries(data.progress||{})){const f=BY_ID[id];if(f&&!f.episodes){const n=Number(v);if(Number.isFinite(n))out.progress[id]=clamp(n,0,maxVal(f))}}
 out.episodes={};for(const [id,values] of Object.entries(data.episodes||{})){const f=BY_ID[id];if(!f?.episodes||!Array.isArray(values))continue;out.episodes[id]=[...new Set(values.map(Number).filter(v=>Number.isInteger(v)&&v>=1&&v<=f.episodes))].sort((a,b)=>a-b)}
 out.saved={doomsday:safeIds(data.saved?.doomsday||[]),mcu:safeIds(data.saved?.mcu||[])};
 out.watching={};for(const [id,v] of Object.entries(data.watching||{}))if(BY_ID[id]&&v)out.watching[id]=true;
 out.notes={};for(const [id,v] of Object.entries(data.notes||{}))if(BY_ID[id]&&typeof v==='string')out.notes[id]=v.slice(0,2500);
 out.customPosters={};for(const [id,v] of Object.entries(data.customPosters||{}))if(BY_ID[id]&&typeof v==='string'&&/^https:\/\//.test(v)&&v.length<600)out.customPosters[id]=v;
 return out;
}
function upgrade(old){const out=blank();if(!old||typeof old!=='object')return out;out.order=old.order||'story';out.theme=old.theme||'dark';out.mcuPageSize=[10,20,50,'all'].includes(old.mcuPageSize)?old.mcuPageSize:10;out.notes=old.notes||{};out.watching=old.watching||{};out.saved={doomsday:safeIds(old.bookmarks||[]),mcu:safeIds((old.bookmarks||[]).filter(id=>BY_ID[id]?.universe==='mcu'))};for(const [id,val] of Object.entries(old.progress||{})){const f=BY_ID[id];if(!f)continue;if(f.episodes)out.episodes[id]=Array.from({length:clamp(Math.floor(Number(val)||0),0,f.episodes)},(_,i)=>i+1);else out.progress[id]=val}return normalize(out)}
let state;let storageReady=true;try{const v2=localStorage.getItem(KEY),v1=localStorage.getItem(OLD_KEY);state=v2?normalize(JSON.parse(v2)):v1?upgrade(JSON.parse(v1)):blank();if(!v2&&v1)localStorage.setItem(KEY,JSON.stringify(state))}catch(e){state=blank();storageReady=false}
let searchTerm='',detailOrigin='doomsday';
let activeToast=null;
const getEpisodes=f=>state.episodes[f.id]||[];
const fraction=f=>f.episodes?getEpisodes(f).length/f.episodes:clamp(Number(state.progress[f.id]||0)/maxVal(f),0,1);
const done=f=>fraction(f)>=1;
const partial=f=>fraction(f)>0&&fraction(f)<1;
const watching=f=>!!state.watching[f.id]&&!done(f)||partial(f);
const stateLabel=f=>done(f)?'دیده‌شده':watching(f)?'در حال تماشا':'دیده‌نشده';
function stats(ids){let watched=0,seenMinutes=0,totalMinutes=0,known=0;for(const id of ids){const f=BY_ID[id];if(!f)continue;if(done(f))watched++;if(f.minutes!=null){totalMinutes+=f.minutes;seenMinutes+=f.minutes*fraction(f);known++}}return {count:ids.length,watched,pending:ids.length-watched,percent:ids.length?Math.round(watched*100/ids.length):0,used:Math.round(seenMinutes),remaining:Math.max(0,Math.round(totalMinutes-seenMinutes)),total:totalMinutes,known}}
const nextOf=ids=>ids.map(id=>BY_ID[id]).find(f=>f&&!done(f));
function syncStorageIndicator(){const el=document.querySelector('.top-status[data-storage-ok]');if(!el)return;const message=storageReady?'ذخیره خودکار فعال است':'خطا در ذخیره اطلاعات';el.dataset.storageOk=String(storageReady);el.title=message;const label=el.querySelector('.storage-label');if(label&&label.textContent!==message)label.textContent=message;}
function save(){try{localStorage.setItem(KEY,JSON.stringify(state));storageReady=true}catch(e){storageReady=false;toast('ذخیره اطلاعات ممکن نشد. خروجی پشتیبان بگیر.','error')}finally{syncStorageIndicator()}}
function dismissToast(){
 const current=activeToast;if(!current)return;
 clearTimeout(current.fadeTimer);clearTimeout(current.removeTimer);
 current.el.remove();activeToast=null;
}
function toast(message,type='ok'){
 const host=document.getElementById('toasts');if(!host)return;
 // Never hide a storage or request error behind a subsequent success message.
 if(activeToast?.type==='error'&&type!=='error'&&!activeToast.el.classList.contains('fade'))return;
 dismissToast();
 const el=document.createElement('div');el.className='toast '+(type==='error'?'error':'ok');el.textContent=String(message);
 host.replaceChildren(el);
 const current={el,type,fadeTimer:null,removeTimer:null};activeToast=current;
 current.fadeTimer=setTimeout(()=>{
  if(activeToast!==current)return;
  el.classList.add('fade');
  current.removeTimer=setTimeout(()=>{if(activeToast===current)dismissToast();},240);
 },type==='error'?4200:2000);
}
document.addEventListener('visibilitychange',()=>{if(document.hidden)dismissToast();});
window.addEventListener('pagehide',dismissToast);
const arc=pct=>`<div class="progress-circle" style="--pct:${pct}%"><div><strong>${num(pct)}٪</strong><span>تکمیل</span></div></div>`;
function poster(f,cls=''){const url=posterUrl(f);return `<div class="poster-art p-${esc(f.palette)} ${cls}" aria-label="پوستر ${esc(f.title)}">${url?`<img class="poster-image" data-poster-id="${esc(f.id)}" src="${esc(url)}" alt="پوستر ${esc(f.title)}" loading="${['cinema-cover','feature-poster-frame'].includes(cls)?'eager':'lazy'}" referrerpolicy="no-referrer"/>`:''}<div class="poster-fallback"><div class="poster-mark">M<span>PATH</span></div><span class="poster-symbol">${esc(f.sigil)}</span><span class="poster-fallback-name" dir="ltr" lang="en">${esc(f.title)}</span></div></div>`}
function artBackdrop(f){const url=posterUrl(f);return `<div class="feature-background p-${esc(f.palette)}" aria-hidden="true">${url?`<img class="poster-image" data-poster-id="${esc(f.id)}" src="${esc(url)}" alt="" referrerpolicy="no-referrer"/>`:''}<span class="feature-glow"></span></div>`}
function pill(f,extra=''){return `<span class="pill ${extra}">${isAnimation(f)?ico('spark',13):f.type==='movie'?ico('film',13):ico('monitor',13)}${kind(f)}</span>`}
function navIcon(id){return id==='doomsday'?'target':id==='mcu'?'layers':id==='timeline'?'clock':id==='watchlist'?'bookmark':id==='posters'?'film':id==='people'?'grid':id==='metadata'?'info':'settings'}
const pageNames={doomsday:'مسیر Doomsday',mcu:'آرشیو MCU',timeline:'خط زمانی',watchlist:'واچ‌لیست من',settings:'تنظیمات',posters:'مدیریت کاورها',people:'بازیگران',metadata:'اطلاعات آثار'};
function navLink(key){const current=(window.location.hash||'#doomsday').split('/')[0];const isActive=current==='#'+key||(current==='#title'&&detailOrigin===key);return `<a href="#${key}" class="nav-link ${isActive?'active':''}" ${isActive?'aria-current="page"':''}>${ico(navIcon(key),19)}<span>${pageNames[key]}</span>${key==='mcu'?`<small>${num(MCU.length)}</small>`:''}</a>`}
function routeIds(){return (state.routeMode==='disney'?DOOMSDAY.filter(id=>OFFICIAL.has(id)):DOOMSDAY)}
function shell(body,active){const s=stats(routeIds());return `<div class="app-shell">
 <aside class="sidebar"><a class="logo" href="#doomsday" data-home-logo aria-label="مسیر مارول؛ بازگشت به صفحه اصلی"><span class="logo-mark">M<span>／</span></span><span class="logo-name"><b>مسیر مارول</b><small>MARVEL PATH</small></span></a>
 <div class="nav-caption">کتابخانه شخصی</div><nav class="nav-column" aria-label="منوی اصلی">${['doomsday','mcu','timeline','watchlist','people','settings'].map(navLink).join('')}</nav>
 <div class="sidebar-spacer"></div><div class="sidebar-foot"><div class="sidebar-foot-art">EARTH-616 <span>✳</span></div><span>${state.routeMode==='disney'?'منتخب دیزنی+':'مسیر پیشنهادی Doomsday'}</span><strong>${num(s.watched)} <small>از ${num(s.count)} عنوان</small></strong><div class="thin-meter"><i style="width:${s.percent}%"></i></div></div>
 <div class="sidebar-end">MARVEL PATH <span> / </span> v3.0</div></aside>
 <div class="workspace"><header class="topbar"><a class="mobile-logo" href="#doomsday" data-home-logo aria-label="مسیر مارول؛ بازگشت به صفحه اصلی"><span class="mini-m" aria-hidden="true">M</span><span>مسیر مارول</span></a><div class="breadcrumb">WATCH HUB <span class="slash">/</span> <b>${esc(active)}</b></div><div class="top-actions"><button type="button" class="mp-search-launch" data-global-search aria-label="جستجوی سراسری" aria-keyshortcuts="Meta+K Control+K">${ico('search',18)}<span>جستجو</span><kbd class="mp-search-hint"></kbd></button>${nextOf(routeIds())?`<a class="top-resume" href="#title/${nextOf(routeIds()).id}">${ico('play',13)}<span>ادامه مسیر</span></a>`:''}<span class="top-status" role="status" title="${storageReady?'ذخیره خودکار فعال است':'خطا در ذخیره اطلاعات'}" data-storage-ok="${storageReady}"><span class="local-dot" aria-hidden="true"></span><span class="storage-label">${storageReady?'ذخیره خودکار فعال است':'خطا در ذخیره اطلاعات'}</span></span><span class="top-clock top-earth">EARTH-616</span></div></header><main id="main-content" class="main-content">${body}</main><footer class="main-footer"><span class="footer-tagline">ساخته‌شده برای دنبال کردن داستان‌ها</span></footer></div>
 <nav class="mobile-nav" aria-label="منوی موبایل">${['doomsday','mcu','timeline','watchlist','people','settings'].map(navLink).join('')}</nav></div>`}
function buttonOpen(f,caption='مشاهده جزئیات',more=''){return `<a href="#title/${encodeURIComponent(f.id)}" class="btn btn-primary ${more}">${ico('play',17)} ${caption} ${ico('arrow',16)}</a>`}
function feature(f,section){if(!f)return `<section class="feature feature-finished"><div class="feature-content"><span class="eyebrow">MISSION COMPLETE</span><h1>تمام مسیر رو دیدی!</h1><p>همه عنوان‌های این مسیر رو به پایان رسوندی.</p></div></section>`;return `<section class="feature feature-next">${artBackdrop(f)}<div class="feature-content"><div class="eyebrow with-dot feature-next-label" dir="rtl"><i aria-hidden="true"></i><span>${section==='doomsday'?'توقف بعدی در مسیر Doomsday':'ادامه داستان MCU'}</span></div><div class="feature-identity"><div class="feature-index"><span class="feature-kicker-en">UP NEXT</span><span class="feature-separator"></span><span>${formatYear(f.year)} / ${f.universe==='fox'?'FOX':'MCU'}</span></div><h1 dir="ltr" lang="en"><a class="feature-title-link" href="#title/${encodeURIComponent(f.id)}">${esc(f.title)}</a></h1></div><p>${esc(META[f.id]?.summary||'')}</p><div class="feature-tags">${pill(f)}<span>${duration(f.minutes)}</span><span>${f.episodes?`${num(f.episodes)} قسمت`:'نسخه سینمایی'}</span></div><div class="feature-ctas">${buttonOpen(f,watching(f)?'ادامه ثبت پیشرفت':'مشاهده و شروع تماشا')}<button type="button" class="btn btn-glass feature-save" aria-label="${state.saved[section==='doomsday'?'doomsday':'mcu'].includes(f.id)?'حذف از واچ‌لیست':'ذخیره در واچ‌لیست'}" aria-pressed="${state.saved[section==='doomsday'?'doomsday':'mcu'].includes(f.id)}" data-action="toggle-save" data-id="${f.id}" data-scope="${section}">${ico('bookmark',18)} <span>${state.saved[section==='doomsday'?'doomsday':'mcu'].includes(f.id)?'حذف از لیست':'ذخیره در واچ‌لیست'}</span></button></div></div><div class="feature-artwork"><a class="feature-poster" href="#title/${encodeURIComponent(f.id)}" aria-label="مشاهده جزئیات ${esc(f.fa)}">${poster(f,'feature-poster-frame')}</a><div class="feature-corner" aria-hidden="true">THE MARVEL PATH COLLECTION</div></div></section>`}
function metric(icon,label,value,sub){return `<div class="metric"><div class="metric-icon">${ico(icon,19)}</div><div><span>${label}</span><strong>${value}</strong><small>${sub}</small></div></div>`}
function sectionTitle(title,description,link=''){return `<div class="section-head"><div><h2>${title}</h2><p>${description}</p></div>${link}</div>`}
function filterButtons(scope,options,current){return `<div class="filter-tabs" aria-label="فیلترها">${options.map(([id,label])=>`<button type="button" class="filter-tab ${current===id?'selected':''}" data-action="filter" data-scope="${scope}" data-value="${id}">${label}</button>`).join('')}</div>`}
function filmCard(f,index,scope,mode='grid',options={}){
 const doneNow=done(f),inProg=watching(f),saved=state.saved[scope]?.includes(f.id),pct=Math.round(fraction(f)*100),href=(options.actor&&ADMIN_MODE?'/':'')+'#title/'+encodeURIComponent(f.id);
 return `<article class="title-card ${mode==='list'?'compact-card':''} ${inProg?'is-progress':''}" id="card-${f.id}"><a class="card-art-link" href="${href}" aria-label="جزئیات ${esc(f.fa)}">${poster(f)}${doneNow?`<span class="card-done">${ico('check',16)}</span>`:''}${inProg?`<span class="card-watching">در حال تماشا</span>`:''}</a><div class="card-info"><div class="card-top-meta"><span>${catalogMeta(f,options.step)}</span>${!options.actor&&scope==='doomsday'&&OFFICIAL.has(f.id)?'<span class="tag-official">انتخاب دیزنی+</span>':''}</div><a href="${href}" class="card-name" dir="ltr" lang="en">${esc(f.title)}</a><span class="card-fa">${esc(f.fa)}</span>${options.actor?`<span class="card-actor-role">نقش: ${esc(options.role||'بازیگر')}</span>`: ''}<div class="card-bottom"><span class="card-duration">${ico('clock',14)}${f.episodes?num(f.episodes)+' قسمت':duration(f.minutes)}</span>${options.actor&&ADMIN_MODE?'':`<div class="card-actions"><button type="button" class="icon-btn ${saved?'saved':''}" data-action="toggle-save" data-scope="${scope}" data-id="${f.id}" aria-label="${saved?'حذف از':'افزودن به'} واچ‌لیست">${ico('bookmark',18)}</button><button type="button" class="icon-btn ${doneNow?'is-done':''}" data-action="toggle-done" data-id="${f.id}" aria-label="${doneNow?'لغو':'ثبت'} تماشای کامل">${ico('check',18)}</button></div>`}</div>${pct>0&&!doneNow?`<div class="card-meter"><span style="width:${pct}%"></span></div>`:''}</div></article>`
}
function filmRow(f,index,scope,options={}){const finished=done(f),part=watching(f),saved=state.saved[scope]?.includes(f.id);return `<div class="item-row ${part?'row-active':''}"><span class="item-seq">${num(index)}</span><a href="#title/${f.id}" class="row-poster">${poster(f)}</a><a href="#title/${f.id}" class="row-description"><strong dir="ltr" lang="en">${esc(f.title)}</strong><small>${esc(f.fa)}</small><span>${catalogMeta(f,options.step)} · ${f.episodes?num(f.episodes)+' قسمت':duration(f.minutes)}${partial(f)?' · ' + num(Math.round(fraction(f)*100))+'٪ پیشرفت':''}</span></a><div class="item-state">${finished?'<span class="state-complete">'+ico('check',13)+' دیده‌شده</span>':part?'<span class="state-progress">در حال تماشا</span>':`<span class="state-todo">دیده‌نشده</span>`}</div><button class="icon-btn ${saved?'saved':''}" data-action="toggle-save" data-id="${f.id}" data-scope="${scope}" aria-label="واچ‌لیست">${ico('bookmark',18)}</button><button class="icon-btn ${finished?'is-done':''}" data-action="toggle-done" data-id="${f.id}" aria-label="تغییر وضعیت">${ico('check',18)}</button><a href="#title/${f.id}" class="row-open" aria-label="جزئیات">${ico('arrow',18)}</a></div>`}
function spotlightCard(f,index,scope){const pct=Math.round(fraction(f)*100), saved=state.saved[scope]?.includes(f.id);return `<article class="spot-card"><a class="spot-image" href="#title/${esc(f.id)}">${poster(f)}<span class="spot-index">${num(index)}</span>${pct?`<div class="spot-meter"><span style="width:${pct}%"></span></div>`:''}</a><div class="spot-card-copy"><span class="spot-kind">${kind(f)} · ${f.episodes?`${num(f.episodes)} قسمت`:duration(f.minutes)}</span><a href="#title/${esc(f.id)}" class="spot-title" dir="ltr">${esc(f.title)}</a><div class="spot-lower"><span>${pct?`${num(pct)}٪ دیده شده`:'آماده تماشا'}</span><button type="button" class="spot-bookmark ${saved?'saved':''}" aria-label="${saved?'حذف از':'افزودن به'} واچ‌لیست" data-action="toggle-save" data-id="${f.id}" data-scope="${scope}">${ico('bookmark',15)}</button></div></div></article>`}
function nextShelf(ids,scope,heading='عنوان‌های بعدی',description='بدون جست‌وجو، از همین‌جا ادامه بده.'){const pending=ids.map(id=>BY_ID[id]).filter(f=>f&&!done(f)).slice(0,5);if(!pending.length)return '';return `<section class="next-shelf"><div class="section-head shelf-title"><div><span class="mini-label">YOUR NEXT PICKS</span><h2>${heading}</h2><p>${description}</p></div><span class="shelf-count">${num(pending.length)} پیشنهاد</span></div><div class="spot-rail">${pending.map((f,i)=>spotlightCard(f,i+1,scope)).join('')}</div></section>`}
function episodeHint(f){if(!f.episodes)return '';const seen=getEpisodes(f),next=Array.from({length:f.episodes},(_,i)=>i+1).find(x=>!seen.includes(x));return `<div class="episode-hint">${ico('play',16)}<div><b>${next?'قسمت '+num(next)+' رو هنوز ندیدی':'تمام قسمت‌ها تکمیل شدند'}</b><span>${num(seen.length)} قسمت از ${num(f.episodes)} تماشا شده</span></div><div class="episode-hint-pct">${num(Math.round(fraction(f)*100))}٪</div></div>`}
function bonusCard(f){
 const watched=done(f),inProgress=watching(f),saved=state.saved.mcu?.includes(f.id),pct=Math.round(fraction(f)*100);
 const status=watched?'دیده‌شده':inProgress?'در حال تماشا':'آماده تماشا';
 const href='#title/'+encodeURIComponent(f.id);
 return `<article class="bonus-title-row" data-bonus-id="${esc(f.id)}"><a class="bonus-cover-link" href="${href}" aria-label="جزئیات ${esc(f.fa)}">${poster(f)}</a><div class="bonus-title-body"><div class="bonus-title-heading"><a class="bonus-title-name" href="${href}" dir="ltr" lang="en">${esc(f.title)}</a><span class="bonus-status ${watched?'done':inProgress?'watching':''}">${watched?ico('check',13):inProgress?ico('play',13):''}${status}</span></div><span class="bonus-title-fa">${esc(f.fa)}</span><div class="bonus-title-bottom"><span class="bonus-episodes">${ico('clock',14)}${num(f.episodes)} قسمت</span><div class="bonus-actions"><button type="button" class="icon-btn ${saved?'saved':''}" data-action="toggle-save" data-scope="mcu" data-id="${esc(f.id)}" aria-label="${saved?'حذف از':'افزودن به'} واچ‌لیست">${ico('bookmark',18)}</button><button type="button" class="icon-btn ${watched?'is-done':''}" data-action="toggle-done" data-id="${esc(f.id)}" aria-label="${watched?'لغو':'ثبت'} تماشای کامل">${ico('check',18)}</button></div></div>${pct>0&&!watched?`<div class="bonus-progress"><div class="card-meter" role="progressbar" aria-label="پیشرفت تماشا" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}"><span style="width:${pct}%"></span></div><small>${num(pct)}٪</small></div>`:''}</div></article>`;
}
function homeGuide(){
 return `<section class="home-guide" aria-labelledby="home-guide-heading"><span class="home-guide-icon" aria-hidden="true">${ico('info',22)}</span><div class="home-guide-copy"><div class="home-guide-head"><h2 id="home-guide-heading">${esc(HOME_GUIDE.title)}</h2><span class="home-guide-tag">پروژه مستقل · کد منبع عمومی</span></div>${HOME_GUIDE.paragraphs.map(p=>'<p>'+esc(p)+'</p>').join('')}<a class="home-guide-repo" href="${esc(HOME_GUIDE.repo)}" target="_blank" rel="noopener noreferrer">${ico('external',15)} ${esc(HOME_GUIDE.linkLabel)}</a></div></section>`;
}
function doomsdayPage(){
 const base=routeIds(),s=stats(base),next=nextOf(base),disney=state.routeMode==='disney';
 const ids=base.filter(id=>{const f=BY_ID[id];return state.routeStatus==='remaining'?!done(f):state.routeStatus==='watched'?done(f):true});
 const modeChoices=`<div class="route-mode-copy"><b>${disney?'مسیر رسمی Disney+':'مسیر پیشنهادی ما'}</b><small>${disney?'منتخب Countdown to Doomsday · لوکی در دو فصل ثبت شده':'فهرست شخصی و آثار تکمیلی برای پیوستگی داستان'}</small></div><div class="route-mode-switch" role="group" aria-label="انتخاب مسیر تماشا"><div class="route-mode-segments"><button type="button" data-action="route-mode" data-value="all" aria-pressed="${!disney}" class="${!disney?'selected':''}">همه آثار پیشنهادی</button><button type="button" data-action="route-mode" data-value="disney" aria-pressed="${disney}" class="${disney?'selected':''}">منتخب Disney+</button></div></div>`;
 return `<div class="page-intro"><div class="page-kicker">THE ROAD TO DOOMSDAY <span class="accent-slash">/</span> مسیر تماشا</div><h1>ماراتن <em>Doomsday</em></h1><p>${disney?'فقط آثار موجود در مجموعه رسمی Countdown to Doomsday دیزنی+؛ پیشرفت، گام بعدی و زمان باقی‌مانده هم براساس همین مسیر محاسبه می‌شه.':'ماراتن کامل شخصی تو با فیلم‌ها و سریال‌های تکمیلی؛ از جایی که تماشا رو متوقف کردی ادامه بده.'}</p></div>
 ${modeChoices}
 ${feature(next,'doomsday')}
 <div class="overview-grid"><div class="overview-progress">${arc(s.percent)}<div><span class="mini-label">WATCH MILESTONE</span><h3>${disney?'پیشرفت مسیر دیزنی+':'پیشرفت مسیر پیشنهادی'}</h3><p>${num(s.watched)} از ${num(s.count)} اثر رو دیدی؛ ${num(s.pending)} اثر باقی مونده.</p><span class="overview-small">مدت‌زمان قسمت‌های سریال جداگانه لحاظ می‌شه.</span></div></div>${metric('clock','زمان باقی‌مانده',duration(s.remaining),disney?'منتخب‌های دیزنی+':'کل برنامه پیشنهادی')}${metric('check','آثار دیده‌شده',num(s.watched)+' / '+num(s.count),'فقط همین مسیر')}</div>
 ${nextShelf(base,'doomsday','در ادامه چه ببینم؟','پنج ایستگاه بعدی همین مسیر، براساس انتخاب فعلی تو.') }
 ${sectionTitle(disney?'مسیر رسمی Disney+':'نقشه کامل تماشا',disney?'منتخب‌های دیزنی+ به ترتیب پیشنهادی ما؛ تماشای هر عنوان روی تمام مسیرها اثر می‌گذاره.':'همه پیش‌نیازهای انتخابی ما؛ برای جزئیات و ثبت پیشرفت وارد هر عنوان شو.','<span class="section-count">'+num(base.length)+' CHAPTERS</span>')}
 ${filterButtons('route-status',[['all','همه وضعیت‌ها'],['remaining','باقی‌مانده'],['watched','دیده‌شده']],state.routeStatus)}
 <div class="route-list">${ids.map(id=>filmRow(BY_ID[id],base.indexOf(id)+1,'doomsday')).join('')||empty('اثری با این وضعیت در مسیر انتخابی پیدا نشد.')}</div>
 ${!disney?`<section class="bonus-section"><div><div class="bonus-kicker">EXTRA CHAPTERS</div><h3>داستان واندا و ویژن رو کامل‌تر ببین</h3><p>این دو سریال تکمیلی، خارج از ۲۳ پیش‌نیاز اصلی هستند.</p></div><div class="bonus-grid">${BONUS.map(id=>bonusCard(BY_ID[id])).join('')}</div></section>`:''}
 <p class="footnote">${disney?'منبع انتخاب عناوین: مجموعه Countdown to Avengers: Doomsday در Disney+. ترتیب نمایش برای این اپ تنظیم شده است؛ Loki در دو فصل جداگانه حساب می‌شود.':'آثار پیشنهادی ما شامل چند پیش‌نیاز تکمیلی هستند و فهرست الزام‌آور رسمی مارول محسوب نمی‌شوند.'}</p>
 ${homeGuide()}`}
const mcuIds=()=>MCU.filter(f=>f.universe!=='bonus').map(f=>f.id);
const arcInfo=()=>STORY_ARCS[state.arc]||STORY_ARCS.main;
const orderedMCU=()=>state.order==='arc'?arcInfo().items.map(id=>BY_ID[id]).filter(f=>f&&MCU.includes(f)):MCU.slice().sort((a,b)=>state.order==='release'?a.release.localeCompare(b.release)||a.title.localeCompare(b.title):(STORY_INDEX[a.id]??9999)-(STORY_INDEX[b.id]??9999)||a.release.localeCompare(b.release));
const arcStep=(f)=>state.order!=='arc'?'':(arcInfo().items.indexOf(f.id)+1);
function arcSpotlight(){if(state.order!=='arc')return '';const arc=arcInfo(),ids=arc.items.filter(id=>BY_ID[id]&&MCU.includes(BY_ID[id])),s=stats(ids),upcoming=nextOf(ids);return `<section class="arc-spotlight" aria-label="مسیر داستانی انتخاب‌شده"><div class="arc-identity"><span class="arc-stamp">${esc(arc.icon)}</span><div><div class="arc-overline">STORY CONNECTION / مسیر شخصیت‌ها</div><h2>${esc(arc.name)}</h2><p>${esc(arc.desc)}</p></div></div><div class="arc-progress"><strong>${num(s.percent)}٪</strong><span>${num(s.watched)} از ${num(s.count)} اثر</span><span>${duration(s.remaining)} باقی مانده</span></div>${upcoming?`<a class="arc-next" href="#title/${esc(upcoming.id)}">${ico('play',17)} ادامه این مسیر: <b dir="ltr">${esc(upcoming.title)}</b>${ico('arrow',16)}</a>`:'<div class="arc-next">این مسیر رو کامل دیدی!</div>'}</section>`}

function filterMCU(){let all=orderedMCU();if(state.mcuFilter!=='all')all=all.filter(f=>state.mcuFilter==='movie'?f.type==='movie':state.mcuFilter==='series'?f.type==='series'&&!isAnimation(f):state.mcuFilter==='animation'?isAnimation(f):f.type==='special');if(state.mcuStatus!=='all')all=all.filter(f=>state.mcuStatus==='watched'?done(f):state.mcuStatus==='remaining'?!done(f):watching(f));if(searchTerm.trim())all=all.filter(f=>[f.title,f.fa,META[f.id]?.summary].some(s=>(s||'').toLocaleLowerCase().includes(searchTerm.trim().toLocaleLowerCase())));return all}
function paginationData(results){const size=state.mcuPageSize==='all'?Math.max(1,results.length):state.mcuPageSize;const pages=Math.ceil(results.length/size)||1;const page=clamp(state.mcuPage,0,pages-1);if(page!==state.mcuPage)state.mcuPage=page;return {size,pages,page,paged:results.slice(page*size,(page+1)*size)};}
function paginationHTML(page,pages,total){if(!total)return '<div class="pagination" hidden></div>';if(state.mcuPageSize==='all')return `<div class="pagination pagination-all"><span>نمایش تمام ${num(total)} عنوان</span></div>`;return `<div class="pagination"><button data-action="page" data-value="-1" ${page===0?'disabled':''}>${ico('chevron',16)} قبلی</button><span>صفحه ${num(page+1)} از ${num(pages)}</span><button data-action="page" data-value="1" ${page>=pages-1?'disabled':''}>بعدی ${ico('arrow',16)}</button></div>`;}
function mcuResultCards(results,page,size){return results.map((f,i)=>state.mcuView==='grid'?filmCard(f,page*size+i+1,'mcu','grid',{step:arcStep(f)}):filmRow(f,page*size+i+1,'mcu',{step:arcStep(f)})).join('')||empty('با تغییر فیلتر یا جست‌وجو دوباره امتحان کن.');}
function mcuPage(){const s=stats(MCU.map(f=>f.id)),visible=filterMCU(),{page,pages,size,paged}=paginationData(visible);
 return `<div class="page-intro mcu-heading ${state.order==='arc'?'arc-mode-intro':''}"><div class="page-kicker">THE COMPLETE UNIVERSE <span class="accent-slash">/</span> آرشیو</div><h1>جهان سینمایی <em>MCU</em></h1><p>فیلم‌ها، سریال‌ها و انیمیشن‌ها؛ بر اساس زمان اتفاقات، انتشار یا پیوستگی داستان شخصیت‌ها. پیشرفت تماشا بین همه حالت‌ها مشترکه.</p></div>
 <div class="mcu-overview ${state.order==='arc'?'arc-mode-global':''}"><div class="mcu-overview-top"><div><span class="overview-overline">MY MCU JOURNEY</span><h2>${num(s.watched)} <span>/ ${num(s.count)} عنوان دیده شده</span></h2><p>${duration(s.remaining)} برای کامل کردن آرشیو باقی مونده.</p></div><div class="mcu-percent">${num(s.percent)}<small>٪</small></div></div><div class="wide-meter"><span style="width:${s.percent}%"></span></div><div class="mcu-counts"><span>${num(MCU.filter(f=>f.type==='movie').length)} فیلم</span><span>${num(MCU.filter(f=>f.type==='series'&&!isAnimation(f)).length)} فصل سریال</span><span>${num(MCU.filter(isAnimation).length)} انیمیشن</span></div></div>
 ${nextShelf(orderedMCU().map(f=>f.id),'mcu','ادامه تماشا و پیشنهادهای بعدی','بر اساس ترتیب انتخابی تو؛ تغییر ترتیب، تیک‌ها رو تغییر نمی‌ده.')}
 <div class="catalog-bar"><div class="order-selector"><span>چیدمان بر اساس</span><div class="segmented"><button data-action="order" data-value="story" class="${state.order==='story'?'selected':''}">خط زمانی وقوع</button><button data-action="order" data-value="release" class="${state.order==='release'?'selected':''}">تاریخ انتشار</button><button data-action="order" data-value="arc" class="${state.order==='arc'?'selected':''}">پیوستگی روایی</button></div></div><div class="layout-switch"><button data-action="view" data-value="grid" title="نمای پوسترها" class="${state.mcuView==='grid'?'selected':''}">${ico('grid',18)}</button><button data-action="view" data-value="list" title="نمای فهرست" class="${state.mcuView==='list'?'selected':''}">${ico('list',18)}</button></div></div>
 ${state.order==='arc'?`<div class="arc-picker-wrap"><label class="arc-picker-label" for="arc-pick">${ico('layers',17)} مسیر کدوم شخصیت / گروه رو دنبال می‌کنی؟</label><select id="arc-pick" class="arc-picker">${Object.entries(STORY_ARCS).map(([key,arc])=>`<option value="${esc(key)}" ${state.arc===key?'selected':''}>${esc(arc.name)} (${num(arc.items.length)} اثر)</option>`).join('')}</select></div>${arcSpotlight()}`:''}
 <div class="catalog-controls"><div class="search-field">${ico('search',18)}<input id="search" type="search" aria-label="فیلتر عناوین آرشیو" placeholder="جست‌وجو در عناوین این آرشیو..." value="${esc(searchTerm)}" autocomplete="off"/></div><div class="select-wrap"><span id="status-filter-label">وضعیت</span><select id="status-filter" aria-labelledby="status-filter-label"><option value="all" ${state.mcuStatus==='all'?'selected':''}>همه وضعیت‌ها</option><option value="remaining" ${state.mcuStatus==='remaining'?'selected':''}>دیده‌نشده</option><option value="inprogress" ${state.mcuStatus==='inprogress'?'selected':''}>در حال تماشا</option><option value="watched" ${state.mcuStatus==='watched'?'selected':''}>دیده‌شده</option></select></div></div>
 ${filterButtons('mcu',[['all','همه'],['movie','فیلم‌ها'],['series','سریال‌ها'],['animation','انیمیشن‌ها'],['special','ویژه‌برنامه‌ها']],state.mcuFilter)}
 <div class="listing-top"><div><strong>${num(visible.length)} عنوان</strong><span> · ${state.order==='story'?'بر اساس خط زمانی وقوع':state.order==='release'?'بر اساس تاریخ انتشار':'پیوستگی روایی · '+esc(arcInfo().name)}</span></div><div class="listing-actions"${visible.length?'':' hidden'}><div class="page-size-picker"><span>تعداد در صفحه</span><select id="page-size" aria-label="تعداد عناوین هر صفحه">${[10,20,50,'all'].map(sz=>`<option value="${sz}" ${state.mcuPageSize===sz?'selected':''}>${sz==='all'?'همه':num(sz)}</option>`).join('')}</select></div><span class="page-total">${state.mcuPageSize==='all'?'همه عناوین':num(page+1)+' از '+num(pages)+' صفحه'}</span></div></div>
 <div id="archive-results" class="${state.mcuView==='grid'?'poster-grid':'compact-list'}">${mcuResultCards(paged,page,size)}</div>
 ${paginationHTML(page,pages,visible.length)}
 <p class="footnote">خط زمانی، ترتیب تقریبی وقوع رویدادهاست؛ مسیرهای پیوستگی روایی انتخاب سردبیری‌اند و لزوماً فهرست رسمی مارول نیستند. تیک‌ها بین هر سه حالت مشترک‌اند. زمان سریال‌ها تقریبی است.</p>`}

/* Release time, not story chronology. Upcoming records never alter watch progress. */
let releaseFilter='all',releaseType='all',releaseYear='all';
const releaseMonths=['ژانویه','فوریه','مارس','آوریل','مه','ژوئن','ژوئیه','اوت','سپتامبر','اکتبر','نوامبر','دسامبر'];
const releaseDateText=r=>{const [y,m,d]=r.date.split('-').map(Number);return r.precision==='halloween'?'حوالی هالووین '+formatYear(y):r.precision==='year'?formatYear(y):[d?num(d):'',releaseMonths[m-1],formatYear(y)].filter(Boolean).join(' ')};
const releaseKind=r=>({movie:'فیلم سینمایی',series:'سریال',animation:'انیمیشن',special:'ویژه‌برنامه'})[r.type];
function releaseRecords(){
 const existing=MCU.map(f=>({id:f.id,title:f.title,fa:f.fa,date:f.release,precision:'day',type:isAnimation(f)?'animation':f.type,phase:f.phase,status:'released',catalog:f}));
 return [...existing,...RELEASE_CALENDAR_EXTRA.filter(r=>!existing.some(f=>f.id===r.id)).map(r=>({...r,catalog:r.variantOf?BY_ID[r.variantOf]:undefined}))];
}
const releaseSortKey=r=>r.precision==='day'?r.date:r.precision==='halloween'?r.date+'-31':r.precision==='year'?r.date+'-99-99':r.date+'-99';
const releaseSorted=(a,b)=>releaseSortKey(a).localeCompare(releaseSortKey(b))||a.title.localeCompare(b.title);
function releaseRow(r){
 const planned=r.status==='planned';
 const visual=r.catalog?poster(r.catalog):'<div class="release-placeholder" aria-hidden="true">'+ico(r.type==='movie'?'film':r.type==='animation'?'spark':'monitor',25)+'</div>';
 const title=r.catalog?'<a class="release-title" href="#title/'+encodeURIComponent(r.variantOf||r.id)+'" dir="auto">'+esc(r.title)+'</a>':'<strong class="release-title" dir="auto">'+esc(r.title)+'</strong>';
 const source=r.source?'<a class="release-source" href="'+esc(r.source)+'" target="_blank" rel="noopener noreferrer">'+ico('external',13)+' منبع اعلام</a>':'';
 return `<article class="release-entry ${planned?'release-planned':''}" data-release-id="${esc(r.id)}"><div class="release-date"><time datetime="${esc(r.date)}">${releaseDateText(r)}</time><small>${r.precision==='day'?(planned?'تاریخ اعلام‌شده':'تاریخ انتشار'):'بازه اعلام‌شده'}</small></div><div class="release-dot"></div><div class="release-card">${visual}<div class="release-copy"><div class="release-meta"><span>${releaseKind(r)}</span>${r.phase?'<span>فاز '+num(r.phase)+'</span>':''}<span class="release-status ${planned?'future':'past'}">${planned?'برنامه‌ریزی‌شده':r.variantOf?'انتشار مجدد':'منتشرشده'}</span></div>${title}<span class="release-fa">${esc(r.fa)}</span>${r.note?'<small class="release-note">'+esc(r.note)+'</small>':''}</div>${source}</div></article>`;
}
function timelinePage(){
 const all=releaseRecords(),future=all.filter(r=>r.status==='planned').sort(releaseSorted),past=all.filter(r=>r.status==='released').sort((a,b)=>releaseSorted(b,a)),next=future.find(r=>r.precision==='day'&&r.date>=new Date().toISOString().slice(0,10));
 const filtered=r=>(releaseType==='all'||r.type===releaseType)&&(releaseYear==='all'||r.date.slice(0,4)===releaseYear);
 const years=[...new Set(all.map(r=>r.date.slice(0,4)))].sort((a,b)=>b.localeCompare(a));
 const group=(items,heading)=>{const y=[...new Set(items.map(r=>r.date.slice(0,4)))];return items.length?`<section class="release-section"><div class="section-head"><h2>${heading}</h2><span class="section-count">${num(items.length)} رکورد انتشار</span></div>${y.map(year=>`<section class="release-year"><h3>${formatYear(year)}</h3><div class="release-track">${items.filter(r=>r.date.startsWith(year)).map(releaseRow).join('')}</div></section>`).join('')}</section>`:''};
 const f=releaseFilter==='released'?[]:future.filter(filtered),p=releaseFilter==='planned'?[]:past.filter(filtered);
 return `<div class="page-intro"><span class="page-kicker">MARVEL RELEASE CALENDAR</span><h1>خط زمانی <em>انتشار</em></h1><p>از نخستین فیلم MCU تا برنامه‌های اعلام‌شده آینده؛ بر اساس زمان انتشار، نه ترتیب رویدادهای داستان.</p></div>
 <section class="release-hero"><div><span class="cinema-kicker">NEXT CONFIRMED DATE</span><h2>${next?esc(next.title):'فعلا تاریخ آینده‌ای ثبت نشده'}</h2>${next?`<p>${esc(next.fa)} · ${releaseDateText(next)} · ${releaseKind(next)}</p>`:''}<p class="release-checked">آخرین بررسی منابع: ${releaseDateText({date:RELEASE_CALENDAR_CHECKED,precision:'day'})}</p></div><div class="release-stats"><div><strong>${num(past.filter(r=>!r.variantOf).length)}</strong><span>آثار منتشرشده</span></div><div><strong>${num(future.length)}</strong><span>در تقویم آینده</span></div><div><strong>${num(past.filter(r=>r.variantOf).length)}</strong><span>نسخه تکمیلی / اکران مجدد</span></div></div></section>
 <div class="release-controls"><div class="filter-tabs" role="group" aria-label="وضعیت انتشار">${[['all','همه'],['planned','آثار آینده'],['released','منتشرشده']].map(([id,label])=>`<button class="filter-tab ${releaseFilter===id?'selected':''}" data-action="release-filter" data-value="${id}" aria-pressed="${releaseFilter===id}">${label}</button>`).join('')}</div><label>نوع اثر<select id="release-type">${[['all','همه آثار'],['movie','فیلم‌ها'],['series','سریال‌ها'],['animation','انیمیشن‌ها'],['special','ویژه‌برنامه‌ها']].map(([v,l])=>`<option value="${v}" ${releaseType===v?'selected':''}>${l}</option>`).join('')}</select></label><label>سال<select id="release-year"><option value="all">همه سال‌ها</option>${years.map(y=>`<option value="${y}" ${releaseYear===y?'selected':''}>${formatYear(y)}</option>`).join('')}</select></label></div>
 <p class="release-disclaimer">تاریخ آغاز انتشار، مبنای مرتب‌سازی است؛ برای آثار آینده تاریخ‌ها ممکن است تغییر کنند. عنوان‌هایی که فقط سال انتشارشان اعلام شده، در انتهای گروه همان سال آمده‌اند. آثار فقط با تاریخ یا بازه اعلام‌شده وارد تقویم شده‌اند. عناوین مرتبط Marvel Animation نیز با نوع اثر مشخص شده‌اند. تاریخ‌های سینمایی بر مبنای اکران آمریکا هستند.</p>
 ${group(f,'در راه مارول')}${group(p,'تاریخچه انتشار')}${!f.length&&!p.length?empty('فیلتر نوع اثر یا سال را تغییر بده.'):''}
 <p class="footnote">تاریخچه آثار از همان آرشیو اصلی ساخته می‌شود. نسخه‌های تکمیلی به‌عنوان رویداد انتشار نمایش داده می‌شوند و در تعداد آثار مستقل و پیشرفت تماشا دوباره به حساب نمی‌آیند. آثار آینده تا زمان انتشار به آمار تماشا اضافه نمی‌شوند.</p>`;
}
function watchlistPage(){const a=state.saved.doomsday.filter(id=>BY_ID[id]),b=state.saved.mcu.filter(id=>BY_ID[id]);const r=stats(a),m=stats(b);return `<div class="page-intro"><div class="page-kicker">YOUR COLLECTION <span class="accent-slash">/</span> ذخیره‌شده‌ها</div><h1>واچ‌لیست <em>من</em></h1><p>آثاری که برای بعد کنار گذاشتی؛ واچ‌لیست Doomsday و آرشیو MCU مستقل هستند.</p></div><div class="watch-summary">${metric('bookmark','در لیست Doomsday',num(a.length),'باقی‌مانده: '+num(r.pending))}${metric('layers','در لیست MCU',num(b.length),'باقی‌مانده: '+num(m.pending))}${metric('clock','زمان لیست‌ها',duration(r.remaining+m.remaining),'تخمین مستقل هر لیست')}</div>${sectionTitle('واچ‌لیست Doomsday','آثار نشان‌گذاری‌شده در مسیر اصلی.')}<div class="route-list">${a.length?a.map((id,i)=>filmRow(BY_ID[id],i+1,'doomsday')).join(''):empty('هنوز موردی از مسیر Doomsday نشان‌گذاری نکردی.')}</div>${sectionTitle('واچ‌لیست MCU','فیلم‌ها و سریال‌های انتخابی از آرشیو.')}<div class="route-list">${b.length?b.map((id,i)=>filmRow(BY_ID[id],i+1,'mcu')).join(''):empty('از آرشیو MCU روی آیکن نشانک بزن تا اینجا اضافه بشه.')}</div>`}
function empty(m,title='موردی پیدا نشد'){return `<div class="empty" role="status"><span aria-hidden="true">${ico('search',28)}</span><b>${esc(title)}</b><p>${esc(m)}</p></div>`}
/* v2.6: Film detail follows the Figma film-page composition: full-height poster, contextual backdrop, editorial content, and episode-first progress. */
function titleExternalLinks(f){
 const query=f.title+' '+f.year;
 const google='https://www.google.com/search?q='+encodeURIComponent(query);
 const marvelSearch='https://www.marvel.com/search?query='+encodeURIComponent(f.title.split(' — Season')[0]);
 const source=OFFICIAL_TITLE_LINKS[f.id];
 const disneyPress={falcon:'https://press.disneyplus.com/media-kits/the-falcon-and-the-winter-soldier',wandavision:'https://press.disneyplus.com/media-kits/wandavision'};
 const disneySource=source?.label.startsWith('Disney')?source.url:disneyPress[f.id];
 const a=(url,label,icon)=>'<a href="'+esc(url)+'" target="_blank" rel="noopener noreferrer" class="title-external-link">'+ico(icon,16)+'<span>'+esc(label)+'</span><svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M7 17 17 7M7 7h10v10"/></svg></a>';
 return '<nav class="title-external-links" aria-label="لینک‌های رسمی و جستجو">'+a(google,'جستجو در گوگل','search')+a(source?.label==='Marvel'?source.url:marvelSearch,source?.label==='Marvel'?'صفحه رسمی مارول':'جستجو در مارول','film')+a(disneySource||'https://www.disneyplus.com/',disneySource?'صفحه رسمی دیزنی':'وب‌سایت دیزنی+','film')+(source&&!source.label.startsWith('Disney')&&source.label!=='Marvel'?a(source.url,'صفحه رسمی '+source.label,'film'):'')+'</nav>';
}
function cinemaBackdropUrl(f){
  const backup=POSTER_BACKUPS[f.id]||'';
  if(backup.includes('/images/posters/'))return backup.replace('/images/posters/','/images/backdrops/');
  // The poster remains the visible fallback when no landscape artwork is available.
  return posterUrl(f);
}
function cinemaHero(f,inDoom,inMcu){
 const watched=done(f),pct=Math.round(fraction(f)*100), next=f.episodes?Array.from({length:f.episodes},(_,i)=>i+1).find(n=>!getEpisodes(f).includes(n)):null;
 const tag=f.universe==='fox'?'FOX UNIVERSE':f.universe==='mcu'?'MARVEL CINEMATIC UNIVERSE':'MARVEL STORIES';
 const remaining=duration(Math.max(0, Math.round((f.minutes||0)*(1-fraction(f)))));
 const savedScope=inDoom?'doomsday':'mcu',isSaved=state.saved[savedScope]?.includes(f.id);
 return `<div class="film-hero-wrap">
   <a class="film-backlink" href="#${detailOrigin}">${ico('back',17)} بازگشت به ${esc(pageNames[detailOrigin]||'آرشیو MCU')}</a>
   <section class="cinema-hero p-${esc(f.palette)}" aria-label="اطلاعات ${esc(f.fa)}">
    <div class="cinema-cover-pane">${poster(f,'cinema-cover')}<div class="cinema-cover-edge"></div></div>
    <div class="cinema-story-pane">
      <div class="cinema-background" aria-hidden="true">
        <div class="cinema-colorwash"></div>
        <img class="cinema-blur-poster poster-image" data-poster-id="${esc(f.id)}" src="${esc(posterUrl(f))}" alt="" loading="eager" referrerpolicy="no-referrer" />
        <img class="cinema-backdrop-img" src="${esc(cinemaBackdropUrl(f))}" alt="" loading="eager" referrerpolicy="no-referrer" onerror="this.remove()"/>
        <div class="cinema-scrim"></div>
      </div>
      <div class="cinema-story-content">
        <div class="cinema-pretitle"><span class="cinema-live-dot"></span><span dir="ltr">${tag}</span><span class="cinema-separator">/</span>${formatYear(f.year)}</div>
        <h1 class="cinema-title" dir="ltr" lang="en">${esc(f.title)}</h1>
        <h2 class="cinema-subtitle">${esc(f.fa)}</h2>
        <div class="cinema-facts" aria-label="مشخصات اثر"><span>${ico('film',15)} ${kind(f)}</span><span>${ico('clock',15)} ${duration(f.minutes)}</span>${f.episodes?`<span>${ico('layers',15)} ${num(f.episodes)} قسمت</span>`:''}<span>${phaseLabel(f)}</span></div>
        <div class="cinema-story-chips"><span>اکشن</span><span>ماجراجویی</span><span>${isAnimation(f)?'انیمیشن':f.universe==='fox'?'مردان ایکس':'جهان مارول'}</span></div>
        <p class="cinema-overview">${esc(META[f.id]?.summary||'داستان این اثر از جهان مارول را دنبال کن و پیشرفت تماشای خودت را ثبت کن.')}</p>
        <div class="cinema-hero-actions">
          <button type="button" class="cinema-primary-action" data-action="detail-jump" data-value="watch-progress">${ico('play',17)} ${watched?'مشاهده پیشرفت':'ادامه تماشا و ثبت پیشرفت'}</button>
          <button type="button" class="cinema-ghost-action ${isSaved?'cinema-ghost-selected':''}" data-action="toggle-save" data-id="${esc(f.id)}" data-scope="${savedScope}">${ico('bookmark',18)} ${isSaved?'در واچ‌لیست':'افزودن به واچ‌لیست'}</button>
        </div>
      </div>
      <div class="cinema-watch-metrics"><div><span>پیشرفت تو</span><strong>${num(pct)}<small>٪</small></strong></div><div><span>${f.episodes?'قسمت بعدی':'زمان باقی‌مانده'}</span><strong class="cinema-small-metric">${f.episodes?(next?'قسمت '+num(next):'تمام شده'):watched?'تمام شده':remaining}</strong></div></div>
    </div>
   </section>
 </div>`
}
function detailPage(id){
 const f=BY_ID[id];if(!f)return `<div class="not-found"><h1>این عنوان پیدا نشد</h1><a href="#mcu" class="btn btn-primary">بازگشت به آرشیو</a></div>`;
 const inDoom=DOOMSDAY.includes(id),inMcu=MCU.some(x=>x.id===id);
 const relatives=FILMS.filter(x=>x.id!==id&&((f.sigil.length>1&&x.sigil===f.sigil)||(f.title.split(':')[0]===x.title.split(':')[0]&&f.title.includes(':')))).slice(0,5);
 const ep=f.episodes?Array.from({length:f.episodes},(_,i)=>i+1):[];
 const watched=done(f),pct=Math.round(fraction(f)*100),count=getEpisodes(f).length;
 const next=f.episodes?ep.find(n=>!getEpisodes(f).includes(n)):null;
 return `<div class="film-detail-page">
   ${cinemaHero(f,inDoom,inMcu)}
   <nav class="cinema-section-nav" data-title-nav="${esc(id)}" aria-label="بخش‌های صفحه اثر">
     <button type="button" class="active" aria-current="true" data-action="detail-jump" data-value="watch-progress">${ico('play',15)} پیگیری تماشا <span>${num(pct)}٪</span></button>
     <button type="button" data-action="detail-jump" data-value="story-info">${ico('info',15)} داستان و اطلاعات</button>
     <button type="button" data-action="detail-jump" data-value="my-notes">${ico('bookmark',15)} یادداشت‌های من</button>
     <button type="button" data-action="detail-jump" data-value="title-cast">${ico('grid',15)} بازیگران</button>
     ${relatives.length?`<button type="button" data-action="detail-jump" data-value="related-titles">${ico('layers',15)} آثار مرتبط</button>`:''}
   </nav>
   <div class="cinema-detail-layout">
     <main class="cinema-main-column">
       <section class="cinema-panel cinema-progress-section" id="watch-progress">
         <header class="cinema-section-head"><div><span class="cinema-kicker">YOUR WATCH JOURNEY</span><h2>${f.episodes?'قسمت‌های این فصل':'پیشرفت تماشای فیلم'}</h2><p>${f.episodes?'هر قسمت را مستقل ثبت کن؛ جای توقف تماشا همیشه حفظ می‌شود.':'زمانی که از فیلم دیدی را مشخص کن؛ مقدار به‌صورت خودکار ذخیره می‌شود.'}</p></div><div class="cinema-progress-big">${num(pct)}<small>٪</small></div></header>
         <div class="cinema-progress-track" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100" aria-label="پیشرفت تماشا"><span style="width:${pct}%"></span></div>
         <div class="cinema-progress-meta"><span>${f.episodes?`${num(count)} از ${num(f.episodes)} قسمت`:`${duration(state.progress[f.id]||0)} دیده شده`}</span><span>${watched?'تماشا کامل شده':f.episodes?(next?'شروع از قسمت '+num(next):''):'از '+duration(f.minutes)}</span></div>
         ${f.episodes?`<div class="cinema-episodes-toolbar"><h3>فهرست قسمت‌ها</h3><div><button class="small-btn" data-action="all-episodes" data-id="${esc(id)}" data-value="all">تیک همه</button><button class="small-btn" data-action="all-episodes" data-id="${esc(id)}" data-value="none">پاک‌کردن</button></div></div><div class="cinema-episode-grid">${ep.map(n=>episodeCard(f,n)).join('')}</div>`:
         `<div class="movie-slider cinema-movie-slider"><div class="slider-readout"><span>زمان تماشاشده</span><strong id="slider-value">${f.minutes==null?(watched?'کامل':'ثبت نشده'):duration(state.progress[f.id]||0)}</strong></div><input type="range" id="movie-range" data-id="${esc(f.id)}" min="0" max="${maxVal(f)}" step="1" value="${state.progress[f.id]||0}" aria-label="دقیقه‌های دیده‌شده"/><div class="range-ends"><span>شروع</span><span>${duration(f.minutes)}</span></div></div>`}
         <div class="cinema-progress-foot"><button class="btn ${watched?'btn-outline':'btn-primary'}" data-action="toggle-done" data-id="${esc(id)}">${ico('check',16)} ${watched?'لغو وضعیت دیده‌شده':'ثبت تماشای کامل'}</button><span>پیشرفت به‌صورت محلی در مرورگرت ذخیره می‌شود.</span></div>
       </section>
       <section class="cinema-panel cinema-story-section" id="story-info"><div class="cinema-section-head"><div><span class="cinema-kicker">THE STORY BEHIND IT</span><h2>درباره ${esc(f.fa)}</h2></div></div><p>${esc(META[id]?.summary||titleMetadata(id)?.overviewFa||'')}</p>${titleMetadata(id)?.sourceMismatch?'<p class="meta-source">فراداده این اثر با عنوان دیگری تطبیق داده شده و نیاز به بازبینی دارد.</p>':titleMetadata(id)?.overviewFa?`<p class="original-plot" lang="fa" dir="rtl"><strong>خلاصه داستان (ترجمه فارسی منبع):</strong> ${esc(titleMetadata(id).overviewFa)}</p>`:titleMetadata(id)?.overview?`<details class="untranslated-source"><summary>خلاصه منبع به زبان اصلی (ترجمه نشده)</summary><p lang="en" dir="ltr">${esc(titleMetadata(id).overview)}</p></details>`:''}${titleMetadata(id)?.source?`<div class="meta-source">برگرفته از ${titleMetadata(id).sourceUrl?`<a href="${esc(titleMetadata(id).sourceUrl)}" target="_blank" rel="noopener">${esc(titleMetadata(id).source)}</a>`:esc(titleMetadata(id).source)} · آخرین دریافت: ${esc((titleMetadata(id).fetchedAt||'').slice(0,10))}</div>`:''}${META[id]?.focus?`<div class="focus-note"><div>${ico('spark',18)} <strong>هنگام تماشا به چی توجه کنم؟</strong></div><p>${esc(META[id].focus)}</p></div>`:''}<div class="detail-tags">${inDoom?'<span>پیش‌نیاز Doomsday</span>':''}${OFFICIAL.has(id)?'<span>منتخب دیزنی+</span>':''}${isAnimation(f)?'<span>انیمیشن</span>':''}${f.universe==='fox'?'<span>جهان مردان ایکس</span>':''}</div></section>
     </main>
     <aside class="cinema-aside-column">
       <section class="cinema-panel cinema-notes-panel" id="my-notes"><span class="cinema-kicker">MY WATCH JOURNAL</span><h3>یادداشت‌های من</h3><p>نکته‌های داستان و شخصیت‌ها را برای مراجعه بعدی یادداشت کن.</p><textarea id="detail-notes" data-id="${esc(id)}" rows="6" maxlength="2500" placeholder="اینجا بنویس...">${esc(state.notes[id]||'')}</textarea><button class="btn btn-outline" data-action="save-note" data-id="${esc(id)}">${ico('check',15)} ذخیره یادداشت</button></section>
       ${id==='endgame'?`<section class="cinema-panel encore-info"><span class="cinema-kicker">EXTENDED EDITION / 2026</span><h3>Avengers Endgame: Encore</h3><p>نسخه تکمیلی با حدود چهار دقیقه صحنه تازه مرتبط با Doomsday و اصلاح رنگ.</p><dl><div><dt>مدت نسخه</dt><dd>${duration(185)}</dd></div><div><dt>اکران مجدد</dt><dd>۲۵ سپتامبر ۲۰۲۶</dd></div><div><dt>Disney+</dt><dd>۱۳ نوامبر ۲۰۲۶</dd></div></dl><p>این نسخه همان فیلم ۲۰۱۹ است و آمار تماشای فیلم را دو بار محاسبه نمی‌کند.</p><a class="btn btn-outline" href="https://www.disneyplus.com/explore/articles/avengers-endgame-encore" target="_blank" rel="noopener noreferrer">اطلاعات رسمی نسخه ${ico('external',14)}</a></section>`:''}
       <div class="cinema-facts-group"><section class="cinema-panel cinema-facts-panel"><span class="cinema-kicker">FILM INFORMATION</span><h3>شناسنامه اثر</h3><dl><div><dt>سال انتشار</dt><dd>${formatYear(f.year)}</dd></div><div><dt>نوع اثر</dt><dd>${kind(f)}</dd></div><div><dt>مدت</dt><dd>${duration(f.minutes)}</dd></div><div><dt>جهان</dt><dd>${f.universe==='mcu'?'MCU':f.universe==='fox'?'FOX / X-Men':f.universe==='animation'?'Marvel Animation / جهان موازی':'Marvel'}</dd></div></dl></section>
       ${titleExternalLinks(f)}
       </div>
     </aside>
   </div>
   ${castSection(f)}
   ${relatives.length?`<section class="cinema-related" id="related-titles"><div class="cinema-section-head"><div><span class="cinema-kicker">KEEP EXPLORING</span><h2>داستان‌های مرتبط</h2><p>برای ادامه این مسیر، این عنوان‌ها را هم بررسی کن.</p></div></div><div class="poster-grid related-grid">${relatives.map(r=>filmCard(r,0,r.universe==='fox'?'doomsday':'mcu')).join('')}</div></section>`:''}
 </div>`;
}
function episodeCard(f,n){return episodeDisplay(f,n)}
function settingsPage(){return `<div class="page-intro"><div class="page-kicker">YOUR DATA <span class="accent-slash">/</span> تنظیمات</div><h1>اطلاعات <em>تماشا</em></h1><p>داده‌ها روی همین مرورگر ذخیره می‌شن و برای انتقالشون می‌تونی نسخه پشتیبان بگیری.</p></div><div class="settings-grid"><article class="setting-tile"><span>${ico('download',23)}</span><h3>دریافت پشتیبان</h3><p>پیشرفت دقیق قسمت‌ها، یادداشت‌ها، پوسترهای شخصی و واچ‌لیست‌ها رو به فایل JSON تبدیل کن.</p><button class="btn btn-primary" data-action="export">${ico('download',16)} دانلود پشتیبان</button></article><article class="setting-tile"><span>${ico('upload',23)}</span><h3>بازیابی از فایل</h3><p>از یک دستگاه یا مرورگر دیگه داده‌هات رو وارد کن؛ فایل نسخه قبلی هم پشتیبانی می‌شه.</p><button class="btn btn-outline" data-action="import">${ico('upload',16)} انتخاب فایل</button><input hidden id="import-file" type="file" accept="application/json,.json"/></article><article class="setting-tile"><span>${ico('spark',23)}</span><h3>ظاهر برنامه</h3><p>رنگ‌بندی پنل رو تغییر بده. حالت سینمایی تیره برای پوسترها پیشنهاد می‌شه.</p><button class="btn btn-outline" data-action="theme">${state.theme==='dark'?'نمای روشن':'نمای تیره'}</button></article><article class="setting-tile"><span>${ico('settings',23)}</span><h3>بازگردانی اطلاعات اولیه</h3><p>پیشرفت، یادداشت‌ها و واچ‌لیست‌ها پاک می‌شن و از ابتدا شروع می‌کنی.</p><button class="btn btn-danger" data-action="reset">بازنشانی اطلاعات</button></article></div><div class="setting-footnote slim"><h3>اعتبار داده و تصاویر</h3><p>منبع پوسترها و اطلاعات تکمیلی از TMDB و آرشیوهای عمومی است. این محصول رسمی Marvel یا TMDB نیست.</p><div class="credit-pills"><a class="credit-pill" href="https://www.themoviedb.org/" target="_blank" rel="noopener">TMDB</a><a class="credit-pill" href="https://developer.themoviedb.org/docs/faq" target="_blank" rel="noopener">شرایط استفاده از تصاویر</a></div></div>`}
function adminDashboard(){
 const coverCount=Object.keys(localPosterManifest).length;
 const metaStatus=information.status||{};
 const people=metaStatus.people||0;
 const ready=metaStatus.ready||0;
 const missing=metaStatus.peopleMissingPhotos||0;
 return `<div class="page-intro"><div class="page-kicker">MARVEL PATH / LOCAL ADMIN</div><h1>مرکز <em>مدیریت سیستم</em></h1><p>کاتالوگ آثار و تصاویر را از این پنل مدیریت کن. واچ‌لیست و پیشرفت تماشا در پنل کاربری باقی می‌مانند.</p></div>
 <div class="admin-overview"><div><span>کاورهای ذخیره‌شده</span><strong>${num(coverCount)} <small>از ${num(FILMS.length)}</small></strong><div class="thin-meter"><i style="width:${FILMS.length?100*coverCount/FILMS.length:0}%"></i></div></div><div><span>آثار دارای فراداده</span><strong>${num(ready)} <small>از ${num(FILMS.length)}</small></strong><div class="thin-meter"><i style="width:${FILMS.length?100*ready/FILMS.length:0}%"></i></div></div><div><span>بازیگران ثبت‌شده</span><strong>${num(people)}</strong><small>${num(missing)} عکس ناقص</small></div></div>
 <div class="admin-module-grid"><a class="admin-module" href="#posters"><span class="admin-module-icon">${ico('film',27)}</span><div><small>POSTER VAULT</small><h2>مدیریت کاورها</h2><p>دریافت گروهی کاورها، آپلود، جایگزینی و حذف تصویرهای ذخیره‌شده در لپ‌تاپ.</p></div><span class="admin-module-arrow">${ico('arrow',20)}</span></a>
 <a class="admin-module" href="#metadata"><span class="admin-module-icon">${ico('layers',27)}</span><div><small>METADATA LIBRARY</small><h2>مدیریت اطلاعات آثار</h2><p>تنظیم TMDB، دریافت داستان و مشخصات فیلم‌ها، بازیگران و قسمت‌های سریال.</p></div><span class="admin-module-arrow">${ico('arrow',20)}</span></a>
 <a class="admin-module" href="#people"><span class="admin-module-icon">${ico('users',27)}</span><div><small>PEOPLE DIRECTORY</small><h2>مدیریت بازیگران</h2><p>پروفایل هر بازیگر، بازیابی عکس، شناسه TMDB و ارتباط نقش‌ها با آثار.</p></div><span class="admin-module-arrow">${ico('arrow',20)}</span></a></div>
 <div class="admin-notice">${ico('info',18)} ویرایش‌ها در پوشه پروژه روی دیسک ذخیره می‌شوند؛ پیشرفت تماشای کاربر دست‌نخورده می‌ماند.</div>`;
}
function adminAccessPage(){
 if(!posterAdmin.available)return `<div class="admin-login-screen"><div class="admin-login-mark">${ico('layers',32)}</div><h1>ورود به مدیریت مارول</h1><p>در حال بررسی اتصال به سرور محلی…</p><div class="admin-login-hint">برای مدیریت، برنامه را با <code>START-MAC.command</code> یا <code>START-WINDOWS.bat</code> اجرا کن.</div></div>`;
 return `<div class="admin-login-screen"><div class="admin-login-mark">${ico('settings',32)}</div><span class="page-kicker">ADMINISTRATION / LOCAL ONLY</span><h1>مدیریت Marvel Path</h1><p>این بخش از پنل تماشای کاربر جداست. کد مدیر را از پنجره ترمینالی که سرور را اجرا کردی بردار.</p><form id="vault-login-form" class="vault-login-row admin-login-form"><label class="sr-only" for="vault-admin-token">کد دسترسی مدیر</label><input id="vault-admin-token" type="password" autocomplete="off" spellcheck="false" placeholder="کد دسترسی مدیر" required><button class="btn btn-primary" type="submit">ورود مدیر</button></form>${posterAdmin.loginError?`<p class="vault-error">${esc(posterAdmin.loginError)}</p>`:''}<div class="admin-login-hint">کد مدیریت در مرورگر نمایش داده نمی‌شود. آدرس این صفحه فقط روی رایانه محلی قابل دسترسی است.</div><a href="/" class="small-btn">${ico('back',15)} بازگشت به پنل تماشا</a></div>`;
}
function adminShell(body,title){const nav=[['dashboard','داشبورد مدیریت','grid'],['posters','مدیریت کاورها','film'],['metadata','اطلاعات آثار','layers'],['people','بازیگران','users']];const current=activePage().name;return `<div class="app-shell admin-app"><aside class="sidebar"><a class="logo" href="#dashboard"><span class="logo-mark">M<span>／</span></span><span class="logo-name"><b>مدیریت مارول</b><small>ADMIN CONSOLE</small></span></a><div class="nav-caption">${posterAdmin.authorized?'ابزارهای مدیر':'ورود مدیر'}</div>${posterAdmin.authorized?`<nav class="nav-column" aria-label="منوی مدیریت">${nav.map(([k,name,ic])=>`<a class="nav-link ${current===k?'active':''}" href="#${k}">${ico(ic,19)}<span>${name}</span></a>`).join('')}</nav>`:''}<div class="sidebar-spacer"></div><a class="admin-viewer-link" href="/">${ico('external',18)} <span>مشاهده پنل کاربری</span></a><div class="sidebar-end">MARVEL PATH <span> / </span> ADMIN</div></aside><div class="workspace"><header class="topbar"><div class="mobile-logo"><span class="mini-m">M</span>مدیریت مارول</div><div class="breadcrumb">SYSTEM / <b>${esc(title)}</b></div><div class="top-actions"><button type="button" class="mp-search-launch" data-global-search aria-label="جستجوی سراسری" aria-keyshortcuts="Meta+K Control+K">${ico('search',18)}<span>جستجو</span><kbd class="mp-search-hint"></kbd></button><span class="local-dot"></span><span class="storage-label">سرور محلی</span>${posterAdmin.authorized?`<button type="button" class="admin-signout" data-admin-action="logout">خروج مدیر</button>`:''}</div></header><main id="main-content" class="main-content">${body}</main><footer class="main-footer">پنل مدیریت محلی · فقط برای مدیریت رسانه‌ها و اطلاعات آثار · فایل‌های شخصی تماشا مستقل باقی می‌مانند</footer></div>${posterAdmin.authorized?`<nav class="mobile-nav" aria-label="ناوبری مدیریت">${nav.map(([k,name,ic])=>`<a class="nav-link ${current===k?'active':''}" href="#${k}">${ico(ic,19)}<span>${name}</span></a>`).join('')}</nav>`:''}</div>`}
function activePage(){
 let h='';try{h=decodeURIComponent(location.hash.replace(/^#/,''))}catch(_){h=''};
 if(ADMIN_MODE){if(h.startsWith('person/'))return {name:'person',id:h.slice(7)};return {name:['dashboard','posters','metadata','people'].includes(h)?h:'dashboard'}}
 if(h.startsWith('title/'))return {name:'title',id:h.slice(6)};
 if(h.startsWith('person/'))return {name:'person',id:h.slice(7)};
 return {name:['doomsday','mcu','timeline','watchlist','people','settings'].includes(h)?h:'doomsday'};
}
function selectDetailSection(nav,value){
 if(!nav)return;
 for(const b of nav.querySelectorAll('button[data-action="detail-jump"]')){
  const active=b.dataset.value===value;b.classList.toggle('active',active);
  if(active)b.setAttribute('aria-current','true');else b.removeAttribute('aria-current');
 }
}
function jumpToDetailSection(value){
 const target=document.getElementById(value),nav=document.querySelector('.cinema-section-nav');if(!target||!nav)return;
 selectDetailSection(nav,value);
 const selected=nav.querySelector('button.active');
 if(selected){
  const r=selected.getBoundingClientRect(),n=nav.getBoundingClientRect();
  if(r.left<n.left)nav.scrollBy({left:r.left-n.left-8,behavior:'instant'});
  else if(r.right>n.right)nav.scrollBy({left:r.right-n.right+8,behavior:'instant'});
 }
 const header=document.querySelector('.topbar'),offset=(header?.getBoundingClientRect().height||0)+nav.getBoundingClientRect().height+12;
 window.scrollTo({top:Math.max(0,window.scrollY+target.getBoundingClientRect().top-offset),behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
}
function render(){
 const p=activePage();document.documentElement.dataset.theme=state.theme;
 const oldNav=document.querySelector('.cinema-section-nav');
 const previous=oldNav&&p.name==='title'&&oldNav.dataset.titleNav===p.id?{value:oldNav.querySelector('.active')?.dataset.value,scroll:oldNav.scrollLeft}:null;
 let body,title;
 if(ADMIN_MODE){
   if(!posterAdmin.authorized){body=adminAccessPage();title='ورود مدیر'}
   else if(p.name==='posters'){body=adminPage();title='مدیریت کاورها'}
   else if(p.name==='metadata'){body=metadataAdminPage();title='اطلاعات آثار'}
   else if(p.name==='people'){body=peoplePage();title='مدیریت بازیگران'}
   else if(p.name==='person'){body=personPage(p.id);title='اطلاعات بازیگر'}
   else{body=adminDashboard();title='مرکز مدیریت'}
 }else{
   if(p.name==='title'){body=detailPage(p.id);title=BY_ID[p.id]?.fa||'جزئیات اثر'}
   else if(p.name==='person'){body=personPage(p.id);title='پروفایل بازیگر'}
   else if(p.name==='people'){body=peoplePage();title='بازیگران'}
   else if(p.name==='mcu'){body=mcuPage();title='آرشیو MCU'}
   else if(p.name==='timeline'){body=timelinePage();title='خط زمانی انتشار'}
   else if(p.name==='watchlist'){body=watchlistPage();title='واچ‌لیست من'}
   else if(p.name==='settings'){body=settingsPage();title='تنظیمات'}
   else{body=doomsdayPage();title='مسیر Doomsday'}
 }
 document.getElementById('app').innerHTML=ADMIN_MODE?adminShell(body,title):shell(body,title);
 if(previous){const nav=document.querySelector('.cinema-section-nav');if(nav){if(previous.value)selectDetailSection(nav,previous.value);nav.scrollLeft=previous.scroll;}}
 document.title=`${title} | مسیر مارول`;
 document.querySelectorAll('.poster-image').forEach(img=>{if(img.complete&&!img.naturalWidth)img.classList.add('broken')});
 if(typeof loadInfoForPage==='function')setTimeout(()=>loadInfoForPage(p),0);
}
function goHash(){const p=activePage();if(p.name==='title'){const ref=document.referrer; /* origin stays last main page visited */}else detailOrigin=p.name;render();window.scrollTo({top:0,behavior:'instant'})}
window.addEventListener('hashchange',goHash);
function setComplete(f,full){if(f.episodes)state.episodes[f.id]=full?Array.from({length:f.episodes},(_,i)=>i+1):[];else state.progress[f.id]=full?maxVal(f):0;if(full)delete state.watching[f.id];else delete state.watching[f.id];save();render();toast(full?'به‌عنوان دیده‌شده ثبت شد.':'وضعیت تماشا پاک شد.')}
function toggleEp(f,n){const old=new Set(getEpisodes(f));if(old.has(n))old.delete(n);else old.add(n);state.episodes[f.id]=[...old].sort((a,b)=>a-b);state.watching[f.id]=old.size>0&&old.size<f.episodes;if(old.size===f.episodes)delete state.watching[f.id];save();render();toast(`قسمت ${num(n)} ${old.has(n)?'دیده شد.':'از تماشا حذف شد.'}`)}
function toggleSave(f,scope){if(!['mcu','doomsday'].includes(scope))return;const s=new Set(state.saved[scope]);if(s.has(f.id))s.delete(f.id);else s.add(f.id);state.saved[scope]=[...s];save();render();toast(s.has(f.id)?'به واچ‌لیست اضافه شد.':'از واچ‌لیست حذف شد.')}
function exportState(){const data={version:2,exportedAt:new Date().toISOString(),...state};const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json;charset=utf-8'});const href=URL.createObjectURL(blob),a=document.createElement('a');a.href=href;a.download='marvel-path-backup-'+new Date().toISOString().slice(0,10)+'.json';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(href),2000);toast('فایل پشتیبان دریافت شد.')}
async function importState(file){try{const data=JSON.parse(await file.text());if(!data||!data.progress||typeof data.progress!=='object'||![1,2].includes(data.version))throw Error('invalid');if(!confirm('اطلاعات تماشای فعلی با فایل انتخاب‌شده جایگزین بشه؟'))return;state=data.version===1?upgrade(data):normalize(data);save();render();toast('پشتیبان با موفقیت بازیابی شد.')}catch(e){toast('فایل پشتیبان معتبر نیست.','error')}}
document.addEventListener('click',e=>{const a=e.target.closest('[data-action]');if(!a)return;const action=a.dataset.action,id=a.dataset.id,f=BY_ID[id],v=a.dataset.value,scope=a.dataset.scope;
if(action==='detail-jump'){jumpToDetailSection(v);return;}
if(action==='route-mode'&&['all','disney'].includes(v)){state.routeMode=v;state.routeStatus='all';save();render();toast(v==='disney'?'مسیر منتخب دیزنی+ فعال شد.':'مسیر پیشنهادی کامل فعال شد.');}
if(action==='filter'){if(scope==='route-status'){state.routeStatus=v}else{state.mcuFilter=v;state.mcuPage=0}save();render()}
if(action==='release-filter'&&['all','planned','released'].includes(v)){releaseFilter=v;render();}
if(action==='order'&&['story','release','arc'].includes(v)){state.order=v;state.mcuPage=0;save();render();toast(state.order==='arc'?'مسیر پیوستگی شخصیت‌ها فعال شد.':state.order==='story'?'ترتیب خط زمانی فعال شد.':'ترتیب تاریخ انتشار فعال شد.')}
if(action==='view'){state.mcuView=v;save();render()}
if(action==='page'){const size=state.mcuPageSize==='all'?Infinity:state.mcuPageSize;state.mcuPage=clamp(state.mcuPage+Number(v),0,Math.max(0,Math.ceil(filterMCU().length/size)-1));save();render();document.querySelector('.listing-top')?.scrollIntoView({behavior:'smooth',block:'start'})}
if(action==='toggle-save'&&f)toggleSave(f,scope);
if(action==='toggle-done'&&f)setComplete(f,!done(f));
if(action==='episode'&&f)toggleEp(f,Number(v));
if(action==='all-episodes'&&f){state.episodes[id]=v==='all'?Array.from({length:f.episodes},(_,i)=>i+1):[];delete state.watching[id];save();render();toast(v==='all'?'همه قسمت‌ها تماشا شدند.':'تیک همه قسمت‌ها پاک شد.')}
if(action==='save-note'&&f){state.notes[id]=document.getElementById('detail-notes')?.value.slice(0,2500)||'';save();toast('یادداشت ذخیره شد.')}

if(action==='export')exportState();
if(action==='import')document.getElementById('import-file')?.click();
if(action==='theme'){state.theme=state.theme==='dark'?'light':'dark';save();render()}
if(action==='reset'&&confirm('همه اطلاعات تماشای این مرورگر پاک بشه؟')){state=blank();save();render();toast('اطلاعات اولیه بازیابی شد.')}
});
document.addEventListener('input',e=>{if(e.target.id==='search'){
 searchTerm=e.target.value;state.mcuPage=0;const visible=filterMCU(),{page,pages,size,paged}=paginationData(visible);
 const panel=document.getElementById('archive-results');if(panel)panel.innerHTML=mcuResultCards(paged,page,size);
 const count=document.querySelector('.listing-top');if(count){count.querySelector('.listing-actions').hidden=!visible.length;count.querySelector('strong').textContent=`${num(visible.length)} عنوان`;const text=count.querySelector('.page-total');if(text)text.textContent=state.mcuPageSize==='all'?'همه عناوین':`${num(page+1)} از ${num(pages)} صفحه`;}
 const pager=document.querySelector('.pagination');if(pager)pager.outerHTML=paginationHTML(page,pages,visible.length);
 }
if(e.target.id==='movie-range'){const f=BY_ID[e.target.dataset.id],v=Number(e.target.value);document.getElementById('slider-value').textContent=f.minutes==null?(v?'کامل':'ثبت نشده'):duration(v);document.querySelector('.detail-panel .wide-meter > span')?.style.setProperty('width',`${100*v/maxVal(f)}%`)}
});
document.addEventListener('change',e=>{if(e.target.id==='movie-range'){const f=BY_ID[e.target.dataset.id];if(f){state.progress[f.id]=Number(e.target.value);state.watching[f.id]=state.progress[f.id]>0&&state.progress[f.id]<maxVal(f);if(done(f))delete state.watching[f.id];save();render();toast('پیشرفت تماشا ذخیره شد.')}}
if(e.target.id==='release-type'){releaseType=e.target.value;render()}
if(e.target.id==='release-year'){releaseYear=e.target.value;render()}
if(e.target.id==='status-filter'){state.mcuStatus=e.target.value;state.mcuPage=0;save();render()}
if(e.target.id==='page-size'){const n=e.target.value==='all'?'all':Number(e.target.value);if([10,20,50,'all'].includes(n)){state.mcuPageSize=n;state.mcuPage=0;save();render();toast(n==='all'?'همه عنوان‌ها نمایش داده می‌شن.':`نمایش ${num(n)} عنوان در هر صفحه.`)}}
if(e.target.id==='arc-pick'){if(Object.hasOwn(STORY_ARCS,e.target.value)){state.arc=e.target.value;state.mcuPage=0;save();render();toast('مسیر شخصیت‌ها تغییر کرد.')}}
if(e.target.id==='import-file'&&e.target.files?.[0])importState(e.target.files[0]);
});
document.addEventListener('error',e=>{
 const img=e.target;if(!img.matches?.('.poster-image'))return;
 const f=BY_ID[img.dataset.posterId];if(!f){img.classList.add('broken');return;}
 const list=posterCandidates(f),index=Number(img.dataset.posterAttempt||0)+1;
 if(index<list.length){img.dataset.posterAttempt=String(index);img.src=list[index];}
 else img.classList.add('broken');
},true);
document.addEventListener('load',e=>{if(e.target.matches?.('.poster-image')&&e.target.naturalWidth)e.target.classList.remove('broken')},true);

if(!location.hash)location.hash=ADMIN_MODE?'#dashboard':'#doomsday';else goHash();

if('serviceWorker' in navigator && (location.protocol==='https:' || ['localhost','127.0.0.1'].includes(location.hostname))){window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));}

/* Shared accessible select enhancement. The native select remains the source
   of truth, so existing change handlers and admin requests stay unchanged. */
(()=>{
 const app=document.getElementById('app');
 if(!app)return;
 const entries=new WeakMap();
 let current=null, serial=0, typeBuffer='', typeTimer=0;
 const paths={
  chevron:'m6 9 6 6 6-6', check:'m5 12 4 4L19 6',
  layers:'m12 3 9 5-9 5-9-5 9-5M3 12l9 5 9-5M3 16l9 5 9-5',
  play:'M9 5v14l11-7z', circle:'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18',
  grid:'M4 4h6v6H4z M14 4h6v6h-6z M4 14h6v6H4z M14 14h6v6h-6z',
  film:'M4 4h16v16H4z M8 4v16M16 4v16M4 9h4M4 15h4M16 9h4M16 15h4'
 };
 function icon(name,cls){
  const ns='http://www.w3.org/2000/svg', svg=document.createElementNS(ns,'svg'), path=document.createElementNS(ns,'path');
  svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('aria-hidden','true');svg.setAttribute('focusable','false');svg.setAttribute('class',cls||'');
  path.setAttribute('d',paths[name]||paths.circle);path.setAttribute('fill','none');path.setAttribute('stroke','currentColor');path.setAttribute('stroke-width','1.8');path.setAttribute('stroke-linecap','round');path.setAttribute('stroke-linejoin','round');svg.append(path);return svg;
 }
 function optionIcon(select,option){
  if(select.id==='status-filter')return ({all:'layers',remaining:'circle',inprogress:'play',watched:'check'})[option.value]||'circle';
  if(select.id==='page-size')return 'grid';
  if(select.id==='metadata-title-picker')return 'film';
  return 'layers';
 }
 function close(restore=false){
  if(!current)return;
  const e=current;current=null;clearTimeout(typeTimer);typeBuffer='';
  e.trigger.setAttribute('aria-expanded','false');e.trigger.removeAttribute('aria-activedescendant');
  e.menu?.remove();e.menu=null;e.active=-1;
  if(restore&&e.trigger.isConnected)e.trigger.focus({preventScroll:true});
 }
 function update(e){
  const o=e.select.options[e.select.selectedIndex];
  const value=o?.textContent.trim()||'انتخاب گزینه';
  if(e.label.textContent!==value)e.label.textContent=value;
  if(e.trigger.disabled!==e.select.disabled)e.trigger.disabled=e.select.disabled;
  e.trigger.setAttribute('aria-disabled',String(e.select.disabled));
 }
 function place(e){
  if(current!==e||!e.trigger.isConnected){close();return;}
  const r=e.trigger.getBoundingClientRect(),v=window.visualViewport;
  const left=v?.offsetLeft||0,top=v?.offsetTop||0,w=v?.width||document.documentElement.clientWidth,h=v?.height||innerHeight;
  const padding=8, gap=6;
  const probe=document.createElement('div');probe.className='mp-dd-safe-probe';document.body.append(probe);
  const computed=getComputedStyle(probe),pt=parseFloat(computed.paddingTop)||0,pb=parseFloat(computed.paddingBottom)||0,pl=parseFloat(computed.paddingLeft)||0,pr=parseFloat(computed.paddingRight)||0;probe.remove();
  let minY=top+pt+padding,maxY=top+h-pb-padding;
  const header=app.querySelector('.topbar')?.getBoundingClientRect();
  const nav=app.querySelector('.mobile-nav');
  if(header&&header.height&&header.top<=minY+10)minY=Math.max(minY,header.bottom+padding);
  if(nav&&getComputedStyle(nav).display!=='none'){const n=nav.getBoundingClientRect();if(n.height)maxY=Math.min(maxY,n.top-padding);}
  if(r.bottom<=minY||r.top>=maxY){close();return;}
  const minX=left+pl+padding,maxX=left+w-pr-padding;
  const width=Math.min(Math.max(r.width, e.select.id==='metadata-title-picker'?300:180),Math.max(1,maxX-minX));
  e.menu.style.width=width+'px';
  const down=maxY-r.bottom-gap,up=r.top-minY-gap;
  const desired=Math.min(e.menu.scrollHeight+2,320);
  const above=down<desired&&up>down;
  const available=Math.max(0,above?up:down);
  if(available<36){close();return;}
  e.menu.style.maxHeight=Math.min(320,available)+'px';
  e.menu.dataset.side=above?'up':'down';
  e.menu.style.left=Math.max(minX,Math.min(r.right-width,maxX-width))+'px';
  e.menu.style.top=(above?Math.max(minY,r.top-gap-e.menu.offsetHeight):r.bottom+gap)+'px';
  e.menu.style.visibility='visible';
 }
 function focusOption(e,index){
  if(current!==e||!e.rows[index]||e.rows[index].getAttribute('aria-disabled')==='true')return;
  e.active=index;e.rows.forEach((row,i)=>row.classList.toggle('is-active',i===index));
  e.trigger.setAttribute('aria-activedescendant',e.rows[index].id);
  const row=e.rows[index],menu=e.menu;
  if(row.offsetTop<menu.scrollTop)menu.scrollTop=row.offsetTop;
  else if(row.offsetTop+row.offsetHeight>menu.scrollTop+menu.clientHeight)menu.scrollTop=row.offsetTop+row.offsetHeight-menu.clientHeight;
 }
 function enabled(e){return Array.from(e.select.options).map((o,i)=>o.disabled||o.hidden||o.parentElement?.disabled?-1:i).filter(i=>i>=0);}
 function open(e,first=null){
  if(e.select.disabled)return;
  if(current===e){close(true);return;}
  close();e.trigger.focus({preventScroll:true});current=e;e.active=-1;
  const menu=document.createElement('div');menu.className='mp-dd-menu';menu.id=e.menuId;menu.setAttribute('role','listbox');menu.setAttribute('aria-labelledby',e.trigger.id);menu.dir='rtl';menu.style.visibility='hidden';e.menu=menu;e.rows=[];
  Array.from(e.select.options).forEach((opt,i)=>{
   const row=document.createElement('div'),label=document.createElement('span');
   row.id=e.menuId+'-opt-'+i;row.className='mp-dd-option';row.setAttribute('role','option');row.dataset.index=String(i);row.setAttribute('aria-selected',String(opt.selected));row.setAttribute('aria-disabled',String(!!(opt.disabled||opt.parentElement?.disabled)));row.hidden=opt.hidden;
   label.className='mp-dd-option-label';label.textContent=opt.textContent.trim();label.dir='auto';
   row.append(icon(optionIcon(e.select,opt),'mp-dd-option-icon'),label,icon('check','mp-dd-check'));
   e.rows.push(row);menu.append(row);
  });
  menu.addEventListener('pointerdown',ev=>{if(ev.pointerType==='mouse')ev.preventDefault();});
  menu.addEventListener('click',ev=>{const row=ev.target.closest('[role="option"]');if(row&&row.getAttribute('aria-disabled')!=='true')choose(e,Number(row.dataset.index));});
  document.body.append(menu);e.trigger.setAttribute('aria-expanded','true');place(e);
  if(current!==e)return;
  const items=enabled(e);focusOption(e,first??(items.includes(e.select.selectedIndex)?e.select.selectedIndex:items[0]));
 }
 function choose(e,index){
  if(!enabled(e).includes(index))return;
  const old=e.select.selectedIndex, id=e.select.id;
  close(true);
  if(old!==index){e.select.selectedIndex=index;update(e);e.select.dispatchEvent(new Event('input',{bubbles:true}));e.select.dispatchEvent(new Event('change',{bubbles:true}));}
  // A filter change may rebuild the entire page.
  scan();const next=id?document.getElementById(id):e.select;
  entries.get(next)?.trigger.focus({preventScroll:true});
 }
 function key(e,ev){
  if(ev.ctrlKey||ev.metaKey||ev.altKey)return;
  const k=ev.key, opened=current===e, items=enabled(e);
  if(k==='Escape'&&opened){ev.preventDefault();ev.stopPropagation();close(true);return;}
  if(k==='Tab'){if(opened)close();return;}
  if(!items.length)return;
  if(k==='Enter'||k===' '){ev.preventDefault();if(opened)choose(e,e.active);else open(e);return;}
  if(['ArrowDown','ArrowUp','Home','End'].includes(k)){
   ev.preventDefault();
   const active=opened?e.active:e.select.selectedIndex;
   const i=items.indexOf(active);
   const idx=k==='Home'?items[0]:k==='End'?items.at(-1):items[Math.max(0,Math.min(items.length-1,i+(k==='ArrowDown'?1:-1)))];
   if(!opened)open(e,idx);else focusOption(e,idx);return;
  }
  if(k.length===1){
   clearTimeout(typeTimer);typeBuffer+=k.toLocaleLowerCase();typeTimer=setTimeout(()=>typeBuffer='',550);
   const query=typeBuffer.normalize('NFKC'),start=items.indexOf(opened?e.active:e.select.selectedIndex);
   const ordered=items.slice(start+1).concat(items.slice(0,start+1));
   const match=ordered.find(i=>e.select.options[i].textContent.trim().toLocaleLowerCase().normalize('NFKC').startsWith(query));
   if(match!==undefined){ev.preventDefault();if(!opened)open(e,match);else focusOption(e,match);}
  }
 }
 function enhance(select){
  if(entries.has(select)||select.multiple||select.size>1)return;
  const trigger=document.createElement('button'),label=document.createElement('span');
  const id=select.id||'mp-select-'+(++serial);
  trigger.id=id+'-custom';trigger.type='button';trigger.className='mp-dd-trigger';trigger.setAttribute('role','combobox');trigger.setAttribute('aria-haspopup','listbox');trigger.setAttribute('aria-expanded','false');
  const menuId=id+'-options';trigger.setAttribute('aria-controls',menuId);
  label.className='mp-dd-value';label.id=id+'-value';label.dir='auto';
  const external=Array.from(select.labels||[]).find(l=>l.htmlFor===select.id);
  const labelled=select.getAttribute('aria-labelledby');
  if(external){if(!external.id)external.id=id+'-label';external.htmlFor=trigger.id;}
  if(labelled||external)trigger.setAttribute('aria-labelledby',(labelled||external.id)+' '+label.id);
  else{const name=document.createElement('span');name.className='mp-dd-sr';name.id=id+'-label';name.textContent=select.getAttribute('aria-label')||'انتخاب گزینه';trigger.append(name);trigger.setAttribute('aria-labelledby',name.id+' '+label.id);}
  trigger.append(label,icon('chevron','mp-dd-chevron'));
  const e={select,trigger,label,menuId,menu:null,rows:[],active:-1};
  entries.set(select,e);
  select.insertAdjacentElement('afterend',trigger);
  select.classList.add('mp-dd-native');select.tabIndex=-1;select.setAttribute('aria-hidden','true');
  update(e);
  trigger.addEventListener('click',()=>open(e));
  trigger.addEventListener('keydown',ev=>key(e,ev));
  select.addEventListener('change',()=>update(e));
 }
 function scan(){
  if(current&&!current.trigger.isConnected)close();
  app.querySelectorAll('select').forEach(s=>{enhance(s);const e=entries.get(s);if(e)update(e);});
 }
 new MutationObserver(scan).observe(app,{childList:true,subtree:true,attributes:true,attributeFilter:['disabled','selected']});
 document.addEventListener('pointerdown',ev=>{if(current&&!current.trigger.contains(ev.target)&&!current.menu?.contains(ev.target))close();},true);
 document.addEventListener('focusin',ev=>{if(current&&!current.trigger.contains(ev.target)&&!current.menu?.contains(ev.target))close();});
 window.addEventListener('resize',()=>{if(current)place(current);});
 window.addEventListener('scroll',ev=>{if(current&&!(ev.target instanceof Node&&current.menu?.contains(ev.target)))place(current);},true);
 window.visualViewport?.addEventListener('resize',()=>{if(current)place(current);});
 window.visualViewport?.addEventListener('scroll',()=>{if(current)place(current);});
 scan();
})();

/* Same-origin global catalogue search. Independent of archive filters and route. */
(()=>{
 const app=document.getElementById('app');
 if(!app)return;
 const shortcut=/Mac|iPhone|iPad|iPod/i.test(navigator.platform||navigator.userAgent)?'⌘ K':'Ctrl K';
 let dialog=null,input=null,results=null,status=null,selected=-1,currentRows=[],filter='all',limit=8,previousFocus=null,localPeople=null,pending=null,peopleError=false,personIndex=null,lastPeople=null;
 const normalize=value=>String(value??'').normalize('NFKD').toLowerCase().replace(/[\u0300-\u036f\u064b-\u065f\u0670]/g,'').replace(/[يى]/g,'ی').replace(/ك/g,'ک').replace(/[\u06f0-\u06f9]/g,c=>String(c.charCodeAt(0)-0x6f0)).replace(/[\u0660-\u0669]/g,c=>String(c.charCodeAt(0)-0x660)).replace(/[^\p{L}\p{N}]+/gu,' ').trim();
 const score=(text,query)=>{if(!text)return 0;if(text===query)return 150;if(text.startsWith(query))return 100;if(text.includes(query))return 70;return query.split(' ').every(word=>text.includes(word))?40:0;};
 const titleIndex=FILMS.map(f=>({f,name:normalize(f.title),fa:normalize(f.fa),key:normalize(f.id),year:String(f.year||'')}));
 const actorDirectory=()=>Array.isArray(information.directory?.items)?information.directory.items:localPeople||[];
 function getPeopleIndex(){
  const items=actorDirectory();
  if(items===lastPeople&&personIndex)return personIndex;
  lastPeople=items;
  personIndex=items.filter(p=>p&&typeof p.name==='string'&&/^[a-z0-9-]{1,110}$/.test(p.id)).map(p=>({p,name:normalize(p.name),fa:normalize(p.nameFa),id:normalize(p.id),roles:normalize((p.credits||[]).flatMap(c=>[c.character||'',c.characterFa||'']).join(' '))}));
  return personIndex;
 }
 const isPublic=()=>typeof seoPath==='function';
 function href(type,id){
  const route=type+'/'+encodeURIComponent(id);
  return isPublic()?seoPath(route):ADMIN_MODE?'/#'+route:'#'+route;
 }
 function safeImage(value){
  if(typeof value!=='string')return '';
  if(/^\.?\/?(?:public-data\/images\/(?:posters|people|remote)|assets\/(?:posters|people))\/[a-z0-9-]+\.(?:webp|jpg|jpeg|png)$/i.test(value))return value;
  return '';
 }
 function image(url,name,type){
  const src=safeImage(url);
  return '<span class="mp-gs-thumb '+(type==='person'?'is-person':'')+'">'+(src?'<img src="'+esc(src)+'" alt="" decoding="async" loading="lazy">':'')+'<span>'+esc(String(name||'?').trim().charAt(0).toUpperCase())+'</span></span>';
 }
 function resultRow(type,id,name,sub,url){
  return '<a class="mp-gs-result" href="'+esc(href(type,id))+'" data-gs-result data-kind="'+type+'" data-id="'+esc(id)+'">'+image(url,name,type)+'<span class="mp-gs-copy"><strong dir="auto">'+esc(name)+'</strong><small dir="auto">'+esc(sub)+'</small></span><span class="mp-gs-arrow" aria-hidden="true">'+ico('arrow',15)+'</span></a>';
 }
 function setActive(i,scroll=false){
  currentRows.forEach((row,n)=>row.classList.toggle('is-active',n===i));selected=i;
  if(i>=0&&currentRows[i]&&scroll){currentRows[i].focus({preventScroll:true});currentRows[i].scrollIntoView({block:'nearest',behavior:'instant'});}
 }
 function renderSearch(reset=true){
  if(!dialog?.open)return;
  const q=normalize(input.value);
  if(reset)selected=-1;
  const people=getPeopleIndex();
  let actors=q?people.map(x=>({p:x.p,s:Math.max(score(x.name,q),score(x.fa,q),score(x.id,q),score(x.roles,q)*.75)})).filter(x=>x.s>0).sort((a,b)=>b.s-a.s||((b.p.credits||[]).length-(a.p.credits||[]).length)):[];
  const related=new Map();
  if(q)for(const {p,s} of actors)for(const c of p.credits||[])if(BY_ID[c.id])related.set(c.id,Math.max(related.get(c.id)||0,s*.49));
  let titles=q?titleIndex.map(x=>({f:x.f,s:Math.max(score(x.name,q),score(x.fa,q),score(x.key,q),score(x.name+' '+x.year,q),score(x.fa+' '+x.year,q),related.get(x.f.id)||0)})).filter(x=>x.s>0).sort((a,b)=>b.s-a.s):[];
  if(filter==='titles')actors=[];
  if(filter==='people')titles=[];
  const total=titles.length+actors.length;
  if(!q){
   results.innerHTML='<div class="mp-gs-empty">'+ico('search',28)+'<strong>دنبال چه اثری یا بازیگری هستی؟</strong><span>نام فیلم، سریال، بازیگر یا شخصیت رو فارسی یا انگلیسی وارد کن.</span><div class="mp-gs-suggestions"><button type="button" data-gs-suggest="Iron Man">Iron Man</button><button type="button" data-gs-suggest="Loki">Loki</button><button type="button" data-gs-suggest="Chris Hemsworth">Chris Hemsworth</button></div></div>';
   status.textContent=peopleError?'فهرست بازیگران فعلا در دسترس نیست.':'جستجو در '+num(FILMS.length)+' اثر و '+num(people.length)+' بازیگر'+(pending?' · در حال دریافت فهرست':'');
  }else{
   const group=(label,rows,count)=>rows.length?'<section class="mp-gs-group"><h3>'+label+' <span>'+num(count)+'</span></h3>'+rows.join('')+'</section>':'';
   const titleRows=titles.slice(0,limit).map(({f})=>resultRow('title',f.id,f.title,f.fa+' · '+kind(f)+' · '+formatYear(f.year),localCover(f)));
   const actorRows=actors.slice(0,limit).map(({p})=>resultRow('person',p.id,p.nameFa||p.name,(p.credits||[]).slice(0,2).map(c=>c.characterFa||c.character).filter(Boolean).join(' / ')||num((p.credits||[]).length)+' حضور در آرشیو',safePhoto(p.photo)));
   const tg=group('فیلم‌ها و سریال‌ها',titleRows,titles.length),ag=group('بازیگران',actorRows,actors.length);
   results.innerHTML=((actors[0]?.s||0)>(titles[0]?.s||0)?ag+tg:tg+ag)+(total?'':'<div class="mp-gs-empty"><strong>نتیجه‌ای پیدا نشد</strong><span>نام یا املای دیگری امتحان کن.</span></div>')+((titles.length>limit||actors.length>limit)?'<button class="mp-gs-more" type="button" data-gs-more>نمایش نتایج بیشتر</button>':'');
   status.textContent=num(total)+' نتیجه'+(pending?' · در حال دریافت فهرست بازیگران':peopleError?' · فهرست بازیگران در دسترس نیست':'');
  }
  if(peopleError){const retry=document.createElement('button');retry.type='button';retry.className='mp-gs-more';retry.dataset.gsRetry='';retry.textContent='تلاش دوباره برای دریافت بازیگران';results.append(retry);}
  currentRows=Array.from(results.querySelectorAll('[data-gs-result]'));
  currentRows.forEach((r,i)=>{r.id='mp-gs-result-'+i;});
  setActive(selected>=0&&selected<currentRows.length?selected:-1);
  if(reset)results.scrollTop=0;
 }
 function loadPeople(){
  if(isPublic()||actorDirectory().length||pending)return;
  peopleError=false;
  const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),10000);
  pending=fetch('/api/metadata/people',{cache:'no-store',signal:ctrl.signal}).then(async r=>{if(!r.ok)throw Error('HTTP');const d=await r.json();if(!Array.isArray(d.items))throw Error('invalid directory');localPeople=d.items;if(!information.directory?.items?.length)information.directory=d;}).catch(()=>{peopleError=true;}).finally(()=>{clearTimeout(timer);pending=null;if(dialog?.open)renderSearch();});
 }
 function closeSearch(){if(dialog?.open)dialog.close();}
 function init(){
  if(dialog)return;
  dialog=document.createElement('dialog');dialog.className='mp-gs-dialog';dialog.id='mp-global-search';dialog.dir='rtl';dialog.setAttribute('aria-labelledby','mp-gs-title');
  dialog.innerHTML='<div class="mp-gs-header"><div class="mp-gs-heading"><h2 id="mp-gs-title">جستجوی سراسری</h2><button type="button" class="mp-gs-close" data-gs-close aria-label="بستن جستجو">×</button></div><div class="mp-gs-field">'+ico('search',21)+'<input id="mp-gs-query" type="search" aria-controls="mp-gs-results" aria-label="نام فیلم، سریال یا بازیگر" placeholder="نام فیلم، سریال یا بازیگر..." autocomplete="off" autocapitalize="off" spellcheck="false"><button type="button" class="mp-gs-clear" data-gs-clear aria-label="پاک کردن جستجو">×</button></div><div class="mp-gs-filters" role="group" aria-label="نوع نتیجه"><button type="button" data-gs-filter="all" aria-pressed="true">همه</button><button type="button" data-gs-filter="titles" aria-pressed="false">فیلم و سریال</button><button type="button" data-gs-filter="people" aria-pressed="false">بازیگران</button></div></div><div class="mp-gs-results" id="mp-gs-results" role="region" aria-label="نتایج جستجو"></div><footer class="mp-gs-footer"><span id="mp-gs-status" role="status" aria-live="polite"></span><span class="mp-gs-keys"><kbd>↑ ↓</kbd> پیمایش <kbd>Enter</kbd> انتخاب <kbd>Esc</kbd> بستن</span></footer>';
  document.body.append(dialog);
  input=dialog.querySelector('#mp-gs-query');results=dialog.querySelector('.mp-gs-results');status=dialog.querySelector('#mp-gs-status');
  // Result links remain native links, reachable via Tab as well as arrow keys.
  input.addEventListener('input',()=>{limit=8;renderSearch();});
  dialog.addEventListener('keydown',e=>{
   if(e.isComposing||e.metaKey||e.ctrlKey||e.altKey)return;
   const activeRow=currentRows.indexOf(e.target);
   if(e.target!==input&&activeRow<0)return;
   if(['ArrowDown','ArrowUp'].includes(e.key)&&currentRows.length){e.preventDefault();if(activeRow===0&&e.key==='ArrowUp'){setActive(-1);input.focus();return;}setActive(activeRow<0?(e.key==='ArrowDown'?0:currentRows.length-1):Math.max(0,Math.min(currentRows.length-1,activeRow+(e.key==='ArrowDown'?1:-1))),true);}
   if(e.target===input&&e.key==='Enter'&&currentRows.length){e.preventDefault();currentRows[0].click();}
  });
  dialog.addEventListener('click',e=>{
   if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)closeSearch();return;}
   if(e.target.closest('[data-gs-close]')){closeSearch();return;}
   if(e.target.closest('[data-gs-clear]')){input.value='';limit=8;renderSearch();input.focus();return;}
   const f=e.target.closest('[data-gs-filter]');
   if(f){filter=f.dataset.gsFilter;dialog.querySelectorAll('[data-gs-filter]').forEach(b=>b.setAttribute('aria-pressed',String(b===f)));limit=8;renderSearch();input.focus();return;}
   const s=e.target.closest('[data-gs-suggest]');if(s){input.value=s.dataset.gsSuggest;renderSearch();input.focus();return;}
   if(e.target.closest('[data-gs-more]')){limit+=20;renderSearch(false);return;}
   if(e.target.closest('[data-gs-retry]')){loadPeople();renderSearch();return;}
   const a=e.target.closest('[data-gs-result]');
   if(a&&!e.metaKey&&!e.ctrlKey&&!e.shiftKey&&!e.altKey)closeSearch();
  });
  results.addEventListener('error',e=>{if(e.target.tagName==='IMG')e.target.remove();},true);
  dialog.addEventListener('focusin',e=>{const n=currentRows.indexOf(e.target);setActive(n);});
  dialog.addEventListener('close',()=>{document.documentElement.classList.remove('mp-gs-open');if(previousFocus?.isConnected)previousFocus.focus({preventScroll:true});});
 }
 function openSearch(){
  init();
  if(dialog.open){input.focus();return;}
  previousFocus=document.activeElement;
  input.value='';selected=-1;limit=8;filter='all';dialog.querySelectorAll('[data-gs-filter]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.gsFilter==='all')));
  dialog.showModal();fitViewport();document.documentElement.classList.add('mp-gs-open');loadPeople();renderSearch();input.focus({preventScroll:true});
 }
 function fitViewport(){if(dialog?.open){dialog.style.setProperty('--mp-gs-vh',(window.visualViewport?.height||innerHeight)+'px');}}
 window.visualViewport?.addEventListener('resize',fitViewport);window.addEventListener('resize',fitViewport);
 function updateLaunchers(){app.querySelectorAll('.mp-search-hint').forEach(k=>{if(k.textContent!==shortcut)k.textContent=shortcut;});}
 new MutationObserver(updateLaunchers).observe(app,{childList:true,subtree:true});
 updateLaunchers();
 document.addEventListener('click',e=>{if(e.target.closest('[data-global-search]'))openSearch();});
 document.addEventListener('keydown',e=>{if((e.metaKey||e.ctrlKey)&&!e.altKey&&e.key.toLowerCase()==='k'){e.preventDefault();if(!e.repeat)openSearch();}});
 window.addEventListener('hashchange',closeSearch);
})();

// The viewer brand returns to the home page; same-page taps scroll to its top.
document.addEventListener('click',e=>{const a=e.target.closest('[data-home-logo]');if(!a||e.ctrlKey||e.metaKey||e.shiftKey||e.altKey||e.button!==0)return;if(!ADMIN_MODE&&activePage().name==='doomsday'){e.preventDefault();window.scrollTo({top:0,behavior:'instant'});}});
