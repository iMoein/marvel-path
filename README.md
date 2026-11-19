# Marvel Path — مسیر مارول
A Persian, RTL, local-first, unofficial Marvel viewing tracker. Public viewer: https://marvel.imoein.com/
 
## Public viewer
The static site is built with `python3 build_public.py` and deployed from `main:/docs` on GitHub Pages. No user accounts or backend are required. Progress and notes are stored in each browser. Import a personal backup from Settings to migrate from localhost; browser storage is origin-specific.
 
The public catalogue is an exported snapshot of the local movie and actor archive, including available synopses, credits, episodes, filmographies and validated poster/portrait artwork. Private viewer state, raw private caches, credentials, and unapproved manual images are excluded.

## Local admin
Run `START-MAC.command` (macOS) or `START-WINDOWS.bat` (Windows). The Python server binds to localhost; the terminal prints its local address and admin access instructions. On a fresh clone, `python3 seed_cast.py` creates starter credits. Add TMDB credentials only through the local admin. Never commit local state or expose the local admin server to the internet.

## Attribution
Artwork and source data belong to their respective owners. This product uses the TMDB API but is not endorsed or certified by TMDB. Some episode information originates from TVmaze. This is an unofficial, non-commercial fan project, not affiliated with Marvel or Disney. See https://developer.themoviedb.org/docs/faq and https://www.tvmaze.com/api. No license is granted to third-party imagery.

## Publish a refreshed public catalogue
From the repository, install Pillow in your Python environment if needed. Run:

    python3 export_public_catalog.py /path/to/private/marvel-path-installation
    python3 build_public.py

The exporter reads only named catalogue records and referenced artwork. It never
reads TMDB credentials, admin credentials, or watch-state backups. All image
files are validated and re-encoded to remove EXIF and other private metadata.
Manually uploaded images are skipped by default; only opt in if publication
rights and privacy have been checked. Commit the exported public-data and docs,
not the local installation. GitHub Pages serves static JSON and artwork with
no runtime TMDB credentials. The public catalogue is an offline snapshot;
metadata and image rights remain with the respective providers.
