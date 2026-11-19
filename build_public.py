#!/usr/bin/env python3
"""Build the read-only public site from allowlisted source and curated data."""
import json,re,shutil
from pathlib import Path
ROOT=Path(__file__).resolve().parent
OUT=ROOT/'docs'
if OUT.exists():shutil.rmtree(OUT)
OUT.mkdir()
for name in ['index.html','app.js','data.js','meta.js','posters.js','enrichment.js','style.css','sw.js']:
    shutil.copy2(ROOT/name,OUT/name)
(OUT/'assets').mkdir()
shutil.copy2(ROOT/'assets/favicon.svg',OUT/'assets/favicon.svg')
shutil.copytree(ROOT/'public-data',OUT/'public-data')
(OUT/'CNAME').write_text('marvel.imoein.com\n')
(OUT/'.nojekyll').touch()
# Static viewer has no admin mode, credentials or write requests.
(OUT/'admin.js').write_text("""'use strict';
const ADMIN_MODE=false,isLoopback=false;
const posterAdmin={available:false,authorized:false,job:null,token:''};
let publicPosterUrls=Object.create(null);
function localCover(f){return publicPosterUrls[f.id]||'';}
window.addEventListener('load',async()=>{
 try{const r=await fetch('./public-data/poster-urls.json');if(r.ok){publicPosterUrls=await r.json();render();}}catch(_){}
});
""")
p=OUT/'enrichment.js';s=p.read_text()
s=s.replace("'/api/metadata/title?id='+encodeURIComponent(page.id)","'./public-data/titles/'+encodeURIComponent(page.id)+'.json'")
s=s.replace("'/api/metadata/person?id='+encodeURIComponent(page.id)","'./public-data/people/'+encodeURIComponent(page.id)+'.json'")
s=s.replace("'/api/metadata/people'","'./public-data/people.json'")
# Reject path traversal; actor IDs use the same slug pattern as the local API.
s=s.replace("page.name==='person'&&!information.personRequested.has(page.id)","page.name==='person'&&/^[a-z0-9-]{1,110}$/.test(page.id)&&!information.personRequested.has(page.id)")
# Remove unused admin implementations on public website. Keep read-only renderer functions and loader.
start=s.index('function metadataAdminPage('); end=s.index('let metadataTimer=null;',start)
s=s[:start]+s[end:]
start=s.index(' if(ADMIN_MODE && posterAdmin.authorized &&'); end=s.index('async function pollMetadataJob',start)
s=s[:start]+'}\n'+s[end:]
# retain public search input from event listener separately.
s=s[:s.index('async function pollMetadataJob')]+"""
document.addEventListener('input',e=>{if(e.target.id==='people-search'){peopleSearchTerm=e.target.value;const el=document.getElementById('people-results');if(el)el.innerHTML=peopleCards(information.directory?.items||[],peopleSearchTerm);}});
"""
s=s.replace(' onerror="this.remove()"','').replace(' onerror="this.parentNode.remove()"','')
p.write_text(s)
p=OUT/'app.js';s=p.read_text()
s=s.replace(' onerror="this.remove()"','')
# Avoid third-party mirror hosts and restrict image origins.
s=s.replace("u===local&&!!local || /^https:\\/\\//.test(u)","u===local&&!!local || /^https:\\/\\/(?:image\\.tmdb\\.org|cdn\\.marvel\\.com|lumiere-a\\.akamaihd\\.net|raw\\.githubusercontent\\.com|cdn\\.jsdelivr\\.net)\\//.test(u)")
s=s.replace("candidates.push(url.replace('https://image.tmdb.org/t/p/','https://img.amodb.dev/t/p/'));","")
s=s.replace("منبع پوسترها و اطلاعات تکمیلی از TMDB و آرشیوهای عمومی است. این محصول رسمی Marvel یا TMDB نیست.","منبع تصاویر و بخشی از اطلاعات TMDB و TVmaze است. فهرست بازیگران گزیده و غیرجامع است. This product uses the TMDB API but is not endorsed or certified by TMDB. این پروژه غیررسمی است.")
# Clear dead admin branch in public render (the common source retains local admin).
start=s.index(' if(ADMIN_MODE){',s.index('function render()'));end=s.index(' }else{',start)
s=s[:start]+' {'+s[end+7:]
s=s.replace('ADMIN_MODE?adminShell(body,title):shell(body,title)','shell(body,title)')
# public image error handling without inline JS
s += """
document.addEventListener('error',e=>{const img=e.target;if(img.matches?.('.actor-img img,.person-portrait img'))img.remove();else if(img.matches?.('.episode-still img'))img.parentNode.remove();},true);
"""
p.write_text(s)
p=OUT/'index.html';s=p.read_text()
csp="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com https://cdn.jsdelivr.net; img-src 'self' data: https://image.tmdb.org https://static.tvmaze.com https://cdn.tvmaze.com https://raw.githubusercontent.com https://cdn.jsdelivr.net https://cdn.marvel.com https://lumiere-a.akamaihd.net; connect-src 'self'; object-src 'none'; base-uri 'none'; form-action 'self'; upgrade-insecure-requests"
s=s.replace('<meta charset="utf-8"/>','<meta charset="utf-8"/>\n<meta http-equiv="Content-Security-Policy" content="'+csp+'"/>\n<meta name="referrer" content="no-referrer"/>\n<link rel="canonical" href="https://marvel.imoein.com/"/>')
p.write_text(s)
p=OUT/'sw.js';s=p.read_text().replace('marvel-path-v29-','marvel-path-v30-')
p.write_text(s)
print('Built public pages:',sum(p.is_file() for p in OUT.rglob('*')))
