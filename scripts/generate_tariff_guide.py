from __future__ import annotations

import os
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
LOCAL_PDF_LIBS = ROOT / "tmp" / "pdfs" / "python_lib"
if LOCAL_PDF_LIBS.exists():
    sys.path.insert(0, str(LOCAL_PDF_LIBS))

from reportlab.lib import colors
from reportlab.lib.colors import HexColor
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase import pdfmetrics
from reportlab.platypus import (
    BaseDocTemplate,
    Flowable,
    Frame,
    Image,
    KeepTogether,
    PageBreak,
    PageTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)


OUTPUT_PATH = ROOT / "output" / "pdf" / "PATANAFUU_Service_Tariff_Guide.pdf"
LOGO_PATH = ROOT / "public" / "icon-512x512.png"

PAGE_W, PAGE_H = A4
MARGIN_X = 17 * mm
TOP_MARGIN = 18 * mm
BOTTOM_MARGIN = 17 * mm
CONTENT_W = PAGE_W - 2 * MARGIN_X

EMERALD = HexColor("#087A5B")
EMERALD_DARK = HexColor("#064E3B")
EMERALD_LIGHT = HexColor("#E8F7F1")
MINT = HexColor("#12B981")
GOLD = HexColor("#E9B949")
INK = HexColor("#14231E")
SLATE = HexColor("#4B635B")
LIGHT_SLATE = HexColor("#E7ECEA")
PALE = HexColor("#F5F8F7")
WHITE = colors.white
BLACK = colors.black


def register_fonts() -> tuple[str, str, str]:
    font_candidates = [
        (
            Path(os.environ.get("WINDIR", r"C:\Windows"))
            / "Fonts"
            / "segoeui.ttf",
            Path(os.environ.get("WINDIR", r"C:\Windows"))
            / "Fonts"
            / "segoeuib.ttf",
            Path(os.environ.get("WINDIR", r"C:\Windows"))
            / "Fonts"
            / "segoeuisb.ttf",
        ),
        (
            Path(os.environ.get("WINDIR", r"C:\Windows"))
            / "Fonts"
            / "arial.ttf",
            Path(os.environ.get("WINDIR", r"C:\Windows"))
            / "Fonts"
            / "arialbd.ttf",
            Path(os.environ.get("WINDIR", r"C:\Windows"))
            / "Fonts"
            / "arialbd.ttf",
        ),
    ]

    for regular, bold, semibold in font_candidates:
        if regular.exists() and bold.exists() and semibold.exists():
            pdfmetrics.registerFont(TTFont("PatanaRegular", str(regular)))
            pdfmetrics.registerFont(TTFont("PatanaBold", str(bold)))
            pdfmetrics.registerFont(TTFont("PatanaSemiBold", str(semibold)))
            return "PatanaRegular", "PatanaBold", "PatanaSemiBold"

    return "Helvetica", "Helvetica-Bold", "Helvetica-Bold"


FONT_REGULAR, FONT_BOLD, FONT_SEMIBOLD = register_fonts()


styles = getSampleStyleSheet()
styles.add(
    ParagraphStyle(
        name="CoverEyebrow",
        fontName=FONT_SEMIBOLD,
        fontSize=9.3,
        leading=12,
        textColor=GOLD,
        tracking=1.8,
        alignment=TA_LEFT,
        spaceAfter=6,
    )
)
styles.add(
    ParagraphStyle(
        name="CoverTitle",
        fontName=FONT_BOLD,
        fontSize=33,
        leading=36,
        textColor=WHITE,
        spaceAfter=10,
    )
)
styles.add(
    ParagraphStyle(
        name="CoverSubtitle",
        fontName=FONT_REGULAR,
        fontSize=13.5,
        leading=19,
        textColor=HexColor("#D8F4EA"),
        spaceAfter=12,
    )
)
styles.add(
    ParagraphStyle(
        name="CoverSmall",
        fontName=FONT_REGULAR,
        fontSize=8.8,
        leading=13,
        textColor=HexColor("#CDE9E0"),
    )
)
styles.add(
    ParagraphStyle(
        name="SectionEyebrow",
        fontName=FONT_SEMIBOLD,
        fontSize=8,
        leading=10,
        textColor=EMERALD,
        tracking=1.3,
        spaceAfter=3,
    )
)
styles.add(
    ParagraphStyle(
        name="H1Custom",
        fontName=FONT_BOLD,
        fontSize=23,
        leading=27,
        textColor=INK,
        spaceAfter=8,
    )
)
styles.add(
    ParagraphStyle(
        name="H2Custom",
        fontName=FONT_BOLD,
        fontSize=14,
        leading=17,
        textColor=EMERALD_DARK,
        spaceBefore=3,
        spaceAfter=5,
    )
)
styles.add(
    ParagraphStyle(
        name="BodyCustom",
        fontName=FONT_REGULAR,
        fontSize=8.9,
        leading=13.1,
        textColor=INK,
        spaceAfter=5,
    )
)
styles.add(
    ParagraphStyle(
        name="BodySmall",
        fontName=FONT_REGULAR,
        fontSize=7.6,
        leading=10.6,
        textColor=SLATE,
    )
)
styles.add(
    ParagraphStyle(
        name="BodyTiny",
        fontName=FONT_REGULAR,
        fontSize=6.8,
        leading=9.1,
        textColor=SLATE,
    )
)
styles.add(
    ParagraphStyle(
        name="BodyBold",
        fontName=FONT_SEMIBOLD,
        fontSize=8.8,
        leading=12,
        textColor=INK,
    )
)
styles.add(
    ParagraphStyle(
        name="CardLabel",
        fontName=FONT_SEMIBOLD,
        fontSize=7.1,
        leading=9,
        textColor=EMERALD,
        tracking=0.7,
        spaceAfter=2,
    )
)
styles.add(
    ParagraphStyle(
        name="CardValue",
        fontName=FONT_BOLD,
        fontSize=10.2,
        leading=12.5,
        textColor=INK,
    )
)
styles.add(
    ParagraphStyle(
        name="TableHead",
        fontName=FONT_SEMIBOLD,
        fontSize=7.2,
        leading=9.1,
        textColor=WHITE,
    )
)
styles.add(
    ParagraphStyle(
        name="TableCell",
        fontName=FONT_REGULAR,
        fontSize=7.2,
        leading=9.4,
        textColor=INK,
    )
)
styles.add(
    ParagraphStyle(
        name="TableCellBold",
        fontName=FONT_SEMIBOLD,
        fontSize=7.2,
        leading=9.4,
        textColor=INK,
    )
)
styles.add(
    ParagraphStyle(
        name="TableCellRight",
        fontName=FONT_SEMIBOLD,
        fontSize=7.2,
        leading=9.4,
        textColor=EMERALD_DARK,
        alignment=TA_RIGHT,
    )
)
styles.add(
    ParagraphStyle(
        name="Callout",
        fontName=FONT_REGULAR,
        fontSize=8,
        leading=11.5,
        textColor=EMERALD_DARK,
    )
)
styles.add(
    ParagraphStyle(
        name="StepNo",
        fontName=FONT_BOLD,
        fontSize=12,
        leading=14,
        textColor=WHITE,
        alignment=TA_CENTER,
    )
)
styles.add(
    ParagraphStyle(
        name="StepText",
        fontName=FONT_SEMIBOLD,
        fontSize=7.1,
        leading=9.1,
        textColor=INK,
        alignment=TA_CENTER,
    )
)
styles.add(
    ParagraphStyle(
        name="Declaration",
        fontName=FONT_REGULAR,
        fontSize=9,
        leading=13.8,
        textColor=INK,
    )
)


def P(text: str, style: str = "BodyCustom") -> Paragraph:
    return Paragraph(text, styles[style])


class Rule(Flowable):
    def __init__(self, color=LIGHT_SLATE, thickness=0.8, width=CONTENT_W):
        super().__init__()
        self.color = color
        self.thickness = thickness
        self.width = width
        self.height = thickness + 1

    def draw(self):
        self.canv.setStrokeColor(self.color)
        self.canv.setLineWidth(self.thickness)
        self.canv.line(0, 0, self.width, 0)


class CoverSpacer(Flowable):
    def __init__(self, height: float):
        super().__init__()
        self.height = height

    def draw(self):
        pass


def draw_cover(canvas, doc):
    canvas.saveState()
    canvas.setFillColor(EMERALD_DARK)
    canvas.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)

    canvas.setFillColor(HexColor("#0A6A50"))
    canvas.circle(PAGE_W + 8 * mm, PAGE_H - 45 * mm, 58 * mm, fill=1, stroke=0)
    canvas.setFillColor(HexColor("#075D47"))
    canvas.circle(PAGE_W - 10 * mm, -8 * mm, 72 * mm, fill=1, stroke=0)

    canvas.setFillColor(GOLD)
    canvas.rect(0, PAGE_H - 5 * mm, PAGE_W, 5 * mm, fill=1, stroke=0)

    canvas.setStrokeColor(HexColor("#64CDB0"))
    canvas.setLineWidth(0.8)
    canvas.line(MARGIN_X, 32 * mm, PAGE_W - MARGIN_X, 32 * mm)
    canvas.setFont(FONT_REGULAR, 7.5)
    canvas.setFillColor(HexColor("#CDE9E0"))
    canvas.drawString(MARGIN_X, 23 * mm, "PATANAFUU | Service Tariff Guide | Effective 27 July 2026")
    canvas.drawRightString(PAGE_W - MARGIN_X, 23 * mm, "Page 1 of 4")
    canvas.restoreState()


def draw_standard_page(canvas, doc):
    canvas.saveState()
    canvas.setFillColor(WHITE)
    canvas.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)

    canvas.setFillColor(EMERALD)
    canvas.rect(0, PAGE_H - 4 * mm, PAGE_W, 4 * mm, fill=1, stroke=0)
    canvas.setFont(FONT_BOLD, 8.5)
    canvas.setFillColor(EMERALD_DARK)
    canvas.drawString(MARGIN_X, PAGE_H - 12 * mm, "PATANAFUU")
    canvas.setFont(FONT_REGULAR, 7.2)
    canvas.setFillColor(SLATE)
    canvas.drawRightString(
        PAGE_W - MARGIN_X, PAGE_H - 12 * mm, "SERVICE TARIFF GUIDE"
    )
    canvas.setStrokeColor(LIGHT_SLATE)
    canvas.setLineWidth(0.65)
    canvas.line(MARGIN_X, PAGE_H - 15 * mm, PAGE_W - MARGIN_X, PAGE_H - 15 * mm)

    canvas.setStrokeColor(LIGHT_SLATE)
    canvas.line(MARGIN_X, 13 * mm, PAGE_W - MARGIN_X, 13 * mm)
    canvas.setFont(FONT_REGULAR, 6.8)
    canvas.setFillColor(SLATE)
    canvas.drawString(MARGIN_X, 8 * mm, "Effective 27 July 2026 | Currency: KES")
    canvas.drawRightString(
        PAGE_W - MARGIN_X, 8 * mm, f"Page {doc.page} of 4"
    )
    canvas.restoreState()


class TariffDocTemplate(BaseDocTemplate):
    def __init__(self, filename: str):
        super().__init__(
            filename,
            pagesize=A4,
            leftMargin=MARGIN_X,
            rightMargin=MARGIN_X,
            topMargin=TOP_MARGIN,
            bottomMargin=BOTTOM_MARGIN,
            title="PATANAFUU Service Tariff Guide",
            author="PATANAFUU",
            subject="Online business service tariffs prepared for M-PESA PayBill onboarding",
            creator="PATANAFUU",
        )
        cover_frame = Frame(
            MARGIN_X,
            35 * mm,
            CONTENT_W,
            PAGE_H - 55 * mm,
            leftPadding=0,
            bottomPadding=0,
            rightPadding=0,
            topPadding=0,
            id="cover_frame",
        )
        standard_frame = Frame(
            MARGIN_X,
            BOTTOM_MARGIN,
            CONTENT_W,
            PAGE_H - TOP_MARGIN - BOTTOM_MARGIN,
            leftPadding=0,
            bottomPadding=0,
            rightPadding=0,
            topPadding=0,
            id="standard_frame",
        )
        self.addPageTemplates(
            [
                PageTemplate(id="Cover", frames=[cover_frame], onPage=draw_cover),
                PageTemplate(
                    id="Standard", frames=[standard_frame], onPage=draw_standard_page
                ),
            ]
        )

    def afterPage(self):
        if self.page == 1:
            self.handle_nextPageTemplate("Standard")


def metric_card(label: str, value: str, width: float) -> Table:
    content = [
        [P(label.upper(), "CardLabel")],
        [P(value, "CardValue")],
    ]
    table = Table(content, colWidths=[width], rowHeights=[8 * mm, 14 * mm])
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), WHITE),
                ("BOX", (0, 0), (-1, -1), 0.7, HexColor("#AEDFCC")),
                ("LEFTPADDING", (0, 0), (-1, -1), 4 * mm),
                ("RIGHTPADDING", (0, 0), (-1, -1), 4 * mm),
                ("TOPPADDING", (0, 0), (-1, -1), 2.5 * mm),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 2.5 * mm),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ]
        )
    )
    return table


def callout(text: str, background=EMERALD_LIGHT, border=HexColor("#B7E4D5")) -> Table:
    table = Table([[P(text, "Callout")]], colWidths=[CONTENT_W])
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), background),
                ("BOX", (0, 0), (-1, -1), 0.7, border),
                ("LEFTPADDING", (0, 0), (-1, -1), 5 * mm),
                ("RIGHTPADDING", (0, 0), (-1, -1), 5 * mm),
                ("TOPPADDING", (0, 0), (-1, -1), 3.5 * mm),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 3.5 * mm),
            ]
        )
    )
    return table


def section_heading(eyebrow: str, title: str, intro: str | None = None):
    items = [
        P(eyebrow.upper(), "SectionEyebrow"),
        P(title, "H1Custom"),
    ]
    if intro:
        items.append(P(intro, "BodyCustom"))
    items.append(Spacer(1, 3 * mm))
    return items


def tariff_table(rows: list[list[str]]) -> Table:
    data = [
        [
            P("CATEGORY", "TableHead"),
            P("SERVICE / BASIS", "TableHead"),
            P("CUSTOMER TARIFF (KES)", "TableHead"),
        ]
    ]
    for category, service, price in rows:
        data.append(
            [
                P(category, "TableCellBold"),
                P(service, "TableCell"),
                P(price, "TableCellRight"),
            ]
        )

    table = Table(
        data,
        colWidths=[34 * mm, 88 * mm, CONTENT_W - 122 * mm],
        repeatRows=1,
        hAlign="LEFT",
    )
    style = [
        ("BACKGROUND", (0, 0), (-1, 0), EMERALD_DARK),
        ("GRID", (0, 0), (-1, -1), 0.45, HexColor("#CAD8D3")),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 3 * mm),
        ("RIGHTPADDING", (0, 0), (-1, -1), 3 * mm),
        ("TOPPADDING", (0, 0), (-1, -1), 2.2 * mm),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 2.2 * mm),
    ]
    for row_index in range(1, len(data)):
        if row_index % 2 == 0:
            style.append(("BACKGROUND", (0, row_index), (-1, row_index), PALE))
    table.setStyle(TableStyle(style))
    return table


def provider_fee_table() -> Table:
    data = [
        [
            P("BOOKING VALUE (KES)", "TableHead"),
            P("BASE MARKETPLACE FEE", "TableHead"),
            P("COMMERCIAL PURPOSE", "TableHead"),
        ],
        [
            P("500 - 2,499", "TableCellBold"),
            P("18%", "TableCellRight"),
            P("Supports higher fixed onboarding, support and payment costs.", "TableCell"),
        ],
        [
            P("2,500 - 9,999", "TableCellBold"),
            P("16%", "TableCellRight"),
            P("Core household-service tier.", "TableCell"),
        ],
        [
            P("10,000 - 39,999", "TableCellBold"),
            P("14%", "TableCellRight"),
            P("Rewards larger confirmed bookings.", "TableCell"),
        ],
        [
            P("40,000 - 150,000", "TableCellBold"),
            P("12%", "TableCellRight"),
            P("Maintains competitiveness on major jobs.", "TableCell"),
        ],
    ]
    table = Table(
        data,
        colWidths=[43 * mm, 42 * mm, CONTENT_W - 85 * mm],
        repeatRows=1,
    )
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), EMERALD_DARK),
                ("GRID", (0, 0), (-1, -1), 0.45, HexColor("#CAD8D3")),
                ("BACKGROUND", (0, 2), (-1, 2), PALE),
                ("BACKGROUND", (0, 4), (-1, 4), PALE),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 3 * mm),
                ("RIGHTPADDING", (0, 0), (-1, -1), 3 * mm),
                ("TOPPADDING", (0, 0), (-1, -1), 2.5 * mm),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 2.5 * mm),
            ]
        )
    )
    return table


def payment_steps() -> Table:
    labels = [
        ("1", "Choose a verified provider"),
        ("2", "Confirm scope and total"),
        ("3", "Create booking ID"),
        ("4", "Pay by M-PESA"),
        ("5", "Confirm delivery"),
        ("6", "Settle provider"),
    ]
    step_w = CONTENT_W / len(labels)
    number_cells = []
    text_cells = []
    for number, label in labels:
        number_cells.append(P(number, "StepNo"))
        text_cells.append(P(label, "StepText"))

    table = Table([number_cells, text_cells], colWidths=[step_w] * len(labels))
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), EMERALD),
                ("BOX", (0, 0), (-1, -1), 0.55, HexColor("#B7CFC7")),
                ("INNERGRID", (0, 0), (-1, -1), 0.4, HexColor("#B7CFC7")),
                ("BACKGROUND", (0, 1), (-1, 1), PALE),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("TOPPADDING", (0, 0), (-1, 0), 2.2 * mm),
                ("BOTTOMPADDING", (0, 0), (-1, 0), 2.2 * mm),
                ("LEFTPADDING", (0, 1), (-1, 1), 1.5 * mm),
                ("RIGHTPADDING", (0, 1), (-1, 1), 1.5 * mm),
                ("TOPPADDING", (0, 1), (-1, 1), 2.2 * mm),
                ("BOTTOMPADDING", (0, 1), (-1, 1), 2.2 * mm),
            ]
        )
    )
    return table


def bullet_list(items: list[str], font_size: float = 8.2) -> Table:
    bullet_style = ParagraphStyle(
        name=f"BulletDynamic{font_size}",
        parent=styles["BodyCustom"],
        fontSize=font_size,
        leading=font_size + 3.5,
        leftIndent=0,
        firstLineIndent=0,
        spaceAfter=0,
    )
    rows = []
    for item in items:
        rows.append(
            [
                P("&#8226;", "BodyBold"),
                Paragraph(item, bullet_style),
            ]
        )
    table = Table(rows, colWidths=[5 * mm, CONTENT_W - 5 * mm])
    table.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (0, 0), (-1, -1), 1.5 * mm),
                ("TOPPADDING", (0, 0), (-1, -1), 0.4 * mm),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 0.7 * mm),
                ("TEXTCOLOR", (0, 0), (0, -1), EMERALD),
            ]
        )
    )
    return table


def refund_table() -> Table:
    data = [
        [
            P("EVENT", "TableHead"),
            P("CUSTOMER OUTCOME", "TableHead"),
        ],
        [
            P("Provider cancellation", "TableCellBold"),
            P("Full refund.", "TableCell"),
        ],
        [
            P("Double or erroneous payment", "TableCellBold"),
            P("Full refund after transaction verification.", "TableCell"),
        ],
        [
            P("Service not delivered as agreed", "TableCellBold"),
            P("Full or fair partial refund after review.", "TableCell"),
        ],
        [
            P("Client cancellation more than 48 hours before service", "TableCellBold"),
            P("Full refund.", "TableCell"),
        ],
        [
            P("Client cancellation 24 to 48 hours before service", "TableCellBold"),
            P("50% refund.", "TableCell"),
        ],
        [
            P("Client cancellation less than 24 hours before service", "TableCellBold"),
            P("No refund, except where required by law or approved after review.", "TableCell"),
        ],
    ]
    table = Table(data, colWidths=[91 * mm, CONTENT_W - 91 * mm], repeatRows=1)
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), EMERALD_DARK),
                ("GRID", (0, 0), (-1, -1), 0.45, HexColor("#CAD8D3")),
                ("BACKGROUND", (0, 2), (-1, 2), PALE),
                ("BACKGROUND", (0, 4), (-1, 4), PALE),
                ("BACKGROUND", (0, 6), (-1, 6), PALE),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 3 * mm),
                ("RIGHTPADDING", (0, 0), (-1, -1), 3 * mm),
                ("TOPPADDING", (0, 0), (-1, -1), 2.2 * mm),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 2.2 * mm),
            ]
        )
    )
    return table


def signature_box() -> Table:
    line = "________________________________________________"
    data = [
        [
            P("<b>Authorised signatory / proprietor</b>", "BodyCustom"),
            P("<b>Business stamp or seal</b>", "BodyCustom"),
        ],
        [
            P(f"{line}<br/><font size='7'>Full legal name</font>", "BodyCustom"),
            P("<br/><br/><br/>", "BodyCustom"),
        ],
        [
            P(f"{line}<br/><font size='7'>Capacity / title</font>", "BodyCustom"),
            "",
        ],
        [
            P(f"{line}<br/><font size='7'>Signature</font>", "BodyCustom"),
            "",
        ],
        [
            P(f"{line}<br/><font size='7'>Date (DD / MM / YYYY)</font>", "BodyCustom"),
            "",
        ],
    ]
    table = Table(data, colWidths=[CONTENT_W * 0.56, CONTENT_W * 0.44])
    table.setStyle(
        TableStyle(
            [
                ("BOX", (0, 0), (-1, -1), 0.75, HexColor("#AFC8BF")),
                ("INNERGRID", (0, 0), (-1, -1), 0.45, HexColor("#D4E1DC")),
                ("BACKGROUND", (0, 0), (-1, 0), EMERALD_LIGHT),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 4 * mm),
                ("RIGHTPADDING", (0, 0), (-1, -1), 4 * mm),
                ("TOPPADDING", (0, 0), (-1, -1), 3 * mm),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 3 * mm),
                ("SPAN", (1, 1), (1, 4)),
            ]
        )
    )
    return table


def build_story():
    story = []

    # Page 1: Cover and business snapshot
    brand_row = Table(
        [
            [
                Image(str(LOGO_PATH), width=22 * mm, height=22 * mm),
                P(
                    "<font size='18'><b>PATANAFUU</b></font><br/>"
                    "<font size='8.5'>THE ULTIMATE SERVICE HUB</font>",
                    "CoverSmall",
                ),
            ]
        ],
        colWidths=[27 * mm, CONTENT_W - 27 * mm],
    )
    brand_row.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                ("TOPPADDING", (0, 0), (-1, -1), 0),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
            ]
        )
    )
    story.append(brand_row)
    story.append(CoverSpacer(22 * mm))
    story.append(P("M-PESA PAYBILL ONBOARDING DOCUMENT", "CoverEyebrow"))
    story.append(P("Service Tariff<br/>Guide", "CoverTitle"))
    story.append(
        P(
            "Transparent service pricing, marketplace fees and payment controls "
            "for an online platform connecting customers with verified providers "
            "across Kenya.",
            "CoverSubtitle",
        )
    )
    story.append(Spacer(1, 5 * mm))

    cover_meta = Table(
        [
            [
                P("EFFECTIVE DATE", "CoverSmall"),
                P("CURRENCY", "CoverSmall"),
                P("BUSINESS TYPE", "CoverSmall"),
            ],
            [
                P("<b>27 July 2026</b>", "CoverSubtitle"),
                P("<b>Kenya Shillings (KES)</b>", "CoverSubtitle"),
                P("<b>Online marketplace</b>", "CoverSubtitle"),
            ],
        ],
        colWidths=[CONTENT_W / 3] * 3,
    )
    cover_meta.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), HexColor("#0B5D49")),
                ("BOX", (0, 0), (-1, -1), 0.7, HexColor("#3BAF8E")),
                ("INNERGRID", (0, 0), (-1, -1), 0.45, HexColor("#3BAF8E")),
                ("LEFTPADDING", (0, 0), (-1, -1), 4 * mm),
                ("RIGHTPADDING", (0, 0), (-1, -1), 4 * mm),
                ("TOPPADDING", (0, 0), (-1, -1), 3 * mm),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 2 * mm),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ]
        )
    )
    story.append(cover_meta)
    story.append(Spacer(1, 10 * mm))

    summary_data = [
        [
            P(
                "<b>Document purpose</b><br/>This guide records PATANAFUU's "
                "commercial service tariff bands and explains the lawful customer "
                "payment flow for PayBill collections.",
                "CoverSmall",
            ),
            P(
                "<b>Collection purpose</b><br/>Payments are accepted only for "
                "confirmed bookings identified by a unique booking ID and paid "
                "through an M-PESA prompt.",
                "CoverSmall",
            ),
        ],
        [
            P(
                "<b>Trading name</b><br/>PATANAFUU. The legal applicant name must "
                "match the accompanying registration and PayBill application "
                "documents.",
                "CoverSmall",
            ),
            P(
                "<b>Support contact</b><br/>stilespulsar77@gmail.com",
                "CoverSmall",
            ),
        ],
    ]
    summary = Table(summary_data, colWidths=[CONTENT_W / 2] * 2)
    summary.setStyle(
        TableStyle(
            [
                ("BOX", (0, 0), (-1, -1), 0.65, HexColor("#3BAF8E")),
                ("INNERGRID", (0, 0), (-1, -1), 0.45, HexColor("#3BAF8E")),
                ("BACKGROUND", (0, 0), (-1, -1), HexColor("#075B47")),
                ("LEFTPADDING", (0, 0), (-1, -1), 4 * mm),
                ("RIGHTPADDING", (0, 0), (-1, -1), 4 * mm),
                ("TOPPADDING", (0, 0), (-1, -1), 3.5 * mm),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 3.5 * mm),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ]
        )
    )
    story.append(summary)
    story.append(PageBreak())

    # Page 2: Customer tariffs
    story.extend(
        section_heading(
            "01 / Customer schedule",
            "Service tariff bands",
            "The tariff bands below are PATANAFUU's published customer price "
            "ranges. Each booking receives an exact total before the M-PESA "
            "payment prompt is initiated.",
        )
    )

    cards = Table(
        [
            [
                metric_card("Minimum PayBill booking", "KES 500", CONTENT_W / 3 - 2 * mm),
                metric_card("Maximum PayBill booking", "KES 150,000", CONTENT_W / 3 - 2 * mm),
                metric_card("Payment reference", "Unique booking ID", CONTENT_W / 3 - 2 * mm),
            ]
        ],
        colWidths=[CONTENT_W / 3] * 3,
    )
    cards.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 1 * mm),
                ("RIGHTPADDING", (0, 0), (-1, -1), 1 * mm),
                ("TOPPADDING", (0, 0), (-1, -1), 0),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
            ]
        )
    )
    story.append(cards)
    story.append(Spacer(1, 5 * mm))

    tariff_rows = [
        ["Cleaning", "General home cleaning - labour for a standard visit", "2,000 - 7,000"],
        ["Cleaning", "Deep cleaning - priced by property size and condition", "5,000 - 25,000"],
        ["Cleaning", "Carpet or upholstery cleaning - per room or item", "500 - 6,000"],
        ["Cleaning", "Post-construction or office cleaning", "10,000 - 30,000"],
        ["Electrical", "Inspection, diagnosis or minor repair", "1,000 - 3,500"],
        ["Electrical", "Light, socket or fixture installation", "1,500 - 8,000"],
        ["Electrical", "Circuit or appliance fault repair", "2,500 - 15,000"],
        ["Electrical", "Wiring or re-wiring project", "10,000 - 100,000"],
        ["Plumbing", "Inspection, minor leak or tap repair", "1,000 - 4,000"],
        ["Plumbing", "Sanitary or water fixture installation", "2,000 - 10,000"],
        ["Plumbing", "Drain blockage or pipe repair", "2,500 - 15,000"],
        ["Plumbing", "Major installation or renovation work", "10,000 - 100,000"],
        ["Mechanic", "Vehicle diagnostic inspection", "1,500 - 3,000"],
        ["Mechanic", "Minor service or oil service", "2,500 - 10,000"],
        ["Mechanic", "Brake, steering or suspension work", "3,500 - 25,000"],
        ["Mechanic", "Major engine, gearbox or related repair", "15,000 - 150,000"],
    ]
    story.append(tariff_table(tariff_rows))
    story.append(Spacer(1, 4 * mm))
    story.append(
        callout(
            "<b>Customer price commitment.</b> PATANAFUU does not add a hidden "
            "platform charge after booking confirmation. The customer authorises "
            "the exact displayed total. Any M-PESA customer transaction charge is "
            "set by Safaricom under its prevailing tariff and is not retained by "
            "PATANAFUU."
        )
    )
    story.append(Spacer(1, 4 * mm))
    story.append(P("PRICE BASIS AND QUOTATION RULES", "SectionEyebrow"))
    story.append(
        bullet_list(
            [
                "The displayed booking total includes the agreed provider labour and PATANAFUU's facilitation service.",
                "Materials, spare parts, specialist equipment and travel outside the normal service area are included only when itemised in the confirmed quote.",
                "Where the scope changes, a replacement quote must be accepted before any additional payment is requested.",
                "Payments below KES 500 or above KES 150,000 are not processed through the PATANAFUU PayBill workflow.",
                "Any tax required by law will be identified on the booking record or invoice before payment.",
            ],
            font_size=7.7,
        )
    )
    story.append(PageBreak())

    # Page 3: Revenue model, payment flow and refunds
    story.extend(
        section_heading(
            "02 / Commercial model",
            "Marketplace revenue and controls",
            "PATANAFUU earns a facilitation fee from the provider's service "
            "proceeds. The fee supports provider verification, platform "
            "operations, customer support, payment collection and dispute handling.",
        )
    )
    story.append(provider_fee_table())
    story.append(Spacer(1, 3 * mm))
    story.append(
        callout(
            "<b>Fee rules.</b> A minimum marketplace fee of KES 75 applies. "
            "Specialist-category adjustments may add 2 percentage points for "
            "electrical services and 1.5 percentage points for plumbing or "
            "mechanical services, subject to an overall maximum fee of 22%. "
            "The fee is deducted from provider proceeds and is not added after "
            "the customer confirms the booking total."
        )
    )
    story.append(Spacer(1, 4 * mm))
    story.append(P("PAYMENT AND FULFILMENT FLOW", "SectionEyebrow"))
    story.append(payment_steps())
    story.append(Spacer(1, 4 * mm))
    story.append(P("CUSTOMER PROTECTION AND REFUNDS", "H2Custom"))
    story.append(refund_table())
    story.append(Spacer(1, 3 * mm))
    story.append(
        P(
            "Refund requests are submitted to <b>stilespulsar77@gmail.com</b> "
            "with the booking ID and M-PESA transaction details. PATANAFUU reviews "
            "requests within 3 to 5 business days. Approved refunds are processed "
            "through M-PESA within 7 to 14 business days. The original payment "
            "number is used unless law or network controls require another verified "
            "method.",
            "BodySmall",
        )
    )
    story.append(Spacer(1, 2 * mm))
    story.append(
        P(
            "<b>Transaction controls:</b> customer and provider records are linked "
            "to the booking ID; payment amount must match the booking total; "
            "providers are approved before listing; and settlement records are "
            "retained for reconciliation and support.",
            "BodySmall",
        )
    )
    story.append(PageBreak())

    # Page 4: Declaration and submission notes
    story.extend(
        section_heading(
            "03 / Applicant declaration",
            "Authority, validity and signature",
            "This page should be signed by the proprietor, partners or authorised "
            "company signatory whose details appear in the M-PESA PayBill "
            "application documents.",
        )
    )
    declaration_text = (
        "I confirm that this Service Tariff Guide accurately describes the "
        "commercial activities, customer price bands, revenue model and payment "
        "purpose of PATANAFUU as at the effective date. PayBill collections will "
        "be used only for genuine service bookings conducted through the "
        "PATANAFUU platform. I authorise Safaricom to rely on this guide together "
        "with the applicant's registration, banking, ownership and onboarding "
        "documents, subject to Safaricom's verification and approval processes."
    )
    declaration = Table([[P(declaration_text, "Declaration")]], colWidths=[CONTENT_W])
    declaration.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), PALE),
                ("BOX", (0, 0), (-1, -1), 0.8, HexColor("#B7CFC7")),
                ("LEFTPADDING", (0, 0), (-1, -1), 5 * mm),
                ("RIGHTPADDING", (0, 0), (-1, -1), 5 * mm),
                ("TOPPADDING", (0, 0), (-1, -1), 5 * mm),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5 * mm),
            ]
        )
    )
    story.append(declaration)
    story.append(Spacer(1, 5 * mm))
    story.append(signature_box())
    story.append(Spacer(1, 5 * mm))

    story.append(P("DOCUMENT CONTROL", "H2Custom"))
    control_rows = [
        [
            P("<b>Trading name</b>", "BodySmall"),
            P("PATANAFUU", "BodySmall"),
            P("<b>Document version</b>", "BodySmall"),
            P("1.0", "BodySmall"),
        ],
        [
            P("<b>Effective date</b>", "BodySmall"),
            P("27 July 2026", "BodySmall"),
            P("<b>Review trigger</b>", "BodySmall"),
            P("Pricing, business model or payment-flow change", "BodySmall"),
        ],
        [
            P("<b>Support email</b>", "BodySmall"),
            P("stilespulsar77@gmail.com", "BodySmall"),
            P("<b>Digital channel</b>", "BodySmall"),
            P("PATANAFUU web platform; active URL supplied with application", "BodySmall"),
        ],
    ]
    control = Table(
        control_rows,
        colWidths=[29 * mm, 55 * mm, 32 * mm, CONTENT_W - 116 * mm],
    )
    control.setStyle(
        TableStyle(
            [
                ("GRID", (0, 0), (-1, -1), 0.45, HexColor("#CAD8D3")),
                ("BACKGROUND", (0, 1), (-1, 1), PALE),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 2.5 * mm),
                ("RIGHTPADDING", (0, 0), (-1, -1), 2.5 * mm),
                ("TOPPADDING", (0, 0), (-1, -1), 2.2 * mm),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 2.2 * mm),
            ]
        )
    )
    story.append(control)
    story.append(Spacer(1, 5 * mm))

    story.append(
        callout(
            "<b>Important onboarding note.</b> This document is PATANAFUU's "
            "business service tariff guide and online-business profile. It does "
            "not replace Safaricom's own PayBill Standard Tariff Form, application "
            "form, terms and conditions, administrator form or KYC documents. "
            "Complete and sign every Safaricom form applicable to the applicant. "
            "Safaricom retains final onboarding discretion.",
            background=HexColor("#FFF8E3"),
            border=HexColor("#E8C86B"),
        )
    )
    story.append(Spacer(1, 4 * mm))
    story.append(P("SUBMISSION READINESS", "SectionEyebrow"))
    checklist = [
        "Attach the active PATANAFUU production URL and ensure its service, payment, privacy, terms and refund pages are accessible.",
        "Use the same legal applicant name, KRA PIN, bank account name and ownership details across all application documents.",
        "Have every required proprietor, partner or authorised signatory sign this guide and the official Safaricom tariff selection.",
        "Attach current registration, ownership, bank-settlement and administrator documents required for the applicant's legal form.",
    ]
    story.append(bullet_list(checklist, font_size=7.6))

    return story


def main():
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    doc = TariffDocTemplate(str(OUTPUT_PATH))
    doc.build(build_story())
    print(OUTPUT_PATH)


if __name__ == "__main__":
    main()
