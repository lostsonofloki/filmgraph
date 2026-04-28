# Filmgraph Artifacts Hub

This folder is the canonical knowledge base for docs you can feed into NotebookLM.

## Recommended NotebookLM Sources (in order)

1. `artifacts/notebooklm-source-pack.md` (meta-index)
2. `artifacts/architecture-overview.md`
3. `artifacts/data-model.md`
4. `artifacts/failure-modes.md`
5. `artifacts/barcode-scanner-implementation-summary.md`

## Folder purpose

- `artifacts/*.md` (root): technical grounding docs for architecture, schema, and troubleshooting.
- `artifacts/launch/*.md`: outbound marketing copy/templates (not core engineering grounding).

## NotebookLM usage notes

- Prefer technical docs first, then feature deep dives.
- Keep one source of truth per topic (avoid duplicate docs with conflicting wording).
- When a feature ships, update the technical artifact in this folder before writing release notes elsewhere.

## Maintenance checklist

- Add new feature summaries as `artifacts/<feature>-implementation-summary.md`.
- Add new regressions to `artifacts/failure-modes.md`.
- Keep `artifacts/notebooklm-source-pack.md` current when files are added/removed.
