"""Render original app-brand graphics using a local browser, no external requests."""
import subprocess,tempfile
from pathlib import Path
from PIL import Image
ROOT=Path(__file__).resolve().parent
BRAND=ROOT/'assets/brand'
OUT=ROOT/'assets/social'
ICONS=ROOT/'assets/icons'
CHROME='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
def capture(url,width,height,out):
    with tempfile.TemporaryDirectory(prefix='marvel-brand-') as profile:
        subprocess.run([CHROME,'--headless','--disable-gpu','--disable-background-networking','--no-first-run','--no-proxy-server','--host-resolver-rules=MAP * ~NOTFOUND','--allow-file-access-from-files','--hide-scrollbars','--force-device-scale-factor=1','--user-data-dir='+profile,'--window-size='+f'{width},{height}','--virtual-time-budget=3500','--screenshot='+str(out),url],check=True,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL,timeout=30)
def main():
    OUT.mkdir(exist_ok=True);ICONS.mkdir(exist_ok=True)
    with tempfile.TemporaryDirectory() as d:
        d=Path(d)
        for size,name in [((1200,630),'og'),((1080,1920),'mobile')]:
            tmp=d/(name+'.png');capture((BRAND/'social.html').as_uri(),*size,tmp)
            with Image.open(tmp) as im:
                assert im.size==size
                im.convert('RGB').save(OUT/(name+'.jpg'),quality=94,optimize=True,progressive=True)
        # Render original app mark; separate maskable safe-zone design.
        for mask in (False,True):
            target=d/('mask.svg' if mask else 'mark.svg')
            svg=(BRAND/'mark.svg').read_text()
            if mask:
                svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" fill="#101116"/><svg x="54" y="54" width="404" height="404" viewBox="0 0 512 512">'+svg.split('>',1)[1].rsplit('</svg>',1)[0]+'</svg></svg>'
            target.write_text(svg)
            # SVG document rasterized via page with exact viewport.
            html=d/'icon.html';html.write_text('<html><style>body{margin:0;background:#101116}img{width:100vw;height:100vh;display:block}</style><img src="'+target.name+'"></html>')
            tmp=d/('mask.png' if mask else 'icon.png');capture(html.as_uri(),512,512,tmp)
            with Image.open(tmp) as im:
                im=im.convert('RGB')
                if mask:im.save(ICONS/'maskable-512.png',optimize=True)
                else:
                    for n in (16,32,48,180,192,512):im.resize((n,n),Image.Resampling.LANCZOS).save(ICONS/f'icon-{n}.png',optimize=True)
                    im.save(ROOT/'assets/favicon.ico',sizes=[(16,16),(32,32),(48,48)])
        (ROOT/'assets/favicon.svg').write_text((BRAND/'mark.svg').read_text())
    print('Rendered landscape and portrait sharing graphics, favicon and app icons')
if __name__=='__main__':main()
