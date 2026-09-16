# ARAC Humanitarian Situation Monitor

A public-service humanitarian information monitoring application developed for **ARAC International Inc.** by **M. Nuri Shakoor, SRMP-R | MNS Consulting | Quanta Analytica**.

The application uses ReliefWeb API V2 metadata to help humanitarians, local organizations, researchers, journalists, and communities understand where humanitarian reporting is concentrated and where the information environment is changing.

> **Analytical boundary:** reporting volume, reporting momentum, source diversity and thematic breadth are information-environment indicators. They are not direct measures of humanitarian severity.

## v0.2.0-alpha scope

- Live ReliefWeb API V2 snapshot synchronization
- Global Overview with KPIs and 30-day reporting trend
- Country reporting ranking using `primary_country.iso3`
- Crisis Pulse with low-base acceleration safeguards
- Humanitarian Information Signal Index (HISI), with full/provisional basis labels
- Country names and coordinates derived from embedded ReliefWeb `primary_country` metadata where available
- Daily/manual quota-conserving enrichment for the 16 highest-volume country profiles
- Country workspaces with themes, sources, formats, timelines, reports and active disaster contexts
- Interactive Leaflet global reporting map using ReliefWeb-embedded country centroids where available
- Disaster Explorer with map and disaster-type filters
- Reports search and triage workspace
- Query Lab with reproducible ReliefWeb POST-body generation and snapshot testing
- QAP-ready country signal JSON export
- CSV/JSON exports
- Community view and local watchlists
- GitHub Pages static deployment
- Hourly core synchronization plus separate daily country enrichment
- Last-known-good retention for recoverable 7-day momentum query failures
- Backward-compatible client normalization for v1/v2 snapshots
- Provenance and methodology controls

## Repository structure

```text
/
├── index.html
├── css/app.css
├── js/
│   ├── app.js
│   ├── charts.js
│   ├── config.js
│   ├── export.js
│   ├── signals.js
│   └── storage.js
├── data/snapshot.json
├── scripts/
│   ├── sync-reliefweb.mjs
│   └── enrich-reliefweb.mjs
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

Both data workflows read `${{ secrets.RELIEFWEB_APPNAME }}`. The hourly core workflow refreshes global aggregates, latest reports and current disaster entities. The daily/manual enrichment workflow adds deeper theme, source, format, timeline and report context for the 16 highest-volume countries.

Failed core refreshes leave the last known good public snapshot in place. If only one of the two 7-day momentum comparison requests is unavailable, the new core snapshot can still publish while retaining the prior known-good momentum values and marking that component accordingly in provenance.

## API conservation

The core snapshot relies on ReliefWeb server-side facets for country, theme, source, format and date distributions. Detailed country enrichment runs separately once per day, or manually, rather than on every hourly refresh. This keeps the public operational picture current while reducing avoidable API load.

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
