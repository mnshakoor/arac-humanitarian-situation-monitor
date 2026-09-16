# ARAC Humanitarian Situation Monitor

A public-service humanitarian information monitoring application developed for **ARAC International Inc.** by **M. Nuri Shakoor, SRMP-R | MNS Consulting | Quanta Analytica**.

The application uses ReliefWeb API V2 metadata to help humanitarians, local organizations, researchers, journalists, and communities understand where humanitarian reporting is concentrated and where the information environment is changing.

> **Analytical boundary:** reporting volume, reporting momentum, source diversity, thematic breadth and source ecology are information-environment indicators. They are not direct measures of humanitarian severity.

## v0.3.0-alpha scope

- Live ReliefWeb API V2 snapshot synchronization
- Global Overview with KPIs and 30-day reporting trend
- Country reporting ranking using `primary_country.iso3`
- Crisis Pulse with low-base acceleration safeguards
- Humanitarian Information Signal Index (HISI), with full/provisional basis labels
- Country names and coordinates derived from embedded ReliefWeb `primary_country` metadata where available
- Daily/manual quota-conserving enrichment for up to 40 country profiles per pass, combining the top 30 reporting countries with standing priority countries
- Country workspaces with themes, sources, formats, true 30-day timelines, reports and active disaster contexts when enriched
- 7-day vs previous-7-day theme momentum
- Source ecology with top-source share, top-five concentration, Shannon entropy and effective source count
- Country deep links using `?country=ISO3`
- Country provenance/freshness drawer
- Watchlist dashboard using browser-local watchlist state
- Saved Query Lab profiles stored locally
- Expanded QAP v2 JSON export with timeline, theme momentum, source ecology, disaster context, provenance and QAP placeholder fields
- Interactive Leaflet global reporting map using ReliefWeb-embedded country centroids where available
- Disaster Explorer with map and disaster-type filters
- Reports search and triage workspace
- Query Lab with reproducible ReliefWeb POST-body generation and snapshot testing
- CSV/JSON exports
- Community view
- GitHub Pages static deployment
- Hourly core synchronization plus separate daily country enrichment
- Last-known-good retention for recoverable ReliefWeb failures
- Backward-compatible client normalization for earlier snapshot shapes
- Provenance and methodology controls
- Local caching of available ReliefWeb report preview thumbnails

## Repository structure

```text
/
├── index.html
├── css/
│   ├── app.css
│   └── ui-patch.css
├── js/
│   ├── app.js
│   ├── charts.js
│   ├── config.js
│   ├── export.js
│   ├── signals.js
│   ├── storage.js
│   ├── ui-patch.js
│   └── v03.js
├── data/snapshot.json
├── assets/report-thumbs/
├── scripts/
│   ├── sync-reliefweb.mjs
│   ├── enrich-reliefweb.mjs
│   └── cache-reliefweb-thumbnails.mjs
├── .github/workflows/
│   ├── reliefweb-sync.yml
│   └── reliefweb-enrichment.yml
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

The core snapshot relies on ReliefWeb server-side facets for country, theme, source, format and date distributions. Detailed country enrichment runs separately once per day, or manually, rather than on every hourly refresh. v0.3 expands the enrichment set while keeping it capped so the public operational picture remains current without avoidable API load.

## GitHub Pages

The application deploys from the `main` branch root. No application server or client-side API credential is required.

## Local preview

Because the application loads JSON with `fetch`, serve the folder over HTTP instead of opening `index.html` directly.

```bash
python -m http.server 8080
```

Then open `http://localhost:8080`.

## Data provenance

Primary external source: ReliefWeb API V2, United Nations Office for the Coordination of Humanitarian Affairs. The application is independently developed by ARAC International Inc. and is not an official ReliefWeb or OCHA product.

## License

Source code: MIT License. Third-party data and content remain subject to their original providers' terms and attribution requirements.
