# Marvel Path — مسیر مارول
A Persian, RTL, local-first, unofficial Marvel viewing tracker. Public viewer: https://marvel.imoein.com/
 
## Current release — 3.5.25

- Persian RTL viewing tracker with two Doomsday routes, progress tracking, watchlists, and notes.
- 88 catalogue entries and posters, 1,518 actor profiles, release timeline, and bilingual search.
- Installable PWA with a footer install action and platform-specific installation instructions.
- Cinematic Doomsday countdown with a locally hosted, silent looping video.
- Local-only administration, incremental metadata/image retrieval, and static public export.

## Install the PWA

Open https://marvel.imoein.com/ and choose **نصب برنامه** in the footer.
Chrome/Edge and other supporting browsers may show a native install prompt.
On iPhone/iPad, open Safari, use Share → Add to Home Screen → Add.
On macOS Safari use File → Add to Dock where supported. On Android, use the
browser menu → Install app / Add to Home screen. The footer provides the matching
instructions when no native prompt is available. The installed display mode
disables the install action. Installation availability is browser-dependent;
no installation or prompt is triggered without user action.

Progress and notes are device/browser-local, not synced to an account.
Export a backup from Settings before moving to a different browser or standalone
app, and import it there if needed. Previously cached content may be available
offline, but the entire catalogue is not guaranteed to be cached.

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
    python3 cache_public_images.py
    python3 build_public.py

The exporter reads only named catalogue records and referenced artwork. It never
reads TMDB credentials, admin credentials, or watch-state backups. All image
files are validated and re-encoded to remove EXIF and other private metadata.
Manually uploaded images are skipped by default; only opt in if publication
rights and privacy have been checked. Commit the exported public-data and docs,
not the local installation. GitHub Pages serves static JSON and artwork with
no runtime TMDB credentials. The public catalogue is an offline snapshot;
metadata and image rights remain with the respective providers.

### Same-origin public viewer (3.2)
After exporting the catalogue, run `python3 cache_public_images.py` before
`python3 build_public.py` to cache the allowlisted remote episode stills and
portraits as sanitized WebP images. The public build embeds the poster map
and actor directory in its startup script, never waits for external images,
and uses same-origin-only CSP and public metadata requests. Remote-only
images without a cached copy are not requested by the browser. Public
viewer serves the bundled Vazirmatn variable font from its own origin.

### Local typography (3.3)
Vazirmatn 33.003, by Saber Rastikerdar, is served directly from assets/fonts. The accompanying OFL 1.1 and AUTHORS notices are retained in both the source and public build. No external font requests are required for the local or public viewer.

### Public web release (3.4.0)

The public build generates clean, crawlable URLs for the archive and actor index,
each title and actor profile, and noindex personal settings/watchlist pages.
Hash-based legacy links remain supported. Generate the site with
`python3 build_public.py`; the new publishing phase adds metadata, canonical
URLs, Open Graph/Twitter cards, sitemap, robots, an installable web app manifest,
and same-origin icons/assets. The original social graphics can be regenerated
with `python3 generate_brand_assets.py` on macOS with Chrome and Pillow.
Progress continues to reside in localStorage; no API key is published.

### Public cache policy (3.5.1)
The public build uses release- and SHA-256-addressed JS/CSS filenames, a stable
/sw.js registration with updateViaCache:none, and network-first HTML requests.
The worker never hides a newer HTML release behind the previous offline copy.
Older runtime files are retained across the next two builds. Personal
localStorage and artwork caches are not cleared during updates.
For Cloudflare, bypass cache for HTML navigations, /sw.js (all query strings),
and /release.json. Long-lived caching remains appropriate for fingerprinted
runtime assets. Existing pre-3.5.1 clients may need a one-time Service Worker
unregister and reload; do not clear all site data.

### Title source links (3.5.4)
The catalogue has a same-origin embedded map of official title destinations in
data.js. Marvel pages are used where their URLs are sourced; Disney Movies,
Disney+ / Disney+ Press, Sony Pictures and 20th Century Studios provide
alternative official title pages. Marvel's site returned HTTP 403 for automated
requests in this environment. The Marvel search link is explicitly labelled
as a search where a direct Marvel page has not been established. Season entries
may use the parent series page. No external source is fetched by the viewer
until the user opens an external link.

### Persian localization (editorial, incremental)
`translations/fa.json` stores editorial and machine-translated title overviews, episode headlines
and descriptions, actor names, bios, and exact role labels. English originals remain
in the source catalogue. Fields are matched using SHA-256 of their source text;
a new or changed source requires a new translation. The public build and local API
apply the same overlay without a runtime translation service.
Final localization includes fingerprints for all available valid-source title
synopses, episode titles and descriptions, actor names, existing biographies,
birthplaces, taglines and directors. Existing editorial translations are retained;
the remaining public catalogue text was translated in a one-time machine batch
and selectively normalized. This is not a fully human-reviewed translation.
Original text remains in the catalogue. External filmography titles remain in
their source language; role labels shared with the Marvel archive are localized.
Missing source text is not invented. Known wrong source records for Daredevil
season 3 (TMDB 207555) and The Defenders (TMDB 32736 / TVmaze 1217) are withheld
from the title viewer until corrected.
Actor directory linkage from those records requires a separate source audit.

### MCU phases and curated viewing steps (3.5.17)
Release phases are separate from the project's editorial story arcs. Films and
series share a phase label only where there is a phase assignment; older Marvel
Television seasons are included as related continuity rather than given a
Marvel Studios phase, and legacy Fox films retain their independent-universe
label. Arc steps are one-based positions within the selected editorial path,
not phase numbers or television season numbers. Actor filmographies reuse
archive poster cards while retaining credit roles.

Phase audit, 2026-11-19: all 86 catalogue entries, including 38 MCU films,
were checked against the following references and recorded in the regression
fixture `tests/catalog_phase_actor_cdp.cjs`:
- Disney+ release-order phase guide: https://www.disneyplus.com/explore/articles/marvel-movies-in-order
- Sony-distributed MCU films: https://en.wikipedia.org/wiki/List_of_Marvel_Cinematic_Universe_films
- Marvel Studios series and specials: https://en.wikipedia.org/wiki/List_of_Marvel_Cinematic_Universe_television_series_(Marvel_Studios)
- Phase Four and Five shorts: https://en.wikipedia.org/wiki/Marvel_Cinematic_Universe:_Phase_Four and https://en.wikipedia.org/wiki/Marvel_Cinematic_Universe:_Phase_Five
- Phase Six: https://en.wikipedia.org/wiki/Marvel_Cinematic_Universe:_Phase_Six
- One-shots/background: https://www.ebsco.com/research-starters/film/marvel-cinematic-universe-mcu/
- Legacy TV distinction: https://www.tomsguide.com/news/marvel-movies-in-order

The audit covers existing catalogue records, not completeness of the catalogue
or all possible story chronology interpretations.

### Release calendar (3.5.18)
The public /timeline/ page is a release-order calendar, distinct from the
in-universe story order. It reads existing MCU archive records and the
`RELEASE_CALENDAR_EXTRA` snapshot in data.js (checked 2026-11-19). Upcoming
titles carry source links, date precision (day, year or Halloween window),
and an announced/scheduled status; titles without a confirmed release
window are omitted. Dates refer to first premieres and US theatrical dates.
Only the existing watch catalogue contributes to personal progress;
calendar-only records are not automatically promoted into that catalogue.
The calendar is a curated snapshot, not a live feed. Historical coverage is the shared archive; it does not claim to cover every
legacy Marvel Television release.

### Release catalogue reconciliation (3.5.19)
The two released X-Men ’97 seasons now belong to the archive with official
premiere dates and episode counts (10 and 9). No invented runtime or cast
metadata is included; artwork and episode-level metadata were initially pending; both season posters and episode records are now exported, with any unavailable fields left empty.
The timeline derives its released-title total from the same catalogue.
Avengers Endgame: Encore is a 2026 release variant of the 2019 film, not a
new MCU film; its September 25 theatrical and November 13 Disney+ dates
are recorded without creating a duplicate watch-progress entry.
Sources: https://thewaltdisneycompany.com/news/x-men-97-marvel-debut-disney/
and https://press.disney.co.uk/news/marvel-animations-x-men-97-season-2-now-streaming-exclusively-on-disney
and https://www.disneyplus.com/explore/articles/avengers-endgame-encore

### Local episode image cache
The local metadata synchronization downloads episode stills into
`assets/episodes/` (ignored by Git). The local viewer receives only local
image paths, with no browser requests to TMDB/TVmaze for episode stills.
Run `python3 episode_cache.py` to backfill or retry missing images without
refreshing title metadata. Existing public image-cache files are reused.
Original source URLs remain in local metadata for provenance and export.

### Incremental local administration
Bulk metadata jobs skip complete title records. Incomplete records retain
existing nonempty fields and merge episode details by episode number; if only
cached episode artwork is missing, the job fetches the artwork without
refetching title metadata. A separate explicit per-title refresh is available.
Bulk poster jobs skip verified on-disk files, reuse cached TMDB poster URLs,
and discover remote artwork only when necessary. Explicit replacement remains
available. Missing-source artwork with no URL is not counted as a failed local
download; a refresh can discover newly published artwork.

### Doomsday countdown background
Countdown target: 2026-12-18T05:00:00Z, matching the fan-made
https://avengerscountdown.com/; not a confirmed first showtime.
The date and UTC time are in the release calendar entry.
Background source supplied by the owner:
https://media.rekydev.fr/avengerscountdown/background.webm
Locally transcoded to silent H.264 MP4 with encoded top/bottom bars cropped (1280 × 536), with a matching local JPEG still. The mobile card has a compact responsive height; desktop follows the next-up hero.
Silent inline video autoplays and loops without a control. Reduced-motion users receive a static background.
Permission to redistribute this third-party footage has not been verified;
confirm rights before public deployment.
