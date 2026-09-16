# Implementation Status

## Current build: v0.7.0-beta

AHSM is now a live GitHub Pages humanitarian information-monitoring application using synchronized ReliefWeb API data with regional monitoring, country workspaces, disaster analysis, source provenance, query tooling, network intelligence, and temporal network comparison.

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
- Disaster Explorer and disaster-to-report drilldowns
- Reports search and Query Lab
- Source Register
- Data Health and component freshness controls
- CSV/JSON exports and Community View
- Installable web-app manifest, service-worker caching and last-known-good resilience
- Automated quality gate and Playwright desktop/mobile smoke tests

## v0.5 additions

- Regional Humanitarian Monitoring workspace
- Quanta Analytica | ReliefWeb Network Explorer
- Report, country, source and theme network nodes
- Interactive node-analysis side panel
- Keyword, theme, source, country and region filtering
- Dynamic topic/keyword word cloud
- ReliefWeb headline ticker using RSS when available with synchronized-report fallback

## v0.6 additions

- Degree centrality
- Weighted influence
- Betweenness centrality
- Weighted label-propagation community detection
- Community focus mode
- Weak-tie threshold controls
- Centrality leader rankings
- Analyst Investigation Pinboard
- `quanta.reliefweb.network-investigation.v1` JSON export
- Native/fallback full-screen Network Explorer mode
- `F` keyboard shortcut for full-screen investigation mode
- Expanded network methodology documentation

## v0.7 additions

### Temporal Network Intelligence

The Network Explorer now compares the selected time window with the immediately preceding equivalent period. Supported comparison windows are:

- 24 hours vs previous 24 hours
- 7 days vs previous 7 days
- 30 days vs previous 30 days

Temporal analysis uses an entity-projection network of country, source and theme nodes linked by co-occurrence in the same ReliefWeb reports.

The temporal layer currently provides:

- current vs prior report counts
- emerging relationships
- disappearing relationships
- strengthening relationships
- weakening relationships
- rising weighted centrality
- falling weighted centrality
- weighted community comparison
- cluster-reassignment indicator
- compact temporal network comparison visualization
- integration with existing keyword, theme, source, country and region filters
- temporal panel retained in full-screen investigation mode

### Analytical boundary

Temporal network change describes changes in the synchronized ReliefWeb information structure. It does not independently establish humanitarian deterioration or improvement, causality, influence, coordination, source independence, actor intent, severity or factual corroboration.

## Validation status

- v0.6 network intelligence desktop/mobile Playwright suite: **passed**
- v0.7 temporal network Playwright suite: **passed**
- v0.7 production quality gate: **passed** after correcting a validator case-sensitivity mismatch
- JavaScript module parsing: **passed**
- GitHub Pages deployment: active and continuously deploying from `main`

## Current provider-resilience behavior

- ReliefWeb comparison/API failures are isolated by component where practical.
- Last-known-good public data remain available during recoverable upstream failures.
- Hourly global synchronization remains separate from deeper country enrichment.
- ReliefWeb RSS may return HTTP 406 to automated requests; the ticker falls back to synchronized current ReliefWeb report URLs without taking the application offline.

## Recommended next phase

The next phase should focus on **temporal investigation depth and release readiness**, including:

1. persistable temporal investigation snapshots;
2. temporal node/edge export for downstream QAP analysis;
3. change alerts for watched countries/themes/sources;
4. cross-window community lineage rather than numerical-label comparison alone;
5. network evidence cards linking temporal changes directly to the underlying ReliefWeb reports;
6. accessibility audit/remediation register;
7. About/Public Service Initiative and public methodology pages;
8. v1.0 release-candidate changelog and release checklist.
