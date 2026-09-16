# ARAC Humanitarian Situation Monitor

## Build Specification and Design Manual

**Version 1.0 | 15 September 2026**  
**By M. Nuri Shakoor, SRMP-R**  
**MNS Consulting | Quanta Analytica**  
**Prepared for ARAC International Inc.**  
**Non-Profit Public Service Initiative for Humanitarians and Local Communities**

This repository implements the ARAC Humanitarian Situation Monitor (AHSM), a public-service humanitarian information observatory using ReliefWeb API V2 metadata.

## Governing analytical rule

AHSM measures and visualizes the **humanitarian information environment**. Reporting volume, reporting momentum, source diversity, thematic breadth, and HISI are information signals. They are not direct humanitarian severity scores and must not be presented as such.

## Core architecture

```text
ReliefWeb API V2
       |
       v
GitHub Actions scheduled sync
       |
       v
data/snapshot.json
       |
       v
Static GitHub Pages application
       |
       +-- Global Overview
       +-- Crisis Pulse
       +-- Country workspaces
       +-- Reports
       +-- Disaster Explorer
       +-- Query Lab
       +-- Community View
       +-- CSV / JSON / QAP exports
```

## Required implementation rules

1. Use `date.original` for humanitarian publication trend analysis.
2. Use `primary_country` for country rankings to reduce multi-country double counting.
3. Use published ReliefWeb records for public analytical displays.
4. Treat ReliefWeb taxonomies as the primary category system for country, source, theme, format, language, disaster, and disaster type.
5. Preserve the distinction between named `disaster` entities and report-level `disaster_type` metadata.
6. Source diversity does not equal independent corroboration.
7. Country choropleths represent report metadata, not precise humanitarian event locations.
8. No private API keys may be embedded in public browser JavaScript.
9. Core public functionality must not require an account.
10. The interface should target WCAG 2.2 AA for core workflows and maintain a low-bandwidth-friendly design.

## Signal methodology

Reporting momentum compares the current seven-day reporting count to the previous seven-day period. Percentage change alone must not generate a high-priority signal when the underlying count is very small. The alpha implementation therefore requires minimum current volume, minimum absolute increase, and minimum percentage increase.

The Humanitarian Information Signal Index (HISI) is a transparent composite of normalized reporting volume, momentum, source diversity, and thematic breadth. HISI measures information-system intensity relative to the comparison set. It must never be labeled or described as a humanitarian severity score.

## Public-service design principles

- free access;
- transparent provenance;
- community-readable language;
- low-bandwidth awareness;
- accessible navigation and data presentation;
- exportable structured data;
- no unnecessary collection of personal information;
- clear independence from ReliefWeb, OCHA, and the United Nations.

## Deployment model

The application is designed for GitHub Pages. An hourly GitHub Actions workflow refreshes `data/snapshot.json` from ReliefWeb using the repository variable `RELIEFWEB_APPNAME`. The public site continues to serve the last valid committed snapshot if a refresh fails.

## Version 1 feature target

- Global Overview and KPIs
- country reporting rankings
- reporting momentum and Crisis Pulse
- Humanitarian Information Signal Index
- country workspaces with theme/source views
- report search and triage
- ReliefWeb Disaster Explorer
- dynamic taxonomy filters
- Query Lab and reproducible request display
- source ecology and theme momentum comparisons
- Community View and low-data design
- local bookmarks/watchlists
- CSV and JSON exports
- QAP-compatible structured export
- provenance and methodology views
- responsive layout and accessibility audit

## Integration boundary

AHSM complements ARAC's other analytical systems rather than replacing them:

```text
ACLED / CSW          ReliefWeb / AHSM          IOM DTM / MOSAIC
      \                    |                       /
       \                   |                      /
        +------------------+---------------------+
                           |
                           v
                    Quanta Analytica
                           |
                           v
                       QAP process
```

CSW addresses conflict-event information, AHSM addresses the humanitarian reporting environment, MOSAIC addresses displacement and mobility, and QAP provides structured analytical interpretation.

## Developer status

See `IMPLEMENTATION-STATUS.md` for completed alpha functions and the next development pass. The separately published full Version 1.0 Build Specification and Design Manual remains the controlling detailed specification for subsequent phases.
