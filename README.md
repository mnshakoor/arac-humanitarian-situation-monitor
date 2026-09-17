# ARAC Humanitarian Situation Monitor

A public-service humanitarian information monitoring application developed for **ARAC International Inc.** by **M. Nuri Shakoor, SRMP-R | MNS Consulting | Quanta Analytica**.

Current release candidate: **v0.9.0-rc2**.

AHSM uses ReliefWeb API V2 metadata to help humanitarians, local organizations, researchers, journalists and communities understand where humanitarian reporting is concentrated, how the information environment is changing, and how reports, countries, sources and themes relate.

> **Analytical boundary:** reporting volume, reporting momentum, HISI, regional roll-ups, source ecology, centrality and network relationships are information-environment indicators. They are not direct humanitarian severity measures.

## Current scope

- Global humanitarian reporting overview with KPIs, trend, map and country signals
- Crisis Pulse with low-base acceleration safeguards
- Regional Humanitarian Monitoring
- Country workspaces with HISI, themes, sources, formats, timelines, source ecology, disaster context and recent reports
- Watchlists and saved Query Lab profiles stored locally
- Report search and progressive rendering for long lists
- Disaster Explorer with explicit exact/inferred related-report logic
- Source Register and provenance
- Quanta Analytica ReliefWeb Network Explorer
- Degree, weighted influence, betweenness and community analysis
- Temporal network comparison for 24h, 7d and 30d windows
- Evidence cards, watched entities, investigation pinboard and JSON exports
- Application-level and Network Explorer full-screen modes
- Data Health, Build Health and runtime diagnostics
- Network-first service-worker behavior with offline fallback
- Windows and iPad portrait/landscape field validation
- Automated static quality gate and Playwright smoke tests

## Data freshness states

- **LIVE**: core synchronized components are current.
- **PARTIAL**: aggregate is current while one or more secondary components use last-known-good data.
- **DEGRADED**: the aggregate itself has fallen back.
- **STALE**: the operational freshness window has been exceeded.

## ReliefWeb configuration

The repository requires a GitHub Actions repository secret named:

`RELIEFWEB_APPNAME`

Its value must not be written into public snapshot provenance, source code or documentation.

## Workflows

- `.github/workflows/reliefweb-sync.yml`: hourly component-resilient core synchronization
- `.github/workflows/reliefweb-enrichment.yml`: daily/manual country enrichment
- `.github/workflows/quality-gate.yml`: static production validation
- `.github/workflows/browser-smoke.yml`: desktop/mobile Chromium smoke testing

## Public deployment

GitHub Pages serves the application from the `main` branch root.

Public crawler policy: `robots.txt`

Sitemap: `sitemap.xml`

Favicon: `favicon.png` / `favicon.ico`

## Documentation

- `docs/USER-GUIDE.md`
- `docs/OPERATIONS-GUIDE.md`
- `docs/NETWORK-INTELLIGENCE.md`
- `docs/RELEASE-CANDIDATE.md`
- `docs/IMPLEMENTATION-STATUS.md`
- `CHANGELOG.md`

## Local preview

Because the application loads JSON with `fetch`, serve the repository over HTTP:

```bash
python -m http.server 8080
```

For validation:

```bash
npm install
npx playwright install chromium
npm run quality
npm run test:smoke
```

## Data provenance

Primary external source: ReliefWeb API V2, United Nations Office for the Coordination of Humanitarian Affairs.

AHSM is independently developed by ARAC International Inc. and is not an official ReliefWeb or OCHA product.

## License

Source code: MIT License. Third-party data and content remain subject to their original providers' terms and attribution requirements.
