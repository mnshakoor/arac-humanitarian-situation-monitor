# AHSM v0.9.0-rc1 Release Candidate Plan

## Purpose

v0.9.0-rc1 freezes major feature expansion and shifts AHSM toward a stable public-service release. The release-candidate program prioritizes reliability, interpretability, accessibility, performance, update convergence, and regression prevention.

## RC1 reliability controls

- Runtime diagnostics are exposed locally in Data Health under **Release Candidate Runtime**.
- Browser-session diagnostics count long tasks, script errors, unhandled promise rejections, connectivity transitions, snapshot age, and component freshness.
- Diagnostics remain local to the browser and are not transmitted.
- Background tabs pause the ReliefWeb ticker animation and remove unnecessary network-graph transitions.
- `prefers-reduced-motion` disables ticker animation and graph transitions.
- The service worker remains network-first for critical application assets and uses cache generation `ahsm-shell-v090-rc1-r1`.
- Old AHSM cache generations are removed when the current worker activates.

## Automated RC1 regression coverage

Playwright must verify on desktop and mobile profiles:

1. core application load and country workspace operation;
2. Source Register and Disaster Explorer operation;
3. keyboard access to Data Health and primary navigation;
4. regional monitoring and Network Explorer operation;
5. structural and temporal network intelligence;
6. graph-first Network Explorer workflow ordering;
7. repeated Data Health open/close cycles without page errors;
8. repeated Network Explorer filtering and navigation without page errors;
9. service-worker convergence on the RC1 cache generation;
10. offline shell recovery followed by successful return to the network-current build.

## Release-candidate interpretation

A passing RC1 test suite means the checked workflows behaved correctly in automated Chromium desktop/mobile profiles. It does not guarantee identical behavior on every browser, device, network, or operating-system version. Windows desktop and iPad field testing remain part of release validation.

## Data-health states

- **LIVE**: the snapshot is inside the operational freshness window and synchronized components are current.
- **DEGRADED**: the current snapshot is usable, but one or more synchronized components are being served from last-known-good data or are older than the preferred freshness target.
- **STALE**: the public view is relying on an older last-known-good snapshot or the primary aggregate is no longer operationally current.

These states describe AHSM data freshness and synchronization health. They are not humanitarian severity classifications.

## Remaining RC work before v1.0

- formal accessibility audit and remediation;
- exact ReliefWeb disaster/report identifier normalization where supported;
- public About / Public Service Initiative page;
- expanded in-app methodology and provenance documentation;
- SEO, Open Graph and social metadata;
- final mobile, tablet, fullscreen and print review;
- cosmetic UI placement and spacing pass;
- operator/administrator guide and public user guide;
- changelog and v1.0 release notes;
- final Windows and iPad endurance test.
