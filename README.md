# ARAC Humanitarian Situation Monitor

A public-service humanitarian information monitoring application developed for **ARAC International Inc.** by **M. Nuri Shakoor, SRMP-R | MNS Consulting | Quanta Analytica**.

The application uses ReliefWeb API V2 metadata to help humanitarians, local organizations, researchers, journalists, and communities understand where humanitarian reporting is concentrated and where the information environment is changing.

> **Analytical boundary:** reporting volume and reporting momentum are information-environment indicators. They are not direct measures of humanitarian severity.

## Initial release scope

- Global Overview
- Country Explorer
- Crisis Pulse
- Themes and source ecology panels
- Reports workspace
- Disaster Explorer shell
- Query Lab shell
- Humanitarian Information Signal Index (transparent information-signal metric)
- CSV/JSON exports
- Responsive and accessible public interface
- Snapshot-first architecture for GitHub Pages
- Scheduled ReliefWeb synchronization through GitHub Actions
- Provenance and methodology views

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
├── data/
│   ├── snapshot.json
│   └── world-lite.geojson
├── scripts/sync-reliefweb.mjs
├── .github/workflows/reliefweb-sync.yml
└── docs/BUILD-DESIGN-MANUAL.md
```

## ReliefWeb configuration

ReliefWeb requires a pre-approved `appname`. Add a GitHub Actions repository variable named:

```text
RELIEFWEB_APPNAME
```

The scheduled workflow uses that value to refresh `data/snapshot.json`.

## GitHub Pages

Set GitHub Pages to deploy from the `main` branch root. No application server is required.

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
