# Regenerate Tokenta spec PDFs from .txt sources (requires Pandoc + PDF engine).
$ErrorActionPreference = "Stop"
$docs = Split-Path -Parent $PSScriptRoot
Set-Location $docs

if (-not (Get-Command pandoc -ErrorAction SilentlyContinue)) {
  Write-Error "pandoc not found. Install from https://pandoc.org/ or see regenerate-spec-pdfs.md"
}

pandoc tokenta-run-verification-mechanism-spec.txt -o tokenta-run-verification-mechanism-spec.pdf --pdf-engine=xelatex -V geometry:margin=1in
pandoc tokenta-verification-engine-spec.txt -o tokenta-verification-engine-spec.pdf --pdf-engine=xelatex -V geometry:margin=1in
Write-Host "PDFs written to $docs"
