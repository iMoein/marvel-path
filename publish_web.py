#!/usr/bin/env python3
"""Add crawlable entry points, same-origin PWA assets, and social previews to the public build."""
import html,json,re,shutil,subprocess
import boot_shell
from pathlib import Path
from urllib.parse import urlparse
from xml.etree.ElementTree import Element,SubElement,ElementTree
ROOT=Path(__file__).resolve().parent
OUT=ROOT/'docs'; P=OUT/'public-data'
VERSION='3.5.8'; SITE='https://marvel.imoein.com'
OG='/assets/social/og.jpg'
def esc(s):return html.escape(str(s or ''),quote=True)
def get(p):return json.loads(p.read_text())
def clip(s,n=155):return (s[:n-1].rsplit(' ',1)[0]+'…') if len(s)>n else s
def jscript(obj):return json.dumps(obj,ensure_ascii=False,separators=(',',':')).replace('<','\\u003c').replace('>','\\u003e').replace('&','\\u0026')
def link(path,label):return f'<a href="{esc(path)}">{esc(label)}</a>'
def absimg(s):
    if isinstance(s,str) and s.startswith('./public-data/') and (OUT/s[2:]).is_file():return '/'+s[2:]
    return ''
def pic(s,alt):
    return f'<img src="{esc(s)}" alt="{esc(alt)}" loading="lazy" width="160" height="240">' if s else ''
def add(path,href):
    if not path.is_file():raise RuntimeError(f'missing asset: {href}')
def main():
    for folder in ('icons','social'):shutil.copytree(ROOT/'assets'/folder,OUT/'assets'/folder,dirs_exist_ok=True)
    shutil.copy2(ROOT/'assets/favicon.ico',OUT/'favicon.ico')
    shutil.copy2(OUT/'assets/icons/icon-180.png',OUT/'apple-touch-icon.png')
    manifest={'id':'/','name':'مسیر مارول | Marvel Path','short_name':'مسیر مارول','description':'راهنمای غیررسمی ترتیب تماشا، آرشیو آثار، بازیگران و پیگیری پیشرفت شخصی.','lang':'fa','dir':'rtl','start_url':'/','scope':'/','display':'standalone','background_color':'#0c0d11','theme_color':'#0c0d11','icons':[{'src':f'/assets/icons/icon-{n}.png','sizes':f'{n}x{n}','type':'image/png','purpose':'any'} for n in (192,512)]+[{'src':'/assets/icons/maskable-512.png','sizes':'512x512','type':'image/png','purpose':'maskable'}],'shortcuts':[{'name':'مسیر Doomsday','url':'/'},{'name':'آرشیو MCU','url':'/archive/'},{'name':'بازیگران','url':'/actors/'}]}
    (OUT/'manifest.webmanifest').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
    node="const fs=require('fs'),vm=require('vm'); const src=fs.readFileSync('data.js','utf8')+'\\n'+fs.readFileSync('meta.js','utf8')+'\\nJSON.stringify({films:FILMS,mcu:MCU.map(f=>f.id),route:DOOMSDAY,meta:META,guide:HOME_GUIDE})'; console.log(vm.runInNewContext(src));"
    data=json.loads(subprocess.check_output(['node','-e',node],cwd=ROOT,text=True))
    films={f['id']:f for f in data['films']}; meta=data['meta']; actors=get(P/'people.json')['items']; people={a['id']:a for a in actors}; poster=get(P/'poster-urls.json'); images=get(P/'image-cache.json')
    head=(OUT/'index.html').read_text()
    head=head.replace("base-uri 'none'","base-uri 'self'; manifest-src 'self'; worker-src 'self'")
    head=head.replace('<head>','<head>\n<base href="/"/>')
    head=re.sub(r'<link rel="canonical"[^>]+>\s*','',head)
    head=re.sub(r'<meta name="description"[^>]+>\s*','',head)
    head=re.sub(r'<title>.*?</title>\s*','',head)
    head=head.replace('v=3.3.1','v='+VERSION)
    head=head.replace('<link rel="icon" type="image/svg+xml" href="assets/favicon.svg"/>','''<link rel="icon" href="/favicon.ico" sizes="any"/>
<link rel="icon" type="image/svg+xml" href="/assets/favicon.svg"/>
<link rel="icon" type="image/png" sizes="32x32" href="/assets/icons/icon-32.png"/>
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png"/>
<link rel="manifest" href="/manifest.webmanifest"/>
<meta name="apple-mobile-web-app-capable" content="yes"/>
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent"/>
<meta name="apple-mobile-web-app-title" content="مسیر مارول"/>
<meta name="application-name" content="Marvel Path"/>''')
    assert '<base href="/"/>' in head and 'manifest.webmanifest' in head
    head=head.replace('</head>','<!--PAGE-META-->\n</head>')
    head=head.replace('<div id="app"></div>','<div id="app"><!--PAGE-CONTENT--></div>')
    head=head.replace('<script src="app.js?v='+VERSION+'"></script>','<!--PAGE-DATA-->\n<script src="app.js?v='+VERSION+'"></script>')
    urls=[]
    nav='<nav class="seo-nav" aria-label="صفحات اصلی">'+''.join(link(p,l) for p,l in [('/','مسیر Doomsday'),('/archive/','آرشیو MCU'),('/actors/','بازیگران')])+'</nav>'
    def static(title,body):return f'<main class="seo-content" id="main-content">{nav}<h1>{esc(title)}</h1>{body}<p class="seo-note">مسیر مارول؛ پروژه هواداری غیررسمی برای دنبال کردن داستان‌ها و ثبت پیشرفت تماشا. پخش فیلم در سایت ارائه نمی‌شود.</p></main>'
    def page(path,title,desc,body,schema=None,record=None,index=True):
        canonical=SITE+path
        description=clip(' '.join(desc.split()),155)
        tags=[f'<title>{esc(title)}</title>',f'<meta name="description" content="{esc(description)}"/>',f'<link rel="canonical" href="{esc(canonical)}"/>',f'<meta name="robots" content="{"index,follow,max-image-preview:large" if index else "noindex,follow"}"/>']
        props={'og:type':'website','og:site_name':'Marvel Path | مسیر مارول','og:locale':'fa_IR','og:title':title,'og:description':description,'og:url':canonical,'og:image':SITE+OG,'og:image:secure_url':SITE+OG,'og:image:type':'image/jpeg','og:image:width':'1200','og:image:height':'630','og:image:alt':'پوستر معرفی اپلیکیشن مسیر مارول'}
        tags.extend(f'<meta property="{k}" content="{esc(v)}"/>' for k,v in props.items())
        for k,v in {'twitter:card':'summary_large_image','twitter:title':title,'twitter:description':description,'twitter:image':SITE+OG,'twitter:image:alt':'پوستر معرفی اپلیکیشن مسیر مارول'}.items():tags.append(f'<meta name="{k}" content="{esc(v)}"/>')
        if schema:
            tags.append('<script type="application/ld+json">'+jscript(schema)+'</script>')
        code=head.replace('<!--PAGE-META-->','\n'.join(tags)).replace('<!--PAGE-CONTENT-->',body).replace('<!--PAGE-DATA-->','<script type="application/json" id="page-data">'+jscript(record)+'</script>' if record is not None else '')
        code=boot_shell.insert_shell(boot_shell.prepare_head(code),path,title)
        dest=OUT/path.strip('/')/'index.html';dest.parent.mkdir(parents=True,exist_ok=True);dest.write_text(code,encoding='utf-8')
        if index:urls.append(canonical)
    def list_titles(ids):return '<ul class="seo-catalog">'+''.join('<li>'+link('/title/'+fid+'/',films[fid]['fa']+' — '+films[fid]['title'])+'</li>' for fid in ids if fid in films)+'</ul>'
    def list_people(items):return '<ul class="seo-catalog">'+''.join('<li>'+link('/person/'+a['id']+'/',a['name'])+'</li>' for a in items)+'</ul>'
    rootdesc='راهنمای فارسی ترتیب تماشای آثار مارول، مسیر پیشنهادی آمادگی برای Avengers: Doomsday، آرشیو MCU، بازیگران و ثبت پیشرفت تماشا.'
    root_schema={'@context':'https://schema.org','@graph':[{'@type':'WebSite','@id':SITE+'/#website','name':'Marvel Path | مسیر مارول','url':SITE+'/','inLanguage':'fa'},{'@type':'WebApplication','@id':SITE+'/#app','name':'مسیر مارول','url':SITE+'/','description':rootdesc,'applicationCategory':'EntertainmentApplication','operatingSystem':'Web','inLanguage':'fa','isAccessibleForFree':True,'image':SITE+OG}]}
    guide=data['guide']
    guide_html='<section aria-labelledby="seo-guide-title"><h2 id="seo-guide-title">'+esc(guide['title'])+'</h2>'+''.join('<p>'+esc(p)+'</p>' for p in guide['paragraphs'])+'<p><a href="'+esc(guide['repo'])+'" target="_blank" rel="noopener noreferrer">'+esc(guide['linkLabel'])+'</a></p></section>'
    page('/','مسیر مارول | ترتیب تماشای MCU و مسیر Doomsday',rootdesc,static('مسیر مارول؛ راهنمای تماشای دنیای مارول','<p>'+esc(rootdesc)+'</p><h2>مسیر پیشنهادی Doomsday</h2>'+list_titles(data['route'])+'<h2>آرشیو آثار و بازیگران</h2><p>'+link('/archive/','همه فیلم‌ها و سریال‌های آرشیو')+' · '+link('/actors/','فهرست بازیگران مارول')+'</p>'+guide_html),root_schema)
    page('/archive/','آرشیو MCU و فیلم‌ها و سریال‌های مارول | مسیر مارول','فهرست فیلم‌ها، سریال‌ها و ویژه‌برنامه‌های آرشیو مارول؛ داستان، بازیگران، قسمت‌ها و ترتیب تماشا.',static('آرشیو فیلم‌ها و سریال‌های مارول','<p>فهرست '+str(len(films))+' عنوان ثبت‌شده در آرشیو مسیر مارول، شامل آثار MCU و جهان‌های مرتبط.</p><h2>همه عناوین</h2>'+list_titles(list(films))))
    page('/actors/','بازیگران مارول؛ نقش‌ها و آثار | مسیر مارول','فهرست بازیگران آرشیو مارول، نقش‌ها، پروفایل و فیلموگرافی در مسیر مارول.',static('بازیگران مارول','<p>فهرست '+str(len(actors))+' بازیگر مرتبط با آثار آرشیو. برای مشاهده نقش‌ها و آثار روی نام بازیگر بزنید.</p>'+list_people(actors)))
    for private,label in [('settings','تنظیمات'),('watchlist','واچ‌لیست من')]:
        page('/'+private+'/',label+' | مسیر مارول','فضای شخصی ثبت و مدیریت اطلاعات تماشا.',static(label,'<p>این بخش اطلاعات شخصی را فقط در مرورگر شما ذخیره می‌کند.</p>'),index=False)
    for fid,f in films.items():
        raw=get(P/'titles'/(fid+'.json')); d=raw.get('data') or {}
        name=f['fa']+' — '+f['title']; desc=meta.get(fid,{}).get('summary') or d.get('overview') or 'اطلاعات و نقش‌های ثبت‌شده این اثر در مسیر مارول.'
        path='/title/'+fid+'/'
        typ='Movie' if f['type'] in ('movie','special') else 'TVSeason'
        body='<div class="seo-hero">'+pic(absimg(poster.get(fid)),f['fa'])+'<div><p>'+esc(desc)+'</p><p>سال: '+esc(f['year'])+' · '+esc(f.get('episodes') or f.get('minutes'))+(' قسمت' if f.get('episodes') else ' دقیقه')+'</p></div></div>'
        cast=[c for c in d.get('cast',[]) if c.get('personId') in people]
        if cast:body+='<h2>بازیگران و نقش‌ها</h2><ul class="seo-catalog">'+''.join('<li>'+link('/person/'+c['personId']+'/',c['name'])+(' — '+esc(c['character']) if c.get('character') else '')+'</li>' for c in cast)+'</ul>'
        if d.get('episodes'):body+='<h2>قسمت‌ها</h2><ol>'+''.join('<li>'+esc(e.get('name') or 'قسمت '+str(e.get('number','')))+' — '+esc(e.get('overview') or '')+'</li>' for e in d['episodes'])+'</ol>'
        schema={'@context':'https://schema.org','@type':typ,'name':f['title'],'alternateName':f['fa'],'url':SITE+path,'description':desc}
        if typ=='Movie':schema['datePublished']=f['release'];schema['duration']='PT'+str(f['minutes'])+'M'
        elif f.get('episodes'):schema['numberOfEpisodes']=f['episodes']
        if absimg(poster.get(fid)):schema['image']=SITE+absimg(poster[fid])
        if cast:schema['actor']=[{'@type':'Person','name':c['name'],'url':SITE+'/person/'+c['personId']+'/'} for c in cast]
        page(path,f['fa']+' ('+str(f['year'])+') | '+f['title']+' | مسیر مارول',desc,static(name,body),schema,{'kind':'title','id':fid,'record':raw})
    for a in actors:
        aid=a['id'];raw=get(P/'people'/(aid+'.json'));d=raw.get('data') or a
        credits=[c for c in d.get('credits',a.get('credits',[])) if c.get('id') in films]
        desc=a['name']+'؛ بازیگر مرتبط با '+('، '.join(films[c['id']]['fa'] for c in credits[:4]) if credits else 'آثار ثبت‌شده در آرشیو مارول')+'. مشاهده نقش‌ها و فیلموگرافی در مسیر مارول.'
        ph=absimg(d.get('photo')) or absimg(images.get(d.get('photo')))
        body='<div class="seo-hero">'+pic(ph,a['name'])+'<div><p>'+esc(desc)+'</p>'+('<p>'+esc(d['bio'])+'</p>' if d.get('bio') else '')+'</div></div>'
        if credits:body+='<h2>حضور در آثار مارول</h2><ul class="seo-catalog">'+''.join('<li>'+link('/title/'+c['id']+'/',films[c['id']]['title'])+(' — '+esc(c['character']) if c.get('character') else '')+'</li>' for c in credits)+'</ul>'
        if d.get('filmography'):body+='<h2>فیلموگرافی ثبت‌شده</h2><ul class="seo-catalog">'+''.join('<li>'+esc(c.get('name',''))+(' ('+esc(c.get('year'))+')' if c.get('year') else '')+'</li>' for c in d['filmography'] if c.get('name'))+'</ul>'
        path='/person/'+aid+'/'
        schema={'@context':'https://schema.org','@type':'Person','name':a['name'],'url':SITE+path}
        if ph:schema['image']=SITE+ph
        if d.get('bio'):schema['description']=d['bio']
        if d.get('birthDate') and re.fullmatch(r'\d{4}-\d{2}-\d{2}',d['birthDate']):schema['birthDate']=d['birthDate']
        # Avoid indexing empty profiles, but keep all actual pages reachable.
        page(path,a['name']+' | بازیگران مارول | مسیر مارول',desc,static(a['name'],body),schema,{'kind':'person','id':aid,'record':raw},index=bool(credits or d.get('bio')))
    root=Element('urlset',xmlns='http://www.sitemaps.org/schemas/sitemap/0.9')
    for u in urls:SubElement(SubElement(root,'url'),'loc').text=u
    ElementTree(root).write(OUT/'sitemap.xml',encoding='utf-8',xml_declaration=True)
    (OUT/'robots.txt').write_text('User-agent: *\nAllow: /\nSitemap: '+SITE+'/sitemap.xml\n')
    (OUT/'404.html').write_text('<!doctype html><html lang="fa" dir="rtl"><meta charset="utf-8"><meta name="robots" content="noindex"><meta name="viewport" content="width=device-width,initial-scale=1"><title>صفحه پیدا نشد | مسیر مارول</title><link rel="stylesheet" href="/style.css"><body><main class="seo-content"><h1>صفحه پیدا نشد</h1><p>این عنوان یا آدرس در آرشیو نیست.</p><a href="/">بازگشت به مسیر مارول</a></main></body></html>')
    app=OUT/'app.js';s=app.read_text()
    s=s.replace('v3.3.1</div></aside>','v'+VERSION+'</div></aside>').replace('./sw.js?v=3.3.1','/sw.js?v='+VERSION)
    pos=s.index('function activePage(){')
    route="""function seoRoute(){const path=location.pathname.replace(/^\\/|\\/$/g,'');if(!path||path==='index.html')return 'doomsday';if(path==='archive')return 'mcu';if(path==='actors')return 'people';if(/^(title|person)\\/[a-z0-9-]+$/.test(path))return path;if(['settings','watchlist'].includes(path))return path;return 'doomsday';}
function seoPath(route){if(route==='doomsday')return '/';if(route==='mcu')return '/archive/';if(route==='people')return '/actors/';if(/^(title|person)\\/[a-z0-9-]+$/.test(route)||['settings','watchlist'].includes(route))return '/'+route+'/';return null;}
function seoLinks(){document.querySelectorAll('a[href^="#"]').forEach(a=>{const href=seoPath(a.getAttribute('href').slice(1));if(href)a.setAttribute('href',href);});}
"""
    s=s[:pos]+route+s[pos:]
    s=s.replace("location.hash.replace(/^#/,'')","(location.hash?location.hash.replace(/^#/,''):seoRoute())")
    s=s.replace("(window.location.hash||'#doomsday').split('/')[0]","('#'+seoRoute()).split('/')[0]")
    s=s.replace("document.title=\x60"+'\${title} | مسیر مارول'+ "\x60;","seoLinks();")
    needle=" document.getElementById('app').innerHTML=shell(body,title);"
    assert needle in s
    s=s.replace(needle,needle+"\n seoLinks();\n window.marvelBootReady?.();",1)
    s="\n".join(line for line in s.split("\n") if not line.strip().startswith("document.title="))
    # Runtime titles remain the accurate pre-rendered title; legacy fragment links navigate to canonical pages.
    s=s.replace("if(!location.hash)location.hash=ADMIN_MODE?'#dashboard':'#doomsday';else goHash();", """if(location.hash){const path=seoPath(location.hash.slice(1));if(path&&path!==location.pathname){location.replace(path);}else{history.replaceState(null,'',location.pathname+location.search);goHash();}}else goHash();
new MutationObserver(seoLinks).observe(document.getElementById('app'),{childList:true,subtree:true});
document.addEventListener('click',e=>{const a=e.target.closest('a[href]');if(!a)return;const href=a.getAttribute('href');if(href==='/archive/'||href==='/actors/'||href==='/'){try{sessionStorage.setItem('marvel-path-origin',href==='/'?'doomsday':href==='/archive/'?'mcu':'people');}catch(_){}}});
""")
    s=s.replace("function goHash(){const p=activePage();","function goHash(){const p=activePage();if(location.hash){const path=seoPath(location.hash.slice(1));if(path&&path!==location.pathname){location.assign(path);return;}}if(p.name==='title'){try{detailOrigin=sessionStorage.getItem('marvel-path-origin')||'mcu';}catch(_){}}")
    # Add an install/help setting without creating an inert button.
    s=s.replace('<div class="setting-footnote slim">','''<article class="setting-tile pwa-install"><span>↧</span><h3>نصب مسیر مارول</h3><p>برنامه را به صفحه اصلی گوشی یا منوی برنامه‌های رایانه اضافه کن.</p><button class="btn btn-outline" data-install-app>نصب برنامه</button><p id="install-hint" aria-live="polite"></p></article><div class="setting-footnote slim">''',1)
    s+="""\nlet installPrompt=null;
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installPrompt=e;});
document.addEventListener('click',async e=>{if(!e.target.closest('[data-install-app]'))return;const hint=document.getElementById('install-hint');if(installPrompt){try{await installPrompt.prompt();await installPrompt.userChoice;}finally{installPrompt=null;}}else if(hint)hint.textContent=matchMedia('(display-mode: standalone)').matches?'برنامه در حالت نصب‌شده اجرا شده است.':'در Safari از Share و Add to Home Screen استفاده کن. در Chrome از منوی مرورگر گزینه Install app یا Add to Home Screen را انتخاب کن.';});
"""
    app.write_text(s)
    e=OUT/'enrichment.js';s=e.read_text().replace('v=3.3.1','v='+VERSION)
    marker='const titleMetadata='
    i=s.index(marker)
    s=s[:i]+"""try{const p=JSON.parse(document.getElementById('page-data')?.textContent||'null');if(p?.kind==='title'&&p.record){information.titles[p.id]=p.record;information.requested.add(p.id);}else if(p?.kind==='person'&&p.record){information.people[p.id]=p.record;information.personRequested.add(p.id);}}catch(_){}
"""+s[i:]
    # Page-data appears after enrichment.js: initialize just before app renders instead.
    seed_start=s.index('try{const p=JSON.parse(document.getElementById')
    seed_end=s.index('\n',seed_start)
    seed=s[seed_start:seed_end]
    s=s[:seed_start]+s[seed_end:]
    e.write_text(s)
    app.write_text(app.read_text().replace('if(location.hash){const path=seoPath(location.hash.slice(1));if(path&&path!==location.pathname){location.replace(path);}',seed+'\nif(location.hash){const path=seoPath(location.hash.slice(1));if(path&&path!==location.pathname){location.replace(path);}',1))
    css=OUT/'style.css'
    with css.open('a') as f:f.write('\n.seo-content{max-width:1000px;margin:auto;padding:28px;color:var(--text);font:16px/1.9 Vazirmatn,Tahoma,Arial}.seo-content h1{font-size:clamp(25px,5vw,44px);line-height:1.5}.seo-content a{color:#f46b77;text-decoration:underline;text-underline-offset:3px}.seo-nav{display:flex;flex-wrap:wrap;gap:20px}.seo-catalog{columns:2;column-gap:30px;padding-inline-start:24px}.seo-catalog li{break-inside:avoid;margin:5px 0}.seo-hero{display:flex;gap:20px;align-items:start}.seo-hero img{max-width:32%;height:auto;border-radius:12px}.seo-note{color:var(--muted);margin-top:40px}@media(max-width:600px){.seo-catalog{columns:1}.seo-content{padding:18px}}.pwa-install{margin-top:16px}.pwa-install #install-hint:empty{display:none}\n')
    worker="""'use strict';
const CORE='marvel-path-v358-core', DATA='marvel-path-v340-data';
const SHELL=['/','/archive/','/actors/','/settings/','/watchlist/','/style.css?v=3.5.8','/data.js?v=3.5.8','/meta.js?v=3.5.8','/posters.js?v=3.5.8','/admin.js?v=3.5.8','/enrichment.js?v=3.5.8','/app.js?v=3.5.8','/assets/favicon.svg','/favicon.ico','/manifest.webmanifest','/assets/icons/icon-192.png','/assets/icons/icon-512.png','/assets/fonts/Vazirmatn-wght.woff2?v=33.003-r2'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CORE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting()));});
self.addEventListener('activate',e=>e.waitUntil(Promise.all([self.clients.claim(),caches.keys().then(ks=>Promise.all(ks.filter(k=>k.startsWith('marvel-path-v')&&![CORE,DATA].includes(k)).map(k=>caches.delete(k))))])));
self.addEventListener('fetch',e=>{
 const r=e.request,u=new URL(r.url);if(r.method!=='GET'||u.origin!==self.location.origin)return;
 if(r.mode==='navigate'){e.respondWith((async()=>{const c=await caches.open(CORE);try{const x=await fetch(r);if(x.ok)await c.put(r,x.clone());return x;}catch(_){return await c.match(r)||await c.match(u.pathname)||await c.match('/')||Response.error();}})());return;}
 if(u.pathname.startsWith('/public-data/')||u.pathname.startsWith('/assets/')||SHELL.some(s=>new URL(s,self.location.origin).pathname===u.pathname)){e.respondWith((async()=>{const c=await caches.open(u.pathname.startsWith('/public-data/')?DATA:CORE);const old=await c.match(r);if(old)return old;const x=await fetch(r);if(x.ok)c.put(r,x.clone()).catch(()=>{});return x;})());}
});
"""
    (OUT/'sw.js').write_text(worker)
    for p in ('favicon.ico','apple-touch-icon.png','manifest.webmanifest','assets/social/og.jpg','assets/social/mobile.jpg','sitemap.xml','robots.txt'):add(OUT/p,p)
    import release_cache
    release_cache.main(VERSION)
    print('SEO pages:',len(films),'titles;',len(actors),'people;',len(urls),'indexable URLs; PWA:',len(manifest['icons']),'icons')
if __name__=='__main__':main()
