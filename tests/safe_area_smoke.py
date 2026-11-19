"""Verify actual CSS geometry with simulated device safe area values in Chromium."""
from pathlib import Path
import tempfile, subprocess, re, json
ROOT=Path(__file__).resolve().parents[1]
CHROME='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
css=(ROOT/'docs/style.css').read_text()
head=(ROOT/'docs/index.html').read_text()
boot=re.search(r'<style>(.*?)</style>',head,re.S).group(1)
with tempfile.TemporaryDirectory(prefix='marvel-safe-test-') as temp:
    tmp=Path(temp)
    # Test actual production rules at iPhone and desktop widths, without network timing.
    for width,top,bottom,bar in [(390,59,34,64),(390,0,0,64),(1440,0,0,74)]:
        p=tmp/'safe.html'
        p.write_text('<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><style>'+boot+'\n'+css+'\n:root{--mp-safe-top:'+str(top)+'px!important;--mp-safe-bottom:'+str(bottom)+'px!important;--mp-safe-left:0px!important;--mp-safe-right:0px!important}</style><div class="app-shell"><div class="workspace"><header class="topbar"><span>Test</span></header><main class="main-content">Test</main></div><nav class="mobile-nav">Nav</nav></div><div id="boot-shell" style="display:block"><header class="bs-top">Boot</header></div><script>const st=s=>getComputedStyle(document.querySelector(s));document.body.dataset.result=JSON.stringify({w:innerWidth,top:parseFloat(st(".topbar").paddingTop),height:parseFloat(st(".topbar").height),bootTop:parseFloat(st(".bs-top").paddingTop),bootHeight:parseFloat(st(".bs-top").height),bottom:parseFloat(st(".mobile-nav").paddingBottom)});</script>')
        result=subprocess.run([CHROME,'--headless','--disable-gpu','--no-first-run','--no-proxy-server','--disable-background-networking','--user-data-dir='+str(tmp/'profile'),'--window-size='+str(width)+',844','--dump-dom',p.as_uri()],capture_output=True,text=True,timeout=30,check=True)
        import html
        v=json.loads(html.unescape(re.search(r'data-result="([^"]+)"',result.stdout).group(1)))
        safe=top+min(10,top) if width<=700 else top
        assert v['top']==v['bootTop']==safe and v['height']==v['bootHeight']==bar+safe,(width,v)
        if width==390:assert v['bottom']==6+bottom,v
        print('PASS',width,top,bottom,v,flush=True)
