"""Validate the bundled locally served Vazirmatn font; no download needed."""
from pathlib import Path

def main():
    font=Path(__file__).resolve().parent/'assets/fonts/Vazirmatn-wght.woff2'
    if not font.is_file() or font.read_bytes()[:4]!=b'wOF2':
        raise SystemExit('Vazirmatn font missing; restore the tracked assets/fonts directory.')
    print('Vazirmatn: local font ready.')
if __name__=='__main__':main()
