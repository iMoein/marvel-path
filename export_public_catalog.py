#!/usr/bin/env python3
"""Export the explicitly permitted public movie/actor catalogue from a local installation.

No credentials or private viewer state are read. Local portraits and posters are
validated and re-encoded with metadata stripped. Manual portraits are excluded
unless explicitly opted in. The TMDB/TVmaze records retain source attribution.
"""
import argparse
import json
import re
import shutil
import tempfile
from pathlib import Path
from urllib.parse import urlsplit
from PIL import Image, ImageOps

ROOT=Path(__file__).resolve().parent
SAFE_ID=re.compile(r"[a-z0-9-]{1,110}\Z")
SENSITIVE=re.compile(r"eyJ[A-Za-z0-9_-]{25,}\.[A-Za-z0-9_-]{25,}\.[A-Za-z0-9_-]{20,}|(?:ghp_|github_pat_|gho_)[A-Za-z0-9_]{25,}|(?:[?&](?:api_key|access_token|token|authorization)=)",re.I)
SOURCE_HOSTS={"www.themoviedb.org","themoviedb.org","www.tvmaze.com","tvmaze.com","api.tvmaze.com","github.com","raw.githubusercontent.com"}
IMAGE_HOSTS={"image.tmdb.org","static.tvmaze.com","cdn.tvmaze.com","cdn.marvel.com","lumiere-a.akamaihd.net","raw.githubusercontent.com","cdn.jsdelivr.net"}
POSTER_SOURCE_HOSTS=IMAGE_HOSTS|{"artofthemovies.co.uk","resizing.flixster.com","m.media-amazon.com","www.originalfilmart.com","media-cache.cinematerial.com"}
def poster_source(value):
    # Preserve public provenance only; strip query strings and fragments.
    if not isinstance(value,str):return ""
    u=urlsplit(value)
    if u.scheme!="https" or u.netloc not in POSTER_SOURCE_HOSTS or not u.path.startswith("/"):return ""
    clean="https://"+u.netloc+u.path
    return clean if not SENSITIVE.search(clean) else ""
TITLE_FIELDS=("id","title","overview","tagline","director","season","seasonCountExpected","selectionOnly","source","fetchedAt","tmdbId","tvmazeId","type")
PERSON_FIELDS=("name","birthDate","birthPlace","bio","source","fetchedAt","tmdbId")
CREDIT_FIELDS=("id","title","character")
CAST_FIELDS=("personId","name","character","order","tmdbId")
EP_FIELDS=("number","name","overview","airDate","runtime")
FILM_FIELDS=("name","year","character","mediaType")

def read(p):return json.loads(p.read_text(encoding="utf-8"))
def put(p,v):
    p.parent.mkdir(parents=True,exist_ok=True)
    s=json.dumps(v,ensure_ascii=False,separators=(",",":"),allow_nan=False)
    if SENSITIVE.search(s):raise ValueError("Possible credential in catalogue: "+p.name)
    p.write_text(s+"\n",encoding="utf-8")
def scalar(v):
    if v is None or isinstance(v,(str,int,float,bool)):
        if isinstance(v,str) and SENSITIVE.search(v):raise ValueError("Possible credential in catalogue field")
        return v
    raise ValueError("Unexpected non-scalar field")
def select(d,fields):return {k:scalar(d[k]) for k in fields if k in d}
def url(v,hosts):
    if not isinstance(v,str) or not v:return ""
    u=urlsplit(v)
    if u.scheme!="https" or u.netloc not in hosts or u.query or u.fragment:return ""
    if not u.path.startswith("/") or SENSITIVE.search(v):return ""
    return v
def entries(d,key):
    x=d.get(key,[])
    if not isinstance(x,list):raise ValueError("Invalid list: "+key)
    return x
def local_ref(v,kind):
    if not isinstance(v,str):return None
    m=re.fullmatch(r"\.?/?assets/"+kind+r"/([a-z0-9-]{1,110})\.(jpg|jpeg|png|webp)",v)
    return m.group(1)+"."+m.group(2) if m else None

def export(src,out,include_manual=False):
    base=src/"assets/metadata"
    catalog=read(ROOT/"catalog.json")
    idx=read(base/"index.json")["people"]
    manifest=read(src/"assets/posters/manifest.json")
    if any(not SAFE_ID.fullmatch(k) for k in list(idx)+list(catalog)):raise ValueError("Invalid identifier")
    image_maps={"people":{},"posters":{}}
    manual_skipped=0
    def image_file(ref,kind,key):
        fname=local_ref(ref,kind)
        if not fname:return ""
        source=src/"assets"/kind/fname
        if not source.is_file() or source.is_symlink():raise ValueError("Missing or non-regular image: "+fname)
        if source.stat().st_size>30_000_000:raise ValueError("Image too large: "+fname)
        dest=out/"images"/kind/(key+".webp")
        dest.parent.mkdir(parents=True,exist_ok=True)
        with Image.open(source) as im:
            if im.format not in ("JPEG","PNG","WEBP"):raise ValueError("Invalid image: "+fname)
            im=ImageOps.exif_transpose(im).convert("RGB")
            im.thumbnail((1500,1500) if kind=="posters" else (900,900))
            im.save(dest,"WEBP",quality=91,method=3)
        path="./public-data/images/"+kind+"/"+dest.name
        image_maps[kind][key]=path
        return path

    people={}
    detailed=0
    for pid,entry in sorted(idx.items()):
        if entry.get("id")!=pid:raise ValueError("Index ID mismatch: "+pid)
        pfile=base/"people"/(pid+".json")
        if pfile.is_symlink():raise ValueError("Symlink profile")
        stored=read(pfile) if pfile.is_file() else {}
        detailed+=bool(stored)
        merged={**entry,**stored}
        person={"id":pid,**select(merged,PERSON_FIELDS)}
        if not person.get("name"):raise ValueError("Nameless profile")
        person["sourceUrl"]=url(merged.get("sourceUrl"),SOURCE_HOSTS)
        person["credits"]=[select(c,CREDIT_FIELDS) for c in entries(entry,"credits")]
        for credit in person["credits"]:
            if credit.get("id") not in catalog:raise ValueError("Unknown catalogue credit")
        photo=merged.get("photo") or entry.get("photo") or ""
        if stored.get("photoSource")=="manual upload" and not include_manual:
            manual_skipped+=1
            photo=""
        person["photo"]=image_file(photo,"people",pid) if local_ref(photo,"people") else url(photo,IMAGE_HOSTS)
        if not person["photo"]:
            person["photo"]=url(entry.get("photo"),IMAGE_HOSTS)
        person["filmography"]=[{**select(f,FILM_FIELDS),"poster":url(f.get("poster"),IMAGE_HOSTS)} for f in entries(stored,"filmography")]
        people[pid]=person
        put(out/"people"/(pid+".json"),{"ready":True,"data":person})
    titles={}
    for tid,name in catalog.items():
        path=base/"titles"/(tid+".json")
        if not path.is_file() or path.is_symlink():raise ValueError("Missing local title: "+tid)
        record=read(path)
        if record.get("id")!=tid:raise ValueError("Title ID mismatch")
        title=select(record,TITLE_FIELDS)
        title["sourceUrl"]=url(record.get("sourceUrl"),SOURCE_HOSTS)
        title["genres"]=[scalar(g) for g in entries(record,"genres")]
        title["cast"]=[]
        for c in entries(record,"cast"):
            credit=select(c,CAST_FIELDS)
            pid=credit.get("personId")
            if pid not in people:raise ValueError("Unknown cast profile: "+str(pid))
            credit["photo"]=people[pid]["photo"] or url(c.get("photo"),IMAGE_HOSTS)
            title["cast"].append(credit)
        title["episodes"]=[{**select(e,EP_FIELDS),"image":url(e.get("image"),IMAGE_HOSTS)} for e in entries(record,"episodes")]
        titles[tid]=title
        put(out/"titles"/(tid+".json"),{"ready":True,"data":title})
    posters={};sources={}
    for tid,entry in sorted(manifest.items()):
        if tid not in catalog:continue
        remote=poster_source(entry.get("source"))
        if not remote and not include_manual:
            manual_skipped+=1
            continue
        ref=entry.get("path")
        if local_ref(ref,"posters"):
            posters[tid]=image_file(ref,"posters",tid)
        elif remote and url(remote,IMAGE_HOSTS):posters[tid]=remote
        if remote:sources[tid]=remote
    directory=[{k:p[k] for k in ("id","name","photo","credits","tmdbId") if k in p} for p in people.values()]
    directory.sort(key=lambda p:(-len(p["credits"]),p["name"].casefold()))
    put(out/"people.json",{"items":directory})
    put(out/"poster-urls.json",posters)
    put(out/"poster-sources.json",sources)
    report={"titles":len(titles),"people":len(people),"detailedProfiles":detailed,
        "castCredits":sum(len(x["cast"]) for x in titles.values()),
        "episodes":sum(len(x["episodes"]) for x in titles.values()),
        "episodeImages":sum(bool(e["image"]) for t in titles.values() for e in t["episodes"]),
        "filmographyCredits":sum(len(x["filmography"]) for x in people.values()),
        "localPortraits":len(image_maps["people"]),"portraitsAvailable":sum(bool(p["photo"]) for p in people.values()),
        "localPosters":len(image_maps["posters"]),"postersAvailable":len(posters),"manualImagesSkipped":manual_skipped,
        "titleOverviews":sum(bool(t.get("overview")) for t in titles.values())}
    put(out/"catalog-summary.json",report)
    for image in list(image_maps["people"].values())+list(image_maps["posters"].values()):
        assert (out/image.removeprefix("./public-data/")).is_file()
    return report

if __name__=="__main__":
    ap=argparse.ArgumentParser()
    ap.add_argument("local_installation",type=Path)
    ap.add_argument("--include-manual-images",action="store_true",help="Publish manually uploaded images only where rights and privacy are cleared")
    args=ap.parse_args()
    source=args.local_installation.resolve()
    if source==ROOT:raise SystemExit("Use the separate private installation as the source.")
    with tempfile.TemporaryDirectory(prefix=".catalog-export-",dir=ROOT) as temp:
        stage=Path(temp)/"public-data"
        stage.mkdir()
        report=export(source,stage,args.include_manual_images)
        old=Path(temp)/"old-public-data"
        dest=ROOT/"public-data"
        if dest.exists():dest.rename(old)
        try:stage.rename(dest)
        except BaseException:
            if old.exists():old.rename(dest)
            raise
    print(json.dumps(report,ensure_ascii=False))
