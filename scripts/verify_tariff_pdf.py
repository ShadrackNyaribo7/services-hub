from __future__ import annotations

import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
LOCAL_PDF_LIBS = ROOT / "tmp" / "pdfs" / "python_lib"
if LOCAL_PDF_LIBS.exists():
    sys.path.insert(0, str(LOCAL_PDF_LIBS))

import fitz
from pypdf import PdfReader


PDF_PATH = ROOT / "output" / "pdf" / "PATANAFUU_Service_Tariff_Guide.pdf"
RENDER_DIR = ROOT / "tmp" / "pdfs" / "rendered"


def main():
    reader = PdfReader(str(PDF_PATH))
    page_text = [(page.extract_text() or "") for page in reader.pages]
    full_text = "\n".join(page_text)

    required_strings = [
        "PATANAFUU",
        "Business Profile and",
        "Service Tariff Guide",
        "KES 500",
        "KES 150,000",
        "Cleaning and electrical services",
        "Plumbing and mechanical services",
        "How PATANAFUU earns and collects",
        "PURPOSE OF THE PAYBILL",
        "APPLICANT DECLARATION",
        "stilespulsar77@gmail.com",
        "Dispatch edition",
    ]
    missing = [value for value in required_strings if value not in full_text]

    RENDER_DIR.mkdir(parents=True, exist_ok=True)
    document = fitz.open(str(PDF_PATH))
    rendered = []
    for index, page in enumerate(document):
        pixmap = page.get_pixmap(matrix=fitz.Matrix(2, 2), alpha=False)
        output = RENDER_DIR / f"tariff-page-{index + 1}.png"
        pixmap.save(str(output))
        rendered.append(output)

    print(f"pages={len(reader.pages)}")
    print(f"text_characters={len(full_text)}")
    print(f"missing_required_strings={missing}")
    print(f"rendered_pages={len(rendered)}")
    for output in rendered:
        print(output)

    if len(reader.pages) != 5 or missing:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
