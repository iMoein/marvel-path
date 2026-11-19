#!/usr/bin/env python3
"""Fetch only already published, allowlisted episode and portrait image URLs; no API or credentials."""
import concurrent.futures, hashlib, io, json, re, urllib.request, urllib.parse, pathlib
from PIL import Image, ImageOps
import episode_cache
ROOT=pathlib.Path(__file__).resolve().parent
P=ROOT/'public-data'
HOSTS={'image.tmdb.org','static.tvmaze.com','cdn.tvmaze.com'}
MAX=5_000_000
def allowed(u):
    if not isinstance(u,str):return False
    x=urllib.parse.urlsplit(u)
    return x.scheme=='https' and x.netloc in HOSTS and not x.query and not x.fragment
class Redirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self,req,fp,code,msg,headers,newurl):
        if not allowed(newurl):raise ValueError('Unapproved redirect')
        return super().redirect_request(req,fp,code,msg,headers,newurl)
def get(u):
    name=hashlib.sha256(u.encode()).hexdigest()[:32]+'.webp'
    dest=P/'images'/'remote'/name
    try:
        if not dest.is_file():
            local=episode_cache.cached_path(u)
            if local:
                b=local.read_bytes()
            else:
                opener=urllib.request.build_opener(Redirect())
                with opener.open(urllib.request.Request(u,headers={'User-Agent':'MarvelPath/3.2 (public artwork cache)'}),timeout=6) as r:
                    if not allowed(r.geturl()):return None
                    b=r.read(MAX+1)
            if len(b)>MAX: return None
            with Image.open(io.BytesIO(b)) as im:
                if im.format not in ('JPEG','PNG','WEBP'):return None
                im=ImageOps.exif_transpose(im).convert('RGB');im.thumbnail((960,960))
                tmp=dest.with_suffix('.tmp')
                im.save(tmp,'WEBP',quality=83,method=3);tmp.replace(dest)
        return (u,'./public-data/images/remote/'+name)
    except Exception:return None
urls=set()
for f in (P/'titles').glob('*.json'):
    d=json.loads(f.read_text())['data']
    urls.update(e['image'] for e in d.get('episodes',[]) if allowed(e.get('image')))
    urls.update(c['photo'] for c in d.get('cast',[]) if allowed(c.get('photo')))
for item in json.loads((P/'people.json').read_text())['items']:
    if allowed(item.get('photo')):urls.add(item['photo'])
(P/'images/remote').mkdir(parents=True,exist_ok=True)
print('Public external image references:',len(urls),flush=True)
m={}
with concurrent.futures.ThreadPoolExecutor(max_workers=18) as ex:
    for i,result in enumerate(ex.map(get,sorted(urls)),1):
        if result:m[result[0]]=result[1]
        if i%50==0:print('Processed',i,'saved',len(m),flush=True)
(P/'image-cache.json').write_text(json.dumps(m,ensure_ascii=False,separators=(',',':'))+'\n')
print('Image cache complete',len(m),'of',len(urls),flush=True)
