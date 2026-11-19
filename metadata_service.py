#!/usr/bin/env python3
"""Locally cached cast, person and episodic metadata for Marvel Path.

Sources: TMDB API v3 (user-provided bearer token), public TVmaze API for
series, and an optional curated community Marvel reference for fallback credits.
All title / actor records are labelled with their provenance. No scraping or
browser secrets. All writes stay on the local machine.
"""
from __future__ import annotations
import datetime
import html
import json
import os
import re
import threading
import time
import urllib.error
import urllib.parse
import urllib.request
import unicodedata
from pathlib import Path
import episode_cache
import localize_catalog

ROOT=Path(__file__).resolve().parent
BASE=ROOT/'assets'/'metadata'
TITLES=BASE/'titles'
PEOPLE=BASE/'people'
HEADSHOTS=ROOT/'assets'/'people'
TOKEN_FILE=ROOT/'.tmdb-token'
for folder in (TITLES,PEOPLE,HEADSHOTS):folder.mkdir(parents=True,exist_ok=True)
CATALOG=json.loads((ROOT/'catalog.json').read_text('utf-8'))
LOCK=threading.RLock()
JOB={'running':False,'done':0,'total':0,'success':0,'failed':0,'current':'','errors':[],'mode':'titles','photosSaved':0}
MAX_JSON=4_000_000

def clock(): return datetime.datetime.now(datetime.timezone.utc).isoformat(timespec='seconds')
def token(): return os.environ.get('MARVEL_TMDB_TOKEN','').strip() or (TOKEN_FILE.read_text('utf-8').strip() if TOKEN_FILE.exists() else '')
def configure_token(value):
    v=str(value or '').strip()
    if len(v)>700 or (v and (any(c.isspace() for c in v) or any(ord(c)<33 or ord(c)>126 for c in v))):raise ValueError('کلید معتبر نیست.')
    if not v: TOKEN_FILE.unlink(missing_ok=True)
    else:
        fd=os.open(TOKEN_FILE,os.O_WRONLY|os.O_CREAT|os.O_TRUNC,0o600)
        with os.fdopen(fd,'w',encoding='ascii') as stream: stream.write(v+'\n')
    return bool(token())

def request_bytes(host,path,params=None,headers=None,limit=MAX_JSON):
    if host not in {'api.themoviedb.org','api.tvmaze.com','raw.githubusercontent.com','image.tmdb.org','static.tvmaze.com','cdn.tvmaze.com'}:raise ValueError('منبع نامعتبر')
    path=path if path.startswith('/') else '/'+path
    url=f'https://{host}{path}'+('?' +urllib.parse.urlencode(params) if params else '')
    req=urllib.request.Request(url,headers={'User-Agent':'MarvelPathPersonal/2.7 (local catalogue)', 'Accept':'application/json', **(headers or {})})
    with urllib.request.urlopen(req,timeout=10 if limit>=MAX_JSON else 5) as response:
        if urllib.parse.urlsplit(response.url).hostname not in {'api.themoviedb.org','api.tvmaze.com','raw.githubusercontent.com','image.tmdb.org','static.tvmaze.com','cdn.tvmaze.com'}:raise ValueError('تغییر مسیر به دامنه نامعتبر')
        if int(response.headers.get('Content-Length','0') or 0)>limit:raise ValueError('پاسخ بیش از اندازه است')
        blob=response.read(limit+1)
    if len(blob)>limit:raise ValueError('پاسخ بیش از اندازه است')
    return blob

def fetch_json(host,path,params=None,headers=None):return json.loads(request_bytes(host,path,params,headers).decode('utf-8'))
def tmdb(path,params=None):
    key=token()
    if not key:raise ValueError('کلید TMDB هنوز تنظیم نشده است.')
    head={'Authorization': 'Bearer '+key} if key.startswith('eyJ') else {}
    p={**(params or {})}
    if not head:p['api_key']=key
    return fetch_json('api.themoviedb.org','/3'+path,p,head)
def parse_year(d):
    try:return int(str(d or '')[:4])
    except (ValueError,TypeError):return 0

def norm(s):
    s=re.sub(r'\s*[—–-]\s*Season\s*\d+\s*$','',s,flags=re.I)
    s=s.replace('*','').replace('…','...')
    return re.sub(r'[^a-z0-9]+','',s.lower())
def base_title(name):return re.sub(r'\s*[—–-]\s*Season\s*\d+\s*$','',name,flags=re.I).strip()
def season_of(name):
    m=re.search(r'[—–-]\s*Season\s*(\d+)\s*$',name,re.I)
    return int(m.group(1)) if m else 1
def safe_id(s):
    s=re.sub(r'[^a-z0-9]+','-',str(s or '').lower()).strip('-')
    return s[:110] if s else 'unknown'
def person_key(name):return safe_id(name)
def as_text(s):return re.sub(r'<[^>]*>','',html.unescape(str(s or ''))).strip()
def safe_image(path, size='w185'):
    if not isinstance(path,str) or not path.startswith('/') or re.search(r'[^/a-zA-Z0-9_.-]',path):return ''
    return 'https://image.tmdb.org/t/p/'+size+path

def atomic_json(path,obj):
    path.parent.mkdir(parents=True,exist_ok=True)
    temp=path.with_name('.'+path.name+'.tmp')
    with LOCK:
        temp.write_text(json.dumps(obj,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
        os.replace(temp,path)

def get_json(path):
    try:return json.loads(path.read_text('utf-8'))
    except (ValueError,OSError):return None

def title_record(id_):
    if id_ not in CATALOG: return None
    record=get_json(TITLES/(id_+'.json'))
    if not record:return None
    for cast in record.get('cast',[]):
        pid=cast.get('personId')
        if not pid or not re.fullmatch(r'[a-z0-9-]{1,110}',pid):continue
        profile=get_json(PEOPLE/(pid+'.json')) or {}
        if profile.get('photo') and (_is_local_photo(profile['photo']) or not cast.get('photo')):
            cast['photo']=profile['photo']
        if profile.get('tmdbId') and not cast.get('tmdbId'):
            cast['tmdbId']=profile['tmdbId']
    return record
def cast_item(name,character,photo='',tmdb_id=None,order=0):
    return {'personId':person_key(name),'name':name,'character':character or '', 'photo':photo,'tmdbId':tmdb_id, 'order':order}

def load_community():
    file=BASE/'community-source.json'
    cached=get_json(file)
    if cached and cached.get('titles') and cached.get('characters'):return cached
    raw=request_bytes('raw.githubusercontent.com','/HaithamAmireh/MCU/main/data.js',limit=2_000_000).decode('utf-8')
    start=raw.index('{');stop=raw.rfind('};')
    if stop<start:raise ValueError('ساختار اطلاعات مرجع معتبر نیست')
    src=json.loads(raw[start:stop+1])
    if not isinstance(src.get('titles'),list) or not isinstance(src.get('characters'),list):raise ValueError('داده ناقص است')
    # Minimize cache: only source fields actually needed.
    src={'titles':[{'title':x.get('title'),'synopsis':x.get('synopsis'),'chars':x.get('chars',[]),'director':x.get('director'),'year':x.get('year'),'tmdb_id':x.get('tmdb_id'),'type':x.get('type')} for x in src['titles']],
         'characters':[{'id':p.get('id'),'name':p.get('name'),'actor':p.get('actor'),'alias':p.get('alias'),'img_local':p.get('img_local')} for p in src['characters']]}
    atomic_json(file,src)
    return src

def from_community(name):
    src=load_community();characters={p['id']:p for p in src['characters']}
    n=norm(name)
    candidates=[t for t in src['titles'] if norm(t.get('title',''))==n]
    if not candidates: return None
    record=candidates[0]
    cast=[];used=set()
    for index,cid in enumerate(record.get('chars') or []):
        person=characters.get(cid,{})
        actor=person.get('actor','')
        if not actor or not isinstance(actor,str) or actor.startswith('Various') or actor in used:continue
        used.add(actor)
        cast.append(cast_item(actor,person.get('name') or person.get('alias') or '', '',None,index))
    return {'overview':record.get('synopsis') or '', 'cast':cast,'director':record.get('director',''),'tmdbId':record.get('tmdb_id')}

def tmdb_lookup(item):
    title=base_title(item['name']);kind=item['kind'];year=item['year']
    if kind=='movie':kind='movie'
    query=tmdb('/search/'+kind,{'query':title,'language':'en-US'})
    results=query.get('results') or []
    if not results: raise ValueError('عنوان در TMDB پیدا نشد.')
    def score(x):
        xname=x.get('title') or x.get('name') or ''
        y=parse_year(x.get('release_date') or x.get('first_air_date'))
        return (12 if norm(xname)==norm(title) else 0)+(5 if y and abs(y-year)<=1 else 0)-abs(y-year)*.25 if y else 0
    match=max(results,key=score)
    if score(match)<3:raise ValueError('تطبیق مطمئن برای این عنوان یافت نشد.')
    return match['id']

POSTER_LOOKUPS=BASE/'poster-candidates'
def cached_poster_candidates(id_):
    if id_ not in CATALOG:return []
    prev=get_json(TITLES/(id_+'.json')) or {}
    saved=get_json(POSTER_LOOKUPS/(id_+'.json')) or {}
    if id_ in localize_catalog.MISMATCH and prev.get('tmdbId')==localize_catalog.MISMATCH[id_]:prev={}
    urls=[prev.get('poster'),prev.get('seriesPoster'),*saved.get('urls',[])]
    return list(dict.fromkeys(u for u in urls if isinstance(u,str) and u.startswith('https://image.tmdb.org/t/p/') and episode_cache.allowed(u)))[:8]

def tmdb_poster_candidates(id_):
    """Resolve artwork server-side, using the season before the series."""
    item=lookup.get(id_)
    if not item or not token():return []
    kind=item['kind']
    prev=get_json(TITLES/(id_+'.json')) or {}
    tmdb_id=prev.get('tmdbId')
    if id_ in localize_catalog.MISMATCH and tmdb_id==localize_catalog.MISMATCH[id_]:tmdb_id=None
    if not isinstance(tmdb_id,int) or isinstance(tmdb_id,bool) or tmdb_id<=0:
        tmdb_id=tmdb_lookup(item)
    path=f'/{kind}/{tmdb_id}'
    obj=tmdb(path,{'language':'en-US'})
    expected=norm(base_title(item['name']))
    names=[obj.get(k) or '' for k in ('title','original_title','name','original_name')]
    if not expected or not any(norm(n)==expected for n in names if n):
        raise ValueError('عنوان پوستر با اثر انتخاب‌شده تطبیق ندارد.')
    def paths(record):
        return [safe_image(record.get('poster_path'),'w500')]
    def image_list(endpoint):
        try:
            images=tmdb(endpoint+'/images',{'include_image_language':'en,null'})
            return [safe_image(x.get('file_path'),'w500') for x in images.get('posters',[])[:4]]
        except (ValueError,OSError,urllib.error.URLError,TimeoutError):
            return []
    candidates=[]
    if kind=='tv':
        season_path=path+'/season/'+str(item['season'])
        season_obj=tmdb(season_path,{'language':'en-US'})
        candidates.extend(paths(season_obj))
        if not any(candidates):candidates.extend(image_list(season_path))
    candidates.extend(paths(obj))
    if not any(candidates):candidates.extend(image_list(path))
    urls=list(dict.fromkeys(u for u in candidates if u))[:8]
    if urls:atomic_json(POSTER_LOOKUPS/(id_+'.json'),{'urls':urls,'tmdbId':tmdb_id,'season':item['season']})
    return urls

def title_info_tmdb(id_, item):
    title=base_title(item['name']);kind=item['kind'];season=item['season']
    prev=title_record(id_)
    tmdb_id=(prev or {}).get('tmdbId')
    if id_ in localize_catalog.MISMATCH and localize_catalog.MISMATCH[id_]==tmdb_id:tmdb_id=None
    if not isinstance(tmdb_id,int):tmdb_id=tmdb_lookup(item)
    if id_ in localize_catalog.MISMATCH and localize_catalog.MISMATCH[id_]==tmdb_id:raise ValueError('شناسه منبع با این اثر تطبیق ندارد.')
    obj=tmdb('/'+kind+'/'+str(tmdb_id),{'append_to_response':'credits','language':'en-US'})
    credits=(obj.get('credits') or {}).get('cast') or []
    cast=[cast_item(x.get('name',''),x.get('character') or '',safe_image(x.get('profile_path')),x.get('id'),x.get('order',0)) for x in credits[:40] if x.get('id') and x.get('name')]
    director=', '.join(x['name'] for x in (obj.get('credits') or {}).get('crew',[]) if x.get('job')=='Director')[:150]
    episodic=[]
    series_poster=safe_image(obj.get('poster_path'),'w500')
    poster=series_poster
    if kind=='tv':
        season_obj=tmdb('/tv/'+str(tmdb_id)+'/season/'+str(season),{'language':'en-US'})
        poster=safe_image(season_obj.get('poster_path'),'w500') or series_poster
        episodic=[{'number':int(e['episode_number']),'name':e.get('name') or '','overview':e.get('overview') or '', 'runtime':e.get('runtime'), 'airDate':e.get('air_date') or '', 'image':safe_image(e.get('still_path'),'w300')} for e in season_obj.get('episodes',[]) if isinstance(e.get('episode_number'),int) and e.get('episode_number')>0]
    return {'id':id_,'title':item['name'],'overview':obj.get('overview') or '', 'tagline':obj.get('tagline') or '', 'genres':[x['name'] for x in obj.get('genres',[]) if x.get('name')], 'cast':cast,'episodes':episodic,'director':director,'tmdbId':tmdb_id,'poster':poster,'seriesPoster':series_poster,'type':kind,'season':season,'source':'TMDB','sourceUrl':f'https://www.themoviedb.org/{kind}/{tmdb_id}', 'fetchedAt':clock()}

def title_info_tvmaze(id_,item):
    title=base_title(item['name']);season=item['season']
    found=fetch_json('api.tvmaze.com','/singlesearch/shows',{'q':title})
    if norm(found.get('name',''))!=norm(title):raise ValueError('نام سریال با نتیجه TVmaze تطبیق ندارد.')
    show_id=found['id']
    castdata=fetch_json('api.tvmaze.com',f'/shows/{show_id}/cast')
    epis=fetch_json('api.tvmaze.com',f'/shows/{show_id}/episodes')
    cast=[]
    for idx,c in enumerate(castdata[:40]):
        person=c.get('person') or {}; char=c.get('character') or {}
        pic=(person.get('image') or {}).get('medium') or ''
        if person.get('name'):cast.append(cast_item(person['name'],char.get('name') or '',pic,None,idx))
    episodic=[{'number':int(e['number']),'name':e.get('name') or '','overview':as_text(e.get('summary')),'runtime':e.get('runtime'),'airDate':e.get('airdate') or '', 'image':(e.get('image') or {}).get('medium') or ''} for e in epis if e.get('season')==season and isinstance(e.get('number'),int) and e.get('number')>0]
    return {'id':id_,'title':item['name'],'overview':as_text(found.get('summary')),'tagline':'','genres':found.get('genres') or [],'cast':cast,'episodes':episodic,'director':'','tvmazeId':show_id,'type':'tv','season':season,'source':'TVmaze','sourceUrl':found.get('url','https://www.tvmaze.com/'),'fetchedAt':clock()}

def title_info_community(id_,item):
    ref=from_community(base_title(item['name']))
    if not ref:raise ValueError('مرجع تکمیلی برای این عنوان داده‌ای ندارد.')
    return {'id':id_,'title':item['name'],'overview':ref.get('overview') or '', 'tagline':'','genres':[], 'cast':ref.get('cast') or [], 'episodes':[], 'director':ref.get('director') or '', 'tmdbId':ref.get('tmdbId'),'type':item['kind'],'season':item['season'], 'source':'Community MCU reference','sourceUrl':'https://github.com/HaithamAmireh/MCU','fetchedAt':clock()}

def cache_cast_photos(cast):
    """Persist first credited profile photos for offline/local playback."""
    for p in cast[:12]:
        pid=p.get('personId','')
        url=p.get('photo','')
        if not pid or not re.fullmatch(r'[a-z0-9-]{1,110}',pid) or not url:continue
        existing=next((HEADSHOTS/(pid+ext) for ext in ('.webp','.jpg','.png') if (HEADSHOTS/(pid+ext)).exists()),None)
        if existing and existing.stat().st_size>100: p['photo']='./assets/people/'+existing.name;continue
        parts=urllib.parse.urlsplit(url)
        if parts.hostname not in {'image.tmdb.org','static.tvmaze.com','cdn.tvmaze.com'} or parts.scheme!='https':continue
        try:
            raw=request_bytes(parts.hostname,parts.path,limit=1_200_000)
            if not (raw.startswith(b'\xff\xd8\xff') or raw.startswith(b'\x89PNG')):continue
            ext='.png' if raw.startswith(b'\x89PNG') else '.jpg'
            target=HEADSHOTS/(pid+ext)
            target.write_bytes(raw)
            p['photo']='./assets/people/'+pid+ext
        except Exception:pass

def read_index():return get_json(BASE/'index.json') or {'people':{},'version':1}
def write_index_from_titles():
    people={}
    for id_ in CATALOG:
        t=title_record(id_)
        if not t:continue
        for person in t.get('cast',[]):
            key=person.get('personId');name=person.get('name')
            if not key or not name:continue
            p=people.setdefault(key,{'id':key,'name':name,'photo':'','tmdbId':None,'credits':[]})
            if person.get('photo') and (not p['photo'] or 'tmdb.org' in person['photo']):p['photo']=person['photo']
            if person.get('tmdbId'):p['tmdbId']=person['tmdbId']
            p['credits'].append({'id':id_,'title':CATALOG[id_],'character':person.get('character') or ''})
    # Preserve enriched ID and portrait even if a later title refresh falls back
    # to starter cast without TMDB IDs.
    old_index=get_json(BASE/'index.json') or {}
    for pid,p in people.items():
        old=(old_index.get('people') or {}).get(pid,{})
        stored=get_json(PEOPLE/(pid+'.json')) or {}
        if not p['tmdbId']:p['tmdbId']=stored.get('tmdbId') or old.get('tmdbId')
        if stored.get('photo') and _is_local_photo(stored.get('photo')):
            p['photo']=stored['photo']
        elif not p['photo']:p['photo']=stored.get('photo') or old.get('photo') or ''
    atomic_json(BASE/'index.json',{'people':people,'version':2,'updatedAt':clock()})
    return people

def _is_local_photo(url):
    if not isinstance(url,str):return False
    m=re.fullmatch(r'\.?/?assets/people/([a-z0-9-]+)\.(jpg|png|webp)',url)
    return bool(m and (HEADSHOTS/(m.group(1)+'.'+m.group(2))).is_file())

def _normalize_person(name):
    name=unicodedata.normalize('NFKD',str(name or ''))
    name=''.join(c for c in name if not unicodedata.combining(c))
    return re.sub(r'[^a-z0-9]','',name.lower())

def _matches_credit(known_for, credits):
    # Confirm candidate's listed works against a locally known credit, not
    # simply the most popular person returned for a similar name.
    local={norm(base_title(c.get('title',''))) for c in credits}
    for work in known_for or []:
        name=work.get('title') or work.get('name') or ''
        if norm(name) in local:return True
    return False

def resolve_person_tmdb_id(person):
    """Resolve a seeded local actor without mixing namesakes.

    TMDB's /search/person can return aliases; require a strong name match,
    known title overlap, or an unambiguous verified credited appearance.
    """
    known_id=person.get('tmdbId')
    if isinstance(known_id,int) and known_id>0:return known_id
    if not token():raise ValueError('ابتدا API Key یا Read Access Token را در مدیریت اطلاعات آثار ثبت کن.')
    name=str(person.get('name') or '').strip()
    if not name:raise ValueError('نام بازیگر مشخص نیست.')
    results=tmdb('/search/person',{'query':name,'language':'en-US','include_adult':'false'}).get('results') or []
    if not results:raise ValueError('شناسه این بازیگر در TMDB پیدا نشد؛ در صورت نیاز شناسه را دستی ثبت کن.')
    target=_normalize_person(name)
    credits=person.get('credits') or []
    ranked=[]
    for candidate in results:
        if not isinstance(candidate.get('id'),int) or not candidate.get('id'):continue
        exact=_normalize_person(candidate.get('name',''))==target
        linked=_matches_credit(candidate.get('known_for') or [],credits)
        ranked.append((candidate,exact,linked))
    exacts=[x for x in ranked if x[1]]
    with_work=[x for x in ranked if x[2]]
    # Unique exact match is sufficient for normal names (e.g. Tom Hiddleston).
    # A non-exact alias must have an overlapping title AND be unique.
    if len(exacts)==1:return exacts[0][0]['id']
    if len(exacts)>1:
        preferred=[x for x in exacts if x[2]]
        if len(preferred)==1:return preferred[0][0]['id']
    if len(with_work)==1:return with_work[0][0]['id']
    raise ValueError('چند بازیگر با نام مشابه پیدا شدند؛ شناسه TMDB را دستی ثبت کن تا اطلاعات اشتباه وصل نشود.')

def _save_headshot(pid,photo):
    if _is_local_photo(photo):return photo
    url=str(photo or '')
    parts=urllib.parse.urlsplit(url)
    if parts.scheme!='https' or parts.hostname not in {'image.tmdb.org','static.tvmaze.com','cdn.tvmaze.com'}:return ''
    try:
        raw=request_bytes(parts.hostname,parts.path,limit=2_000_000)
        if raw.startswith(b'\xff\xd8\xff'):ext='.jpg'
        elif raw.startswith(b'\x89PNG\r\n\x1a\n'):ext='.png'
        elif raw.startswith(b'RIFF') and raw[8:12]==b'WEBP':ext='.webp'
        else:return ''
        target=HEADSHOTS/(pid+ext)
        temp=HEADSHOTS/('.'+pid+ext+'.tmp')
        temp.write_bytes(raw)
        os.replace(temp,target)
        return './assets/people/'+pid+ext
    except (OSError,ValueError,TimeoutError,urllib.error.URLError):return ''

def upload_person_photo(pid,data):
    """Manually store an actor headshot; no remote lookups required."""
    if pid not in read_index().get('people',{}):raise ValueError('بازیگر پیدا نشد.')
    if not isinstance(data,bytes) or not (60<=len(data)<=4_000_000):raise ValueError('فایل تصویر باید حداکثر ۴ مگابایت باشد.')
    if data.startswith(b'\xff\xd8\xff'):ext='.jpg'
    elif data.startswith(b'\x89PNG\r\n\x1a\n'):ext='.png'
    elif data.startswith(b'RIFF') and data[8:12]==b'WEBP':ext='.webp'
    else:raise ValueError('فقط تصاویر JPG، PNG و WebP مجازند.')
    temp=HEADSHOTS/('.'+pid+'.upload')
    temp.write_bytes(data)
    target=HEADSHOTS/(pid+ext)
    os.replace(temp,target)
    path=PEOPLE/(pid+'.json')
    old=get_json(path) or {}
    old.update({'photo':'./assets/people/'+pid+ext,'photoSource':'manual upload','fetchedAt':clock()})
    atomic_json(path,old)
    write_index_from_titles()
    return person_info(pid)

def set_person_tmdb_id(pid,value):
    if pid not in read_index().get('people',{}):raise ValueError('بازیگر پیدا نشد.')
    try:value=int(value)
    except (TypeError,ValueError):raise ValueError('شناسه TMDB باید یک عدد مثبت باشد.')
    if value<=0 or value>100_000_000:raise ValueError('شناسه TMDB معتبر نیست.')
    if not token():raise ValueError('ابتدا اعتبارنامه TMDB را ثبت کن.')
    obj=tmdb('/person/'+str(value),{'language':'en-US'})
    name=_normalize_person(person_info(pid)['name'])
    actual=_normalize_person(obj.get('name'))
    # Do not silently attach an unrelated person to a local actor.
    aliases=[_normalize_person(x) for x in (obj.get('also_known_as') or [])]
    if name!=actual and name not in aliases:
        raise ValueError('نام شناسه TMDB با نام بازیگر هم‌خوانی ندارد.')
    old=get_json(PEOPLE/(pid+'.json')) or {}
    old['tmdbId']=value
    atomic_json(PEOPLE/(pid+'.json'),old)
    write_index_from_titles()
    return {'ok':True,'tmdbId':value,'name':obj.get('name')}

def _photo_is_missing(p):
    stored=get_json(PEOPLE/(p['id']+'.json')) or {}
    return not _is_local_photo(stored.get('photo') or p.get('photo'))

def person_info(pid):
    people=read_index().get('people',{})
    found=people.get(pid)
    if not found:return None
    stored=get_json(PEOPLE/(pid+'.json'))
    return {**found,**(stored or {}),'credits':found['credits']}

def update_person(pid):
    person=person_info(pid)
    if not person:raise ValueError('بازیگر در فهرست موجود نیست.')
    tmdb_id=resolve_person_tmdb_id(person)
    obj=tmdb('/person/'+str(tmdb_id),{'append_to_response':'combined_credits','language':'en-US'})
    if not isinstance(obj.get('id'),int) or obj['id']!=tmdb_id:
        raise ValueError('پروفایل دریافتی TMDB با شناسه بازیگر مطابقت ندارد.')
    filmography=[]
    for x in (obj.get('combined_credits') or {}).get('cast',[]):
        name=x.get('title') or x.get('name')
        if not name:continue
        filmography.append({'name':name,'year':parse_year(x.get('release_date') or x.get('first_air_date')),'character':x.get('character') or '', 'mediaType':x.get('media_type') or '', 'poster':safe_image(x.get('poster_path'))})
    filmography.sort(key=lambda x:x.get('year') or 0,reverse=True)
    previous=get_json(PEOPLE/(pid+'.json')) or {}
    remote=safe_image(obj.get('profile_path'),'w342')
    local=_save_headshot(pid,remote) if remote else ''
    # User-supplied portrait takes priority, then local TMDB image, then URL.
    image=previous.get('photo') if previous.get('photoSource')=='manual upload' and _is_local_photo(previous.get('photo')) else (local or remote or previous.get('photo') or person.get('photo') or '')
    result={**previous,'name':person['name'],'tmdbId':tmdb_id,'bio':obj.get('biography') or '', 'birthDate':obj.get('birthday') or '', 'birthPlace':obj.get('place_of_birth') or '', 'photo':image,'filmography':filmography[:250], 'source':'TMDB','sourceUrl':f'https://www.themoviedb.org/person/{tmdb_id}','fetchedAt':clock()}
    atomic_json(PEOPLE/(pid+'.json'),result)
    write_index_from_titles()
    return person_info(pid)


def title_missing(id_,record=None):
    """Required metadata and referenced-but-not-cached artwork are separate."""
    item=lookup[id_]
    r=record if record is not None else get_json(TITLES/(id_+'.json'))
    if not isinstance(r,dict) or not r:return ['record']
    if r.get('sourceMismatch') or (id_ in localize_catalog.MISMATCH and r.get('tmdbId')==localize_catalog.MISMATCH[id_]):return ['source']
    missing=[k for k in ('overview','cast') if not r.get(k)]
    if item['episodes']:
        episodes={e.get('number'):e for e in r.get('episodes',[]) if isinstance(e,dict)}
        if any(not all(episodes.get(n,{}).get(k) for k in ('name','overview','airDate','runtime')) for n in range(1,item['episodes']+1)):
            missing.append('episodes')
    return missing

def missing_episode_images(record):
    return sum(1 for e in (record or {}).get('episodes',[]) if episode_cache.allowed(e.get('image')) and not episode_cache.cached_path(e['image']))

def merge_title(old,new,force=False):
    """Missing-only keeps existing fields and merges episode rows by number."""
    def merge(a,b):
        out=dict(a)
        for k,v in b.items():
            if v not in (None,'',[],{}) and (force or not out.get(k)):out[k]=v
            elif k not in out:out[k]=v
        return out
    out=merge(old,new)
    before={e['number']:e for e in old.get('episodes',[]) if isinstance(e,dict) and isinstance(e.get('number'),int)}
    after={e['number']:e for e in new.get('episodes',[]) if isinstance(e,dict) and isinstance(e.get('number'),int)}
    out['episodes']=[merge(before.get(n,{}),after.get(n,{})) for n in sorted(before.keys()|after.keys())]
    out['lastSyncAt']=clock()
    return out

def sync_one(id_,allow_cached=False,force=False):
    if id_ not in CATALOG:raise ValueError('شناسه معتبر نیست.')
    old=get_json(TITLES/(id_+'.json')) or {}
    missing=title_missing(id_,old)
    if not force and not missing:
        report=episode_cache.cache_record(old) if missing_episode_images(old) else {}
        if report.get('failed'):raise ValueError('دریافت برخی تصاویر قسمت‌ها ناموفق بود.')
        return old
    if allow_cached and old and not force:return old
    item=lookup[id_]
    errors=[];result=None
    if token():
        try:result=title_info_tmdb(id_,item)
        except Exception as ex:errors.append('TMDB: '+str(ex)[:90])
    if result is None and item['kind']=='tv':
        try:result=title_info_tvmaze(id_,item)
        except Exception as ex:errors.append('TVmaze: '+str(ex)[:90])
    if result is None:
        try:result=title_info_community(id_,item)
        except Exception as ex:errors.append('Community: '+str(ex)[:90])
    if result is None:raise ValueError('؛ '.join(errors)[:280] or 'داده‌ای پیدا نشد')
    if item['kind']=='tv' and not result.get('episodes'):
        # TVmaze can fill episode information when community actor data is used.
        if result['source']!='TVmaze':
            try:
                alt=title_info_tvmaze(id_,item)
                result['episodes']=alt.get('episodes') or []
                result['secondarySource']='TVmaze'
                if not result.get('overview'):result['overview']=alt['overview']
                if not result.get('cast'):result['cast']=alt['cast']
            except Exception:pass
    result['seasonCountExpected']=item.get('episodes',0)
    if old and 'source' not in missing:
        # Do not mix data from different verified TMDB titles.
        if old.get('tmdbId') and result.get('tmdbId') and old['tmdbId']!=result['tmdbId']:
            raise ValueError('شناسه منبع جدید با اطلاعات موجود متفاوت است.')
        result=merge_title(old,result,force=force)
    cache_cast_photos(result.get('cast',[]))
    atomic_json(TITLES/(id_+'.json'),result)
    report=episode_cache.cache_record(result)
    if report.get('failed'):raise ValueError('اطلاعات ذخیره شد؛ برخی تصاویر قسمت‌ها دریافت نشد.')
    if title_missing(id_,result):raise ValueError('اطلاعات موجود حفظ شد؛ منبع هنوز همه اطلاعات لازم را ندارد.')
    return result

def sync_job(ids,force=False):
    global JOB
    for id_ in ids:
        try:
            sync_one(id_,force=force)
            with LOCK:JOB['success']+=1
        except Exception as ex:
            with LOCK:
                JOB['failed']+=1
                if len(JOB['errors'])<100:JOB['errors'].append({'id':id_,'message':str(ex)[:230]})
        with LOCK:JOB['done']+=1;JOB['current']=id_
        time.sleep(.22)
    write_index_from_titles()
    with LOCK:JOB['running']=False

def start_job(ids,force=False):
    global JOB
    ids=list(dict.fromkeys(i for i in ids if i in CATALOG))
    if not ids:raise ValueError('عنوان معتبری انتخاب نشده است.')
    selected=ids
    if not force:
        ids=[id_ for id_ in selected if title_missing(id_) or missing_episode_images(get_json(TITLES/(id_+'.json')))]
    with LOCK:
        if JOB['running']:raise RuntimeError('همگام‌سازی دیگری در حال اجراست.')
        JOB={'running':bool(ids),'done':0,'total':len(ids),'success':0,'failed':0,'skipped':len(selected)-len(ids),'current':'','errors':[],'mode':'titles','photosSaved':0}
    if ids:threading.Thread(target=sync_job,args=(ids,force),daemon=True).start()
    return dict(JOB)

def sync_people_job(ids):
    for pid in ids:
        try:
            result=update_person(pid)
            with LOCK:
                JOB['success']+=1
                if _is_local_photo(result.get('photo')):JOB['photosSaved']+=1
        except Exception as ex:
            with LOCK:
                JOB['failed']+=1
                if len(JOB['errors'])<100:JOB['errors'].append({'id':pid,'message':str(ex)[:210]})
        with LOCK:
            JOB['done']+=1
            JOB['current']=pid
        time.sleep(.25)
    with LOCK:JOB['running']=False

def start_people_job(only_missing=True):
    global JOB
    people=read_index().get('people',{})
    ids=[pid for pid,p in people.items() if not only_missing or _photo_is_missing(p)]
    with LOCK:
        if JOB['running']:raise RuntimeError('همگام‌سازی دیگری در حال اجراست.')
        JOB={'running':bool(ids),'done':0,'total':len(ids),'success':0,'failed':0,'current':'','errors':[],'mode':'people','photosSaved':0}
    if ids:threading.Thread(target=sync_people_job,args=(ids,),daemon=True).start()
    return job_status()

def job_status():
    with LOCK:return {**JOB,'errors':list(JOB['errors'])}

def status():
    records={id_:get_json(TITLES/(id_+'.json')) for id_ in CATALOG}
    incomplete=[id_ for id_,r in records.items() if title_missing(id_,r) or missing_episode_images(r)]
    ready=len(CATALOG)-len(incomplete)
    idx=read_index()
    people=idx.get('people',{})
    images=sum(1 for p in people.values() if _is_local_photo(p.get('photo')) or _is_local_photo((get_json(PEOPLE/(p['id']+'.json')) or {}).get('photo')))
    return {'ready':ready,'incomplete':len(incomplete),'incompleteIds':incomplete,'total':len(CATALOG),'people':len(people),'peopleWithPhotos':images,'peopleMissingPhotos':len(people)-images,'tmdbConfigured':bool(token()),'job':job_status()}

def full_catalog():
    # Generated from the app's own local catalogue, not from remote untrusted content.
    js=(ROOT/'data.js').read_text('utf-8')
    # data.js rows are JS literals; parse the subset with a conservative regex.
    pattern=re.compile(r"^\['(?P<id>[^']+)','(?P<title>[^']+)','(?P<fa>[^']+)',(?P<year>\d+),'[^']+',(?:\d+|null),(?P<eps>\d+),'(?P<type>[^']+)'",re.M)
    rows={}
    for m in pattern.finditer(js):
        id_=m.group('id');title=m.group('title');eps=int(m.group('eps'))
        if id_ not in CATALOG:continue
        rows[id_]={'name':title,'year':int(m.group('year')),'episodes':eps,'season':season_of(title),'kind':'tv' if eps else 'movie'}
    for id_,name in CATALOG.items():
        if id_ not in rows:
            rows[id_]={'name':name,'year':0,'episodes':0,'season':1,'kind':'movie'}
    # Specials are routed to the movie API; the fallback can still supply their description.
    return rows
lookup=full_catalog()
