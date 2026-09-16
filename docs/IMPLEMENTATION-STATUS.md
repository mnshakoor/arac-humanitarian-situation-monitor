# Implementation Status

## Current build: v0.9.0-rc1

AHSM is now in release-candidate preparation. Major analytical feature expansion is frozen while the application is hardened for reliability, performance, update convergence, accessibility, documentation and public release readiness.

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
- Graph-first workflow hierarchy on desktop and mobile

## Temporal network intelligence retained

The Explorer compares 24h, 7d and 30d windows with the immediately preceding equivalent period using an entity-projection network of country, source and theme nodes. It surfaces current/prior report volume, emerging and disappearing relationships, strengthening and weakening relationships, rising/falling weighted centrality and temporal community change.

## Temporal evidence and investigation packaging

- persistent browser-local temporal investigation snapshots;
- report-level evidence cards for high-priority emerging, strengthening and disappearing relationships;
- direct ReliefWeb URLs retained in evidence cards;
- watched country/source/theme entities with current vs prior weighted-connectivity change;
- cross-window community lineage matching using node-set overlap rather than numerical community labels alone;
- structured `quanta.reliefweb.temporal-network.v1` JSON export containing temporal nodes, relationship changes, community lineage, watched entities, filters and provenance;
- saved investigations and watched entities remain browser-local and are not uploaded by AHSM.

## Entire-application full-screen mode

AHSM provides an **App full screen** control in the global top bar. It expands the full application, including header, navigation and active workspace, using the browser Fullscreen API with a pseudo-fullscreen fallback. `Alt+Enter` toggles app-level full screen. The existing Network Explorer full-screen control remains available as a separate investigation-focused mode.

## v0.9.0-rc1 reliability hardening

### Runtime stability diagnostics

Data Health now receives a browser-local **Release Candidate Runtime** block reporting:

- session uptime;
- snapshot age;
- synchronized core-component freshness;
- browser long-task count and maximum long-task duration;
- script-error count;
- unhandled-promise-rejection count;
- connectivity transitions;
- foreground/background page state.

These diagnostics are local to the browser session and are not transmitted.

### Background and reduced-motion safeguards

- ReliefWeb ticker animation pauses when the page is backgrounded.
- Network graph transitions are disabled while the page is backgrounded.
- `prefers-reduced-motion` disables ticker animation and graph transitions.
- The runtime-health attachment uses a bounded one-shot observer rather than an always-on document mutation loop.

### Service-worker convergence

- critical application assets remain network-first while online;
- offline cache remains available as last-known-good continuity;
- RC1 cache generation is `ahsm-shell-v090-rc1-r1`;
- previous AHSM cache generations are removed on activation;
- `js/v09.js` is included in the offline shell.

### RC1 automated regression coverage

Playwright now adds explicit stress/regression tests for:

- repeated Data Health open/close cycles;
- repeated Network Explorer filtering and navigation;
- browser page-error detection during those cycles;
- RC1 service-worker cache convergence;
- offline shell recovery and return to a network-current session.

The static quality gate also validates RC1 version alignment, runtime diagnostics, service-worker cache generation, snapshot sync-health fields and regression guards against recursive Build Health observers.

## Analytical boundary

Structural and temporal network changes describe the synchronized ReliefWeb information environment. They do not independently establish humanitarian deterioration or improvement, causality, institutional influence, coordination, source independence, actor intent, severity or factual corroboration. Evidence cards provide traceability to underlying reports, not automatic validation of a substantive hypothesis.

## Provider-resilience behavior

- ReliefWeb comparison/API failures are isolated by component where practical.
- Last-known-good public data remain available during recoverable upstream failures.
- Hourly global synchronization remains separate from deeper country enrichment.
- ReliefWeb RSS may return HTTP 406 to automated requests; the ticker falls back to synchronized ReliefWeb report URLs.

## Remaining release-candidate work

- formal accessibility audit/remediation;
- exact ReliefWeb disaster/report identifier normalization where supported;
- About/Public Service Initiative page;
- expanded public methodology and provenance navigation;
- SEO/social metadata and release metadata;
- final mobile/tablet/fullscreen/print review;
- cosmetic UI placement and spacing pass;
- public user guide and operator/administrator guide;
- changelog and v1.0 release notes;
- final Windows and iPad endurance validation.

See `docs/RELEASE-CANDIDATE.md` for the RC validation plan.
