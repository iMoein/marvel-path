#!/usr/bin/env python3
"""Local-only poster vault for Marvel Path. Python 3 standard library only.

Admin writes are restricted to a 127.0.0.1 listener and a secret printed on
startup. Poster bytes are stored in assets/posters/ and persist independently
from browser data. Do not expose this development/admin server to the internet.
"""
from __future__ import annotations

import argparse
import hmac
import json
import os
import re
import secrets
import socket
import threading
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

import metadata_service as metadata
import localize_catalog
import episode_cache

ROOT = Path(__file__).resolve().parent
POSTER_DIR = ROOT / 'assets' / 'posters'
MANIFEST_PATH = POSTER_DIR / 'manifest.json'
KEY_PATH = ROOT / '.admin-token'
CATALOG = json.loads((ROOT / 'catalog.json').read_text(encoding='utf-8'))
MAX_BYTES = 9 * 1024 * 1024
MAX_JSON = 150 * 1024
HOSTS = {
    'image.tmdb.org','img.amodb.dev','raw.githubusercontent.com','cdn.jsdelivr.net',
    'cdn.marvel.com','lumiere-a.akamaihd.net','www.impawards.com','impawards.com',
    'www.originalfilmart.com','originalfilmart.com','hustonsite.files.wordpress.com',
    'media-cache.cinematerial.com','www.cinematerial.com','artofthemovies.co.uk',
    'pics.filmaffinity.com','resizing.flixster.com','m.media-amazon.com',
    'static.wikia.nocookie.net', 'image.mux.com',
}
lock = threading.RLock()
job_lock = threading.RLock()
job = {'running': False, 'total': 0, 'done': 0, 'success': 0, 'failed': 0, 'last': '', 'errors': []}
POSTER_DIR.mkdir(parents=True, exist_ok=True)


def utc_now():
    return datetime.now(timezone.utc).isoformat(timespec='seconds')


def admin_token():
    if KEY_PATH.exists():
        token = KEY_PATH.read_text(encoding='ascii').strip()
        if len(token) >= 32:
            return token
    token = secrets.token_hex(24)
    descriptor = os.open(KEY_PATH, os.O_CREAT | os.O_WRONLY | os.O_TRUNC, 0o600)
    with os.fdopen(descriptor, 'w', encoding='ascii') as f:
        f.write(token + '\n')
    return token

TOKEN = admin_token()


def read_manifest():
    with lock:
        try:
            data = json.loads(MANIFEST_PATH.read_text(encoding='utf-8'))
            return data if isinstance(data, dict) else {}
        except (OSError, ValueError):
            return {}


def valid_poster_entry(id_,entry):
    if not isinstance(entry,dict):return False
    ref=entry.get('path','')
    if not isinstance(ref,str) or not re.fullmatch(r'assets/posters/'+re.escape(id_)+r'\.(jpg|png|webp)',ref):return False
    f=POSTER_DIR/Path(ref).name
    try:
        if f.is_symlink() or not f.is_file() or f.stat().st_size!=entry.get('size'):return False
        with f.open('rb') as stream:head=stream.read(40)
        return (detect_image(head)[1]==entry.get('mime'))
    except (ValueError,OSError):return False

def available_manifest():
    return {id_:e for id_,e in read_manifest().items() if id_ in CATALOG and valid_poster_entry(id_,e)}

def write_manifest(data):
    with lock:
        temp = POSTER_DIR / '.manifest.tmp'
        temp.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
        os.replace(temp, MANIFEST_PATH)


def detect_image(data):
    if len(data) < 40 or len(data) > MAX_BYTES:
        raise ValueError('حجم یا محتوای تصویر نامعتبر است (حداکثر ۹ مگابایت).')
    if data.startswith(b'\xff\xd8\xff'):
        return '.jpg','image/jpeg'
    if data.startswith(b'\x89PNG\r\n\x1a\n'):
        return '.png','image/png'
    if data.startswith(b'RIFF') and data[8:12] == b'WEBP':
        return '.webp','image/webp'
    raise ValueError('فقط تصویرهای JPG، PNG و WebP پشتیبانی می‌شوند.')


def validate_url(url):
    try:
        u = urllib.parse.urlsplit(url)
    except ValueError:
        raise ValueError('نشانی تصویر معتبر نیست.')
    host = (u.hostname or '').lower()
    if u.scheme != 'https' or host not in HOSTS or u.username or u.password or u.port not in (None, 443):
        raise ValueError('دامنه تصویر در منابع مجاز نیست؛ برای منابع دیگر فایل را دستی بارگذاری کن.')
    return url


class SafeRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        validate_url(newurl)
        return super().redirect_request(req, fp, code, msg, headers, newurl)


opener = urllib.request.build_opener(SafeRedirect())


def fetch_image(url):
    validate_url(url)
    req = urllib.request.Request(url, headers={
        'User-Agent':'Mozilla/5.0 MarvelPathLocalPosterVault/2.6',
        'Accept':'image/avif,image/webp,image/png,image/jpeg;q=0.9,*/*;q=0.1',
    })
    with opener.open(req, timeout=12) as response:
        length = response.headers.get('Content-Length')
        if length and int(length) > MAX_BYTES:
            raise ValueError('فایل تصویر از سقف ۹ مگابایت بزرگ‌تر است.')
        data = response.read(MAX_BYTES + 1)
    detect_image(data)
    return data


def store_image(id_, data, source):
    if id_ not in CATALOG:
        raise ValueError('شناسه عنوان شناخته‌شده نیست.')
    ext, mime = detect_image(data)
    # Atomic replacement, including cleanup of previous format.
    with lock:
        final = POSTER_DIR / (id_ + ext)
        temp = POSTER_DIR / ('.' + id_ + '.upload')
        temp.write_bytes(data)
        os.replace(temp, final)
        manifest = read_manifest()
        old_path = manifest.get(id_, {}).get('path','')
        manifest[id_] = {
            'path':'assets/posters/' + final.name,
            'size':len(data),
            'mime':mime,
            'updatedAt':utc_now(),
            'revision':int(time.time() * 1000),
            'source':source[:500],
        }
        write_manifest(manifest)
        if old_path and old_path != manifest[id_]['path']:
            (POSTER_DIR / Path(old_path).name).unlink(missing_ok=True)
        return manifest[id_]


def store_from_urls(id_, urls, force=False):
    if id_ not in CATALOG:
        return (False, 'عنوان نامعتبر')
    if not force and id_ in available_manifest():
        return (True, 'قبلاً ذخیره شده')
    if not isinstance(urls, list):
        return (False, 'نشانی‌ها معتبر نیستند')
    failures = []
    attempted = set()
    def try_urls(candidates):
        for url in candidates[:8]:
            try:
                if not isinstance(url, str) or len(url)>1500 or url in attempted:
                    continue
                attempted.add(url)
                data = fetch_image(url)
                store_image(id_, data, url)
                return True
            except (ValueError, OSError, urllib.error.URLError, TimeoutError) as ex:
                failures.append(str(ex)[:120])
        return False
    # Explicit replacement preserves the supplied URL priority; otherwise reuse metadata first.
    if not force and try_urls(metadata.cached_poster_candidates(id_)):
        return (True, 'کاور از اطلاعات ذخیره‌شده دریافت شد')
    if try_urls(urls):
        return (True, 'ذخیره شد')
    # Works for catalogue additions that have no hardcoded image URLs,
    # for both single downloads and batch jobs.
    try:
        dynamic_urls = metadata.tmdb_poster_candidates(id_)
        if try_urls(dynamic_urls):
            return (True, 'کاور از TMDB ذخیره شد')
    except (ValueError, OSError, urllib.error.URLError, TimeoutError):
        failures.append('بازیابی پوستر از TMDB ناموفق بود.')
    return (False, 'منبع قابل دریافت نبود' + (': ' + failures[-1] if failures else '؛ آدرس تصویر ثبت نشده یا کلید TMDB تنظیم نشده است.'))



def background_batch(entries, force):
    global job
    for entry in entries:
        id_ = entry.get('id','') if isinstance(entry,dict) else ''
        urls = entry.get('urls',[]) if isinstance(entry,dict) else []
        ok, message = store_from_urls(id_, urls, force=force)
        with job_lock:
            job['done'] += 1
            job['success' if ok else 'failed'] += 1
            job['last'] = CATALOG.get(id_, id_)
            if not ok and len(job['errors']) < 60:
                job['errors'].append({'id':id_, 'reason':message})
    with job_lock:
        job['running'] = False


class AppHandler(SimpleHTTPRequestHandler):
    server_version = 'MarvelPath/2.9'
    extensions_map = {**SimpleHTTPRequestHandler.extensions_map,
                      '.webp':'image/webp','.woff2':'font/woff2','.woff':'font/woff'}

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def log_message(self, fmt, *args):
        if self.path.startswith('/api/'):
            return
        super().log_message(fmt, *args)

    def _safe_host(self):
        host = self.headers.get('Host','')
        if not host:
            return False
        host = host.lower().split(':')[0].strip('[]')
        return host in ('localhost','127.0.0.1')

    def _send_json(self, code, data):
        payload = json.dumps(data, ensure_ascii=False).encode('utf-8')
        self.send_response(code)
        self.send_header('Content-Type','application/json; charset=utf-8')
        self.send_header('Content-Length',str(len(payload)))
        self.send_header('Cache-Control','no-store')
        self.send_header('X-Content-Type-Options','nosniff')
        self.end_headers()
        self.wfile.write(payload)

    def _authorized(self):
        token = self.headers.get('X-Marvel-Admin','')
        return self.client_address[0] in ('127.0.0.1','::1') and hmac.compare_digest(token,TOKEN)

    def _same_origin(self):
        origin = self.headers.get('Origin','')
        expected = 'http://' + self.headers.get('Host','')
        return not origin or origin == expected

    def _allowed_static(self):
        path = urllib.parse.unquote(urllib.parse.urlsplit(self.path).path)
        path = path.replace('\\','/')
        if path in ('/','/index.html','/admin.html'):
            return True
        parts = path.strip('/').split('/')
        if any(p.startswith('.') or p in ('..','') for p in parts):
            return False
        # Serve only public assets and client-side files; NEVER the local admin secret.
        if len(parts) == 1 and parts[0] in ('app.js','admin.js','enrichment.js','data.js','meta.js','posters.js','style.css','sw.js','catalog.json'):
            return True
        if parts[0] != 'assets':
            return False
        return Path(parts[-1]).suffix.lower() in ('.jpg','.jpeg','.png','.webp','.svg','.woff2','.woff','.ttf','.json')

    def _serve_countdown_video(self,head=False):
        # Explicit allowlisted video endpoint; byte ranges support Safari/iOS.
        p=ROOT/'assets/media/doomsday-background.mp4'
        if not p.is_file() or p.is_symlink():
            self.send_error(404);return
        size=p.stat().st_size
        start,end=0,size-1
        value=self.headers.get('Range')
        if value:
            match=re.fullmatch(r'bytes=(\d*)-(\d*)',value)
            if match and (match[1] or match[2]):
                if match[1]:
                    start=int(match[1]);end=min(end,int(match[2])) if match[2] else end
                else:start=max(0,size-int(match[2]))
            else:start=size
            if start>end or start>=size:
                self.send_response(416);self.send_header('Content-Range',f'bytes */{size}');self.send_header('Content-Length','0');self.end_headers();return
        self.send_response(206 if value else 200)
        self.send_header('Content-Type','video/mp4')
        self.send_header('Accept-Ranges','bytes')
        self.send_header('Content-Length',str(end-start+1))
        self.send_header('X-Content-Type-Options','nosniff')
        if value:self.send_header('Content-Range',f'bytes {start}-{end}/{size}')
        self.end_headers()
        if not head:
            with p.open('rb') as f:
                f.seek(start)
                try:self.wfile.write(f.read(end-start+1))
                except (BrokenPipeError,ConnectionResetError):pass

    def do_GET(self):
        if not self._safe_host():
            self._send_json(403,{'error':'Invalid host'});return
        path = urllib.parse.urlsplit(self.path).path
        if path == '/assets/media/doomsday-background.mp4':return self._serve_countdown_video()
        if path == '/api/metadata/status':
            self._send_json(200,metadata.status());return
        if path == '/api/metadata/people':
            people=metadata.read_index().get('people',{})
            self._send_json(200,localize_catalog.directory({'items':sorted(people.values(), key=lambda p:len(p.get('credits',[])),reverse=True)}));return
        if path == '/api/metadata/title':
            raw=urllib.parse.parse_qs(urllib.parse.urlsplit(self.path).query)
            id_=(raw.get('id') or [''])[0]
            if id_ not in CATALOG:self._send_json(404,{'error':'عنوان یافت نشد.'});return
            record=episode_cache.localize_record(localize_catalog.title(metadata.title_record(id_),id_))
            self._send_json(200,{'ready':bool(record),'data':record});return
        if path == '/api/metadata/person':
            raw=urllib.parse.parse_qs(urllib.parse.urlsplit(self.path).query)
            pid=(raw.get('id') or [''])[0]
            if not re.fullmatch(r'[a-z0-9-]{1,110}',pid):self._send_json(400,{'error':'شناسه نامعتبر'});return
            record=localize_catalog.person(metadata.person_info(pid),pid)
            self._send_json(200 if record else 404,{'ready':bool(record),'data':record});return
        if path == '/api/admin/metadata/job':
            if not self._authorized():self._send_json(401,{'error':'دسترسی مدیریت نیاز به کد دارد.'});return
            self._send_json(200,metadata.job_status());return
        if path == '/api/posters/manifest':
            self._send_json(200,available_manifest());return
        if path == '/api/admin/status':
            self._send_json(200,{'localServer':True,'saved':len(available_manifest()),'total':len(CATALOG),'loginRequired':True});return
        if path == '/api/admin/check':
            self._send_json(200 if self._authorized() else 401,{'authorized':self._authorized()});return
        if path == '/api/admin/posters/job':
            if not self._authorized():self._send_json(401,{'error':'دسترسی مدیریت نیاز به کد دارد.'});return
            with job_lock: snapshot={**job,'errors':list(job['errors'])}
            self._send_json(200,snapshot);return
        if not self._allowed_static():
            self._send_json(404,{'error':'Not found'});return
        if path=='/admin.html':
            # Browser may cache only the public app, never the manager login page.
            self.send_response(200)
            payload=(ROOT/'admin.html').read_bytes()
            self.send_header('Content-Type','text/html; charset=utf-8')
            self.send_header('Content-Length',str(len(payload)))
            self.send_header('Cache-Control','no-store')
            self.send_header('X-Content-Type-Options','nosniff')
            self.send_header('Referrer-Policy','no-referrer')
            self.end_headers();self.wfile.write(payload);return
        return super().do_GET()

    def do_HEAD(self):
        if self._safe_host() and urllib.parse.urlsplit(self.path).path=='/assets/media/doomsday-background.mp4':return self._serve_countdown_video(head=True)
        if not self._safe_host() or not self._allowed_static():
            self.send_response(404);self.end_headers();return
        return super().do_HEAD()

    def _read_json(self):
        length=int(self.headers.get('Content-Length','0'))
        if not 0<length<=MAX_JSON:
            raise ValueError('اندازه درخواست نامعتبر است.')
        data=json.loads(self.rfile.read(length).decode('utf-8'))
        if not isinstance(data,dict):
            raise ValueError('داده درخواست نامعتبر است.')
        return data

    def do_POST(self):
        if not self._safe_host() or not self._same_origin() or not self._authorized():
            self._send_json(403,{'error':'فقط مدیر احرازشده روی همین رایانه مجاز است.'});return
        path = urllib.parse.urlsplit(self.path).path
        try:
            if path == '/api/admin/metadata/token':
                data=self._read_json()
                is_on=metadata.configure_token(data.get('token',''))
                self._send_json(200,{'ok':True,'tmdbConfigured':is_on});return
            if path == '/api/admin/metadata/sync':
                data=self._read_json()
                ids=data.get('ids') or []
                if data.get('scope')=='all':ids=list(CATALOG)
                if not isinstance(ids,list) or len(ids)>len(CATALOG) or any(not isinstance(i,str) for i in ids):raise ValueError('فهرست عنوان‌ها معتبر نیست.')
                try:
                    job_info=metadata.start_job(ids,force=data.get('force') is True)
                except RuntimeError as e:
                    self._send_json(409,{'error':str(e)});return
                self._send_json(202,{'ok':True,'job':job_info});return
            if path == '/api/admin/metadata/people/sync':
                data=self._read_json()
                try:
                    job_info=metadata.start_people_job(only_missing=data.get('onlyMissing',True) is not False)
                except RuntimeError as e:
                    self._send_json(409,{'error':str(e)});return
                self._send_json(202,{'ok':True,'job':job_info});return
            if path == '/api/admin/metadata/person/link':
                data=self._read_json()
                pid=data.get('id','')
                if not isinstance(pid,str) or not re.fullmatch(r'[a-z0-9-]{1,110}',pid):raise ValueError('بازیگر معتبر نیست.')
                result=metadata.set_person_tmdb_id(pid,data.get('tmdbId'))
                self._send_json(200,result);return
            if path == '/api/admin/metadata/person/photo':
                parsed=urllib.parse.parse_qs(urllib.parse.urlsplit(self.path).query)
                pid=(parsed.get('id') or [''])[0]
                if not re.fullmatch(r'[a-z0-9-]{1,110}',pid):raise ValueError('بازیگر معتبر نیست.')
                length=int(self.headers.get('Content-Length','0'))
                if length<60 or length>4_000_000:raise ValueError('تصویر باید حداکثر ۴ مگابایت باشد.')
                result=metadata.upload_person_photo(pid,self.rfile.read(length))
                self._send_json(200,{'ok':True,'data':result});return
            if path == '/api/admin/metadata/person':
                data=self._read_json()
                pid=data.get('id','')
                if not isinstance(pid,str) or not re.fullmatch(r'[a-z0-9-]{1,110}',pid):raise ValueError('بازیگر معتبر نیست.')
                result=metadata.update_person(pid)
                self._send_json(200,{'ok':True,'data':result});return
            if path == '/api/admin/posters/save':
                params=self._read_json()
                id_=params.get('id','')
                ok, msg=store_from_urls(id_,params.get('urls',[]),force=params.get('force') is True)
                self._send_json(200 if ok else 422,{'ok':ok,'message':msg,'entry':read_manifest().get(id_)});return
            if path == '/api/admin/posters/upload':
                parsed=urllib.parse.parse_qs(urllib.parse.urlsplit(self.path).query)
                id_=(parsed.get('id') or [''])[0]
                length=int(self.headers.get('Content-Length','0'))
                if not 40 <= length <= MAX_BYTES:
                    raise ValueError('فایل باید تصویری و حداکثر ۹ مگابایت باشد.')
                data=self.rfile.read(length)
                result=store_image(id_,data,'manual upload')
                self._send_json(200,{'ok':True,'entry':result});return
            if path == '/api/admin/posters/delete':
                id_=self._read_json().get('id','')
                if id_ not in CATALOG:
                    raise ValueError('عنوان نامعتبر است.')
                with lock:
                    manifest=read_manifest()
                    entry=manifest.pop(id_,None)
                    write_manifest(manifest)
                    if entry:
                        (POSTER_DIR / Path(entry.get('path','')).name).unlink(missing_ok=True)
                self._send_json(200,{'ok':True});return
            if path == '/api/admin/posters/batch':
                params=self._read_json()
                entries=params.get('entries',[])
                force=bool(params.get('force',False))
                if not isinstance(entries,list) or len(entries)>len(CATALOG):
                    raise ValueError('محدوده درخواست گروهی معتبر نیست.')
                entries=[e for e in entries if isinstance(e,dict) and e.get('id') in CATALOG]
                requested=len(entries)
                existing=available_manifest()
                if not force:entries=[e for e in entries if e['id'] not in existing]
                with job_lock:
                    if job['running']:
                        self._send_json(409,{'error':'دانلود گروهی دیگری در حال انجام است.'});return
                    job.update({'running':bool(entries),'total':len(entries),'done':0,'success':0,'failed':0,'skipped':requested-len(entries),'last':'','errors':[]})
                if entries:threading.Thread(target=background_batch,args=(entries,force),daemon=True).start()
                self._send_json(202,{'ok':True,'total':len(entries),'job':dict(job)});return
            self._send_json(404,{'error':'Not found'})
        except (ValueError,UnicodeError,json.JSONDecodeError) as ex:
            self._send_json(422,{'error':str(ex)})
        except (OSError, urllib.error.URLError, TimeoutError) as ex:
            self._send_json(503,{'error':'دریافت اطلاعات از اینترنت ممکن نشد: '+str(ex)[:160]})
        except Exception:
            self._send_json(500,{'error':'خطای سرور هنگام پردازش درخواست.'})


def main():
    parser=argparse.ArgumentParser(description='Marvel Path local poster manager')
    parser.add_argument('--port',type=int,default=8765)
    args=parser.parse_args()
    if not 1024<=args.port<=65535:parser.error('Port must be 1024-65535')
    try:
        server=ThreadingHTTPServer(('127.0.0.1',args.port),AppHandler)
    except OSError as ex:
        raise SystemExit(f'Cannot start local server: {ex}')
    print('\n'+'='*64,flush=True)
    print('Marvel Path v2.9 — local server',flush=True)
    print(f'Viewer (پنل کاربر): http://localhost:{args.port}/',flush=True)
    print(f'Admin (مدیریت سیستم): http://localhost:{args.port}/admin.html',flush=True)
    print('Admin password (فقط در پنل مدیریت وارد کن):',flush=True)
    print(TOKEN,flush=True)
    print('Stored in local file .admin-token; do not publish this file.',flush=True)
    print('Press Ctrl+C to stop.',flush=True)
    print('='*64+'\n',flush=True)
    try:server.serve_forever(poll_interval=0.25)
    except KeyboardInterrupt:print('\nServer stopped.')
    finally:server.server_close()


if __name__ == '__main__':
    main()
