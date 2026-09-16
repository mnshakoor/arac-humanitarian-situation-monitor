# Implementation Status

## v0.4.0-beta

Implemented and retained from v0.3:
- Static GitHub Pages application with live ReliefWeb snapshot pipeline
- Responsive ARAC public-service visual system
- Global KPI cards and 30-day reporting timeline
- Country ranking using `primary_country.iso3`
- Rule-based reporting acceleration with low-base safeguards
- Humanitarian Information Signal Index (HISI)
- Full versus provisional HISI transparency depending on enrichment availability
- Expanded country enrichment targeting the top 30 reporting countries plus standing priority countries, capped at 40 profiles per pass
- Country workspaces with themes, sources, formats, true 30-day timelines when enriched, reports and active disaster contexts
- 7-day versus previous-7-day theme momentum
- Source and format momentum in the enriched snapshot
- Source ecology metrics using source-assignment concentration, Shannon entropy and effective source count
- Dedicated country deep links using `?country=ISO3`
- Country provenance/freshness drawer
- Browser-local watchlist dashboard
- Saved Query Lab profiles
- Expanded QAP v2 export
- Global Leaflet reporting map
- Disaster Explorer with active/alert contexts, type filter and interactive map
- Reports search and triage workspace
- Query Lab with structured ReliefWeb POST-body generation and local snapshot execution
- CSV/JSON exports and Community View
- Hourly ReliefWeb core synchronization plus separate daily enrichment
- Recoverable component failures with last-known-good retention
- Local caching of available ReliefWeb report preview thumbnails

Production hardening added in v0.4:
- Data Health control showing snapshot and component freshness
- Panel-level freshness/source badges
- Global Source Register with snapshot provenance and source-presence rankings
- Disaster-to-report drilldowns using exact ReliefWeb disaster links when present and clearly labeled country + disaster-type inference otherwise
- Print command and print-focused stylesheet
- Skip navigation link
- Strong keyboard focus treatment
- ARIA live region for operational UI announcements
- `aria-current` navigation state
- Installable web-app manifest
- Service worker with cached application shell
- Network-first `data/snapshot.json` strategy with cached fallback for temporary connectivity loss
- Static production quality gate validating required assets, snapshot contract and JavaScript syntax
- Playwright Chromium smoke-test suite covering desktop and mobile profiles
- Browser smoke workflow for country workspace, Source Register, Disaster Explorer, data-health controls and accessibility interaction
- Version advanced to `0.4.0-beta`

Validated during v0.3 transition:
- Expanded ReliefWeb enrichment completed 40/40 country profiles in the first validation run
- Enriched snapshot validation passed
- Thumbnail cache successfully added local previews for available reports
- Desktop and mobile layouts were reviewed operationally before beginning v0.4

Current v0.4 validation focus:
- Confirm GitHub Pages deployment of the complete v0.4 shell
- Confirm production quality gate remains green after all hardening commits
- Confirm Playwright desktop/mobile smoke workflow completes successfully
- Observe service-worker update behavior on the deployed GitHub Pages origin
- Confirm Data Health correctly reflects degraded/last-known-good component states during a future partial ReliefWeb refresh
- Continue visual review of print output and long Source Register lists

Provider behavior retained in the design:
- ReliefWeb may intermittently return HTTP 504 on comparison queries.
- AHSM treats recoverable comparison failures independently rather than allowing them to invalidate the public snapshot.
- The hourly public snapshot remains separate from deeper country enrichment so provider latency in one layer does not prevent the public operational picture from refreshing.

Next phase after v0.4 beta validation:
- Stabilize exact ReliefWeb disaster-to-report identifiers in the normalized report schema
- Add release-level changelog and public About/Public Service Initiative page
- Consider optional region-level humanitarian reporting views
- Add formal accessibility audit results and remediation register
- Prepare v1.0 public-service release candidate
