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
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const duration=m=>m==null?'زمان نامشخص':m>=60?`${num(Math.floor(m/60))} ساعت${m%60?' و '+num(Math.round(m%60))+' دقیقه':''}`:`${num(Math.round(m))} دقیقه`;
const isAnimation=f=>!!META[f.id]?.animation;
const kind=f=>isAnimation(f)?'انیمیشن':f.type==='movie'?'فیلم سینمایی':f.type==='series'?'سریال':f.id==='all-hail'?'فیلم کوتاه':'ویژه‌برنامه';
const seasonCount=f=>f.episodes||0;
const maxVal=f=>f.episodes||f.minutes||1;
const posterCandidates=f=>{const local=localCover(f);return local?[local]:[];};
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
let searchTerm='',detailOrigin='doomsday',statusTimeout;
const getEpisodes=f=>state.episodes[f.id]||[];
const fraction=f=>f.episodes?getEpisodes(f).length/f.episodes:clamp(Number(state.progress[f.id]||0)/maxVal(f),0,1);
const done=f=>fraction(f)>=1;
const partial=f=>fraction(f)>0&&fraction(f)<1;
const watching=f=>!!state.watching[f.id]&&!done(f)||partial(f);
const stateLabel=f=>done(f)?'دیده‌شده':watching(f)?'در حال تماشا':'دیده‌نشده';
function stats(ids){let watched=0,seenMinutes=0,totalMinutes=0,known=0;for(const id of ids){const f=BY_ID[id];if(!f)continue;if(done(f))watched++;if(f.minutes!=null){totalMinutes+=f.minutes;seenMinutes+=f.minutes*fraction(f);known++}}return {count:ids.length,watched,pending:ids.length-watched,percent:ids.length?Math.round(watched*100/ids.length):0,used:Math.round(seenMinutes),remaining:Math.max(0,Math.round(totalMinutes-seenMinutes)),total:totalMinutes,known}}
const nextOf=ids=>ids.map(id=>BY_ID[id]).find(f=>f&&!done(f));
function save(){try{localStorage.setItem(KEY,JSON.stringify(state));storageReady=true}catch(e){storageReady=false;toast('ذخیره اطلاعات ممکن نشد. خروجی پشتیبان بگیر.','error')}}
function toast(message,type='ok'){const el=document.createElement('div');el.className='toast '+type;el.textContent=message;document.getElementById('toasts').append(el);clearTimeout(statusTimeout);statusTimeout=setTimeout(()=>{el.classList.add('fade');setTimeout(()=>el.remove(),240)},2800)}
const arc=pct=>`<div class="progress-circle" style="--pct:${pct}%"><div><strong>${num(pct)}٪</strong><span>تکمیل</span></div></div>`;
function poster(f,cls=''){const url=posterUrl(f);return `<div class="poster-art p-${esc(f.palette)} ${cls}" aria-label="پوستر ${esc(f.title)}">${url?`<img class="poster-image" data-poster-id="${esc(f.id)}" src="${esc(url)}" alt="پوستر ${esc(f.title)}" loading="lazy" referrerpolicy="no-referrer"/>`:''}<div class="poster-fallback"><div class="poster-mark">M<span>PATH</span></div><span class="poster-symbol">${esc(f.sigil)}</span><span class="poster-fallback-name" dir="ltr" lang="en">${esc(f.title)}</span></div></div>`}
function artBackdrop(f){const url=posterUrl(f);return `<div class="feature-background p-${esc(f.palette)}" aria-hidden="true">${url?`<img class="poster-image" data-poster-id="${esc(f.id)}" src="${esc(url)}" alt="" referrerpolicy="no-referrer"/>`:''}<span class="feature-glow"></span></div>`}
function pill(f,extra=''){return `<span class="pill ${extra}">${isAnimation(f)?ico('spark',13):f.type==='movie'?ico('film',13):ico('monitor',13)}${kind(f)}</span>`}
function navIcon(id){return id==='doomsday'?'target':id==='mcu'?'layers':id==='watchlist'?'bookmark':id==='posters'?'film':id==='people'?'grid':id==='metadata'?'info':'settings'}
const pageNames={doomsday:'مسیر Doomsday',mcu:'آرشیو MCU',watchlist:'واچ‌لیست من',settings:'تنظیمات',posters:'مدیریت کاورها',people:'بازیگران',metadata:'اطلاعات آثار'};
function navLink(key){const current=('#'+seoRoute()).split('/')[0];const isActive=current==='#'+key||(current==='#title'&&detailOrigin===key);return `<a href="#${key}" class="nav-link ${isActive?'active':''}" ${isActive?'aria-current="page"':''}>${ico(navIcon(key),19)}<span>${pageNames[key]}</span>${key==='mcu'?`<small>${num(MCU.length)}</small>`:''}</a>`}
function routeIds(){return (state.routeMode==='disney'?DOOMSDAY.filter(id=>OFFICIAL.has(id)):DOOMSDAY)}
function shell(body,active){const s=stats(routeIds());return `<div class="app-shell">
 <aside class="sidebar"><a class="logo" href="#doomsday"><span class="logo-mark">M<span>／</span></span><span class="logo-name"><b>مسیر مارول</b><small>MARVEL PATH</small></span></a>
 <div class="nav-caption">کتابخانه شخصی</div><nav class="nav-column" aria-label="منوی اصلی">${['doomsday','mcu','watchlist','people','settings'].map(navLink).join('')}</nav>
 <div class="sidebar-spacer"></div><div class="sidebar-foot"><div class="sidebar-foot-art">EARTH-616 <span>✳</span></div><span>${state.routeMode==='disney'?'منتخب دیزنی+':'مسیر پیشنهادی Doomsday'}</span><strong>${num(s.watched)} <small>از ${num(s.count)} عنوان</small></strong><div class="thin-meter"><i style="width:${s.percent}%"></i></div></div>
 <div class="sidebar-end">MARVEL PATH <span> / </span> v3.4.0</div></aside>
 <div class="workspace"><header class="topbar"><div class="mobile-logo"><span class="mini-m">M</span><span>مسیر مارول</span></div><div class="breadcrumb">WATCH HUB <span class="slash">/</span> <b>${esc(active)}</b></div><div class="top-actions">${nextOf(routeIds())?`<a class="top-resume" href="#title/${nextOf(routeIds()).id}">${ico('play',13)}<span>ادامه مسیر</span></a>`:''}<span class="top-status"><span class="local-dot" title="داده‌ها فقط در مرورگر ذخیره می‌شوند"></span><span class="storage-label">ذخیره خودکار روشن است</span></span><span class="top-clock top-earth">EARTH-616</span></div></header><main id="main-content" class="main-content">${body}</main><footer class="main-footer"><span class="footer-tagline">ساخته‌شده برای دنبال کردن داستان‌ها</span></footer></div>
 <nav class="mobile-nav" aria-label="منوی موبایل">${['doomsday','mcu','watchlist','people','settings'].map(navLink).join('')}</nav></div>`}
function buttonOpen(f,caption='مشاهده جزئیات',more=''){return `<a href="#title/${encodeURIComponent(f.id)}" class="btn btn-primary ${more}">${ico('play',17)} ${caption} ${ico('arrow',16)}</a>`}
function feature(f,section){if(!f)return `<section class="feature feature-finished"><div class="feature-content"><span class="eyebrow">MISSION COMPLETE</span><h1>تمام مسیر رو دیدی!</h1><p>همه عنوان‌های این مسیر رو به پایان رسوندی.</p></div></section>`;return `<section class="feature">${artBackdrop(f)}<div class="feature-content"><div class="eyebrow with-dot"><i></i>${section==='doomsday'?'توقف بعدی در مسیر Doomsday':'ادامه داستان MCU'}</div><div class="feature-index"><span class="feature-kicker-en">UP NEXT</span><span class="feature-separator"></span><span>${f.year} / ${f.universe==='fox'?'FOX':'MCU'}</span></div><h1 dir="ltr" lang="en">${esc(f.title)}</h1><p>${esc(META[f.id]?.summary||'')}</p><div class="feature-tags">${pill(f)}<span>${duration(f.minutes)}</span><span>${f.episodes?`${num(f.episodes)} قسمت`:'نسخه سینمایی'}</span></div><div class="feature-ctas">${buttonOpen(f,watching(f)?'ادامه ثبت پیشرفت':'مشاهده و شروع تماشا')}<button class="btn btn-glass" data-action="toggle-save" data-id="${f.id}" data-scope="${section}">${ico('bookmark',16)} ${state.saved[section==='doomsday'?'doomsday':'mcu'].includes(f.id)?'حذف از لیست':'ذخیره در واچ‌لیست'}</button></div></div><div class="feature-poster">${poster(f,'feature-poster-frame')}</div><div class="feature-corner">THE MARVEL PATH COLLECTION / 001</div></section>`}
function metric(icon,label,value,sub){return `<div class="metric"><div class="metric-icon">${ico(icon,19)}</div><div><span>${label}</span><strong>${value}</strong><small>${sub}</small></div></div>`}
function sectionTitle(title,description,link=''){return `<div class="section-head"><div><h2>${title}</h2><p>${description}</p></div>${link}</div>`}
function filterButtons(scope,options,current){return `<div class="filter-tabs" aria-label="فیلترها">${options.map(([id,label])=>`<button type="button" class="filter-tab ${current===id?'selected':''}" data-action="filter" data-scope="${scope}" data-value="${id}">${label}</button>`).join('')}</div>`}
function filmCard(f,index,scope,mode='grid'){
 const doneNow=done(f),inProg=watching(f),saved=state.saved[scope]?.includes(f.id),pct=Math.round(fraction(f)*100);
 return `<article class="title-card ${mode==='list'?'compact-card':''} ${inProg?'is-progress':''}" id="card-${f.id}"><a class="card-art-link" href="#title/${f.id}" aria-label="جزئیات ${esc(f.fa)}">${poster(f)}${doneNow?`<span class="card-done">${ico('check',16)}</span>`:''}${inProg?`<span class="card-watching">در حال تماشا</span>`:''}</a><div class="card-info"><div class="card-top-meta"><span>${state.order==='arc'&&scope==='mcu'?`فصل ${num(arcStep(f))} · `:''}${num(f.year)} <i>•</i> ${kind(f)}</span>${scope==='doomsday'&&OFFICIAL.has(f.id)?'<span class="tag-official">انتخاب دیزنی+</span>':''}</div><a href="#title/${f.id}" class="card-name" dir="ltr" lang="en">${esc(f.title)}</a><span class="card-fa">${esc(f.fa)}</span><div class="card-bottom"><span class="card-duration">${ico('clock',14)}${f.episodes?num(f.episodes)+' قسمت':duration(f.minutes)}</span><div class="card-actions"><button type="button" class="icon-btn ${saved?'saved':''}" data-action="toggle-save" data-scope="${scope}" data-id="${f.id}" aria-label="${saved?'حذف از':'افزودن به'} واچ‌لیست">${ico('bookmark',18)}</button><button type="button" class="icon-btn ${doneNow?'is-done':''}" data-action="toggle-done" data-id="${f.id}" aria-label="${doneNow?'لغو':'ثبت'} تماشای کامل">${ico('check',18)}</button></div></div>${pct>0&&!doneNow?`<div class="card-meter"><span style="width:${pct}%"></span></div>`:''}</div></article>`
}
function filmRow(f,index,scope){const finished=done(f),part=watching(f),saved=state.saved[scope]?.includes(f.id);return `<div class="item-row ${part?'row-active':''}"><span class="item-seq">${num(index)}</span><a href="#title/${f.id}" class="row-poster">${poster(f)}</a><a href="#title/${f.id}" class="row-description"><strong dir="ltr" lang="en">${esc(f.title)}</strong><small>${esc(f.fa)}</small><span>${num(f.year)} · ${kind(f)} · ${f.episodes?num(f.episodes)+' قسمت':duration(f.minutes)}${partial(f)?' · ' + num(Math.round(fraction(f)*100))+'٪ پیشرفت':''}</span></a><div class="item-state">${finished?'<span class="state-complete">'+ico('check',13)+' دیده‌شده</span>':part?'<span class="state-progress">در حال تماشا</span>':`<span class="state-todo">دیده‌نشده</span>`}</div><button class="icon-btn ${saved?'saved':''}" data-action="toggle-save" data-id="${f.id}" data-scope="${scope}" aria-label="واچ‌لیست">${ico('bookmark',18)}</button><button class="icon-btn ${finished?'is-done':''}" data-action="toggle-done" data-id="${f.id}" aria-label="تغییر وضعیت">${ico('check',18)}</button><a href="#title/${f.id}" class="row-open" aria-label="جزئیات">${ico('arrow',18)}</a></div>`}
function spotlightCard(f,index,scope){const pct=Math.round(fraction(f)*100), saved=state.saved[scope]?.includes(f.id);return `<article class="spot-card"><a class="spot-image" href="#title/${esc(f.id)}">${poster(f)}<span class="spot-index">${num(index)}</span>${pct?`<div class="spot-meter"><span style="width:${pct}%"></span></div>`:''}</a><div class="spot-card-copy"><span class="spot-kind">${kind(f)} · ${f.episodes?`${num(f.episodes)} قسمت`:duration(f.minutes)}</span><a href="#title/${esc(f.id)}" class="spot-title" dir="ltr">${esc(f.title)}</a><div class="spot-lower"><span>${pct?`${num(pct)}٪ دیده شده`:'آماده تماشا'}</span><button type="button" class="spot-bookmark ${saved?'saved':''}" aria-label="${saved?'حذف از':'افزودن به'} واچ‌لیست" data-action="toggle-save" data-id="${f.id}" data-scope="${scope}">${ico('bookmark',15)}</button></div></div></article>`}
function nextShelf(ids,scope,heading='عنوان‌های بعدی',description='بدون جست‌وجو، از همین‌جا ادامه بده.'){const pending=ids.map(id=>BY_ID[id]).filter(f=>f&&!done(f)).slice(0,5);if(!pending.length)return '';return `<section class="next-shelf"><div class="section-head shelf-title"><div><span class="mini-label">YOUR NEXT PICKS</span><h2>${heading}</h2><p>${description}</p></div><span class="shelf-count">${num(pending.length)} پیشنهاد</span></div><div class="spot-rail">${pending.map((f,i)=>spotlightCard(f,i+1,scope)).join('')}</div></section>`}
function episodeHint(f){if(!f.episodes)return '';const seen=getEpisodes(f),next=Array.from({length:f.episodes},(_,i)=>i+1).find(x=>!seen.includes(x));return `<div class="episode-hint">${ico('play',16)}<div><b>${next?'قسمت '+num(next)+' رو هنوز ندیدی':'تمام قسمت‌ها تکمیل شدند'}</b><span>${num(seen.length)} قسمت از ${num(f.episodes)} تماشا شده</span></div><div class="episode-hint-pct">${num(Math.round(fraction(f)*100))}٪</div></div>`}
function doomsdayPage(){
 const base=routeIds(),s=stats(base),next=nextOf(base),disney=state.routeMode==='disney';
 const ids=base.filter(id=>{const f=BY_ID[id];return state.routeStatus==='remaining'?!done(f):state.routeStatus==='watched'?done(f):true});
 const modeChoices=`<div class="route-mode-switch" role="group" aria-label="انتخاب مسیر تماشا"><div class="route-mode-copy"><b>${disney?'مسیر رسمی Disney+':'مسیر پیشنهادی ما'}</b><small>${disney?'منتخب Countdown to Doomsday · لوکی در دو فصل ثبت شده':'فهرست شخصی و آثار تکمیلی برای پیوستگی داستان'}</small></div><div class="route-mode-segments"><button type="button" data-action="route-mode" data-value="all" aria-pressed="${!disney}" class="${!disney?'selected':''}">همه آثار پیشنهادی</button><button type="button" data-action="route-mode" data-value="disney" aria-pressed="${disney}" class="${disney?'selected':''}">منتخب Disney+</button></div></div>`;
 return `<div class="page-intro"><div class="page-kicker">THE ROAD TO DOOMSDAY <span class="accent-slash">/</span> مسیر تماشا</div><h1>ماراتن <em>Doomsday</em></h1><p>${disney?'فقط آثار موجود در مجموعه رسمی Countdown to Doomsday دیزنی+؛ پیشرفت، گام بعدی و زمان باقی‌مانده هم براساس همین مسیر محاسبه می‌شه.':'ماراتن کامل شخصی تو با فیلم‌ها و سریال‌های تکمیلی؛ از جایی که تماشا رو متوقف کردی ادامه بده.'}</p></div>
 ${modeChoices}
 ${feature(next,'doomsday')}
 <div class="overview-grid"><div class="overview-progress">${arc(s.percent)}<div><span class="mini-label">WATCH MILESTONE</span><h3>${disney?'پیشرفت مسیر دیزنی+':'پیشرفت مسیر پیشنهادی'}</h3><p>${num(s.watched)} از ${num(s.count)} اثر رو دیدی؛ ${num(s.pending)} اثر باقی مونده.</p><span class="overview-small">مدت‌زمان قسمت‌های سریال جداگانه لحاظ می‌شه.</span></div></div>${metric('clock','زمان باقی‌مانده',duration(s.remaining),disney?'منتخب‌های دیزنی+':'کل برنامه پیشنهادی')}${metric('check','آثار دیده‌شده',num(s.watched)+' / '+num(s.count),'فقط همین مسیر')}</div>
 ${nextShelf(base,'doomsday','در ادامه چه ببینم؟','پنج ایستگاه بعدی همین مسیر، براساس انتخاب فعلی تو.') }
 ${sectionTitle(disney?'مسیر رسمی Disney+':'نقشه کامل تماشا',disney?'منتخب‌های دیزنی+ به ترتیب پیشنهادی ما؛ تماشای هر عنوان روی تمام مسیرها اثر می‌گذاره.':'همه پیش‌نیازهای انتخابی ما؛ برای جزئیات و ثبت پیشرفت وارد هر عنوان شو.','<span class="section-count">'+num(base.length)+' CHAPTERS</span>')}
 ${filterButtons('route-status',[['all','همه وضعیت‌ها'],['remaining','باقی‌مانده'],['watched','دیده‌شده']],state.routeStatus)}
 <div class="route-list">${ids.map(id=>filmRow(BY_ID[id],base.indexOf(id)+1,'doomsday')).join('')||empty('اثری با این وضعیت در مسیر انتخابی پیدا نشد.')}</div>
 ${!disney?`<section class="bonus-section"><div><div class="bonus-kicker">EXTRA CHAPTERS</div><h3>داستان واندا و ویژن رو کامل‌تر ببین</h3><p>این دو سریال تکمیلی، خارج از ۲۳ پیش‌نیاز اصلی هستند.</p></div><div class="bonus-grid">${BONUS.map(id=>filmCard(BY_ID[id],0,'mcu')).join('')}</div></section>`:''}
 <p class="footnote">${disney?'منبع انتخاب عناوین: مجموعه Countdown to Avengers: Doomsday در Disney+. ترتیب نمایش برای این اپ تنظیم شده است؛ Loki در دو فصل جداگانه حساب می‌شود.':'آثار پیشنهادی ما شامل چند پیش‌نیاز تکمیلی هستند و فهرست الزام‌آور رسمی مارول محسوب نمی‌شوند.'}</p>`}
const mcuIds=()=>MCU.filter(f=>f.universe!=='bonus').map(f=>f.id);
const arcInfo=()=>STORY_ARCS[state.arc]||STORY_ARCS.main;
const orderedMCU=()=>state.order==='arc'?arcInfo().items.map(id=>BY_ID[id]).filter(f=>f&&MCU.includes(f)):MCU.slice().sort((a,b)=>state.order==='release'?a.release.localeCompare(b.release)||a.title.localeCompare(b.title):(STORY_INDEX[a.id]??9999)-(STORY_INDEX[b.id]??9999)||a.release.localeCompare(b.release));
const arcStep=(f)=>state.order!=='arc'?'':(arcInfo().items.indexOf(f.id)+1);
function arcSpotlight(){if(state.order!=='arc')return '';const arc=arcInfo(),ids=arc.items.filter(id=>BY_ID[id]&&MCU.includes(BY_ID[id])),s=stats(ids),upcoming=nextOf(ids);return `<section class="arc-spotlight" aria-label="مسیر داستانی انتخاب‌شده"><div class="arc-identity"><span class="arc-stamp">${esc(arc.icon)}</span><div><div class="arc-overline">STORY CONNECTION / مسیر شخصیت‌ها</div><h2>${esc(arc.name)}</h2><p>${esc(arc.desc)}</p></div></div><div class="arc-progress"><strong>${num(s.percent)}٪</strong><span>${num(s.watched)} از ${num(s.count)} اثر</span><span>${duration(s.remaining)} باقی مانده</span></div>${upcoming?`<a class="arc-next" href="#title/${esc(upcoming.id)}">${ico('play',17)} ادامه این مسیر: <b dir="ltr">${esc(upcoming.title)}</b>${ico('arrow',16)}</a>`:'<div class="arc-next">این مسیر رو کامل دیدی!</div>'}</section>`}

function filterMCU(){let all=orderedMCU();if(state.mcuFilter!=='all')all=all.filter(f=>state.mcuFilter==='movie'?f.type==='movie':state.mcuFilter==='series'?f.type==='series'&&!isAnimation(f):state.mcuFilter==='animation'?isAnimation(f):f.type==='special');if(state.mcuStatus!=='all')all=all.filter(f=>state.mcuStatus==='watched'?done(f):state.mcuStatus==='remaining'?!done(f):watching(f));if(searchTerm.trim())all=all.filter(f=>[f.title,f.fa,META[f.id]?.summary].some(s=>(s||'').toLocaleLowerCase().includes(searchTerm.trim().toLocaleLowerCase())));return all}
function paginationData(results){const size=state.mcuPageSize==='all'?Math.max(1,results.length):state.mcuPageSize;const pages=Math.ceil(results.length/size)||1;const page=clamp(state.mcuPage,0,pages-1);if(page!==state.mcuPage)state.mcuPage=page;return {size,pages,page,paged:results.slice(page*size,(page+1)*size)};}
function paginationHTML(page,pages){if(state.mcuPageSize==='all')return `<div class="pagination pagination-all"><span>نمایش تمام ${num(filterMCU().length)} عنوان</span></div>`;return `<div class="pagination"><button data-action="page" data-value="-1" ${page===0?'disabled':''}>${ico('chevron',16)} قبلی</button><span>صفحه ${num(page+1)} از ${num(pages)}</span><button data-action="page" data-value="1" ${page>=pages-1?'disabled':''}>بعدی ${ico('arrow',16)}</button></div>`;}
function mcuResultCards(results,page,size){return results.map((f,i)=>state.mcuView==='grid'?filmCard(f,page*size+i+1,'mcu'):filmRow(f,page*size+i+1,'mcu')).join('')||empty('با تغییر فیلتر یا جست‌وجو دوباره امتحان کن.');}
function mcuPage(){const s=stats(MCU.map(f=>f.id)),visible=filterMCU(),{page,pages,size,paged}=paginationData(visible);
 return `<div class="page-intro mcu-heading ${state.order==='arc'?'arc-mode-intro':''}"><div class="page-kicker">THE COMPLETE UNIVERSE <span class="accent-slash">/</span> آرشیو</div><h1>جهان سینمایی <em>MCU</em></h1><p>فیلم‌ها، سریال‌ها و انیمیشن‌ها؛ بر اساس زمان اتفاقات، انتشار یا پیوستگی داستان شخصیت‌ها. پیشرفت تماشا بین همه حالت‌ها مشترکه.</p></div>
 <div class="mcu-overview ${state.order==='arc'?'arc-mode-global':''}"><div class="mcu-overview-top"><div><span class="overview-overline">MY MCU JOURNEY</span><h2>${num(s.watched)} <span>/ ${num(s.count)} عنوان دیده شده</span></h2><p>${duration(s.remaining)} برای کامل کردن آرشیو باقی مونده.</p></div><div class="mcu-percent">${num(s.percent)}<small>٪</small></div></div><div class="wide-meter"><span style="width:${s.percent}%"></span></div><div class="mcu-counts"><span>${num(MCU.filter(f=>f.type==='movie').length)} فیلم</span><span>${num(MCU.filter(f=>f.type==='series'&&!isAnimation(f)).length)} فصل سریال</span><span>${num(MCU.filter(isAnimation).length)} انیمیشن</span></div></div>
 ${nextShelf(orderedMCU().map(f=>f.id),'mcu','ادامه تماشا و پیشنهادهای بعدی','بر اساس ترتیب انتخابی تو؛ تغییر ترتیب، تیک‌ها رو تغییر نمی‌ده.')}
 <div class="catalog-bar"><div class="order-selector"><span>چیدمان بر اساس</span><div class="segmented"><button data-action="order" data-value="story" class="${state.order==='story'?'selected':''}">خط زمانی وقوع</button><button data-action="order" data-value="release" class="${state.order==='release'?'selected':''}">تاریخ انتشار</button><button data-action="order" data-value="arc" class="${state.order==='arc'?'selected':''}">پیوستگی روایی</button></div></div><div class="layout-switch"><button data-action="view" data-value="grid" title="نمای پوسترها" class="${state.mcuView==='grid'?'selected':''}">${ico('grid',18)}</button><button data-action="view" data-value="list" title="نمای فهرست" class="${state.mcuView==='list'?'selected':''}">${ico('list',18)}</button></div></div>
 ${state.order==='arc'?`<div class="arc-picker-wrap"><label class="arc-picker-label" for="arc-pick">${ico('layers',17)} مسیر کدوم شخصیت / گروه رو دنبال می‌کنی؟</label><select id="arc-pick" class="arc-picker">${Object.entries(STORY_ARCS).map(([key,arc])=>`<option value="${esc(key)}" ${state.arc===key?'selected':''}>${esc(arc.name)} (${num(arc.items.length)} اثر)</option>`).join('')}</select></div>${arcSpotlight()}`:''}
 <div class="catalog-controls"><div class="search-field">${ico('search',18)}<input id="search" type="search" placeholder="جست‌وجوی فیلم، سریال یا شخصیت..." value="${esc(searchTerm)}" autocomplete="off"/><kbd>⌘ K</kbd></div><label class="select-wrap"><span>وضعیت</span><select id="status-filter"><option value="all" ${state.mcuStatus==='all'?'selected':''}>همه وضعیت‌ها</option><option value="remaining" ${state.mcuStatus==='remaining'?'selected':''}>دیده‌نشده</option><option value="inprogress" ${state.mcuStatus==='inprogress'?'selected':''}>در حال تماشا</option><option value="watched" ${state.mcuStatus==='watched'?'selected':''}>دیده‌شده</option></select></label></div>
 ${filterButtons('mcu',[['all','همه'],['movie','فیلم‌ها'],['series','سریال‌ها'],['animation','انیمیشن‌ها'],['special','ویژه‌برنامه‌ها']],state.mcuFilter)}
 <div class="listing-top"><div><strong>${num(visible.length)} عنوان</strong><span> · ${state.order==='story'?'بر اساس خط زمانی وقوع':state.order==='release'?'بر اساس تاریخ انتشار':'پیوستگی روایی · '+esc(arcInfo().name)}</span></div><div class="listing-actions"><label class="page-size-picker" for="page-size"><span>تعداد در صفحه</span><select id="page-size" aria-label="تعداد عناوین هر صفحه">${[10,20,50,'all'].map(sz=>`<option value="${sz}" ${state.mcuPageSize===sz?'selected':''}>${sz==='all'?'همه':num(sz)}</option>`).join('')}</select></label><span class="page-total">${state.mcuPageSize==='all'?'همه عناوین':num(page+1)+' از '+num(pages)+' صفحه'}</span></div></div>
 <div class="${state.mcuView==='grid'?'poster-grid':'compact-list'}">${mcuResultCards(paged,page,size)}</div>
 <div class="pagination"><button data-action="page" data-value="-1" ${page===0?'disabled':''}>${ico('chevron',16)} قبلی</button><span>صفحه ${num(page+1)} از ${num(pages)}</span><button data-action="page" data-value="1" ${page>=pages-1?'disabled':''}>بعدی ${ico('arrow',16)}</button></div>
 <p class="footnote">خط زمانی، ترتیب تقریبی وقوع رویدادهاست؛ مسیرهای پیوستگی روایی انتخاب سردبیری‌اند و لزوماً فهرست رسمی مارول نیستند. تیک‌ها بین هر سه حالت مشترک‌اند. زمان سریال‌ها تقریبی است.</p>`}
function watchlistPage(){const a=state.saved.doomsday.filter(id=>BY_ID[id]),b=state.saved.mcu.filter(id=>BY_ID[id]);const r=stats(a),m=stats(b);return `<div class="page-intro"><div class="page-kicker">YOUR COLLECTION <span class="accent-slash">/</span> ذخیره‌شده‌ها</div><h1>واچ‌لیست <em>من</em></h1><p>آثاری که برای بعد کنار گذاشتی؛ واچ‌لیست Doomsday و آرشیو MCU مستقل هستند.</p></div><div class="watch-summary">${metric('bookmark','در لیست Doomsday',num(a.length),'باقی‌مانده: '+num(r.pending))}${metric('layers','در لیست MCU',num(b.length),'باقی‌مانده: '+num(m.pending))}${metric('clock','زمان لیست‌ها',duration(r.remaining+m.remaining),'تخمین مستقل هر لیست')}</div>${sectionTitle('واچ‌لیست Doomsday','آثار نشان‌گذاری‌شده در مسیر اصلی.')}<div class="route-list">${a.length?a.map((id,i)=>filmRow(BY_ID[id],i+1,'doomsday')).join(''):empty('هنوز موردی از مسیر Doomsday نشان‌گذاری نکردی.')}</div>${sectionTitle('واچ‌لیست MCU','فیلم‌ها و سریال‌های انتخابی از آرشیو.')}<div class="route-list">${b.length?b.map((id,i)=>filmRow(BY_ID[id],i+1,'mcu')).join(''):empty('از آرشیو MCU روی آیکن نشانک بزن تا اینجا اضافه بشه.')}</div>`}
function empty(m){return `<div class="empty"><span>${ico('search',28)}</span><b>موردی پیدا نشد</b><p>${m}</p></div>`}
/* v2.6: Film detail follows the Figma film-page composition: full-height poster, contextual backdrop, editorial content, and episode-first progress. */
function cinemaBackdropUrl(f){return posterUrl(f);}
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
        <img class="cinema-backdrop-img" src="${esc(cinemaBackdropUrl(f))}" alt="" loading="eager" referrerpolicy="no-referrer"/>
        <div class="cinema-scrim"></div>
      </div>
      <div class="cinema-story-content">
        <div class="cinema-pretitle"><span class="cinema-live-dot"></span><span dir="ltr">${tag}</span><span class="cinema-separator">/</span>${num(f.year)}</div>
        <h1 class="cinema-title" dir="ltr" lang="en">${esc(f.title)}</h1>
        <h2 class="cinema-subtitle">${esc(f.fa)}</h2>
        <div class="cinema-facts" aria-label="مشخصات اثر"><span>${ico('film',15)} ${kind(f)}</span><span>${ico('clock',15)} ${duration(f.minutes)}</span>${f.episodes?`<span>${ico('layers',15)} ${num(f.episodes)} قسمت</span>`:''}<span>${f.phase?'فاز '+num(f.phase):'جهان مستقل'}</span></div>
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
   <nav class="cinema-section-nav" aria-label="بخش‌های صفحه اثر">
     <button type="button" class="active" data-action="detail-jump" data-value="watch-progress">${ico('play',15)} پیگیری تماشا <span>${num(pct)}٪</span></button>
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
       <section class="cinema-panel cinema-story-section" id="story-info"><div class="cinema-section-head"><div><span class="cinema-kicker">THE STORY BEHIND IT</span><h2>درباره ${esc(f.fa)}</h2></div></div><p>${esc(META[id]?.summary||titleMetadata(id)?.overview||'')}</p>${titleMetadata(id)?.overview?`<p class="original-plot"><strong>خلاصه داستان از منبع:</strong> ${esc(titleMetadata(id).overview)}</p>`:''}${titleMetadata(id)?.source?`<div class="meta-source">برگرفته از ${titleMetadata(id).sourceUrl?`<a href="${esc(titleMetadata(id).sourceUrl)}" target="_blank" rel="noopener">${esc(titleMetadata(id).source)}</a>`:esc(titleMetadata(id).source)} · آخرین دریافت: ${esc((titleMetadata(id).fetchedAt||'').slice(0,10))}</div>`:''}${META[id]?.focus?`<div class="focus-note"><div>${ico('spark',18)} <strong>هنگام تماشا به چی توجه کنم؟</strong></div><p>${esc(META[id].focus)}</p></div>`:''}<div class="detail-tags">${inDoom?'<span>پیش‌نیاز Doomsday</span>':''}${OFFICIAL.has(id)?'<span>منتخب دیزنی+</span>':''}${isAnimation(f)?'<span>انیمیشن</span>':''}${f.universe==='fox'?'<span>جهان مردان ایکس</span>':''}</div></section>
     </main>
     <aside class="cinema-aside-column">
       <section class="cinema-panel cinema-notes-panel" id="my-notes"><span class="cinema-kicker">MY WATCH JOURNAL</span><h3>یادداشت‌های من</h3><p>نکته‌های داستان و شخصیت‌ها را برای مراجعه بعدی یادداشت کن.</p><textarea id="detail-notes" data-id="${esc(id)}" rows="6" maxlength="2500" placeholder="اینجا بنویس...">${esc(state.notes[id]||'')}</textarea><button class="btn btn-outline" data-action="save-note" data-id="${esc(id)}">${ico('check',15)} ذخیره یادداشت</button></section>
       <section class="cinema-panel cinema-facts-panel"><span class="cinema-kicker">FILM INFORMATION</span><h3>شناسنامه اثر</h3><dl><div><dt>سال انتشار</dt><dd>${num(f.year)}</dd></div><div><dt>نوع اثر</dt><dd>${kind(f)}</dd></div><div><dt>مدت</dt><dd>${duration(f.minutes)}</dd></div><div><dt>جهان</dt><dd>${f.universe==='mcu'?'MCU':f.universe==='fox'?'FOX / X-Men':'Marvel'}</dd></div></dl></section>
     </aside>
   </div>
   ${castSection(f)}
   ${relatives.length?`<section class="cinema-related" id="related-titles"><div class="cinema-section-head"><div><span class="cinema-kicker">KEEP EXPLORING</span><h2>داستان‌های مرتبط</h2><p>برای ادامه این مسیر، این عنوان‌ها را هم بررسی کن.</p></div></div><div class="poster-grid related-grid">${relatives.map(r=>filmCard(r,0,r.universe==='fox'?'doomsday':'mcu')).join('')}</div></section>`:''}
 </div>`;
}
function episodeCard(f,n){return episodeDisplay(f,n)}
function settingsPage(){return `<div class="page-intro"><div class="page-kicker">YOUR DATA <span class="accent-slash">/</span> تنظیمات</div><h1>اطلاعات <em>تماشا</em></h1><p>داده‌ها روی همین مرورگر ذخیره می‌شن و برای انتقالشون می‌تونی نسخه پشتیبان بگیری.</p></div><div class="settings-grid"><article class="setting-tile"><span>${ico('download',23)}</span><h3>دریافت پشتیبان</h3><p>پیشرفت دقیق قسمت‌ها، یادداشت‌ها، پوسترهای شخصی و واچ‌لیست‌ها رو به فایل JSON تبدیل کن.</p><button class="btn btn-primary" data-action="export">${ico('download',16)} دانلود پشتیبان</button></article><article class="setting-tile"><span>${ico('upload',23)}</span><h3>بازیابی از فایل</h3><p>از یک دستگاه یا مرورگر دیگه داده‌هات رو وارد کن؛ فایل نسخه قبلی هم پشتیبانی می‌شه.</p><button class="btn btn-outline" data-action="import">${ico('upload',16)} انتخاب فایل</button><input hidden id="import-file" type="file" accept="application/json,.json"/></article><article class="setting-tile"><span>${ico('spark',23)}</span><h3>ظاهر برنامه</h3><p>رنگ‌بندی پنل رو تغییر بده. حالت سینمایی تیره برای پوسترها پیشنهاد می‌شه.</p><button class="btn btn-outline" data-action="theme">${state.theme==='dark'?'نمای روشن':'نمای تیره'}</button></article><article class="setting-tile"><span>${ico('settings',23)}</span><h3>بازگردانی اطلاعات اولیه</h3><p>پیشرفت، یادداشت‌ها و واچ‌لیست‌ها پاک می‌شن و از ابتدا شروع می‌کنی.</p><button class="btn btn-danger" data-action="reset">بازنشانی اطلاعات</button></article></div><article class="setting-tile pwa-install"><span>↧</span><h3>نصب مسیر مارول</h3><p>برنامه را به صفحه اصلی گوشی یا منوی برنامه‌های رایانه اضافه کن.</p><button class="btn btn-outline" data-install-app>نصب برنامه</button><p id="install-hint" aria-live="polite"></p></article><div class="setting-footnote slim"><h3>اعتبار داده و تصاویر</h3><p>منبع تصاویر و بخشی از اطلاعات TMDB و TVmaze است. اطلاعات بر اساس آرشیو ذخیره‌شده است و ممکن است در منبع کامل نباشد. This product uses the TMDB API but is not endorsed or certified by TMDB. این پروژه غیررسمی است.</p><div class="credit-pills"><a class="credit-pill" href="https://www.themoviedb.org/" target="_blank" rel="noopener">TMDB</a><a class="credit-pill" href="https://developer.themoviedb.org/docs/faq" target="_blank" rel="noopener">شرایط استفاده از تصاویر</a></div></div>`}
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
function adminShell(body,title){const nav=[['dashboard','داشبورد مدیریت','grid'],['posters','مدیریت کاورها','film'],['metadata','اطلاعات آثار','layers'],['people','بازیگران','users']];const current=activePage().name;return `<div class="app-shell admin-app"><aside class="sidebar"><a class="logo" href="#dashboard"><span class="logo-mark">M<span>／</span></span><span class="logo-name"><b>مدیریت مارول</b><small>ADMIN CONSOLE</small></span></a><div class="nav-caption">${posterAdmin.authorized?'ابزارهای مدیر':'ورود مدیر'}</div>${posterAdmin.authorized?`<nav class="nav-column" aria-label="منوی مدیریت">${nav.map(([k,name,ic])=>`<a class="nav-link ${current===k?'active':''}" href="#${k}">${ico(ic,19)}<span>${name}</span></a>`).join('')}</nav>`:''}<div class="sidebar-spacer"></div><a class="admin-viewer-link" href="/">${ico('external',18)} <span>مشاهده پنل کاربری</span></a><div class="sidebar-end">MARVEL PATH <span> / </span> ADMIN</div></aside><div class="workspace"><header class="topbar"><div class="mobile-logo"><span class="mini-m">M</span>مدیریت مارول</div><div class="breadcrumb">SYSTEM / <b>${esc(title)}</b></div><div class="top-actions"><span class="local-dot"></span><span class="storage-label">سرور محلی</span>${posterAdmin.authorized?`<button type="button" class="admin-signout" data-admin-action="logout">خروج مدیر</button>`:''}</div></header><main id="main-content" class="main-content">${body}</main><footer class="main-footer">پنل مدیریت محلی · فقط برای مدیریت رسانه‌ها و اطلاعات آثار · فایل‌های شخصی تماشا مستقل باقی می‌مانند</footer></div>${posterAdmin.authorized?`<nav class="mobile-nav" aria-label="ناوبری مدیریت">${nav.map(([k,name,ic])=>`<a class="nav-link ${current===k?'active':''}" href="#${k}">${ico(ic,19)}<span>${name}</span></a>`).join('')}</nav>`:''}</div>`}
function seoRoute(){const path=location.pathname.replace(/^\/|\/$/g,'');if(!path||path==='index.html')return 'doomsday';if(path==='archive')return 'mcu';if(path==='actors')return 'people';if(/^(title|person)\/[a-z0-9-]+$/.test(path))return path;if(['settings','watchlist'].includes(path))return path;return 'doomsday';}
function seoPath(route){if(route==='doomsday')return '/';if(route==='mcu')return '/archive/';if(route==='people')return '/actors/';if(/^(title|person)\/[a-z0-9-]+$/.test(route)||['settings','watchlist'].includes(route))return '/'+route+'/';return null;}
function seoLinks(){document.querySelectorAll('a[href^="#"]').forEach(a=>{const href=seoPath(a.getAttribute('href').slice(1));if(href)a.setAttribute('href',href);});}
function activePage(){
 let h='';try{h=decodeURIComponent((location.hash?location.hash.replace(/^#/,''):seoRoute()))}catch(_){h=''};
 if(ADMIN_MODE){if(h.startsWith('person/'))return {name:'person',id:h.slice(7)};return {name:['dashboard','posters','metadata','people'].includes(h)?h:'dashboard'}}
 if(h.startsWith('title/'))return {name:'title',id:h.slice(6)};
 if(h.startsWith('person/'))return {name:'person',id:h.slice(7)};
 return {name:['doomsday','mcu','watchlist','people','settings'].includes(h)?h:'doomsday'};
}
function render(){
 const p=activePage();document.documentElement.dataset.theme=state.theme;
 let body,title;
 {
   if(p.name==='title'){body=detailPage(p.id);title=BY_ID[p.id]?.fa||'جزئیات اثر'}
   else if(p.name==='person'){body=personPage(p.id);title='پروفایل بازیگر'}
   else if(p.name==='people'){body=peoplePage();title='بازیگران'}
   else if(p.name==='mcu'){body=mcuPage();title='آرشیو MCU'}
   else if(p.name==='watchlist'){body=watchlistPage();title='واچ‌لیست من'}
   else if(p.name==='settings'){body=settingsPage();title='تنظیمات'}
   else{body=doomsdayPage();title='مسیر Doomsday'}
 }
 document.getElementById('app').innerHTML=shell(body,title);
 seoLinks();
 document.querySelectorAll('.poster-image').forEach(img=>{if(img.complete&&!img.naturalWidth)img.classList.add('broken')});
 if(typeof loadInfoForPage==='function')setTimeout(()=>loadInfoForPage(p),0);
}
function goHash(){const p=activePage();if(location.hash){const path=seoPath(location.hash.slice(1));if(path&&path!==location.pathname){location.assign(path);return;}}if(p.name==='title'){try{detailOrigin=sessionStorage.getItem('marvel-path-origin')||'mcu';}catch(_){}}if(p.name==='title'){const ref=document.referrer; /* origin stays last main page visited */}else detailOrigin=p.name;render();window.scrollTo({top:0,behavior:'instant'})}
window.addEventListener('hashchange',goHash);
function setComplete(f,full){if(f.episodes)state.episodes[f.id]=full?Array.from({length:f.episodes},(_,i)=>i+1):[];else state.progress[f.id]=full?maxVal(f):0;if(full)delete state.watching[f.id];else delete state.watching[f.id];save();render();toast(full?'به‌عنوان دیده‌شده ثبت شد.':'وضعیت تماشا پاک شد.')}
function toggleEp(f,n){const old=new Set(getEpisodes(f));if(old.has(n))old.delete(n);else old.add(n);state.episodes[f.id]=[...old].sort((a,b)=>a-b);state.watching[f.id]=old.size>0&&old.size<f.episodes;if(old.size===f.episodes)delete state.watching[f.id];save();render();toast(`قسمت ${num(n)} ${old.has(n)?'دیده شد.':'از تماشا حذف شد.'}`)}
function toggleSave(f,scope){if(!['mcu','doomsday'].includes(scope))return;const s=new Set(state.saved[scope]);if(s.has(f.id))s.delete(f.id);else s.add(f.id);state.saved[scope]=[...s];save();render();toast(s.has(f.id)?'به واچ‌لیست اضافه شد.':'از واچ‌لیست حذف شد.')}
function exportState(){const data={version:2,exportedAt:new Date().toISOString(),...state};const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json;charset=utf-8'});const href=URL.createObjectURL(blob),a=document.createElement('a');a.href=href;a.download='marvel-path-backup-'+new Date().toISOString().slice(0,10)+'.json';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(href),2000);toast('فایل پشتیبان دریافت شد.')}
async function importState(file){try{const data=JSON.parse(await file.text());if(!data||!data.progress||typeof data.progress!=='object'||![1,2].includes(data.version))throw Error('invalid');if(!confirm('اطلاعات تماشای فعلی با فایل انتخاب‌شده جایگزین بشه؟'))return;state=data.version===1?upgrade(data):normalize(data);save();render();toast('پشتیبان با موفقیت بازیابی شد.')}catch(e){toast('فایل پشتیبان معتبر نیست.','error')}}
document.addEventListener('click',e=>{const a=e.target.closest('[data-action]');if(!a)return;const action=a.dataset.action,id=a.dataset.id,f=BY_ID[id],v=a.dataset.value,scope=a.dataset.scope;
if(action==='detail-jump'){const target=document.getElementById(v);if(target){document.querySelectorAll('.cinema-section-nav button').forEach(b=>b.classList.toggle('active',b.dataset.value===v));target.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});}return;}
if(action==='route-mode'&&['all','disney'].includes(v)){state.routeMode=v;state.routeStatus='all';save();render();toast(v==='disney'?'مسیر منتخب دیزنی+ فعال شد.':'مسیر پیشنهادی کامل فعال شد.');}
if(action==='filter'){if(scope==='route-status'){state.routeStatus=v}else{state.mcuFilter=v;state.mcuPage=0}save();render()}
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
 const panel=document.querySelector('.poster-grid,.compact-list');if(panel)panel.innerHTML=mcuResultCards(paged,page,size);
 const count=document.querySelector('.listing-top');if(count){count.querySelector('strong').textContent=`${num(visible.length)} عنوان`;const text=count.querySelector('.page-total');if(text)text.textContent=state.mcuPageSize==='all'?'همه عناوین':`${num(page+1)} از ${num(pages)} صفحه`;}
 const pager=document.querySelector('.pagination');if(pager)pager.outerHTML=paginationHTML(page,pages);
 }
if(e.target.id==='movie-range'){const f=BY_ID[e.target.dataset.id],v=Number(e.target.value);document.getElementById('slider-value').textContent=f.minutes==null?(v?'کامل':'ثبت نشده'):duration(v);document.querySelector('.detail-panel .wide-meter > span')?.style.setProperty('width',`${100*v/maxVal(f)}%`)}
});
document.addEventListener('change',e=>{if(e.target.id==='movie-range'){const f=BY_ID[e.target.dataset.id];if(f){state.progress[f.id]=Number(e.target.value);state.watching[f.id]=state.progress[f.id]>0&&state.progress[f.id]<maxVal(f);if(done(f))delete state.watching[f.id];save();render();toast('پیشرفت تماشا ذخیره شد.')}}
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
document.addEventListener('keydown',e=>{if(ADMIN_MODE)return;if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k'){e.preventDefault();if(activePage().name!=='mcu'){location.assign('/archive/');return;}requestAnimationFrame(()=>document.getElementById('search')?.focus())}});
try{const p=JSON.parse(document.getElementById('page-data')?.textContent||'null');if(p?.kind==='title'&&p.record){information.titles[p.id]=p.record;information.requested.add(p.id);}else if(p?.kind==='person'&&p.record){information.people[p.id]=p.record;information.personRequested.add(p.id);}}catch(_){}
if(location.hash){const path=seoPath(location.hash.slice(1));if(path&&path!==location.pathname){location.replace(path);}else{history.replaceState(null,'',location.pathname+location.search);goHash();}}else goHash();
new MutationObserver(seoLinks).observe(document.getElementById('app'),{childList:true,subtree:true});
document.addEventListener('click',e=>{const a=e.target.closest('a[href]');if(!a)return;const href=a.getAttribute('href');if(href==='/archive/'||href==='/actors/'||href==='/'){try{sessionStorage.setItem('marvel-path-origin',href==='/'?'doomsday':href==='/archive/'?'mcu':'people');}catch(_){}}});


if('serviceWorker' in navigator && (location.protocol==='https:' || ['localhost','127.0.0.1'].includes(location.hostname))){navigator.serviceWorker.register('/sw.js?v=3.4.0',{updateViaCache:'none'}).catch(()=>{});}

document.addEventListener('error',e=>{const img=e.target;if(img.matches?.('.actor-img img,.person-portrait img'))img.remove();else if(img.matches?.('.episode-still img'))img.parentNode.remove();},true);

let installPrompt=null;
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installPrompt=e;});
document.addEventListener('click',async e=>{if(!e.target.closest('[data-install-app]'))return;const hint=document.getElementById('install-hint');if(installPrompt){try{await installPrompt.prompt();await installPrompt.userChoice;}finally{installPrompt=null;}}else if(hint)hint.textContent=matchMedia('(display-mode: standalone)').matches?'برنامه در حالت نصب‌شده اجرا شده است.':'در Safari از Share و Add to Home Screen استفاده کن. در Chrome از منوی مرورگر گزینه Install app یا Add to Home Screen را انتخاب کن.';});
