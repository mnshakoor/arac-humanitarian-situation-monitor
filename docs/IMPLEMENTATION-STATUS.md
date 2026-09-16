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
- Canonical country-name normalization from ReliefWeb country metadata
- Quota-conserving enrichment of the 20 highest-volume country profiles
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
- ReliefWeb Actions synchronization script
- Hourly workflow plus ingestion-pipeline validation on sync-code changes
- Last-known-good semantics through commit-only-on-success workflow behavior
- GitHub Pages production deployment enabled

Current validation focus:
- Confirm enriched ReliefWeb snapshot v2 completes successfully under the approved appname
- Confirm country and disaster maps populate from embedded ReliefWeb centroid data
- Confirm the 20 enriched country profiles remain within the daily ReliefWeb API call budget
- Browser smoke test across desktop and mobile layouts

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
