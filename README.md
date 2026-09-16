# ARAC Humanitarian Situation Monitor

A public-service humanitarian information monitoring application developed for **ARAC International Inc.** by **M. Nuri Shakoor, SRMP-R | MNS Consulting | Quanta Analytica**.

The application uses ReliefWeb API V2 metadata to help humanitarians, local organizations, researchers, journalists, and communities understand where humanitarian reporting is concentrated and where the information environment is changing.

> **Analytical boundary:** reporting volume, reporting momentum, source diversity, thematic breadth and source ecology are information-environment indicators. They are not direct measures of humanitarian severity.

## v0.4.0-beta scope

v0.4 retains the v0.3 analytical layer and adds production hardening for public-service use.

- Live ReliefWeb API V2 snapshot synchronization
- Global Overview with KPIs and 30-day reporting trend
- Country reporting ranking using `primary_country.iso3`
- Crisis Pulse with low-base acceleration safeguards
- Humanitarian Information Signal Index (HISI), with full/provisional basis labels
- Daily/manual quota-conserving enrichment for up to 40 country profiles per pass
- Country workspaces with themes, sources, formats, true 30-day timelines, reports and active disaster contexts when enriched
- 7-day vs previous-7-day theme momentum
- Source ecology with concentration and effective-source-count measures
- Country deep links using `?country=ISO3`
- Watchlist dashboard and saved Query Lab profiles stored locally
- Expanded QAP v2 JSON export
- Interactive Leaflet global reporting map
- Disaster Explorer with related-report drilldowns; exact ReliefWeb disaster links are preferred when available and country + disaster-type matches are explicitly labeled as inferred
- Global Source Register and provenance view
- Panel-level freshness labels plus a global Data Health control
- Print-friendly report styling
- Keyboard focus improvements, skip navigation, ARIA live announcements and current-page navigation state
- Installable web-app manifest and service-worker caching for low-bandwidth/temporary offline continuity
- Network-first snapshot caching so the latest valid ReliefWeb snapshot is preferred while a cached snapshot remains available during connectivity loss
- Automated static quality gate validating application assets, snapshot contract and JavaScript parsing
- Automated Chromium smoke tests across desktop and mobile profiles
- CSV/JSON exports and Community View
- Hourly core synchronization plus separate daily country enrichment
- Last-known-good retention for recoverable ReliefWeb failures
- Local caching of available ReliefWeb report preview thumbnails

## Repository structure

```text
/
├── index.html
├── manifest.webmanifest
├── sw.js
├── package.json
├── playwright.config.mjs
├── css/
│   ├── app.css
│   ├── ui-patch.css
│   └── v04.css
├── js/
│   ├── app.js
│   ├── charts.js
│   ├── config.js
│   ├── export.js
│   ├── signals.js
│   ├── storage.js
│   ├── ui-patch.js
│   ├── v03.js
│   └── v04.js
├── data/snapshot.json
├── assets/report-thumbs/
├── scripts/
│   ├── sync-reliefweb.mjs
│   ├── enrich-reliefweb.mjs
│   ├── cache-reliefweb-thumbnails.mjs
│   └── quality-gate.mjs
├── tests/smoke.spec.mjs
├── .github/workflows/
│   ├── reliefweb-sync.yml
│   ├── reliefweb-enrichment.yml
│   ├── quality-gate.yml
│   └── browser-smoke.yml
└── docs/
    ├── BUILD-DESIGN-MANUAL.md
    └── IMPLEMENTATION-STATUS.md
```

## ReliefWeb configuration

ReliefWeb requires a pre-approved `appname`. The repository uses a GitHub Actions **repository secret** named:

```text
RELIEFWEB_APPNAME
```

Both data workflows read `${{ secrets.RELIEFWEB_APPNAME }}`. The hourly core workflow refreshes global aggregates, latest reports and current disaster entities. The daily/manual enrichment workflow adds deeper theme, source, format, timeline, momentum and report context for selected country profiles.

Failed core refreshes leave the last known good public snapshot in place. If only one of the two 7-day momentum comparison requests is unavailable, the core snapshot can still publish while retaining prior known-good momentum values and marking that component accordingly in provenance.

## API conservation

The core snapshot relies on ReliefWeb server-side facets for country, theme, source, format and date distributions. Detailed country enrichment runs separately once per day, or manually, rather than on every hourly refresh. The enrichment set remains capped so the public operational picture stays current without avoidable API load.

## GitHub Pages

The application deploys from the `main` branch root. No application server or client-side API credential is required.

## Local preview

Because the application loads JSON with `fetch`, serve the folder over HTTP instead of opening `index.html` directly.

```bash
python -m http.server 8080
```

Then open `http://localhost:8080`.

For the automated browser checks:

```bash
npm install
npx playwright install chromium
npm run test:smoke
```

## Data provenance

Primary external source: ReliefWeb API V2, United Nations Office for the Coordination of Humanitarian Affairs. The application is independently developed by ARAC International Inc. and is not an official ReliefWeb or OCHA product.

## License

Source code: MIT License. Third-party data and content remain subject to their original providers' terms and attribution requirements.
