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
- Canonical country names from ReliefWeb country metadata
- Quota-conserving enrichment for the 20 highest-volume country profiles
- Country workspaces with themes, sources, formats, timelines, reports and active disaster contexts
- Interactive Leaflet global reporting map using ReliefWeb-embedded country centroids where available
- Disaster Explorer with map and disaster-type filters
- Reports search and triage workspace
- Query Lab with reproducible ReliefWeb POST-body generation and snapshot testing
- QAP-ready country signal JSON export
- CSV/JSON exports
- Community view and local watchlists
- GitHub Pages static deployment
- Hourly GitHub Actions synchronization and pipeline validation
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
├── scripts/sync-reliefweb.mjs
├── .github/workflows/reliefweb-sync.yml
└── docs/
    ├── BUILD-DESIGN-MANUAL.md
    └── IMPLEMENTATION-STATUS.md
```

## ReliefWeb configuration

ReliefWeb requires a pre-approved `appname`. The repository uses a GitHub Actions **repository secret** named:

```text
RELIEFWEB_APPNAME
```

The scheduled workflow reads `${{ secrets.RELIEFWEB_APPNAME }}` and refreshes `data/snapshot.json` only after a successful API retrieval and JSON validation. Failed refreshes therefore leave the last known good public snapshot in place.

## API conservation

The global snapshot uses ReliefWeb server-side facets for country, theme, source, format and date distributions. Detailed country enrichment is limited to the 20 highest-volume countries per refresh to remain comfortably within the ReliefWeb daily request budget while still supporting high-value country workspaces.

## GitHub Pages

The application is designed for deployment from the `main` branch root. No application server or client-side API credential is required.

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
