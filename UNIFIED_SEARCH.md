# Unified Search Pipeline (Additive)

This project now has a **separate unified pipeline** that does not modify or replace the legacy `/api/scan` manual scraper flow.

## Endpoints

- Legacy/manual scan (unchanged):
  - `POST /api/scan`
- Unified/agentic scan (new):
  - `POST /api/scan/unified`
- Unified feedback loop (new):
  - `POST /api/scan/unified/feedback`

## Unified Architecture

The unified flow is implemented in `src/lib/unified-search/*` with a pluggable platform design:

1. Orchestrator schedules seed jobs per platform in parallel workers.
2. Generic platform executor applies rate limiting, retry, cache, and dead-letter logging.
3. Classifier removes opinion/noise posts and produces confidence scores.
4. Aggregation + dedup/entity resolution merges cross-platform duplicates.
5. Configurable ARR filter is applied at persistence.
6. Final deals are saved with source `unified`.
7. User feedback updates token weighting for future runs.

## Request Shape: `POST /api/scan/unified`

```json
{
  "platform": "reddit",
  "platforms": ["reddit", "producthunt", "indiehustle", "indiehackers"],
  "subreddits": ["SaaS", "smallbusiness"],
  "seeds": ["mrr", "for sale"],
  "keywords": ["selling", "arr", "exit"],
  "minARR": 0,
  "maxARR": 20000,
  "minConfidence": 0.55,
  "maxItemsPerPlatform": 60,
  "strictRevenue": false,
  "bypassCache": false
}
```

Notes:
- `platform` is supported as legacy single-platform shorthand.
- `platforms` is preferred for multi-platform runs.
- `maxARR` is optional and configurable (not hardcoded in pipeline).
- SSE events are streamed with `status`, `log`, `metric`, `complete`, `error`.

## Request Shape: `POST /api/scan/unified/feedback`

```json
{
  "verdict": "relevant",
  "text": "Great deal: SaaS at $2k MRR, owner wants to sell",
  "tokens": ["saas", "mrr", "sell"],
  "sourceId": "optional-source-reference"
}
```

- `verdict`: `relevant` or `irrelevant`
- Feedback is stored in activity logs and consumed by classifier token weighting.

## Key Files

- `src/app/api/scan/unified/route.ts`
- `src/app/api/scan/unified/feedback/route.ts`
- `src/lib/unified-search/orchestrator.ts`
- `src/lib/unified-search/platform-config.ts`
- `src/lib/unified-search/classifier.ts`
- `src/lib/unified-search/dedupe.ts`
- `src/lib/unified-search/cache.ts`
- `src/lib/unified-search/rate-limit.ts`
- `src/lib/unified-search/retry.ts`
- `src/lib/unified-search/persist.ts`
