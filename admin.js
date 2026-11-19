'use strict';
/* The admin app is deliberately optional. Public clients read local posters
   but cannot access write endpoints; only a loopback Python server offers them. */
let localPosterManifest = Object.create(null);
const posterAdmin = {
  available:false, authorized:false, busy:false, token:'', search:'', filter:'missing', job:null,
  lastError:'', loginError:'', lastSync:0,
};
const isLoopback = ['127.0.0.1','localhost'].includes(location.hostname);
const ADMIN_MODE = isLoopback && /\/admin\.html$/.test(location.pathname);
// Administrative credentials live in memory only, never in persistent browser storage.
try{sessionStorage.removeItem('marvel-poster-admin-token')}catch(_){}
function localCover(f){
  const entry = localPosterManifest[f.id];
  if(!entry || !/^assets\/posters\/[a-z0-9-]+\.(?:jpg|png|webp)$/.test(entry.path))return '';
  return './' + entry.path + '?v=' + encodeURIComponent(entry.revision||1);
}
async function fetchPosterManifest(){
  let data;
  try{
    const res=await fetch('/api/posters/manifest',{cache:'no-store'});
    if(res.ok)data=await res.json();
  }catch(_){}
  if(!data){
    try{const res=await fetch('./assets/posters/manifest.json',{cache:'no-store'});if(res.ok)data=await res.json()}catch(_){}
  }
  if(data && typeof data==='object' && !Array.isArray(data)){
    localPosterManifest=data;
    posterAdmin.lastSync=Date.now();
    if(typeof render==='function')render();
  }
}
async function detectAdminServer(){
 if(!ADMIN_MODE || !isLoopback)return;
 try{
   const response=await fetch('/api/admin/status',{cache:'no-store'});
   const result=await response.json();
   posterAdmin.available=response.ok&&result.localServer===true;
 }catch(_){posterAdmin.available=false}
 if(ADMIN_MODE)render();
}
async function adminRequest(endpoint, options={}){
  const response=await fetch(endpoint,{
    ...options,
    cache:'no-store',
    headers:{'X-Marvel-Admin':posterAdmin.token,...(options.headers||{})},
  });
  let body;try{body=await response.json()}catch(_){body={}}
  if(!response.ok)throw new Error(body.error||body.message||`خطای ${response.status}`);
  return body;
}
async function checkAdminToken(showError=true){
 try{
   const data=await adminRequest('/api/admin/check');
   if(!data.authorized)throw Error('کد اشتباه است.');
   posterAdmin.authorized=true;
   posterAdmin.loginError='';
   return true;
 }catch(err){
   posterAdmin.authorized=false;
   if(showError)posterAdmin.loginError=err.message||'کد ورود معتبر نیست.';
   return false;
 }
}
function adminStatus(id){return localPosterManifest[id]?'local':'missing'}
function adminStats(){const saved=FILMS.filter(f=>adminStatus(f.id)==='local').length;return {saved,total:FILMS.length,missing:FILMS.length-saved}}
function adminFiltered(){return FILMS.filter(f=>{
  if(posterAdmin.filter==='missing'&&adminStatus(f.id)!=='missing')return false;
  if(posterAdmin.filter==='stored'&&adminStatus(f.id)!=='local')return false;
  const q=posterAdmin.search.trim().toLocaleLowerCase();
  return !q||(`${f.fa} ${f.title} ${f.year}`).toLocaleLowerCase().includes(q)
})}
function adminPosterCard(f){
 const entry=localPosterManifest[f.id];
 return `<article class="vault-card" data-poster-card="${esc(f.id)}"><div class="vault-card-cover"><a href="/#title/${esc(f.id)}" target="_blank" rel="noopener noreferrer">${poster(f,'vault-art')}</a></div><div class="vault-card-main"><div class="vault-card-title" dir="ltr" lang="en">${esc(f.title)}</div><p>${esc(f.fa)} · ${num(f.year)}</p><span class="vault-state ${entry?'vault-stored':'vault-missing'}">${entry?'● ذخیره‌شده روی دیسک':'○ نیاز به ذخیره'}</span>${entry?`<span class="vault-meta">${num(Math.round(entry.size/1024))} کیلوبایت · ${esc(entry.mime||'image')}</span>`:''}<div class="vault-operations"><button class="small-btn vault-save" data-admin-action="save" data-id="${esc(f.id)}" ${posterAdmin.busy?'disabled':''}>${ico('download',14)} ${entry?'دریافت دوباره':'ذخیره از اینترنت'}</button><button class="small-btn" data-admin-action="choose-file" data-id="${esc(f.id)}">${ico('upload',14)} بارگذاری فایل</button>${entry?`<button class="small-btn vault-delete" data-admin-action="delete" data-id="${esc(f.id)}">حذف نسخه محلی</button>`:''}</div><div class="vault-url-row"><input type="url" class="vault-url" data-id="${esc(f.id)}" dir="ltr" placeholder="https://... آدرس دلخواه (اختیاری)" aria-label="نشانی کاور سفارشی ${esc(f.fa)}"/></div></div></article>`
}
function adminPage(){
 const s=adminStats();
 const intro=`<div class="page-intro vault-intro"><div class="page-kicker">POSTER VAULT <span class="accent-slash">/</span> مدیریت سیستم</div><h1>آرشیو <em>کاورها</em></h1><p>تصویرهای ذخیره‌شده روی دیسک، در تمام دستگاه‌هایی که سایت رو باز می‌کنن نمایش داده می‌شن؛ بدون درخواست دوباره از منابع خارجی.</p></div>`;
 if(!isLoopback||!posterAdmin.available) return `${intro}<section class="vault-empty"><span>${ico('monitor',30)}</span><h2>سرور مدیریت کاور فعال نیست</h2><p>این بخش فقط روی کامپیوتر مدیر و با سرور داخلی برنامه کار می‌کنه. برای فعال‌کردنش فایل <code>START-MAC.command</code> یا <code>START-WINDOWS.bat</code> رو اجرا کن؛ اجرای ساده <code>python3 -m http.server</code> امکان ذخیره روی دیسک نداره.</p></section>`;
 if(!posterAdmin.authorized) return `${intro}<section class="vault-login"><span class="eyebrow">LOCAL ADMIN ACCESS</span><h2>ورود مدیر کاورها</h2><p>کد مدیریت در پنجره ترمینالِ اجرای برنامه نمایش داده می‌شه؛ همچنین داخل فایل مخفی <code>.admin-token</code> در پوشه پروژه ذخیره شده. این کد رو به هیچ‌کس نده.</p><form id="vault-login-form" class="vault-login-row"><input id="vault-admin-token" type="password" spellcheck="false" autocomplete="off" placeholder="کد دسترسی مدیر" aria-label="کد مدیر" required/><button class="btn btn-primary" type="submit">ورود به مدیریت</button></form>${posterAdmin.loginError?`<p class="vault-error">${esc(posterAdmin.loginError)}</p>`:''}</section>`;
 let items=adminFiltered();
 const job=posterAdmin.job;
 return `${intro}<div class="vault-summary"><div><small>کل عنوان‌ها</small><strong>${num(s.total)}</strong></div><div><small>کاورهای روی دیسک</small><strong class="green-text">${num(s.saved)}</strong></div><div><small>باقی‌مانده</small><strong>${num(s.missing)}</strong></div><div><small>پوشه ذخیره‌سازی</small><b dir="ltr">assets/posters/</b></div></div><div class="vault-meter"><span style="width:${s.total?s.saved/s.total*100:0}%"></span></div><section class="vault-controls"><div class="vault-buttons"><button class="btn btn-primary" data-admin-action="batch" ${job?.running?'disabled':''}>${ico('download',16)} ذخیره همه کاورهای ناقص (${num(s.missing)})</button><button class="btn btn-outline" data-admin-action="refresh">${ico('layers',16)} به‌روزرسانی فهرست</button><button class="btn btn-outline" data-admin-action="logout">${ico('settings',16)} خروج مدیر</button></div><p>برای عنوان‌هایی که نسخه محلی ندارن، چند منبع تصویر بررسی می‌شه. اگر تصویر مناسب پیدا نشد، فایل JPG، PNG یا WebP رو دستی بارگذاری کن.</p></section>${job?.running||job?.total?`<section class="vault-job"><div><b>${job.running?'در حال دریافت و ذخیره کاورها':'نتیجه ذخیره گروهی'}</b><span>${num(job.done)} از ${num(job.total)} · موفق ${num(job.success)} · ناموفق ${num(job.failed)}</span></div><div class="vault-meter"><span style="width:${job.total?job.done/job.total*100:0}%"></span></div>${job.last?`<p>آخرین عنوان: ${esc(job.last)}</p>`:''}${!job.running&&job.errors?.length?`<details><summary>مشاهده ${num(job.errors.length)} مورد ناموفق</summary><div class="vault-errors">${job.errors.map(x=>`<div>${esc(BY_ID[x.id]?.fa||x.id)} — ${esc(x.reason)}</div>`).join('')}</div></details>`:''}</section>`:''}<div class="vault-filter"><div class="vault-segment"><button class="${posterAdmin.filter==='missing'?'selected':''}" data-admin-action="filter" data-value="missing">ناقص‌ها</button><button class="${posterAdmin.filter==='stored'?'selected':''}" data-admin-action="filter" data-value="stored">ذخیره‌شده‌ها</button><button class="${posterAdmin.filter==='all'?'selected':''}" data-admin-action="filter" data-value="all">همه</button></div><label class="vault-search">${ico('search',16)}<input id="vault-search" type="search" placeholder="جست‌وجوی فیلم یا سریال..." value="${esc(posterAdmin.search)}"/></label></div><div class="vault-results-info">نمایش ${num(items.length)} عنوان</div><div class="vault-grid">${items.map(adminPosterCard).join('')||'<div class="vault-no-results">عنوانی در این گروه باقی نمونده.</div>'}</div><input hidden type="file" id="vault-file" accept="image/jpeg,image/png,image/webp"/><div class="vault-caution"><b>نکته برای انتشار عمومی</b><p>فایل‌های ذخیره‌شده در پوشه پروژه باقی می‌مونن، حتی اگر مرورگر پاک بشه. برای جابه‌جایی سایت، پوشه <code>assets/posters</code> رو همراه بقیه فایل‌ها منتقل کن. سرور مدیریت فقط روی دستگاه مدیر و با کد دسترسی اجرا می‌شه؛ برای انتشار عمومی از سرویس‌دهنده فایل‌های ایستا استفاده کن.</p></div>`;
}
async function refreshVault(repaint=true){
 try{
   const response=await fetch('/api/posters/manifest',{cache:'no-store'});
   if(!response.ok)throw Error('دریافت فهرست فایل‌ها ناموفق بود.');
   localPosterManifest=await response.json();
   if(repaint)render();
 }catch(err){toast(err.message||'خطا در خواندن کاورها','error')}
}
async function adminSaveOne(id){
 const f=BY_ID[id];if(!f)return;
 const chosen=document.querySelector(`.vault-url[data-id="${id}"]`)?.value.trim();
 const urls=[...(chosen?[chosen]:[]),...posterCandidates(f).filter(u=>!u.startsWith('./'))];
 posterAdmin.busy=true;toast('در حال دریافت تصویر…');
 try{const res=await adminRequest('/api/admin/posters/save',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,urls})});await refreshVault(false);toast('کاور «'+f.fa+'» روی دیسک ذخیره شد.');}
 catch(err){toast('ذخیره نشد: '+err.message,'error')}
 finally{posterAdmin.busy=false;render()}
}
async function adminUploadOne(id,file){
 if(!file||!BY_ID[id])return;
 if(file.size>9*1024*1024){toast('حجم تصویر باید کمتر از ۹ مگابایت باشه.','error');return}
 posterAdmin.busy=true;
 try{await adminRequest('/api/admin/posters/upload?id='+encodeURIComponent(id),{method:'POST',headers:{'Content-Type':file.type||'application/octet-stream'},body:file});await refreshVault(false);toast('تصویر انتخابی ذخیره شد.');}
 catch(err){toast('بارگذاری ناموفق بود: '+err.message,'error')}
 finally{posterAdmin.busy=false;render()}
}
async function adminDeleteOne(id){
 if(!confirm('فایل محلی این کاور حذف بشه؟ تصویر اینترنتی همچنان قابل نمایش خواهد بود.'))return;
 try{await adminRequest('/api/admin/posters/delete',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id})});await refreshVault(false);render();toast('نسخه محلی حذف شد.');}
 catch(err){toast(err.message,'error')}
}
async function adminBatch(){
 const entries=FILMS.filter(f=>!localPosterManifest[f.id]).map(f=>({id:f.id,urls:posterCandidates(f).filter(u=>!u.startsWith('./'))}));
 if(!entries.length){toast('همه کاورها قبلاً ذخیره شدن.');return}
 if(!confirm(`برای ${entries.length} عنوانِ فاقد کاور، دریافت از اینترنت شروع بشه؟ فایل‌ها در پوشه پروژه ذخیره می‌شن.`))return;
 try{
   await adminRequest('/api/admin/posters/batch',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({entries})});
   posterAdmin.job={running:true,total:entries.length,done:0,success:0,failed:0,last:'',errors:[]};
   render();
   pollPosterJob();
 }catch(err){toast('امکان شروع دریافت گروهی نیست: '+err.message,'error')}
}
let jobTimer=null;
async function pollPosterJob(){
 if(jobTimer)return;
 const run=async()=>{
   try{
     const j=await adminRequest('/api/admin/posters/job');
     posterAdmin.job=j;
     await refreshVault(false);
     if(ADMIN_MODE)render();
     if(j.running){jobTimer=setTimeout(run,1000)}else{
       jobTimer=null;
       toast(`ذخیره گروهی پایان یافت: ${num(j.success)} موفق، ${num(j.failed)} ناموفق.`);
     }
   }catch(err){jobTimer=null;toast('دریافت وضعیت دانلود ناموفق بود.','error')}
 };
 jobTimer=setTimeout(run,300);
}
// One delegated listener for admin-only controls; does not interfere with player actions.
document.addEventListener('click',async evt=>{
 if(!ADMIN_MODE)return;
 const button=evt.target.closest('[data-admin-action]');if(!button)return;
 const action=button.dataset.adminAction,id=button.dataset.id;
 if(action==='filter'){posterAdmin.filter=button.dataset.value;render();return}
 if(action==='logout'){posterAdmin.authorized=false;posterAdmin.token='';sessionStorage.removeItem('marvel-poster-admin-token');render();return}
 if(action==='refresh'){await refreshVault();return}
 if(!posterAdmin.authorized)return;
 if(action==='save')await adminSaveOne(id);
 if(action==='delete')await adminDeleteOne(id);
 if(action==='batch')await adminBatch();
 if(action==='choose-file'){const input=document.getElementById('vault-file');if(input){input.dataset.id=id;input.value='';input.click()}}
});
document.addEventListener('submit',async evt=>{
 if(!ADMIN_MODE)return;
 if(evt.target.id!=='vault-login-form')return;
 evt.preventDefault();
 posterAdmin.token=document.getElementById('vault-admin-token')?.value.trim()||'';
 const ok=await checkAdminToken();
 if(ok){toast('مدیریت کاورها فعال شد.');try{const j=await adminRequest('/api/admin/posters/job');posterAdmin.job=j;if(j.running)pollPosterJob()}catch(_){}}
 render();
});
document.addEventListener('input',evt=>{
 if(!ADMIN_MODE)return;
 if(evt.target.id!=='vault-search')return;
 posterAdmin.search=evt.target.value;
 const grid=document.querySelector('.vault-grid');
 if(grid)grid.innerHTML=adminFiltered().map(adminPosterCard).join('')||'<div class="vault-no-results">نتیجه‌ای پیدا نشد.</div>';
 const info=document.querySelector('.vault-results-info');if(info)info.textContent='نمایش '+num(adminFiltered().length)+' عنوان';
});
document.addEventListener('change',async evt=>{
 if(!ADMIN_MODE)return;
 if(evt.target.id==='vault-file'&&evt.target.files?.[0])await adminUploadOne(evt.target.dataset.id,evt.target.files[0]);
});
window.addEventListener('load',async()=>{await Promise.all([fetchPosterManifest(),detectAdminServer()]);
 if(ADMIN_MODE&&posterAdmin.available&&posterAdmin.authorized){try{const j=await adminRequest('/api/admin/posters/job');posterAdmin.job=j;if(j.running)pollPosterJob()}catch(_){}}
});
