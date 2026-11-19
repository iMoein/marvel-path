#!/usr/bin/env python3
# Persian editorial translations; source fingerprints prevent stale translations.
import hashlib
import json
from pathlib import Path
ROOT=Path(__file__).resolve().parent
TABLE=json.loads((ROOT/'translations/fa.json').read_text(encoding='utf-8'))
MISMATCH={'daredevil-3':207555,'defenders':32736}
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
    if id_ in MISMATCH and d.get('tmdbId')==MISMATCH[id_]:
        # Keep the original source snapshot on disk; do not present the wrong show's synopsis/cast.
        d['sourceMismatch']=True
        return d
    tx=TABLE['titles'].get(id_,{})
    field(d,'overview',tx.get('overview'))
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
