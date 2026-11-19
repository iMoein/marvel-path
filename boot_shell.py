"""Progressive enhancement: retain readable static HTML if JavaScript fails."""
import base64,hashlib,html,re
BOOT="""(()=>{const root=document.documentElement;root.dataset.boot='loading';let timer;const end=state=>{clearTimeout(timer);root.dataset.boot=state;};window.marvelBootReady=()=>end('ready');timer=setTimeout(()=>{if(root.dataset.boot==='loading')end('fallback')},12000);document.addEventListener('DOMContentLoaded',()=>{if(root.dataset.boot==='loading')end('fallback')},{once:true});})();"""
HASH=base64.b64encode(hashlib.sha256(BOOT.encode()).digest()).decode()
CSS="""
html{background:#0c0d11;color-scheme:dark}body{margin:0}
#boot-shell,#boot-fallback{display:none}
html[data-boot=loading] #app{display:none}
html[data-boot=loading] #boot-shell{display:block;min-height:100vh;min-height:100dvh;background:#0e0f13;color:#f4f4f6;font:14px/1.8 Vazirmatn,Tahoma,Arial,sans-serif}
html[data-boot=fallback] #boot-fallback{display:flex;align-items:center;justify-content:space-between;gap:12px;border:1px solid #ed33444d;background:#251b22;color:#f1b7be;padding:12px 16px;margin:18px auto;width:min(94%,1000px);border-radius:12px;font:13px/1.8 Vazirmatn,Tahoma,Arial,sans-serif}
#boot-fallback a{color:inherit;text-decoration:underline;white-space:nowrap}
#boot-shell *{box-sizing:border-box}
.bs-side{position:fixed;right:0;top:0;bottom:0;width:250px;background:#121318;border-left:1px solid #ffffff12;padding:28px 18px}
.bs-brand{display:flex;align-items:center;gap:11px;font-size:18px;font-weight:900;white-space:nowrap}
.bs-mark{display:grid;place-items:center;width:43px;height:43px;flex:none;background:#ed2338;color:white;clip-path:polygon(0 0,100% 0,100% 76%,76% 100%,0 100%);border-radius:6px;font:900 italic 30px Arial}
.bs-menu{display:grid;gap:12px;margin-top:48px}.bs-menu i{height:42px;border-radius:9px;background:#1d1e25}.bs-menu i:first-child{background:#70212e}
.bs-work{margin-right:250px}.bs-top{height:74px;border-bottom:1px solid #ffffff12;background:#121318;display:flex;justify-content:space-between;align-items:center;padding:0 clamp(18px,3.4vw,62px);color:#9696a2}
.bs-mobile{display:none}.bs-state{display:flex;align-items:center;gap:9px;font-size:12px}.bs-state i{width:8px;height:8px;border-radius:50%;background:#eb3347;box-shadow:0 0 13px #ef334077;animation:bs-pulse 1.5s ease-in-out infinite}
.bs-main{width:100%;max-width:1480px;margin:auto;padding:38px clamp(18px,3.2vw,55px) 90px}
.bs-head{margin-bottom:28px}.bs-eyebrow{font:800 11px Arial,sans-serif;letter-spacing:2px;color:#ed3347;direction:ltr;text-align:right}
.bs-title{font-size:clamp(25px,3.1vw,42px);font-weight:900;line-height:1.65;margin:8px 0;color:#f2f2f5}.bs-line,.bs-block,.bs-tile,.bs-card{position:relative;overflow:hidden;background:#202129;border-radius:8px}
.bs-line{height:12px;width:min(540px,82%);margin-top:12px}.bs-line.short{width:48%}.bs-block{height:76px;margin-bottom:16px;border:1px solid #ffffff0c;background:#191a21}.bs-hero{display:grid;grid-template-columns:minmax(0,1fr) 190px;gap:28px;align-items:center;min-height:300px;padding:26px;border:1px solid #ffffff16;border-radius:16px;background:linear-gradient(135deg,#221a20,#15171e);margin-bottom:16px}
.bs-hero .bs-line:first-child{height:25px;width:63%}.bs-hero .bs-tile{aspect-ratio:2/3;width:100%;min-width:0;border:1px solid #ffffff0d}
.bs-metrics{display:grid;grid-template-columns:1.4fr 1fr 1fr;gap:13px;margin-bottom:28px}.bs-metrics .bs-block{height:119px}
.bs-grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:12px}.bs-grid .bs-card{height:220px;border:1px solid #ffffff12;background:#191a21;padding:12px}.bs-card .bs-tile{height:68%}.bs-card .bs-line{width:75%}
.bs-actors .bs-grid{grid-template-columns:repeat(6,minmax(0,1fr))}.bs-actors .bs-card{height:270px}.bs-detail .bs-hero{grid-template-columns:minmax(0,1fr) 34%;min-height:420px}
.bs-tile:after,.bs-line:after,.bs-block:after,.bs-menu i:after{content:'';position:absolute;inset:0;background:linear-gradient(100deg,transparent 25%,#ffffff08 48%,transparent 72%);transform:translateX(-100%);animation:bs-sheen 1.8s ease-in-out infinite}
.bs-menu i{position:relative;overflow:hidden}
.bs-bottom{display:none}
@keyframes bs-sheen{to{transform:translateX(100%)}}@keyframes bs-pulse{50%{opacity:.45}}
@media(max-width:1199px){.bs-side{width:220px}.bs-work{margin-right:220px}.bs-grid,.bs-actors .bs-grid{grid-template-columns:repeat(4,minmax(0,1fr))}.bs-hero{grid-template-columns:minmax(0,1fr) 145px}}
@media(min-width:701px) and (max-width:900px){.bs-side{width:70px;padding:20px 10px}.bs-side .bs-name{display:none}.bs-work{margin-right:70px}.bs-grid,.bs-actors .bs-grid{grid-template-columns:repeat(3,minmax(0,1fr))}}
@media(max-width:700px){.bs-side,.bs-desktop{display:none}.bs-work{margin-right:0}.bs-mobile{display:flex}.bs-top{height:60px}.bs-mobile .bs-mark{width:31px;height:31px;font-size:24px}.bs-mobile{font-size:15px}.bs-main{padding:20px 16px 105px}.bs-hero{grid-template-columns:minmax(0,1fr) 96px;gap:14px;padding:15px;min-height:230px}.bs-block{height:66px}.bs-metrics{grid-template-columns:1fr 1fr;gap:9px}.bs-metrics .bs-block:first-child{grid-column:1/-1}.bs-grid,.bs-actors .bs-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.bs-grid .bs-card{height:190px}.bs-actors .bs-card{height:235px}.bs-detail .bs-hero{grid-template-columns:1fr;min-height:340px}.bs-detail .bs-hero .bs-tile{width:42%;max-width:145px;grid-row:1;justify-self:center}.bs-bottom{position:fixed;display:grid;grid-template-columns:repeat(5,1fr);gap:5px;bottom:0;right:0;left:0;background:#191a21;border-top:1px solid #ffffff15;padding:13px 8px calc(13px + env(safe-area-inset-bottom,0px))}.bs-bottom i{height:38px;border-radius:9px;background:#24252d}}

:root{--mp-safe-top:env(safe-area-inset-top,0px);--mp-safe-right:env(safe-area-inset-right,0px);--mp-safe-bottom:env(safe-area-inset-bottom,0px);--bs-height:74px;--bs-edge:clamp(18px,3.4vw,62px)}
.bs-top{height:calc(var(--bs-height) + var(--mp-safe-top));padding-top:var(--mp-safe-top);padding-left:max(var(--bs-edge),var(--mp-safe-left,env(safe-area-inset-left,0px)));padding-right:max(var(--bs-edge),var(--mp-safe-right))}
.bs-side{padding-top:calc(28px + var(--mp-safe-top));padding-bottom:calc(18px + var(--mp-safe-bottom))}
#boot-fallback{margin-top:calc(18px + var(--mp-safe-top))}
html:not([data-boot]) .seo-content{padding-top:calc(28px + var(--mp-safe-top))}
@media(min-width:701px) and (max-width:900px){.bs-side{padding-top:calc(20px + var(--mp-safe-top))}}
@media(max-width:700px){
 :root{--bs-height:60px;--bs-edge:17px}
 .bs-main{padding-left:max(16px,var(--mp-safe-left,env(safe-area-inset-left,0px)));padding-right:max(16px,var(--mp-safe-right));padding-bottom:calc(105px + var(--mp-safe-bottom))}
 .bs-bottom{padding:13px max(8px,var(--mp-safe-right)) calc(13px + var(--mp-safe-bottom)) max(8px,var(--mp-safe-left,env(safe-area-inset-left,0px)))}
}

.bs-search-placeholder{display:none}
@media(max-width:700px){
 :root{--bs-height:64px;--mp-header-safe:calc(var(--mp-safe-top) + min(10px,var(--mp-safe-top)))}
 .bs-top{height:calc(var(--bs-height) + var(--mp-header-safe));padding-top:var(--mp-header-safe);gap:14px;box-sizing:border-box}
 .bs-mobile{flex:0 0 auto;font-size:14px;gap:8px}
 .bs-mobile .bs-mark{width:29px;height:29px;font-size:23px}
 .bs-search-placeholder{display:block;flex:1 1 0;height:44px;min-width:0;border:1px solid #ffffff12;background:#202129;border-radius:11px}
 .bs-state{flex:0 0 16px;font-size:0;gap:0;justify-content:center}
}
@media(max-width:360px){.bs-top{gap:10px}.bs-mobile{font-size:13px;gap:6px}}
@media(prefers-reduced-motion:reduce){#boot-shell *{animation:none!important}#boot-shell *:after{animation:none!important}}
"""
def shell(path,title):
    title=html.escape(title.split(' | ')[0])
    kind='bs-actors' if path=='/actors/' else 'bs-detail' if path.startswith(('/title/','/person/')) else 'bs-default'
    line='<div class="bs-line"></div><div class="bs-line short"></div>'
    block='<div class="bs-block"></div>'
    grid='<div class="bs-grid">'+('<div class="bs-card"><div class="bs-tile"></div><div class="bs-line"></div><div class="bs-line short"></div></div>'*6)+'</div>'
    hero='<div class="bs-hero"><div>'+line+'<div class="bs-line"></div><div class="bs-line short"></div></div><div class="bs-tile"></div></div>'
    contents=(block+grid) if path=='/actors/' else (hero+block+grid) if kind=='bs-detail' else (block+'<div class="bs-metrics">'+block*3+'</div>'+grid) if path!="/" else (block+hero+'<div class="bs-metrics">'+block*3+'</div>'+grid)
    brand='<span class="bs-mark">M</span><span class="bs-name">مسیر مارول</span>'
    return '<div id="boot-shell" aria-label="در حال آماده‌سازی صفحه" role="status"><aside class="bs-side" aria-hidden="true"><div class="bs-brand">'+brand+'</div><div class="bs-menu">'+('<i></i>'*5)+'</div></aside><div class="bs-work"><header class="bs-top"><div class="bs-brand bs-mobile" aria-hidden="true">'+brand+'</div><span class="bs-desktop" aria-hidden="true">WATCH HUB</span><span class="bs-search-placeholder" aria-hidden="true"></span><span class="bs-state"><i aria-hidden="true"></i>در حال آماده‌سازی</span></header><div class="bs-main '+kind+'"><div class="bs-head"><div class="bs-eyebrow">MARVEL PATH / EARTH-616</div><div class="bs-title">'+title+'</div><div class="bs-line" aria-hidden="true"></div></div><div aria-hidden="true">'+contents+'</div></div></div><div class="bs-bottom" aria-hidden="true">'+('<i></i>'*5)+'</div></div>'
def prepare_head(head):
    marker="script-src 'self';"
    assert marker in head
    head=head.replace(marker,"script-src 'self' 'sha256-"+HASH+"';",1)
    at='<link rel="stylesheet"'
    assert at in head
    # Synchronous, CSP-hashed boot code executes before the potentially slow app bundles.
    head=head.replace(at,'<style>'+CSS+'</style>\n<script>'+BOOT+'</script>\n'+at,1)
    head=re.sub(r'<script src="((?:data|meta|posters|admin|enrichment|app)\.js\?[^"]+)"></script>',r'<script defer src="\1"></script>',head)
    return head
def insert_shell(code,path,title):
    return code.replace('<div id="app">',shell(path,title)+'\n<div id="boot-fallback" role="status"><span>بارگذاری کامل برنامه ممکن نشد؛ فعلا اطلاعات پایه در دسترس است.</span><a href="'+html.escape(path,quote=True)+'">تلاش دوباره</a></div>\n<div id="app">',1)
