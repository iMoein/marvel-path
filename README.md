# Marvel Path — مسیر مارول
A Persian, RTL, local-first, unofficial Marvel viewing tracker. Public viewer: https://marvel.imoein.com/
 
## Public viewer
The static site is built with `python3 build_public.py` and deployed from `main:/docs` on GitHub Pages. No user accounts or backend are required. Progress and notes are stored in each browser. Import a personal backup from Settings to migrate from localhost; browser storage is origin-specific.
 
The public catalogue includes curated cast credits and selected factual episode metadata. Artwork is linked from its source, not redistributed here. The full private cache, personal photos, and tokens are deliberately excluded.

## Local admin
Run `START-MAC.command` (macOS) or `START-WINDOWS.bat` (Windows). The Python server binds to localhost; the terminal prints its local address and admin access instructions. On a fresh clone, `python3 seed_cast.py` creates starter credits. Add TMDB credentials only through the local admin. Never commit local state or expose the local admin server to the internet.

## Attribution
Artwork and source data belong to their respective owners. This product uses the TMDB API but is not endorsed or certified by TMDB. Some episode information originates from TVmaze. This is an unofficial, non-commercial fan project, not affiliated with Marvel or Disney. See https://developer.themoviedb.org/docs/faq and https://www.tvmaze.com/api. No license is granted to third-party imagery.
