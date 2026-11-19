'use strict';
/* Metadata UX. Title progress stays exclusively in the v2 localStorage schema. */
const information={titles:Object.create(null),people:Object.create(null),directory:null,status:null,requested:new Set(),personRequested:new Set(),busy:false};
const titleMetadata=id=>information.titles[id]?.data||null;
const safePhoto=url=>{if(typeof url!=='string')return '';if(/^https:\/\/(image\.tmdb\.org|static\.tvmaze\.com|cdn\.tvmaze\.com)\//.test(url))return url;if(/^\.?\/?assets\/people\/[a-z0-9-]+\.(?:jpg|jpeg|png|webp)$/.test(url))return url;return '';};
const picture=(src,caption,cls='actor-img')=>{const safe=safePhoto(src);return `<span class="${cls}">${safe?`<img src="${esc(safe)}" loading="lazy" alt="${esc(caption)}" referrerpolicy="no-referrer" onerror="this.remove()">`:''}<span class="actor-fallback">${esc((caption||'?').trim().charAt(0).toUpperCase())}</span></span>`};
const creditCard=(p)=>`<a class="cast-card" href="#person/${encodeURIComponent(p.personId)}" title="پروفایل ${esc(p.name)}">${picture(p.photo,p.name)}<span class="cast-actor" dir="ltr">${esc(p.name)}</span><span class="cast-character">${esc(p.character||'بازیگر')}</span></a>`;
function castSection(f){const meta=titleMetadata(f.id), cast=meta?.cast||[];
 const info=meta?.source?`اطلاعات: ${esc(meta.source)}`:'اطلاعات بازیگران';
 return `<section class="cinema-panel cast-panel" id="title-cast"><header class="cinema-section-head"><div><span class="cinema-kicker">CAST & CHARACTERS</span><h2>بازیگران و نقش‌ها</h2><p>${info} · روی هر بازیگر بزن تا حضورهایش در آثار دیگر را ببینی.</p></div><a class="small-btn" href="#people">همه بازیگران</a></header>${cast.length?`<div class="cast-grid">${cast.slice(0,16).map(creditCard).join('')}</div>${cast.length>16?`<details class="cast-rest"><summary>نمایش ${num(cast.length-16)} بازیگر دیگر</summary><div class="cast-grid">${cast.slice(16).map(creditCard).join('')}</div></details>`:''}`:`<div class="metadata-empty">${ico('info',23)}<div><strong>هنوز فهرست بازیگران این اثر ذخیره نشده.</strong><p>هنوز اطلاعات بازیگران این اثر به کتابخانه اضافه نشده است.</p></div>${ADMIN_MODE&&posterAdmin.authorized?`<button class="small-btn" data-info-action="sync-title" data-id="${esc(f.id)}">دریافت اطلاعات این اثر</button>`:''}</div>`}</section>`;
}
function episodeDisplay(f,n){const meta=titleMetadata(f.id),ep=meta?.episodes?.find(x=>x.number===n)||null;
 const title=ep?.name||META[f.id]?.episodes?.[n-1]||`Episode ${n}`;
 const checked=getEpisodes(f).includes(n);
 const image=safePhoto(ep?.image)||(/^https:\/\/(image\.tmdb\.org|static\.tvmaze\.com|cdn\.tvmaze\.com)\//.test(ep?.image||'')?ep.image:'');
 return `<article class="episode episode-rich ${checked?'episode-checked':''}" data-episode="${n}">${image?`<div class="episode-still"><img alt="تصویر قسمت ${num(n)}" src="${esc(image)}" loading="lazy" onerror="this.parentNode.remove()" /></div>`:''}<div class="ep-rich-body"><div class="ep-rich-head"><span class="ep-number">${num(n)}</span><div><h4 dir="ltr" lang="en">${esc(title)}</h4><small>قسمت ${num(n)}${ep?.runtime?' · '+duration(ep.runtime):''}${ep?.airDate?' · '+esc(ep.airDate):''}</small></div></div>${ep?.overview?`<p class="ep-synopsis">${esc(ep.overview)}</p>`:meta?.source?'<p class="ep-synopsis subtle">برای این قسمت هنوز خلاصه‌ای در منبع ثبت نشده است.</p>':''}<button type="button" class="episode-watch-button ${checked?'checked':''}" role="checkbox" aria-checked="${checked}" data-action="episode" data-id="${esc(f.id)}" data-value="${n}">${ico('check',15)} ${checked?'دیده‌شده؛ برای لغو بزن':'ثبت تماشای قسمت'}</button></div></article>`;
}
function peoplePage(){const items=information.directory?.items||[],busy=!information.directory;
 return `<div class="page-intro"><span class="page-kicker">THE PEOPLE BEHIND THE STORIES</span><h1>بازیگران <em>مارول</em></h1><p>پروفایل‌ها از روی حضور واقعی بازیگران در عناوین ذخیره‌شده به هم متصل می‌شن.</p></div><div class="people-toolbar"><label class="vault-search">${ico('search',17)}<input id="people-search" placeholder="نام بازیگر یا شخصیت..." autocomplete="off" value="${esc(peopleSearchTerm)}" /></label><span>${num(items.length)} بازیگر در آرشیو</span></div><div id="people-results" class="people-directory">${peopleCards(items,peopleSearchTerm)}</div>${busy?'<p class="metadata-empty">در حال خواندن فهرست بازیگران از دیسک…</p>':''}`;
}
let peopleSearchTerm='';
function peopleCards(items,term=''){const q=term.toLowerCase().trim();const chosen=items.filter(p=>(p.name+' '+p.credits.map(c=>c.character).join(' ')).toLowerCase().includes(q));return chosen.length?chosen.map(p=>`<a class="people-card" href="#person/${encodeURIComponent(p.id)}">${picture(p.photo,p.name)}<strong dir="ltr">${esc(p.name)}</strong><span>${num(p.credits.length)} حضور در آرشیو</span></a>`).join(''):'<div class="metadata-empty">بازیگری با این نام پیدا نشد.</div>'}
function personPage(id){const data=information.people[id],p=data?.data;
 if(!p)return `<div class="page-intro"><h1>پروفایل بازیگر</h1><p>${data?.missing?'این بازیگر در آرشیو فعلی ثبت نشده.':'در حال خواندن پروفایل و فیلموگرافی…'}</p><a class="btn btn-outline" href="#people">بازگشت به فهرست</a></div>`;
 const films=p.credits||[],external=(p.filmography||[]).filter(x=>x?.name);
 return `<div class="person-profile"><a class="film-backlink" href="#people">${ico('back',16)} بازگشت به بازیگران</a><section class="person-hero">${picture(p.photo,p.name,'person-portrait')}<div class="person-intro"><span class="cinema-kicker">ACTOR PROFILE / ${esc(p.source||'LOCAL CATALOGUE')}</span><h1 dir="ltr">${esc(p.name)}</h1>${p.birthDate?`<p>تولد: ${esc(p.birthDate)}${p.birthPlace?' · '+esc(p.birthPlace):''}</p>`:''}<p>${esc(p.bio||'پروفایل این بازیگر بر اساس نقش‌ها و حضورهای ثبت‌شده در آرشیو شخصی مارول ساخته شده است.')}</p><div class="person-counter">${num(films.length)} حضور در مجموعه خودت</div>${ADMIN_MODE&&posterAdmin.authorized?`<div class="person-admin-controls"><button class="btn btn-primary" data-info-action="sync-person" data-id="${esc(id)}">${ico('download',16)} یافتن خودکار اطلاعات و عکس</button>${posterAdmin.authorized?`<button class="btn btn-outline" data-info-action="upload-person-photo" data-id="${esc(id)}">${ico('upload',16)} آپلود عکس دلخواه</button><input hidden type="file" accept="image/jpeg,image/png,image/webp" id="person-photo-upload-${esc(id)}" data-person-id="${esc(id)}" />` :''}</div>${!p.tmdbId&&posterAdmin.authorized?`<div class="person-tmdb-manual"><label for="person-tmdb-id">اگر بازیگر به اشتباه شناسایی شد یا نتیجه‌ای نداشت، شناسه TMDB اون رو وارد کن.</label><div><input id="person-tmdb-id" type="number" min="1" placeholder="شناسه عددی بازیگر در TMDB" /><button class="btn btn-outline" data-info-action="link-person" data-id="${esc(id)}">ثبت شناسه</button></div></div>`:''}`:''}</div></section><section class="cinema-panel person-credits"><div class="cinema-section-head"><div><span class="cinema-kicker">IN YOUR MARVEL LIBRARY</span><h2>فیلم‌ها و سریال‌های این بازیگر</h2></div></div><div class="person-film-grid">${films.map(c=>{const f=BY_ID[c.id];return f?`<a class="person-film" href="${ADMIN_MODE?'/#title/':'#title/'}${esc(c.id)}">${poster(f)}<div><strong dir="ltr">${esc(f.title)}</strong><span>${esc(c.character||'بازیگر')} · ${num(f.year)}</span><small>${kind(f)}</small></div></a>`:''}).join('')}</div></section>${external.length?`<section class="cinema-panel person-outside"><h2>سایر آثار در فیلموگرافی</h2><p>این عناوین لزوماً در آرشیو Marvel Path وجود ندارند.</p><div class="external-film-list">${external.slice(0,48).map(x=>`<div><strong dir="ltr">${esc(x.name)}</strong><span>${x.year||'—'} · ${esc(x.character||'')}</span></div>`).join('')}</div></section>`:''}</div>`;
}
function metadataAdminPage(){const s=information.status||{ready:0,total:FILMS.length,people:0,tmdbConfigured:false,job:{}};const j=s.job||{};
 if(!isLoopback||!posterAdmin.available)return `<div class="page-intro"><h1>اطلاعات <em>آثار</em></h1><p>برای دریافت و ذخیره فراداده‌ها، برنامه رو با START-MAC.command یا START-WINDOWS.bat اجرا کن.</p></div>`;
 if(!ADMIN_MODE || !posterAdmin.authorized)return `<div class="page-intro"><span class="page-kicker">METADATA ADMINISTRATION</span><h1>مدیریت <em>اطلاعات آثار</em></h1><p>برای همگام‌سازی بازیگران و قسمت‌ها با کد مدیریت محلی وارد شو. همین کد برای مدیریت کاورها هم استفاده می‌شه.</p></div><section class="vault-login"><h2>ورود مدیر</h2><form id="metadata-login-form" class="vault-login-row"><input id="metadata-admin-token" type="password" placeholder="کد مدیر در پنجره ترمینال" autocomplete="off" required><button class="btn btn-primary" type="submit">ورود</button></form></section>`;
 return `<div class="page-intro"><span class="page-kicker">METADATA LIBRARY / مدیریت سیستم</span><h1>اطلاعات <em>آثار و بازیگران</em></h1><p>خلاصه داستان، عوامل، عکس بازیگران و توضیح قسمت‌ها رو دریافت و روی دیسک ذخیره کن؛ یک بار دانلود برای استفاده‌های بعدی.</p></div><div class="metadata-stats"><div><span>عنوان‌های آماده</span><strong>${num(s.ready)} / ${num(s.total)}</strong></div><div><span>تصاویر ذخیره‌شده بازیگران</span><strong>${num(s.peopleWithPhotos||0)} / ${num(s.people)}</strong><small>${num(s.peopleMissingPhotos??s.people)} عکس باقی‌مانده</small></div><div><span>TMDB API</span><strong>${s.tmdbConfigured?'فعال':'تنظیم‌نشده'}</strong></div></div><section class="cinema-panel metadata-admin-info"><h2>۱. منبع کامل اطلاعات</h2><p>برای گرفتن اطلاعات کامل‌تر بازیگران، نقش‌ها، تصاویر پرتره و خلاصه قسمت‌ها، توکن خواندن API را از حساب رایگان TMDB وارد کن. توکن فقط در فایل مخفی روی لپ‌تاپ ذخیره می‌شود.</p><div class="token-row"><input type="password" id="tmdb-token" placeholder="TMDB API Read Access Token یا API Key" autocomplete="off" spellcheck="false"/><button data-info-action="save-token" class="btn btn-outline">ذخیره کلید</button>${s.tmdbConfigured?'<button class="small-btn" data-info-action="clear-token">حذف کلید</button>':''}</div><p class="meta-hint"><a href="https://www.themoviedb.org/settings/api" target="_blank" rel="noopener">دریافت کلید از TMDB</a> · برای دریافت تصاویر و شناسایی بازیگران، اعتبارنامه TMDB الزامی است. در نبود آن، فقط داده‌های پایه و بعضی سریال‌ها در دسترس‌اند.</p></section><section class="cinema-panel metadata-admin-info"><h2>۲. دانلود و نگهداری داده‌ها</h2><p>هر عنوان یک فایل JSON مستقل دارد. اگر اطلاعات جدیدی پیدا شود، می‌توانی دوباره همگام‌سازی کنی. پیشرفت تماشا دست نخورده باقی می‌ماند.</p><div class="metadata-buttons"><button class="btn btn-primary" data-info-action="sync-all" ${j.running?'disabled':''}>${ico('download',16)} دریافت اطلاعات تمام ${num(FILMS.length)} عنوان</button><button class="btn btn-outline" data-info-action="sync-people" ${j.running?'disabled':''}>${ico('users',16)} تکمیل خودکار عکس و پروفایل بازیگران (${num(s.peopleMissingPhotos??s.people)})</button><a class="btn btn-outline" href="#people">${ico('layers',16)} مشاهده بازیگران</a><button class="btn btn-outline" data-info-action="refresh-status">به‌روزرسانی وضعیت</button></div><div class="metadata-single-sync"><label for="metadata-title-picker">همگام‌سازی اطلاعات یک عنوان</label><div><select id="metadata-title-picker" aria-label="عنوان موردنظر">${FILMS.map(f=>`<option value="${esc(f.id)}">${esc(f.fa)} (${esc(f.title)})</option>`).join('')}</select><button class="btn btn-outline" data-info-action="sync-selected-title" ${j.running?'disabled':''}>${ico('download',16)} دریافت اطلاعات این عنوان</button></div></div>${j.running||j.total?`<div class="meta-job"><div>${j.mode==='people'?'دریافت عکس و اطلاعات بازیگران':'دریافت فراداده فیلم‌ها و سریال‌ها'} — ${j.running?'در حال انجام':'پایان‌یافته'} · ${num(j.done||0)} از ${num(j.total||0)} · موفق ${num(j.success||0)} · ناموفق ${num(j.failed||0)}${j.mode==='people'?' · عکس محلی '+num(j.photosSaved||0):''}</div><div class="cinema-progress-track"><span style="width:${j.total?(j.done/j.total*100):0}%"></span></div>${!j.running&&j.errors?.length?`<details><summary>${num(j.errors.length)} مورد ناموفق</summary>${j.errors.map(x=>`<p>${esc(BY_ID[x.id]?.fa||information.directory?.items?.find(p=>p.id===x.id)?.name||x.id)}: ${esc(x.message)}</p>`).join('')}</details>`:''}</div>`:''}</section><section class="cinema-panel metadata-admin-info"><h2>منابع و محل ذخیره‌سازی</h2><p>TMDB برای فیلم، سریال، بازیگر و قسمت‌ها؛ TVmaze برای اطلاعات سریال بدون کلید؛ و مرجع عمومی MCU برای برخی اطلاعات پایه. هیچ متن بدون منبعی به‌عنوان داده تاییدشده مارول نمایش داده نمی‌شود.</p><code dir="ltr">assets/metadata/ · assets/people/</code><p>داده‌های شخصی تماشا در LocalStorage می‌مانند. این بخش فقط هنگام اجرای سرور محلی قابل تغییر است.</p></section>`;
}
let metadataTimer=null;
async function loadInfoForPage(page){
 if(page.name==='title'&&BY_ID[page.id]&&!information.requested.has(page.id)){
    information.requested.add(page.id);
    try{const r=await fetch('/api/metadata/title?id='+encodeURIComponent(page.id),{cache:'no-store'});if(r.ok){information.titles[page.id]=await r.json();}else information.titles[page.id]={ready:false};}catch(_){information.titles[page.id]={ready:false}}
    if(activePage().name==='title'&&activePage().id===page.id)render();
 }
 if(page.name==='person'&&!information.personRequested.has(page.id)){
    information.personRequested.add(page.id);
    try{const r=await fetch('/api/metadata/person?id='+encodeURIComponent(page.id),{cache:'no-store'});information.people[page.id]=r.ok?await r.json():{missing:true};}catch(_){information.people[page.id]={missing:true}}
    if(activePage().name==='person'&&activePage().id===page.id)render();
 }
 if(page.name==='people'&&!information.directory){
    information.directory={items:[]};
    try{const r=await fetch('/api/metadata/people',{cache:'no-store'});if(r.ok)information.directory=await r.json();}catch(_){ }
    if(activePage().name==='people')render();
 }
 if(ADMIN_MODE && posterAdmin.authorized && ['metadata','dashboard'].includes(page.name) && isLoopback && (!information.status||Date.now()-(information.lastStatus||0)>4000)){
    information.lastStatus=Date.now();
    try{const r=await fetch('/api/metadata/status',{cache:'no-store'});if(r.ok){information.status=await r.json(); if(['metadata','dashboard'].includes(activePage().name))render();if(information.status.job?.running&&!metadataTimer)metadataTimer=setTimeout(pollMetadataJob,1300)}}catch(_){}
 }
}
async function pollMetadataJob(){metadataTimer=null;if(!information.status?.job?.running)return;
 try{const r=await fetch('/api/metadata/status',{cache:'no-store'});if(r.ok){information.status=await r.json();information.lastStatus=Date.now();if(['metadata','dashboard'].includes(activePage().name))render();if(information.status.job?.running)metadataTimer=setTimeout(pollMetadataJob,1100);else{information.requested.clear();information.personRequested.clear();information.directory=null;toast('همگام‌سازی اطلاعات آثار پایان یافت.')}}}catch(_){metadataTimer=setTimeout(pollMetadataJob,3500)}
}
async function infoSync(ids){if(!ADMIN_MODE || !posterAdmin.authorized){location.hash=ADMIN_MODE?'#posters':'#dashboard';toast('برای دریافت اطلاعات، ابتدا با کد مدیر وارد شو.','error');return;}
 try{const res=await adminRequest('/api/admin/metadata/sync',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({ids})});information.status={...(information.status||{}),job:res.job};if(activePage().name==='metadata')render();if(!metadataTimer)metadataTimer=setTimeout(pollMetadataJob,900);toast('دریافت اطلاعات شروع شد.')}catch(e){toast(e.message,'error')}
}
document.addEventListener('click',async event=>{
 if(!ADMIN_MODE)return;
 const btn=event.target.closest('[data-info-action]');if(!btn)return;
 const action=btn.dataset.infoAction,id=btn.dataset.id;
 if(action==='sync-selected-title'){const selected=document.getElementById('metadata-title-picker')?.value;return selected&&BY_ID[selected]?infoSync([selected]):toast('عنوان معتبر نیست.','error')}
 if(action==='sync-title')return infoSync([id]);
 if(action==='sync-all')return infoSync(FILMS.map(f=>f.id));
 if(action==='sync-people'){
  if(!ADMIN_MODE || !posterAdmin.authorized){toast('ابتدا وارد مدیریت سیستم شو.','error');return;}
  if(!information.status?.tmdbConfigured){toast('برای دریافت عکس بازیگران، ابتدا اعتبارنامه TMDB را در بالا ثبت کن.','error');return;}
  try{const r=await adminRequest('/api/admin/metadata/people/sync',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({onlyMissing:true})});information.status={...(information.status||{}),job:r.job};render();if(r.job?.running&&!metadataTimer)metadataTimer=setTimeout(pollMetadataJob,950);toast(r.job?.total?'دریافت گروهی بازیگران آغاز شد.':'همه عکس‌های بازیگران از قبل ذخیره شده‌اند.');}catch(e){toast(e.message,'error')}
  return;
 }
 if(action==='link-person'){
  if(!ADMIN_MODE || !posterAdmin.authorized){toast('برای ثبت شناسه، ابتدا با کد مدیر وارد شو.','error');return;}
  try{const value=document.getElementById('person-tmdb-id')?.value;const r=await adminRequest('/api/admin/metadata/person/link',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,tmdbId:value})});information.people[id]={ready:true,data:{...information.people[id].data,tmdbId:r.tmdbId}};render();toast('شناسه بازیگر ثبت شد. اکنون دریافت اطلاعات را بزن.');}catch(e){toast(e.message,'error')}
  return;
 }
 if(action==='upload-person-photo'){
  if(!ADMIN_MODE || !posterAdmin.authorized){toast('برای بارگذاری عکس، ابتدا با کد مدیر وارد شو.','error');return;}
  document.getElementById('person-photo-upload-'+id)?.click();return;
 }
 if(action==='refresh-status'){information.status=null;loadInfoForPage({name:'metadata'});return;}
 if(action==='save-token'||action==='clear-token'){
  if(!ADMIN_MODE || !posterAdmin.authorized){toast('ابتدا از بخش مدیریت کاورها با کد مدیر وارد شو.','error');return;}
  try{const t=action==='clear-token'?'':(document.getElementById('tmdb-token')?.value||'').trim();const r=await adminRequest('/api/admin/metadata/token',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token:t})});information.status={...(information.status||{}),tmdbConfigured:r.tmdbConfigured};render();toast('تنظیم منبع اطلاعات ذخیره شد.')}catch(e){toast(e.message,'error')}
 }
 if(action==='sync-person'){
  if(!ADMIN_MODE || !posterAdmin.authorized){location.hash=ADMIN_MODE?'#posters':'#dashboard';toast('ابتدا با کد مدیر وارد شو.','error');return;}
  try{const r=await adminRequest('/api/admin/metadata/person',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id})});information.people[id]={ready:true,data:{...(information.people[id]?.data||{}),...r.data}};render();toast('پروفایل بازیگر به‌روز شد.')}catch(e){toast(e.message,'error')}
 }
});
document.addEventListener('submit',async event=>{if(!ADMIN_MODE||event.target.id!=='metadata-login-form')return;event.preventDefault();posterAdmin.token=document.getElementById('metadata-admin-token')?.value.trim()||'';if(await checkAdminToken())toast('مدیریت اطلاعات فعال شد.');else toast('کد مدیریت معتبر نیست.','error');render();});
document.addEventListener('change',async event=>{
 if(!ADMIN_MODE)return;
 const fileInput=event.target.closest('input[data-person-id]');if(!fileInput)return;
 const file=fileInput.files?.[0];if(!file)return;
 const pid=fileInput.dataset.personId;
 if(!ADMIN_MODE || !posterAdmin.authorized){toast('ابتدا وارد مدیریت سیستم شو.','error');return;}
 if(file.size>4_000_000){toast('حجم تصویر باید کمتر از ۴ مگابایت باشه.','error');return;}
 try{
  const res=await adminRequest('/api/admin/metadata/person/photo?id='+encodeURIComponent(pid),{method:'POST',headers:{'Content-Type':file.type||'application/octet-stream'},body:file});
  information.people[pid]={ready:true,data:res.data};
  information.directory=null;
  render();toast('عکس بازیگر روی دیسک ذخیره شد.');
 }catch(e){toast(e.message,'error')}
});
document.addEventListener('input',event=>{if(event.target.id!=='people-search')return;peopleSearchTerm=event.target.value;const el=document.getElementById('people-results');if(el)el.innerHTML=peopleCards(information.directory?.items||[],peopleSearchTerm)});
