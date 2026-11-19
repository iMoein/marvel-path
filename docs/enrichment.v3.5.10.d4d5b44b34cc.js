let selectedMetadataTitle = "";
'use strict';
/* Metadata UX. Title progress stays exclusively in the v2 localStorage schema. */
const information={titles:Object.create(null),people:Object.create(null),directory:publicPeopleDirectory,status:null,requested:new Set(),personRequested:new Set(),busy:false};

const titleMetadata=id=>information.titles[id]?.data||null;
const safePhoto=url=>{if(typeof url!=='string')return '';if(/^\.\/public-data\/images\/(?:people|remote)\/[a-z0-9-]+\.webp$/.test(url))return url;return Object.hasOwn(publicImageMap,url)?publicImageMap[url]:'';};
const picture=(src,caption,cls='actor-img')=>{const safe=safePhoto(src);return `<span class="${cls}">${safe?`<img src="${esc(safe)}" loading="lazy" alt="${esc(caption)}" referrerpolicy="no-referrer">`:''}<span class="actor-fallback">${esc((caption||'?').trim().charAt(0).toUpperCase())}</span></span>`};
const creditCard=(p)=>`<a class="cast-card" href="#person/${encodeURIComponent(p.personId)}" title="پروفایل ${esc(p.name)}">${picture(p.photo,p.name)}<span class="cast-actor" dir="ltr">${esc(p.name)}</span><span class="cast-character">${esc(p.character||'بازیگر')}</span></a>`;
function castSection(f){const meta=titleMetadata(f.id), cast=meta?.cast||[];if(information.titles[f.id]?.failed)return '<section class="cinema-panel metadata-empty"><p>دریافت اطلاعات اثر ناموفق بود.</p><button class="btn btn-outline" data-retry-info>تلاش دوباره</button></section>';
 const info=meta?.source?`اطلاعات: ${esc(meta.source)}`:'اطلاعات بازیگران';
 return `<section class="cinema-panel cast-panel" id="title-cast"><header class="cinema-section-head"><div><span class="cinema-kicker">CAST & CHARACTERS</span><h2>بازیگران و نقش‌ها</h2><p>${info} · روی هر بازیگر بزن تا حضورهایش در آثار دیگر را ببینی.</p></div><a class="small-btn" href="#people">همه بازیگران</a></header>${cast.length?`<div class="cast-grid">${cast.slice(0,16).map(creditCard).join('')}</div>${cast.length>16?`<details class="cast-rest"><summary>نمایش ${num(cast.length-16)} بازیگر دیگر</summary><div class="cast-grid">${cast.slice(16).map(creditCard).join('')}</div></details>`:''}`:`<div class="metadata-empty">${ico('info',23)}<div><strong>هنوز فهرست بازیگران این اثر ذخیره نشده.</strong><p>هنوز اطلاعات بازیگران این اثر به کتابخانه اضافه نشده است.</p></div>${ADMIN_MODE&&posterAdmin.authorized?`<button class="small-btn" data-info-action="sync-title" data-id="${esc(f.id)}">دریافت اطلاعات این اثر</button>`:''}</div>`}</section>`;
}
function episodeDisplay(f,n){const meta=titleMetadata(f.id),ep=meta?.episodes?.find(x=>x.number===n)||null;
 const title=ep?.name||META[f.id]?.episodes?.[n-1]||`Episode ${n}`;
 const checked=getEpisodes(f).includes(n);
 const image=safePhoto(ep?.image);
 return `<article class="episode episode-rich ${checked?'episode-checked':''}" data-episode="${n}">${image?`<div class="episode-still"><img alt="تصویر قسمت ${num(n)}" src="${esc(image)}" loading="lazy" /></div>`:''}<div class="ep-rich-body"><div class="ep-rich-head"><span class="ep-number" aria-hidden="true"><span class="ep-number-label" lang="en">EP</span><span class="ep-number-value">${num(n)}</span></span><div><h4 dir="ltr" lang="en">${esc(title)}</h4><small>قسمت ${num(n)}${ep?.runtime?' · '+duration(ep.runtime):''}${ep?.airDate?' · '+esc(ep.airDate):''}</small></div></div>${ep?.overview?`<p class="ep-synopsis">${esc(ep.overview)}</p>`:meta?.source?'<p class="ep-synopsis subtle">برای این قسمت هنوز خلاصه‌ای در منبع ثبت نشده است.</p>':''}<button type="button" class="episode-watch-button ${checked?'checked':''}" role="checkbox" aria-checked="${checked}" data-action="episode" data-id="${esc(f.id)}" data-value="${n}">${ico('check',15)} ${checked?'دیده‌شده؛ برای لغو بزن':'ثبت تماشای قسمت'}</button></div></article>`;
}
function peoplePage(){const items=information.directory?.items||[],busy=!information.directory;
 return `<div class="page-intro"><span class="page-kicker">THE PEOPLE BEHIND THE STORIES</span><h1>بازیگران <em>مارول</em></h1><p>پروفایل‌ها از روی حضور واقعی بازیگران در عناوین ذخیره‌شده به هم متصل می‌شن.</p></div><div class="people-toolbar"><label class="vault-search">${ico('search',17)}<input id="people-search" placeholder="نام بازیگر یا شخصیت..." autocomplete="off" value="${esc(peopleSearchTerm)}" /></label><span>${num(items.length)} بازیگر در آرشیو</span></div><div id="people-results" class="people-directory">${peopleCards(items,peopleSearchTerm)}</div>${busy?'<p class="metadata-empty">در حال بارگذاری فهرست بازیگران…</p>':''}`;
}
let peopleSearchTerm='';
let publicPeoplePage=0;
function peopleCards(items,term=''){
 const q=term.toLowerCase().trim();
 const chosen=items.filter(p=>(p.name+' '+(p.credits||[]).map(c=>c.character||'').join(' ')).toLowerCase().includes(q));
 const pages=Math.max(1,Math.ceil(chosen.length/60));
 publicPeoplePage=Math.max(0,Math.min(publicPeoplePage,pages-1));
 const cards=chosen.slice(publicPeoplePage*60,(publicPeoplePage+1)*60).map(p=>`<a class="people-card" href="#person/${encodeURIComponent(p.id)}">${picture(p.photo,p.name)}<strong dir="ltr">${esc(p.name)}</strong><span>${num((p.credits||[]).length)} حضور در آرشیو</span></a>`).join('');
 if(!cards)return '<div class="metadata-empty">بازیگری با این نام پیدا نشد.</div>';
 return cards+(pages>1?`<div class="public-people-pager"><button class="btn btn-outline" data-people-page="-1" ${publicPeoplePage===0?'disabled':''}>قبلی</button><span>صفحه ${num(publicPeoplePage+1)} از ${num(pages)} · ${num(chosen.length)} بازیگر</span><button class="btn btn-outline" data-people-page="1" ${publicPeoplePage===pages-1?'disabled':''}>بعدی</button></div>`:'');
}
function personPage(id){const data=information.people[id],p=data?.data;
 if(data?.failed)return '<div class="metadata-empty"><p>دریافت اطلاعات ممکن نشد. اتصال اینترنت را بررسی کنید.</p><button class="btn btn-outline" data-retry-info>تلاش دوباره</button></div>';
 if(!p)return `<div class="page-intro"><h1>پروفایل بازیگر</h1><p>${data?.missing?'این بازیگر در آرشیو فعلی ثبت نشده.':'در حال خواندن پروفایل و فیلموگرافی…'}</p><a class="btn btn-outline" href="#people">بازگشت به فهرست</a></div>`;
 const films=p.credits||[],external=(p.filmography||[]).filter(x=>x?.name);
 return `<div class="person-profile"><a class="film-backlink" href="#people">${ico('back',16)} بازگشت به بازیگران</a><section class="person-hero">${picture(p.photo,p.name,'person-portrait')}<div class="person-intro"><span class="cinema-kicker">ACTOR PROFILE / ${esc(p.source||'LOCAL CATALOGUE')}</span><h1 dir="ltr">${esc(p.name)}</h1>${p.birthDate?`<p>تولد: ${esc(p.birthDate)}${p.birthPlace?' · '+esc(p.birthPlace):''}</p>`:''}<p>${esc(p.bio||'پروفایل این بازیگر بر اساس نقش‌ها و حضورهای ثبت‌شده در آرشیو شخصی مارول ساخته شده است.')}</p><div class="person-counter">${num(films.length)} حضور در مجموعه خودت</div>${ADMIN_MODE&&posterAdmin.authorized?`<div class="person-admin-controls"><button class="btn btn-primary" data-info-action="sync-person" data-id="${esc(id)}">${ico('download',16)} یافتن خودکار اطلاعات و عکس</button>${posterAdmin.authorized?`<button class="btn btn-outline" data-info-action="upload-person-photo" data-id="${esc(id)}">${ico('upload',16)} آپلود عکس دلخواه</button><input hidden type="file" accept="image/jpeg,image/png,image/webp" id="person-photo-upload-${esc(id)}" data-person-id="${esc(id)}" />` :''}</div>${!p.tmdbId&&posterAdmin.authorized?`<div class="person-tmdb-manual"><label for="person-tmdb-id">اگر بازیگر به اشتباه شناسایی شد یا نتیجه‌ای نداشت، شناسه TMDB اون رو وارد کن.</label><div><input id="person-tmdb-id" type="number" min="1" placeholder="شناسه عددی بازیگر در TMDB" /><button class="btn btn-outline" data-info-action="link-person" data-id="${esc(id)}">ثبت شناسه</button></div></div>`:''}`:''}</div></section><section class="cinema-panel person-credits"><div class="cinema-section-head"><div><span class="cinema-kicker">IN YOUR MARVEL LIBRARY</span><h2>فیلم‌ها و سریال‌های این بازیگر</h2></div></div><div class="person-film-grid">${films.map(c=>{const f=BY_ID[c.id];return f?`<a class="person-film" href="${ADMIN_MODE?'/#title/':'#title/'}${esc(c.id)}">${poster(f)}<div><strong dir="ltr">${esc(f.title)}</strong><span>${esc(c.character||'بازیگر')} · ${num(f.year)}</span><small>${kind(f)}</small></div></a>`:''}).join('')}</div></section>${external.length?`<section class="cinema-panel person-outside"><h2>سایر آثار در فیلموگرافی</h2><p>این عناوین لزوماً در آرشیو Marvel Path وجود ندارند.</p><div class="external-film-list">${external.map(x=>`<div><strong dir="ltr">${esc(x.name)}</strong><span>${esc(x.year||'—')} · ${esc(x.character||'')}</span></div>`).join('')}</div></section>`:''}</div>`;
}
async function publicJson(path){
 const ctl=new AbortController();const timer=setTimeout(()=>ctl.abort(),12000);
 try{const r=await fetch(path+'?v=3.5.10',{signal:ctl.signal});if(!r.ok)throw new Error('HTTP '+r.status);return await r.json();}finally{clearTimeout(timer);}
}
async function loadInfoForPage(page){
 if(page.name==='title'&&BY_ID[page.id]&&!information.requested.has(page.id)){
  information.requested.add(page.id);
  try{information.titles[page.id]=await publicJson('./public-data/titles/'+encodeURIComponent(page.id)+'.json');}catch(_){information.titles[page.id]={ready:false,failed:true};}
  if(activePage().name==='title'&&activePage().id===page.id)render();
 }
 if(page.name==='person'&&/^[a-z0-9-]{1,110}$/.test(page.id)&&!information.personRequested.has(page.id)){
  information.personRequested.add(page.id);
  try{information.people[page.id]=await publicJson('./public-data/people/'+encodeURIComponent(page.id)+'.json');}catch(_){information.people[page.id]={failed:true};}
  if(activePage().name==='person'&&activePage().id===page.id)render();
 }
}
document.addEventListener('click',e=>{const b=e.target.closest('[data-retry-info]');if(!b)return;const page=activePage();if(page.name==='title'){information.requested.delete(page.id);delete information.titles[page.id];}else if(page.name==='person'){information.personRequested.delete(page.id);delete information.people[page.id];}else return;render();});
document.addEventListener('input',e=>{if(e.target.id==='people-search'){peopleSearchTerm=e.target.value;publicPeoplePage=0;const el=document.getElementById('people-results');if(el)el.innerHTML=peopleCards(information.directory?.items||[],peopleSearchTerm);}});

document.addEventListener('click',e=>{
 const b=e.target.closest('[data-people-page]');
 if(!b||b.disabled)return;
 publicPeoplePage+=Number(b.dataset.peoplePage);
 const el=document.getElementById('people-results');
 if(el){el.innerHTML=peopleCards(information.directory?.items||[],peopleSearchTerm);el.scrollIntoView({block:'start',behavior:'instant'});}
});
