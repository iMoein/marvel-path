"""Optional one-time download of official Vazirmatn on the user's own computer.
No font binaries are included in the distribution ZIP.
"""
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.error import URLError

OUT = Path(__file__).resolve().parent / 'assets' / 'fonts' / 'Vazirmatn-wght.woff2'
SOURCES = (
    'https://cdn.jsdelivr.net/gh/rastikerdar/vazirmatn@v33.003/fonts/webfonts/Vazirmatn%5Bwght%5D.woff2',
    'https://raw.githubusercontent.com/rastikerdar/vazirmatn/master/fonts/webfonts/Vazirmatn%5Bwght%5D.woff2',
)

def main():
    if OUT.is_file() and OUT.stat().st_size > 20000:
        return print('Vazirmatn: فونت محلی از قبل آماده است.')
    OUT.parent.mkdir(parents=True, exist_ok=True)
    for src in SOURCES:
        try:
            req = Request(src, headers={'User-Agent': 'MarvelPathFontSetup/2.3'})
            with urlopen(req, timeout=13) as response:
                content = response.read(2_000_000)
            if not content.startswith(b'wOF2') or len(content) < 20000:
                raise ValueError('This response is not a valid WOFF2 font')
            OUT.write_bytes(content)
            return print('Vazirmatn: فونت رسمی روی همین دستگاه آماده شد.')
        except (URLError, OSError, ValueError, TimeoutError) as exc:
            print('Vazirmatn: این منبع در دسترس نیست؛ مسیر بعدی آزمایش می‌شود.')
    print('Vazirmatn: دانلود محلی ممکن نشد؛ نسخه آنلاین در CSS آزمایش خواهد شد.')

if __name__ == '__main__':
    main()
