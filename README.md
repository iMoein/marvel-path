# Marvel Path | مسیر مارول

A Persian-first, RTL viewing companion for the Marvel universe. Explore movies and
series, follow curated story paths, prepare for **Avengers: Doomsday**, and keep
track of what you have watched — without creating an account.

**[Explore Marvel Path →](https://marvel.imoein.com/)**

## Features

- **Road to Doomsday:** follow the extended recommended marathon or the Disney+
  selection, see the next title, estimate remaining viewing time, and count down
  to the announced release date.
- **Marvel archive:** browse films, series, animations and specials by release
  order, story chronology, or curated character arcs. Official MCU phases are
  distinguished from editorial viewing steps and related continuities.
- **Release timeline:** explore past releases and announced upcoming titles,
  with filters for status, media type and year. Re-releases are distinguished
  from separate works and do not duplicate viewing progress.
- **Title details:** Persian plot summaries, available credits and roles, genre,
  director, episode information, artwork and links to official sources.
- **Actor directory:** searchable Persian and English names, character credits,
  available biographies, and filmographies.
- **Personal tracker:** record movie progress and individual episodes, maintain
  separate watchlists, write notes, and export or import a personal backup.
- **Installable web app:** responsive mobile and desktop layouts, light and dark
  themes, a locally hosted Persian font, and PWA installation support.

The public archive currently includes 88 catalogue entries and posters and
1,518 actor profiles. Coverage is curated rather than exhaustive; some source
records and biographies are unavailable or incomplete.

## Install Marvel Path

Visit [marvel.imoein.com](https://marvel.imoein.com/) and select **نصب برنامه**
(Install app) in the footer. Compatible browsers can open a native installation
prompt. Otherwise, the footer provides platform-specific instructions. The
installation invitation is hidden when the app is launched in installed mode
or the browser reports a successful installation.

| Platform | Installation |
| --- | --- |
| iPhone / iPad | Safari → Share → Add to Home Screen → Add |
| Android | Chrome menu → Install app / Add to Home screen |
| macOS | Safari → File → Add to Dock, or the install option in Chrome |
| Windows / Linux | Install the app from a compatible browser such as Chrome or Edge |

Installation and offline functionality depend on the browser. Previously
cached content may be available offline; the full archive is not guaranteed to
be cached. Progress and notes are stored locally, not synced to a cloud account.
Use the backup and restore options in Settings when switching browsers,
devices, or to an installed app.

## Architecture

Marvel Path separates its public viewer from its local administration tools.

| Component | Implementation |
| --- | --- |
| Interface | HTML, CSS and JavaScript, without a frontend framework |
| Public catalogue | Static JSON records and same-origin artwork |
| Personal data | Browser localStorage |
| Local administration | Python HTTP server bound to localhost |
| Metadata | TMDB API, TVmaze and curated catalogue records |
| Localization | Persian translation overlay with source-text fingerprints |
| Installation and caching | Web App Manifest and Service Worker |
| Deployment | GitHub Pages, served from the `docs/` directory |

The public website requires neither a backend server nor an API key. Artwork,
fonts and the countdown media are served from the site's own origin. The public
build uses fingerprinted runtime assets and network-first HTML navigation to
support updates without clearing personal viewing data.

## Run locally

Clone the repository:

```bash
git clone https://github.com/iMoein/marvel-path.git
cd marvel-path
```

### Preview the public website

Python 3 is sufficient to serve the prebuilt static site:

```bash
python3 -m http.server 8000 --bind 127.0.0.1 --directory docs
```

Open [http://localhost:8000/](http://localhost:8000/). No TMDB key is needed.

### Use the local admin

Run `START-MAC.command` on macOS or `START-WINDOWS.bat` on Windows.
Alternatively:

```bash
python3 server.py --port 8787
```

For the launcher, the viewer normally uses port 8787 on macOS and 8765 on
Windows. Open `/admin.html` on the corresponding local address and follow
the terminal's admin access instructions.

On a fresh installation, `python3 seed_cast.py` can populate a non-exhaustive
starter cast catalogue. Configure your own TMDB API credential through the
local admin only. Do not expose the admin server on the public internet.

The admin supports incremental synchronization of title metadata, episode
stills, poster artwork and actors. Existing complete records and cached
images are reused; explicit refresh and replacement operations are available.
For series, poster discovery prioritizes season-specific artwork.

## Build and publish

To rebuild the public site using the existing exported catalogue:

```bash
python3 build_public.py
```

To export an updated local catalogue, install Pillow in your Python environment,
then run the following from the repository root. Replace the source path with
your local installation path, or use `.` when this repository contains the
local admin data.

```bash
python3 -m pip install Pillow
python3 export_public_catalog.py /path/to/local-installation
python3 cache_public_images.py
python3 build_public.py
```

The exporter selects public catalogue fields, validates artwork, and re-encodes
local images to remove embedded metadata. Previously published title records
are retained when the local installation lacks them. Manually uploaded artwork
is excluded by default; only publish it when rights and privacy have been checked.

Deploy the generated `docs/` directory with GitHub Pages. The build generates
clean title and actor URLs, canonical metadata, structured data, social previews,
a sitemap, robots directives, and PWA resources.

Never commit the TMDB credential, admin token, raw private caches or personal
watch-state backups. Commit only the intended source changes and sanitized
public export. If using a CDN, avoid long-lived caching of HTML, `/sw.js`, and
`/release.json`; fingerprinted JS and CSS can use long-lived caching.

## Project structure

```text
app.js, enrichment.js, style.css    Viewer and UI
data.js, meta.js, catalog.json      Catalogue and curated routes
admin.html, admin.js, server.py    Local administration
metadata_service.py                Metadata retrieval and synchronization
episode_cache.py                   Local episode artwork cache
translations/fa.json               Persian translation records
localize_catalog.py                Fingerprint-based localization
public-data/                       Sanitized public catalogue and artwork
build_public.py, publish_web.py    Static publishing pipeline
release_cache.py                   Runtime versioning and service worker
docs/                              Generated public website
tests/                             Automated regression tests
```

## Testing

Run the Python regression suite after building the public website:

```bash
python3 -m unittest discover -s tests -p 'test_*.py'
```

The repository also contains browser regression tests for responsive layout,
navigation, title and actor pages, Persian localization, PWA installation flows,
countdown behavior and release caching. These CDP tests use Node.js and a local
Google Chrome installation; the included launcher paths target macOS.

```bash
node tests/localization_cdp.cjs
node tests/pwa_footer_cdp.cjs
node tests/release_timeline_cdp.cjs
node tests/doomsday_countdown_cdp.cjs
```

## Data quality and localization

The archive retains original metadata alongside Persian translations. Some
translations are machine-generated with selective editorial review. Missing
source data is not invented, and translation fingerprints help prevent outdated
translations from being applied to changed source text. External filmography
titles may remain in their original language.

Known mismatched title records for Daredevil season 3 and The Defenders are
withheld from the title viewer pending correction; associated actor links still
require source verification. Release dates can change, and the timeline is a
curated snapshot rather than a live release feed. The countdown is a viewing
planning aid, not a guaranteed first cinema showtime.

## Credits and disclaimer

Marvel Path is an independent, non-commercial fan project. It is not affiliated
with, endorsed by, or certified by Marvel, Marvel Studios or Disney. It does
not host or provide streams or downloads of any films or television series.
Use authorised services to watch the works.

This product uses the TMDB API but is not endorsed or certified by TMDB.
Some metadata comes from TVmaze. See [TMDB](https://www.themoviedb.org/),
[TVmaze](https://www.tvmaze.com/api) and [Marvel](https://www.marvel.com/).
The bundled [Vazirmatn](https://github.com/rastikerdar/vazirmatn) font retains
its OFL license and author notices.

All third-party works, names, characters, trademarks and media belong to their
respective rights holders. Public availability of this repository does not grant
permission to redistribute third-party content.

Created and maintained by [iMoein](https://github.com/iMoein).
