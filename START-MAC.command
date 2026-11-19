#!/bin/bash
cd "$(dirname "$0")" || exit 1
if ! command -v python3 >/dev/null 2>&1; then
  echo 'Python 3 نصب نیست؛ از راهنمای README.md استفاده کنید.'
  read -r -p 'برای خروج Enter بزنید...'
  exit 1
fi
python3 setup_font.py 2>/dev/null || true
printf '\nمارول ترکِر در http://localhost:8765 در حال اجراست.\nبرای توقف Ctrl+C بزنید.\n\n'
(sleep 1; open 'http://localhost:8787') &
exec python3 server.py --port 8787
