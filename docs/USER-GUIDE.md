# ARAC Humanitarian Situation Monitor
## Public User Guide

Version: **0.9.0-rc2**

AHSM is a public-service humanitarian information monitoring application developed for ARAC International Inc. using ReliefWeb API V2 metadata. It helps users understand where humanitarian reporting is concentrated, how reporting patterns are changing, and how reports, countries, sources and themes relate inside the synchronized information corpus.

> AHSM measures the humanitarian information environment. Reporting volume, momentum, HISI, regional roll-ups, source ecology and network measures are not direct humanitarian severity scores.

## Main workspaces

### Global Overview
Use this page for the broad 30-day picture. It includes reporting volume, country coverage, source breadth, theme activity, reporting trend, the global map and country-level signals.

### Crisis Pulse
Shows rule-based reporting acceleration signals that meet minimum current-volume, absolute-change and percentage-change safeguards. These signals identify changes that may deserve analyst review. They are not crisis-severity determinations.

### Regions
Aggregates the same country-level reporting signals into operational regional views. Regional totals should be interpreted as reporting intensity and information-system activity.

### Countries
Opens a country workspace with 30-day and 7-day reporting, signal state, HISI, themes, sources, formats, timeline, disaster context, source ecology and recent reports when enrichment is available.

### Watchlist
Stores locally selected country workspaces in the current browser. Watchlists do not require an account and are not synchronized across devices.

### Reports
Searches the synchronized report corpus. Progressive rendering limits the number of report cards initially displayed on smaller screens to preserve responsiveness.

### Disasters
Displays named ReliefWeb disaster entities separately from report-level disaster-type tags. A related-report count of zero means no matching report is present in the synchronized AHSM snapshot, not that ReliefWeb has no reporting on the event.

### Network Explorer
Provides a Quanta Analytica relationship workspace linking reports, countries, sources and themes through co-occurrence in the synchronized ReliefWeb corpus. Network proximity, centrality and community membership describe structure in the information graph. They do not establish causality, coordination, source independence, organizational influence or real-world command relationships.

The temporal network layer compares equivalent 24-hour, 7-day or 30-day windows. Emerging, disappearing, strengthening and weakening relationships refer to changes in corpus co-occurrence between the compared windows.

### Query Lab
Builds a ReliefWeb-style structured query and tests it against the synchronized snapshot. Queries can be saved locally and exported as JSON.

### Source Register
Shows source presence in the 30-day synchronized reporting window together with snapshot provenance. Frequent appearance may reflect operational prominence, publication cadence or reporting access. It does not by itself establish evidentiary independence or quality.

### Methodology
Provides the public analytical rules, freshness model, interpretation boundary, regional aggregation rules, network methodology and reproducibility information.

## Data Health states

- **LIVE**: core synchronized components are current.
- **PARTIAL**: the global aggregate is current while one or more secondary components use last-known-good data.
- **DEGRADED**: the aggregate itself has fallen back to last-known-good data.
- **STALE**: the operational freshness window has been exceeded.

Open the Data Health control for component-level freshness, build version, service-worker status and browser runtime diagnostics.

## Full-screen modes

AHSM supports application-level full screen from the top bar. Network Explorer also has a dedicated analysis-focused full-screen control. On supported desktop browsers, Alt+Enter toggles application full screen and F toggles Network Explorer full screen when focus is not inside a form field.

## Exports

AHSM supports CSV and JSON exports from the global application and structured analytical exports from country, network and temporal investigation workspaces. Exported analytical packages should be treated as evidence packages for analyst review, not final assessments.

## Mobile and tablet use

The interface supports portrait and landscape layouts. Long country and report lists use progressive rendering. On narrow screens the Network Explorer places the graph before lower-priority interpretation modules and may collapse secondary analytical panels.

## Offline and low-bandwidth behavior

AHSM uses a service worker for temporary offline continuity. Critical application files and the data snapshot prefer the network while online and fall back to the last cached valid version when connectivity is unavailable. Data Health identifies whether the current build was network-verified or served from offline fallback.

## Attribution

Primary external data source: ReliefWeb API V2, United Nations Office for the Coordination of Humanitarian Affairs.

AHSM is independently developed by ARAC International Inc. and is not an official ReliefWeb or OCHA product.
