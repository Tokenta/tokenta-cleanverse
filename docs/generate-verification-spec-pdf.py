#!/usr/bin/env python3
"""Generate PDF from tokenta-verification-engine-spec.txt using fpdf2."""

from pathlib import Path

try:
    from fpdf import FPDF
except ImportError:
    raise SystemExit("Install fpdf2: pip install fpdf2")

ROOT = Path(__file__).resolve().parent
TXT = ROOT / "tokenta-verification-engine-spec.txt"
PDF = ROOT / "tokenta-verification-engine-spec.pdf"


class SpecPDF(FPDF):
    def footer(self):
        self.set_y(-12)
        self.set_font("Helvetica", "I", 8)
        self.set_text_color(100, 100, 100)
        self.cell(0, 8, f"Tokenta Verification Engine Spec v0.1  |  Page {self.page_no()}", align="C")


def ascii_safe(s: str) -> str:
    replacements = {
        "\u2014": "-",
        "\u2013": "-",
        "\u2018": "'",
        "\u2019": "'",
        "\u2026": "...",
        "\u2192": "->",
        "\u2190": "<-",
        "\u2193": "v",
        "\u2191": "^",
    }
    for k, v in replacements.items():
        s = s.replace(k, v)
    return s.encode("ascii", "replace").decode("ascii")


def main():
    text = ascii_safe(TXT.read_text(encoding="utf-8"))
    pdf = SpecPDF(orientation="P", unit="mm", format="A4")
    pdf.set_auto_page_break(auto=True, margin=18)
    pdf.set_margins(18, 18, 18)
    pdf.add_page()
    pdf.set_font("Courier", size=7.5)
    pdf.set_text_color(20, 20, 20)

    line_height = 3.6
    page_width = pdf.w - pdf.l_margin - pdf.r_margin

    for line in text.splitlines():
        if line.startswith("===="):
            pdf.ln(2)
            pdf.set_font("Courier", "B", 8)
            pdf.multi_cell(page_width, line_height + 0.5, line.strip("= ").strip() or " ", align="L")
            pdf.set_font("Courier", size=7.5)
            pdf.ln(1)
            continue

        if not line.strip():
            pdf.ln(line_height * 0.4)
            continue

        # Section numbers bold
        if len(line) > 2 and line[0].isdigit() and "." in line[:4]:
            pdf.set_font("Courier", "B", 7.5)
            pdf.multi_cell(page_width, line_height, line, align="L")
            pdf.set_font("Courier", size=7.5)
        else:
            pdf.multi_cell(page_width, line_height, line, align="L")

    pdf.output(str(PDF))
    print(f"Wrote {PDF}")


if __name__ == "__main__":
    main()
