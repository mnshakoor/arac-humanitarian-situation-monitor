# AHSM AI Quick Analysis

## Purpose

AI Quick Analysis adds an optional analytical assistance layer to the ARAC Humanitarian Situation Monitor without changing the underlying ReliefWeb synchronization pipeline or analytical boundary.

The feature generates concise, evidence-bounded briefs from the structured data already present in the synchronized AHSM snapshot. The AI does not scrape the rendered page and does not use outside knowledge for these briefs.

## Initial analytical surfaces

- Country Workspace: country humanitarian information quick brief
- Regions: regional humanitarian information brief
- Crisis Pulse: focused reporting-acceleration assessment
- Query Lab: synthesis of the current filtered report set
- Saved Analysis: local browser library for generated briefs

## Architecture

```text
ReliefWeb
  |
GitHub Actions synchronization
  |
data/snapshot.json
  |
AHSM structured payload builders
  |
Supabase Edge Function: ahsm-analyze
  |
Google Gemini API
  |
Structured AI brief
  |
On-screen drawer + local save + Markdown/JSON export
```

## Analytical controls

Every request applies the following controls:

1. The supplied AHSM payload is the complete evidence set for the response.
2. Reporting volume, reporting momentum, HISI, source breadth, theme breadth, and network relationships are information-environment indicators.
3. These signals must not be presented as direct humanitarian severity measures.
4. The model must not infer deterioration, escalation, causality, organizational coordination, or operational impact solely from reporting changes or co-occurrence.
5. Direct observations must be distinguished from analytical inference.
6. Source diversity must not be treated automatically as independent corroboration.
7. Unsupported judgments must be identified as information gaps rather than filled with outside knowledge.

## Output structure

The Edge Function requests structured JSON with:

- BLUF
- Key Judgments
- Supporting Signals
- Implications
- Indicators to Watch
- Information Gaps
- Confidence level and rationale
- Analytical Boundary

The response also includes a Markdown rendering for download and local saving.

## Security

The Gemini credential is never stored in the GitHub Pages client.

The public client contains only the Supabase publishable key. The `ahsm-analyze` Edge Function validates that application key, restricts browser origins, bounds request size, and applies per-client daily rate limiting.

The internal `ahsm_ai_usage` table is protected by RLS and explicit deny-all policies for `anon` and `authenticated` database roles. The Edge Function accesses it with server-side credentials.

## Persistence

Version 1 saves generated briefs in browser local storage so the public application does not require a login.

The database table `public.ahsm_ai_reports` is already prepared for a later authenticated cloud-save release. Its RLS policies restrict reads and writes to the owning authenticated user.

## Operational notes

- The Edge Function model is selected with `GEMINI_AHSM_MODEL` when configured.
- If that variable is absent, the function falls back to `GEMINI_ANALYSIS_MODEL`, then `gemini-3.5-flash`.
- The current client limit is 20 AI analyses per client per UTC day.
- Query Lab sends at most 40 matching reports to the analysis endpoint.
- The browser never sends the entire application snapshot when a smaller section-specific payload can be used.
