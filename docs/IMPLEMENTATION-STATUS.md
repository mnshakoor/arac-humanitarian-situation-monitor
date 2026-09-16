# Implementation Status

## Current build: v0.8.0-beta

AHSM is a live GitHub Pages humanitarian information-monitoring application using synchronized ReliefWeb API data with regional monitoring, country workspaces, disaster analysis, source provenance, query tooling, structural network intelligence, temporal network comparison, and temporal evidence packaging.

## Core platform retained

- Live ReliefWeb API V2 synchronization
- Responsive ARAC public-service interface
- Global KPI dashboard and reporting trend
- Country rankings using `primary_country.iso3`
- Crisis Pulse with low-base safeguards
- Humanitarian Information Signal Index (HISI), including full/provisional transparency
- Expanded daily/manual enrichment for up to 40 country profiles per pass
- Country workspaces with themes, sources, formats, timelines, reports, disaster contexts, provenance and QAP export
- Theme momentum and source ecology
- Country deep links and local watchlists
- Global Leaflet reporting map
- Regional Humanitarian Monitoring
- Disaster Explorer and disaster-to-report drilldowns
- Reports search, Query Lab, Source Register and Data Health controls
- CSV/JSON exports and Community View
- Installable web-app manifest, service-worker caching and last-known-good resilience
- Automated quality gate and Playwright desktop/mobile smoke tests

## Network intelligence retained

- Quanta Analytica | ReliefWeb Network Explorer
- Report, country, source and theme nodes
- Keyword, theme, source, country and region filters
- Dynamic topic/keyword cloud and ReliefWeb ticker
- Degree, weighted influence and betweenness centrality
- Weighted label-propagation communities and community focus
- Weak-tie threshold controls
- Investigation Pinboard and `quanta.reliefweb.network-investigation.v1` export
- Dedicated Network Explorer full-screen mode

## v0.7 temporal network intelligence

The Explorer compares 24h, 7d and 30d windows with the immediately preceding equivalent period using an entity-projection network of country, source and theme nodes. It surfaces current/prior report volume, emerging and disappearing relationships, strengthening and weakening relationships, rising/falling weighted centrality and temporal community change.

## v0.8 additions

### Temporal evidence and investigation packaging

- persistent browser-local temporal investigation snapshots;
- report-level evidence cards for high-priority emerging, strengthening and disappearing relationships;
- direct ReliefWeb URLs retained in evidence cards;
- watched country/source/theme entities with current vs prior weighted-connectivity change;
- cross-window community lineage matching using node-set overlap rather than numerical community labels alone;
- structured `quanta.reliefweb.temporal-network.v1` JSON export containing temporal nodes, relationship changes, community lineage, watched entities, filters and provenance;
- saved temporal investigations may be re-exported locally;
- saved investigations and watched entities remain browser-local and are not uploaded by AHSM.

### Entire-application full-screen mode

AHSM now provides an **App full screen** control in the global top bar. It expands the full application, including header, navigation, active workspace and footer behavior, using the browser Fullscreen API with a pseudo-fullscreen fallback. `Alt+Enter` toggles app-level full screen. The existing Network Explorer full-screen control remains available as a separate investigation-focused mode.

## Analytical boundary

Structural and temporal network changes describe the synchronized ReliefWeb information environment. They do not independently establish humanitarian deterioration or improvement, causality, institutional influence, coordination, source independence, actor intent, severity or factual corroboration. Evidence cards provide traceability to underlying reports, not automatic validation of a substantive hypothesis.

## Validation focus

- v0.8 production quality gate verifies the new investigation layer, app-wide full-screen control, temporal export schema and required assets;
- Playwright desktop/mobile smoke tests cover app-wide full-screen control availability and temporal investigation panels;
- service-worker cache advanced to the v0.8 application shell;
- GitHub Pages continues to deploy from `main`.

## Provider-resilience behavior

- ReliefWeb comparison/API failures are isolated by component where practical.
- Last-known-good public data remain available during recoverable upstream failures.
- Hourly global synchronization remains separate from deeper country enrichment.
- ReliefWeb RSS may return HTTP 406 to automated requests; the ticker falls back to synchronized ReliefWeb report URLs.

## Recommended next phase

The next phase should focus on release-candidate preparation: formal accessibility audit/remediation, About/Public Service Initiative page, public methodology navigation, changelog/release notes, SEO/social metadata, final mobile/print review, and v1.0 release checklist.
