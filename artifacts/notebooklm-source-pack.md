# Filmgraph NotebookLM Source Pack

Use this file as the top-level loader document for NotebookLM. It tells the notebook what to read and why.

## Primary grounding set

### 1) System architecture
- File: `artifacts/architecture-overview.md`
- Why: End-to-end map of frontend, Supabase, Vercel functions, APIs, and critical runtime flows.

### 2) Database/schema reference
- File: `artifacts/data-model.md`
- Why: Table purposes, important columns, constraints/indexes, and migration lineage.

### 3) Failure and debugging memory
- File: `artifacts/failure-modes.md`
- Why: Known regressions, root causes, shipped fixes, and first checks when incidents recur.

### 4) Feature deep dive (scanner + physical ownership)
- File: `artifacts/barcode-scanner-implementation-summary.md`
- Why: Scanner flow, fallback logic, ownership integration, and operational guardrails.

## Optional supporting sources

### Product/docs context
- `README.md`
- `ROADMAP.md`
- `CHANGELOG.md`

Use these for product history and sequencing, not as primary technical truth when they conflict with the four primary docs.

## Exclude from NotebookLM grounding by default

- `artifacts/launch/*.md` (marketing copy/templates)

These are useful for comms workflows, but they add noise for technical Q&A.

## Suggested NotebookLM prompt starter

Use this as a pinned instruction in your notebook:

```
Treat the Filmgraph artifacts as the source of truth in this priority order:
1) architecture-overview
2) data-model
3) failure-modes
4) barcode-scanner implementation summary

When answering, cite relevant file paths and separate:
- current behavior
- known risks
- recommended next step
```

## Quick refresh workflow

When a major feature ships:
1. Update or add the implementation summary in `artifacts/`.
2. Add regressions/guardrails to `failure-modes.md` if relevant.
3. Update this source pack if file names or priority changed.
