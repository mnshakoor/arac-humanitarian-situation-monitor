# AHSM Operations Guide
## ARAC Humanitarian Situation Monitor

Version: **0.9.0-rc2**

This guide is for maintainers responsible for GitHub Pages deployment, ReliefWeb synchronization, country enrichment, service-worker updates, release validation and recovery.

## Deployment model

AHSM is a static application served from the repository `main` branch through GitHub Pages. There is no application server and no client-side API credential.

## Required GitHub secret

The repository requires a pre-approved ReliefWeb application identifier stored as the repository secret:

`RELIEFWEB_APPNAME`

Do not write its value into public snapshot provenance, source files, logs or documentation.

## Data workflows

### Hourly core synchronization

`.github/workflows/reliefweb-sync.yml`

The core sync refreshes global aggregates, latest reports, 7-day momentum comparisons and active disaster entities. The workflow is component-resilient. Recoverable ReliefWeb failures preserve the last valid component and expose component freshness in `snapshot.syncHealth`.

### Country enrichment

`.github/workflows/reliefweb-enrichment.yml`

The daily/manual enrichment pass adds deeper theme, source, format, timeline, momentum, source-ecology and recent-report context for selected country profiles while controlling API load.

## Snapshot states

- LIVE: aggregate and core components are current.
- PARTIAL: aggregate is current, one or more secondary components are last-known-good.
- DEGRADED: aggregate has fallen back to the prior valid aggregate.
- STALE: the snapshot has exceeded the operational freshness window.

Do not delete a valid snapshot merely because an upstream request failed. The resilience design intentionally favors a clearly labeled last-known-good component over an empty application.

## Service worker release procedure

Every public release that changes application-shell behavior should rotate the `CACHE` constant in `sw.js`.

Current RC2 generation: `ahsm-shell-v090-rc2-r1`.

The worker must keep critical HTML, JavaScript, CSS, manifest and snapshot requests network-first while online. Offline cache is a fallback only. Older `ahsm-` cache namespaces are removed during worker activation.

Do not reintroduce cache-first behavior for the application shell. That previously allowed different browser profiles to remain pinned to different builds.

## Build Health troubleshooting

Open Data Health and check:

1. displayed build
2. deployed build
3. service-worker cache
4. worker control state
5. connectivity
6. verification source
7. component freshness
8. runtime long tasks and script errors

If the displayed build differs from the deployed build, use the in-app update controls first. If a legacy service worker prevents convergence, unregister the worker and clear site data for the AHSM origin once, then reopen the site.

## Release validation

Before promotion:

1. `npm run quality`
2. `npm run test:smoke`
3. confirm GitHub Pages deployment succeeds
4. verify Data Health reports the intended build and service-worker cache
5. test Windows desktop
6. test iPad landscape
7. test iPad portrait
8. test application full screen
9. test Network Explorer full screen
10. test background/foreground transitions
11. test offline then online recovery
12. confirm no page errors or unhandled rejections

## Regression priorities

The most important historical regressions to prevent are:

- recursive DOM observers that lock the main thread
- service-worker cache pinning across browser profiles
- network-analysis layouts producing excessive vertical dead space
- unbounded long lists causing excessive page height or DOM growth
- stale or partial data being mislabeled as fully current
- ReliefWeb timeout failures taking down the entire public snapshot

## Favicon and public metadata

The ARAC International favicon is stored at the repository root as `favicon.png` and `favicon.ico`. Public crawler policy is in `robots.txt`, and the deployment sitemap is in `sitemap.xml`.

## Rollback

If a release causes a browser-breaking regression:

1. identify the last known-good commit
2. revert the application change
3. rotate the service-worker cache generation again
4. deploy
5. confirm the new worker activates and removes the bad cache generation
6. run the quality gate and browser smoke suite

Never force browser users to remain on a known-bad service-worker cache generation.
