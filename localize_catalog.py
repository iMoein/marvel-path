#!/usr/bin/env python3
# Persian editorial translations; source fingerprints prevent stale translations.
import hashlib
import json
from pathlib import Path
ROOT=Path(__file__).resolve().parent
TABLE=json.loads((ROOT/'translations/fa.json').read_text(encoding='utf-8'))
MISMATCH={'daredevil-3':207555,'defenders':32736}
TVMAZE_MISMATCH={'defenders':1217}
def source_mismatch(id_,r):
    return bool(r.get('sourceMismatch') or (id_ in MISMATCH and r.get('tmdbId')==MISMATCH[id_]) or (id_ in TVMAZE_MISMATCH and r.get('tvmazeId')==TVMAZE_MISMATCH[id_]))
def field(row,key,entry):
    value=row.get(key)
    if isinstance(value,str) and entry and hashlib.sha256(value.encode()).hexdigest()==entry['sha256']:
        row[key+'Fa']=entry['fa']
def roles(row):
    for c in row:
        if not isinstance(c,dict):continue
        v=TABLE['roles'].get(c.get('character'))
        if v:c['characterFa']=v
def person(d,id_=None):
    if not isinstance(d,dict):return d
    tx=TABLE['people'].get(id_ or d.get('id'),{})
    for k in ('name','bio','birthPlace'):field(d,k,tx.get(k))
    if d.get('bioFa') and not d.get('bioFa')==d.get('bio'):
        source=d.get('bio','')
        credit=next((x.strip() for x in source.splitlines() if x.startswith('Description above from the Wikipedia article')),None)
        if credit:
            d['bioFaAttribution']=credit
            d['bioFaLicense']='CC-BY-SA'
    for k in ('credits','filmography'):roles(d.get(k,[]))
    return d
def title(d,id_):
    if not isinstance(d,dict):return d
    if source_mismatch(id_,d):
        # Keep the original source snapshot on disk; do not present the wrong show's synopsis/cast.
        d['sourceMismatch']=True
        return d
    tx=TABLE['titles'].get(id_,{})
    for k in ('overview','tagline','director'):field(d,k,tx.get(k))
    genres={'Action':'اکشن','Action & Adventure':'اکشن و ماجراجویی','Adventure':'ماجراجویی','Animation':'انیمیشن','Comedy':'کمدی','Crime':'جنایی','Documentary':'مستند','Drama':'درام','Family':'خانوادگی','Fantasy':'فانتزی','Horror':'ترسناک','Kids':'کودک','Legal':'حقوقی','Mystery':'معمایی','Reality':'واقع‌نما','Sci-Fi & Fantasy':'علمی‌تخیلی و فانتزی','Science Fiction':'علمی‌تخیلی','Science-Fiction':'علمی‌تخیلی','Thriller':'دلهره‌آور'}
    if d.get('genres'):d['genresFa']=[genres.get(g,g) for g in d['genres']]
    for e in d.get('episodes',[]):
        te=tx.get('episodes',{}).get(str(e.get('number')),{})
        for k in ('name','overview'):field(e,k,te.get(k))
    for c in d.get('cast',[]):person(c,c.get('personId'))
    roles(d.get('cast',[]))
    return d
def directory(d):
    for p in d.get('items',[]):person(p)
    return d
def apply_public(base):
    def edit(p,fn):
        data=json.loads(p.read_text(encoding='utf-8'));before=json.dumps(data,ensure_ascii=False,sort_keys=True);fn(data)
        if before==json.dumps(data,ensure_ascii=False,sort_keys=True):return
        p.write_text(json.dumps(data,ensure_ascii=False,separators=(',',':'))+'\n',encoding='utf-8')
    edit(base/'people.json',directory)
    for p in (base/'titles').glob('*.json'):edit(p,lambda rec,p=p:title(rec.get('data'),p.stem))
    for p in (base/'people').glob('*.json'):edit(p,lambda rec,p=p:person(rec.get('data'),p.stem))
