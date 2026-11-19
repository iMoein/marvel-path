"""Local, source-addressed episode still cache. No API credentials or browser fetches."""
import hashlib
import json
import tempfile
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

ROOT=Path(__file__).resolve().parent
CACHE=ROOT/'assets'/'episodes'
PUBLIC=ROOT/'public-data'/'images'/'remote'
HOSTS={'image.tmdb.org','static.tvmaze.com','cdn.tvmaze.com'}
MAX_BYTES=5_000_000

def allowed(url):
    if not isinstance(url,str):return False
    try:u=urllib.parse.urlsplit(url)
    except ValueError:return False
    return u.scheme=='https' and u.netloc in HOSTS and u.path.startswith('/') and not u.query and not u.fragment

def key(url):
    return hashlib.sha256(url.encode()).hexdigest()[:32]

def extension(blob):
    if len(blob)<40 or len(blob)>MAX_BYTES:raise ValueError('Invalid image size')
    if blob.startswith(b'\xff\xd8\xff'):return '.jpg'
    if blob.startswith(b'\x89PNG\r\n\x1a\n'):return '.png'
    if blob.startswith(b'RIFF') and blob[8:12]==b'WEBP':return '.webp'
    raise ValueError('Unsupported image format')

def cached_path(url):
    if not allowed(url):return None
    name=key(url)
    for suffix in ('.webp','.jpg','.png'):
        p=CACHE/(name+suffix)
        if p.is_file() and not p.is_symlink():return p
    return None

def public_ref(url):
    if not allowed(url):return None
    p=PUBLIC/(key(url)+'.webp')
    return p if p.is_file() and not p.is_symlink() else None

def local_url(url):
    p=cached_path(url)
    return '/assets/episodes/'+p.name if p else ''

class SafeRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self,req,fp,code,msg,headers,newurl):
        if not allowed(newurl):raise ValueError('Unapproved redirect')
        return super().redirect_request(req,fp,code,msg,headers,newurl)

def download(url):
    opener=urllib.request.build_opener(SafeRedirect())
    req=urllib.request.Request(url,headers={'User-Agent':'MarvelPath/3.5 (episode still cache)','Accept':'image/webp,image/png,image/jpeg'})
    with opener.open(req,timeout=8) as response:
        if not allowed(response.geturl()):raise ValueError('Unapproved image host')
        if int(response.headers.get('Content-Length','0') or 0)>MAX_BYTES:raise ValueError('Image too large')
        return response.read(MAX_BYTES+1)

def ensure(url):
    if not allowed(url):return 'invalid'
    if cached_path(url):return 'cached'
    try:
        existing=public_ref(url)
        data=existing.read_bytes() if existing else download(url)
        suffix=extension(data)
        CACHE.mkdir(parents=True,exist_ok=True)
        with tempfile.NamedTemporaryFile(dir=CACHE,delete=False) as tmp:
            temp=Path(tmp.name);tmp.write(data)
        try:temp.replace(CACHE/(key(url)+suffix))
        finally:temp.unlink(missing_ok=True)
        return 'reused' if existing else 'downloaded'
    except (ValueError,OSError,TimeoutError,TypeError):return 'failed'

def cache_urls(urls):
    urls=sorted(set(u for u in urls if allowed(u)))
    report={'cached':0,'reused':0,'downloaded':0,'failed':0,'invalid':0}
    with ThreadPoolExecutor(max_workers=6) as pool:
        for status in pool.map(ensure,urls):report[status]+=1
    return report

def cache_record(record):
    return cache_urls(e.get('image') for e in record.get('episodes',[]) if isinstance(e,dict))

def localize_record(record):
    if not isinstance(record,dict):return record
    # Keep upstream URL on disk and in export; send only same-origin paths to the laptop viewer.
    return {**record,'episodes':[{**e,'image':local_url(e.get('image'))} for e in record.get('episodes',[]) if isinstance(e,dict)]}

if __name__=='__main__':
    urls=[]
    for p in (ROOT/'assets'/'metadata'/'titles').glob('*.json'):
        try:urls.extend(e.get('image') for e in json.loads(p.read_text()).get('episodes',[]) if isinstance(e,dict))
        except (ValueError,OSError):continue
    report=cache_urls(urls)
    print(json.dumps(report),flush=True)
    raise SystemExit(bool(report['failed']))
