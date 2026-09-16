# Implementation Status

## v0.3.0-alpha

Implemented:
- Static GitHub Pages application with live ReliefWeb snapshot pipeline
- Responsive ARAC public-service visual system
- Global KPI cards and 30-day reporting timeline
- Country ranking using `primary_country.iso3`
- Rule-based reporting acceleration with low-base safeguards
- Humanitarian Information Signal Index (HISI)
- Full versus provisional HISI transparency depending on enrichment availability
- Country names and coordinates derived from embedded ReliefWeb `primary_country` metadata where available
- Backward-compatible client normalization for v1/v2/v3 snapshot shapes
- Expanded daily/manual country enrichment targeting the top 30 reporting countries plus standing priority countries, capped at 40 profiles per pass
- Country workspaces with themes, sources, formats, true 30-day timelines when enriched, reports and active disaster contexts
- 7-day versus previous-7-day theme momentum
- 7-day versus previous-7-day source and format momentum in the v3 snapshot
- Source ecology metrics using source-assignment concentration, Shannon entropy and effective source count
- Dedicated country deep links using `?country=ISO3`
- Country provenance and freshness drawer
- Watchlist-focused dashboard generated from browser-local watchlist state
- Saved Query Lab profiles stored locally in the browser
- Expanded QAP v2 export with reporting timeline, theme momentum, source ecology, active disasters, recent reports, provenance and KIQ/KJ/indicator placeholders
- Global Leaflet reporting map using ReliefWeb-embedded country centroids where available
- Disaster Explorer with active/alert contexts, type filter and interactive map
- Reports search and triage workspace
- Query Lab with structured ReliefWeb POST-body generation, local snapshot execution, copy and export
- Global theme summary
- CSV/JSON exports
- Community view toggle
- Local watchlist persistence
- Methodology and analytical-boundary language
- Hourly ReliefWeb core synchronization workflow
- Separate daily ReliefWeb country-enrichment workflow
- Push validation for enrichment-script/workflow changes
- Recoverable 7-day momentum queries with last-known-good retention when ReliefWeb returns a transient timeout
- Preservation of prior country enrichment across hourly core refreshes
- Last-known-good snapshot semantics through commit-only-on-success workflow behavior
- GitHub Pages production deployment enabled

Current validation focus:
- Confirm the first v0.3 enrichment pass completes against ReliefWeb for the expanded target set
- Confirm v3 snapshot fields populate theme momentum, source ecology and true country timelines
- Confirm country deep links reopen the correct workspace across desktop/mobile browsers
- Confirm watchlist dashboard updates immediately after local watchlist changes
- Confirm QAP v2 export schema remains valid across enriched and provisional countries
- Browser smoke test across desktop and mobile layouts

Provider behavior observed during validation:
- ReliefWeb has intermittently returned HTTP 504 on some comparison queries.
- AHSM treats recoverable comparison failures independently rather than allowing them to invalidate the public snapshot.
- The hourly public snapshot remains separate from deeper country enrichment so provider latency in one layer does not prevent the public operational picture from refreshing.

Next development pass after v0.3 validation:
- Add disaster-to-report relationship drilldowns
- Add global provenance/source-register view
- Add more explicit freshness badges at panel level
- Add print stylesheet and formal accessibility audit
- Add automated browser smoke tests
- Add low-bandwidth/offline caching improvements
- Prepare v0.4.0-beta production hardening
