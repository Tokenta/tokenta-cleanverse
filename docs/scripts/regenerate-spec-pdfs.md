# Regenerate Tokenta spec PDFs

Source of truth: `.txt` files in `docs/`. PDFs are export artifacts.

## Prerequisites

Install one of:

- [Pandoc](https://pandoc.org/) + a PDF engine (e.g. MiKTeX, TeX Live)
- Or use VS Code / Word “Print to PDF” on the `.txt` files

## Pandoc (recommended)

From repo root:

```powershell
cd docs
pandoc tokenta-run-verification-mechanism-spec.txt -o tokenta-run-verification-mechanism-spec.pdf --pdf-engine=xelatex -V geometry:margin=1in
pandoc tokenta-verification-engine-spec.txt -o tokenta-verification-engine-spec.pdf --pdf-engine=xelatex -V geometry:margin=1in
```

## When to regenerate

After each mechanism or engine spec version bump (e.g. v0.4 → v0.5), per implementation plan checklist.

## Note

Implementation annotations in `.txt` files are included in PDF exports unless you strip `IMPLEMENTATION STATUS` blocks manually before export.
