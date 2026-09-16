# Implementation Status

## v0.2.0-alpha

Implemented:
- Static GitHub Pages application with live ReliefWeb snapshot pipeline
- Responsive ARAC public-service visual system
- Global KPI cards and 30-day reporting timeline
- Country ranking using `primary_country.iso3`
- Rule-based reporting acceleration with low-base safeguards
- Humanitarian Information Signal Index (HISI)
- Full versus provisional HISI transparency depending on enrichment availability
- Country names and coordinates derived from embedded ReliefWeb `primary_country` metadata where available
- Backward-compatible client normalization for both v1 and v2 snapshot shapes
- Separate daily/manual enrichment of the 16 highest-volume country profiles
- Country workspace selector with reporting, themes, sources, formats, trends, active disaster contexts, recent reports and watchlist controls
- QAP-ready country signal JSON export
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
- Recoverable 7-day momentum queries with last-known-good retention when ReliefWeb returns a transient timeout
- Preservation of prior country enrichment across hourly core refreshes
- Last-known-good snapshot semantics through commit-only-on-success workflow behavior
- Five-minute cap on hourly core workflow and eight-minute cap on enrichment workflow
- GitHub Pages production deployment enabled

Current validation focus:
- Confirm the hardened hourly core v2 snapshot completes after recent ReliefWeb 504 responses
- Confirm country and disaster maps populate from embedded ReliefWeb centroid data
- Confirm daily/manual top-16 country enrichment completes independently of the hourly core workflow
- Browser smoke test across desktop and mobile layouts

Provider behavior observed during validation:
- ReliefWeb has intermittently returned HTTP 504 on a previous-7-day comparison request after approximately two minutes.
- AHSM now treats that comparison as recoverable rather than allowing it to invalidate the entire operational snapshot.
- The public site continues serving the last known good snapshot during failed provider refreshes.

Next development pass:
- Add 7d/30d theme momentum comparison
- Add source ecology concentration and diversity measures
- Add dedicated country deep-link routing
- Add disaster-to-report relationship drilldowns
- Add provenance drawer and query/source register
- Add saved analyst query profiles
- Add watchlist-focused dashboard mode
- Add print stylesheet and accessibility audit
- Expand QAP export to KIQ/KJ-ready package fields
