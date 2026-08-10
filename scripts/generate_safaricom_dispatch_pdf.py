from __future__ import annotations

import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
LOCAL_LIBS = ROOT / "tmp" / "pdfs" / "python_lib"
if LOCAL_LIBS.exists():
    sys.path.insert(0, str(LOCAL_LIBS))

from reportlab.lib import colors
from reportlab.lib.colors import HexColor
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    BaseDocTemplate,
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


OUTPUT = ROOT / "output" / "pdf" / "PATANAFUU_Service_Tariff_Guide.pdf"
LOGO = ROOT / "public" / "icon-512x512.png"

PAGE_W, PAGE_H = A4
LEFT = 17 * mm
RIGHT = 17 * mm
TOP = 23 * mm
BOTTOM = 17 * mm
CONTENT_W = PAGE_W - LEFT - RIGHT

GREEN = HexColor("#047857")
DARK_GREEN = HexColor("#064E3B")
MINT = HexColor("#ECFDF5")
PALE_GREEN = HexColor("#F4FBF8")
GOLD = HexColor("#D99A16")
INK = HexColor("#17251F")
GREY = HexColor("#52645D")
LIGHT_GREY = HexColor("#D7E0DC")
WHITE = colors.white


base = getSampleStyleSheet()
styles = {
    "brand": ParagraphStyle(
        "brand",
        fontName="Helvetica-Bold",
        fontSize=16,
        leading=18,
        textColor=DARK_GREEN,
    ),
    "brand_sub": ParagraphStyle(
        "brand_sub",
        fontName="Helvetica",
        fontSize=8,
        leading=10,
        textColor=GREY,
    ),
    "eyebrow": ParagraphStyle(
        "eyebrow",
        fontName="Helvetica-Bold",
        fontSize=9,
        leading=11,
        textColor=GREEN,
        spaceAfter=4,
    ),
    "title": ParagraphStyle(
        "title",
        fontName="Helvetica-Bold",
        fontSize=25,
        leading=29,
        textColor=DARK_GREEN,
        spaceAfter=8,
    ),
    "subtitle": ParagraphStyle(
        "subtitle",
        fontName="Helvetica",
        fontSize=12,
        leading=17,
        textColor=GREY,
        spaceAfter=8,
    ),
    "h1": ParagraphStyle(
        "h1",
        fontName="Helvetica-Bold",
        fontSize=20,
        leading=24,
        textColor=DARK_GREEN,
        spaceAfter=8,
    ),
    "h2": ParagraphStyle(
        "h2",
        fontName="Helvetica-Bold",
        fontSize=13,
        leading=16,
        textColor=DARK_GREEN,
        spaceBefore=3,
        spaceAfter=6,
    ),
    "body": ParagraphStyle(
        "body",
        fontName="Helvetica",
        fontSize=10.2,
        leading=15,
        textColor=INK,
        spaceAfter=6,
    ),
    "body_small": ParagraphStyle(
        "body_small",
        fontName="Helvetica",
        fontSize=8.7,
        leading=12,
        textColor=GREY,
    ),
    "body_bold": ParagraphStyle(
        "body_bold",
        fontName="Helvetica-Bold",
        fontSize=10,
        leading=14,
        textColor=INK,
    ),
    "table_head": ParagraphStyle(
        "table_head",
        fontName="Helvetica-Bold",
        fontSize=9.2,
        leading=11,
        textColor=WHITE,
    ),
    "table_cell": ParagraphStyle(
        "table_cell",
        fontName="Helvetica",
        fontSize=9.4,
        leading=12.6,
        textColor=INK,
    ),
    "table_cell_bold": ParagraphStyle(
        "table_cell_bold",
        fontName="Helvetica-Bold",
        fontSize=9.4,
        leading=12.6,
        textColor=INK,
    ),
    "table_price": ParagraphStyle(
        "table_price",
        fontName="Helvetica-Bold",
        fontSize=9.4,
        leading=12.6,
        textColor=DARK_GREEN,
        alignment=TA_RIGHT,
    ),
    "callout": ParagraphStyle(
        "callout",
        fontName="Helvetica",
        fontSize=10,
        leading=14.5,
        textColor=DARK_GREEN,
    ),
    "center": ParagraphStyle(
        "center",
        fontName="Helvetica-Bold",
        fontSize=9,
        leading=12,
        textColor=INK,
        alignment=TA_CENTER,
    ),
    "signature": ParagraphStyle(
        "signature",
        fontName="Helvetica",
        fontSize=9,
        leading=12,
        textColor=INK,
    ),
}


def p(text: str, style: str = "body") -> Paragraph:
    return Paragraph(text, styles[style])


def draw_header_footer(canvas, doc):
    canvas.saveState()
    canvas.setFillColor(GREEN)
    canvas.rect(0, PAGE_H - 4 * mm, PAGE_W, 4 * mm, fill=1, stroke=0)

    canvas.setFont("Helvetica-Bold", 8.5)
    canvas.setFillColor(DARK_GREEN)
    canvas.drawString(LEFT, PAGE_H - 13 * mm, "PATANAFUU")
    canvas.setFont("Helvetica", 7.5)
    canvas.setFillColor(GREY)
    canvas.drawRightString(
        PAGE_W - RIGHT,
        PAGE_H - 13 * mm,
        "BUSINESS PROFILE AND SERVICE TARIFF GUIDE",
    )
    canvas.setStrokeColor(LIGHT_GREY)
    canvas.setLineWidth(0.6)
    canvas.line(LEFT, PAGE_H - 16 * mm, PAGE_W - RIGHT, PAGE_H - 16 * mm)

    canvas.line(LEFT, 13 * mm, PAGE_W - RIGHT, 13 * mm)
    canvas.setFont("Helvetica", 7.2)
    canvas.setFillColor(GREY)
    canvas.drawString(LEFT, 8 * mm, "Effective 27 July 2026 | Currency: Kenya Shillings (KES)")
    canvas.drawRightString(PAGE_W - RIGHT, 8 * mm, f"Page {doc.page} of 5")
    canvas.restoreState()


class Document(BaseDocTemplate):
    def __init__(self, filename: str):
        super().__init__(
            filename,
            pagesize=A4,
            leftMargin=LEFT,
            rightMargin=RIGHT,
            topMargin=TOP,
            bottomMargin=BOTTOM,
            title="PATANAFUU Business Profile and Service Tariff Guide",
            author="PATANAFUU",
            subject="Prepared for Safaricom M-PESA PayBill application",
        )
        frame = Frame(
            LEFT,
            BOTTOM,
            CONTENT_W,
            PAGE_H - TOP - BOTTOM,
            leftPadding=0,
            rightPadding=0,
            topPadding=0,
            bottomPadding=0,
            id="main",
        )
        self.addPageTemplates(
            [PageTemplate(id="main", frames=[frame], onPage=draw_header_footer)]
        )


def heading(section: str, title: str, subtitle: str | None = None):
    items = [p(section.upper(), "eyebrow"), p(title, "h1")]
    if subtitle:
        items.append(p(subtitle, "body"))
    items.append(Spacer(1, 2 * mm))
    return items


def callout(text: str, gold: bool = False) -> Table:
    bg = HexColor("#FFF8E6") if gold else MINT
    border = HexColor("#E7C76D") if gold else HexColor("#9DD8C1")
    table = Table([[p(text, "callout")]], colWidths=[CONTENT_W])
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), bg),
                ("BOX", (0, 0), (-1, -1), 0.8, border),
                ("LEFTPADDING", (0, 0), (-1, -1), 5 * mm),
                ("RIGHTPADDING", (0, 0), (-1, -1), 5 * mm),
                ("TOPPADDING", (0, 0), (-1, -1), 4 * mm),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4 * mm),
            ]
        )
    )
    return table


def profile_table() -> Table:
    rows = [
        ["Trading name", "PATANAFUU"],
        ["Business activity", "Online marketplace connecting customers with verified service providers"],
        ["Country and coverage", "Kenya - county-based service search covering all 47 counties"],
        ["Customer groups", "Households and businesses seeking local services"],
        ["Service providers", "Approved cleaners, electricians, plumbers and motor vehicle mechanics"],
        ["Payment method", "M-PESA payment prompt linked to a confirmed service booking"],
        ["Payment reference", "Unique PATANAFUU booking ID"],
        ["PayBill collection range", "KES 500 to KES 150,000 per booking"],
        ["Customer support", "stilespulsar77@gmail.com"],
        ["Online channel", "PATANAFUU website and progressive web application; active URL supplied with the application"],
    ]
    data = [[p("BUSINESS DETAIL", "table_head"), p("PATANAFUU INFORMATION", "table_head")]]
    data.extend([[p(a, "table_cell_bold"), p(b, "table_cell")] for a, b in rows])
    table = Table(data, colWidths=[48 * mm, CONTENT_W - 48 * mm])
    style = [
        ("BACKGROUND", (0, 0), (-1, 0), DARK_GREEN),
        ("GRID", (0, 0), (-1, -1), 0.45, LIGHT_GREY),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 3.2 * mm),
        ("RIGHTPADDING", (0, 0), (-1, -1), 3.2 * mm),
        ("TOPPADDING", (0, 0), (-1, -1), 2.6 * mm),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 2.6 * mm),
    ]
    for index in range(2, len(data), 2):
        style.append(("BACKGROUND", (0, index), (-1, index), PALE_GREEN))
    table.setStyle(TableStyle(style))
    return table


def service_cards() -> Table:
    items = [
        ("CLEANING", "General, deep, upholstery, carpet, office and post-construction cleaning."),
        ("ELECTRICAL", "Inspection, fault repair, fixtures, sockets, wiring and re-wiring."),
        ("PLUMBING", "Leak repair, fittings, sanitary installations, drains and pipe work."),
        ("MECHANICAL", "Vehicle diagnostics, servicing, brakes, suspension, engine and gearbox work."),
    ]
    cards = []
    for title, description in items:
        cards.append(
            [
                p(title, "eyebrow"),
                p(description, "body_small"),
            ]
        )
    table = Table(cards, colWidths=[34 * mm, CONTENT_W - 34 * mm])
    table.setStyle(
        TableStyle(
            [
                ("GRID", (0, 0), (-1, -1), 0.45, LIGHT_GREY),
                ("BACKGROUND", (0, 1), (-1, 1), PALE_GREEN),
                ("BACKGROUND", (0, 3), (-1, 3), PALE_GREEN),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 3 * mm),
                ("RIGHTPADDING", (0, 0), (-1, -1), 3 * mm),
                ("TOPPADDING", (0, 0), (-1, -1), 2.5 * mm),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 2.5 * mm),
            ]
        )
    )
    return table


def bullet_table(items: list[str]) -> Table:
    data = [[p("•", "body_bold"), p(item, "body")] for item in items]
    table = Table(data, colWidths=[5 * mm, CONTENT_W - 5 * mm])
    table.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (0, 0), (-1, -1), 1 * mm),
                ("TOPPADDING", (0, 0), (-1, -1), 0),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
                ("TEXTCOLOR", (0, 0), (0, -1), GREEN),
            ]
        )
    )
    return table


def tariff_table(category: str, rows: list[tuple[str, str, str]]) -> Table:
    data = [
        [
            p("SERVICE", "table_head"),
            p("PUBLISHED CUSTOMER TARIFF", "table_head"),
            p("PRICE BASIS", "table_head"),
        ]
    ]
    data.extend(
        [
            p(service, "table_cell_bold"),
            p(price, "table_price"),
            p(basis, "table_cell"),
        ]
        for service, price, basis in rows
    )
    table = Table(
        data,
        colWidths=[62 * mm, 46 * mm, CONTENT_W - 108 * mm],
        repeatRows=1,
    )
    style = [
        ("BACKGROUND", (0, 0), (-1, 0), DARK_GREEN),
        ("GRID", (0, 0), (-1, -1), 0.45, LIGHT_GREY),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 3.2 * mm),
        ("RIGHTPADDING", (0, 0), (-1, -1), 3.2 * mm),
        ("TOPPADDING", (0, 0), (-1, -1), 3 * mm),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3 * mm),
    ]
    for index in range(2, len(data), 2):
        style.append(("BACKGROUND", (0, index), (-1, index), PALE_GREEN))
    table.setStyle(TableStyle(style))
    return KeepTogether([p(category.upper(), "h2"), table])


def commission_table() -> Table:
    rows = [
        ("KES 500 - 2,499", "18%"),
        ("KES 2,500 - 9,999", "16%"),
        ("KES 10,000 - 39,999", "14%"),
        ("KES 40,000 - 150,000", "12%"),
    ]
    data = [
        [
            p("CONFIRMED BOOKING VALUE", "table_head"),
            p("BASE PROVIDER MARKETPLACE FEE", "table_head"),
        ]
    ]
    data.extend([[p(a, "table_cell_bold"), p(b, "table_price")] for a, b in rows])
    table = Table(data, colWidths=[CONTENT_W * 0.6, CONTENT_W * 0.4])
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), DARK_GREEN),
                ("GRID", (0, 0), (-1, -1), 0.45, LIGHT_GREY),
                ("BACKGROUND", (0, 2), (-1, 2), PALE_GREEN),
                ("BACKGROUND", (0, 4), (-1, 4), PALE_GREEN),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 3.2 * mm),
                ("RIGHTPADDING", (0, 0), (-1, -1), 3.2 * mm),
                ("TOPPADDING", (0, 0), (-1, -1), 2.1 * mm),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 2.1 * mm),
            ]
        )
    )
    return table


def payment_flow_table() -> Table:
    steps = [
        ("1", "Customer selects an approved provider."),
        ("2", "Service scope, date and exact price are confirmed."),
        ("3", "PATANAFUU creates a unique booking ID."),
        ("4", "Customer receives and authorises the M-PESA payment prompt."),
        ("5", "Payment is recorded against the booking."),
        ("6", "Customer and provider confirm service delivery."),
    ]
    data = [[p(no, "center"), p(text, "table_cell")] for no, text in steps]
    table = Table(data, colWidths=[13 * mm, CONTENT_W - 13 * mm])
    table.setStyle(
        TableStyle(
            [
                ("GRID", (0, 0), (-1, -1), 0.45, LIGHT_GREY),
                ("BACKGROUND", (0, 0), (0, -1), GREEN),
                ("TEXTCOLOR", (0, 0), (0, -1), WHITE),
                ("BACKGROUND", (1, 1), (1, 1), PALE_GREEN),
                ("BACKGROUND", (1, 3), (1, 3), PALE_GREEN),
                ("BACKGROUND", (1, 5), (1, 5), PALE_GREEN),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("LEFTPADDING", (0, 0), (-1, -1), 3 * mm),
                ("RIGHTPADDING", (0, 0), (-1, -1), 3 * mm),
                ("TOPPADDING", (0, 0), (-1, -1), 1.6 * mm),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 1.6 * mm),
            ]
        )
    )
    return table


def refund_table() -> Table:
    rows = [
        ("Provider cancels", "Full refund"),
        ("Double or erroneous payment", "Full refund after transaction verification"),
        ("Service not delivered as agreed", "Full or fair partial refund after review"),
        ("Customer cancels more than 48 hours before service", "Full refund"),
        ("Customer cancels 24 to 48 hours before service", "50% refund"),
        ("Customer cancels less than 24 hours before service", "No refund, except where required by law"),
    ]
    data = [[p("EVENT", "table_head"), p("REFUND POSITION", "table_head")]]
    data.extend([[p(a, "table_cell_bold"), p(b, "table_cell")] for a, b in rows])
    table = Table(data, colWidths=[CONTENT_W * 0.58, CONTENT_W * 0.42])
    style = [
        ("BACKGROUND", (0, 0), (-1, 0), DARK_GREEN),
        ("GRID", (0, 0), (-1, -1), 0.45, LIGHT_GREY),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 3 * mm),
        ("RIGHTPADDING", (0, 0), (-1, -1), 3 * mm),
        ("TOPPADDING", (0, 0), (-1, -1), 1.6 * mm),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 1.6 * mm),
    ]
    for index in range(2, len(data), 2):
        style.append(("BACKGROUND", (0, index), (-1, index), PALE_GREEN))
    table.setStyle(TableStyle(style))
    return table


def signature_table() -> Table:
    line = "____________________________________________"
    data = [
        [
            p("<b>AUTHORISED APPLICANT / SIGNATORY</b>", "signature"),
            p("<b>BUSINESS STAMP OR SEAL</b>", "signature"),
        ],
        [p(f"{line}<br/><font size='8'>Full legal name</font>", "signature"), ""],
        [p(f"{line}<br/><font size='8'>Position or capacity</font>", "signature"), ""],
        [p(f"{line}<br/><font size='8'>Signature</font>", "signature"), ""],
        [p(f"{line}<br/><font size='8'>Date</font>", "signature"), ""],
    ]
    table = Table(data, colWidths=[CONTENT_W * 0.58, CONTENT_W * 0.42])
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), MINT),
                ("BOX", (0, 0), (-1, -1), 0.75, HexColor("#A8C7BB")),
                ("INNERGRID", (0, 0), (-1, -1), 0.45, LIGHT_GREY),
                ("SPAN", (1, 1), (1, 4)),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 4 * mm),
                ("RIGHTPADDING", (0, 0), (-1, -1), 4 * mm),
                ("TOPPADDING", (0, 0), (-1, -1), 3.5 * mm),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 3.5 * mm),
            ]
        )
    )
    return table


def build_story():
    story = []

    # Page 1
    brand = Table(
        [
            [
                Image(str(LOGO), width=19 * mm, height=19 * mm),
                p(
                    "PATANAFUU<br/><font size='8' color='#52645D'>THE ULTIMATE SERVICE HUB</font>",
                    "brand",
                ),
            ]
        ],
        colWidths=[24 * mm, CONTENT_W - 24 * mm],
    )
    brand.setStyle(
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
    story.append(brand)
    story.append(Spacer(1, 8 * mm))
    story.append(p("PREPARED FOR SAFARICOM M-PESA PAYBILL APPLICATION", "eyebrow"))
    story.append(p("Business Profile and<br/>Service Tariff Guide", "title"))
    story.append(
        p(
            "A clear statement of PATANAFUU's business activity, customer service prices, "
            "payment purpose, provider fees and refund terms.",
            "subtitle",
        )
    )
    story.append(Spacer(1, 2 * mm))
    story.append(profile_table())
    story.append(Spacer(1, 5 * mm))
    story.append(p("WHAT PATANAFUU DOES", "h2"))
    story.append(
        p(
            "PATANAFUU is a Kenyan online service marketplace. Customers search for "
            "approved providers by county, view a provider profile, request a booking, "
            "agree the service price and pay through M-PESA. PATANAFUU records the "
            "booking, payment status, service confirmation and provider rating.",
            "body",
        )
    )
    story.append(service_cards())
    story.append(PageBreak())

    # Page 2
    story.extend(
        heading(
            "01 / Customer tariffs",
            "Cleaning and electrical services",
            "The exact price is shown and accepted before payment. The ranges allow for "
            "differences in property size, job scope, location, materials and complexity.",
        )
    )
    cleaning = [
        ("Carpet or upholstery cleaning", "KES 500 - 6,000", "Per room, seat or item"),
        ("General home cleaning", "KES 2,000 - 7,000", "Per standard visit"),
        ("Deep cleaning", "KES 5,000 - 25,000", "By property size and condition"),
        ("Office or post-construction cleaning", "KES 10,000 - 30,000", "By area and workload"),
    ]
    electrical = [
        ("Inspection or minor repair", "KES 1,000 - 3,500", "Per visit or minor job"),
        ("Light, socket or fixture installation", "KES 1,500 - 8,000", "By number of fittings"),
        ("Circuit or appliance fault repair", "KES 2,500 - 15,000", "By diagnosis and repair scope"),
        ("Wiring or re-wiring project", "KES 10,000 - 100,000", "By approved project quote"),
    ]
    story.append(tariff_table("Cleaning services", cleaning))
    story.append(Spacer(1, 7 * mm))
    story.append(tariff_table("Electrical services", electrical))
    story.append(Spacer(1, 7 * mm))
    story.append(
        callout(
            "<b>Important price rule:</b> Labour and PATANAFUU facilitation are included "
            "in the confirmed booking total. Materials, spare parts, specialist equipment "
            "or extra travel are charged only when clearly included in the accepted quote."
        )
    )
    story.append(Spacer(1, 5 * mm))
    story.append(p("CUSTOMER CHECKOUT RULES", "h2"))
    story.append(
        bullet_table(
            [
                "No hidden PATANAFUU fee is added after the customer accepts the booking total.",
                "A changed service scope requires a revised quote and customer approval before any additional payment.",
                "Any M-PESA customer transaction charge is determined by Safaricom and is not retained by PATANAFUU.",
                "Transactions below KES 500 or above KES 150,000 are not accepted through this PayBill booking workflow.",
            ]
        )
    )
    story.append(PageBreak())

    # Page 3
    story.extend(
        heading(
            "02 / Customer tariffs",
            "Plumbing and mechanical services",
            "All prices are quoted in Kenya Shillings. The customer receives a booking "
            "record showing the provider, service date, agreed amount and booking ID.",
        )
    )
    plumbing = [
        ("Inspection, minor leak or tap repair", "KES 1,000 - 4,000", "Per visit or minor job"),
        ("Sanitary or water fixture installation", "KES 2,000 - 10,000", "By number and type of fittings"),
        ("Drain blockage or pipe repair", "KES 2,500 - 15,000", "By access and repair scope"),
        ("Major installation or renovation", "KES 10,000 - 100,000", "By approved project quote"),
    ]
    mechanical = [
        ("Vehicle diagnostic inspection", "KES 1,500 - 3,000", "Per diagnostic visit"),
        ("Minor service or oil service", "KES 2,500 - 10,000", "By vehicle and service package"),
        ("Brake, steering or suspension work", "KES 3,500 - 25,000", "By parts and repair scope"),
        ("Major engine or gearbox repair", "KES 15,000 - 150,000", "By approved repair quote"),
    ]
    story.append(tariff_table("Plumbing services", plumbing))
    story.append(Spacer(1, 7 * mm))
    story.append(tariff_table("Motor vehicle mechanical services", mechanical))
    story.append(Spacer(1, 7 * mm))
    story.append(p("PROVIDER AND CUSTOMER SAFEGUARDS", "h2"))
    story.append(
        bullet_table(
            [
                "Only providers with an approved PATANAFUU profile appear in service search results.",
                "Provider onboarding records include identity details, Police Clearance Certificate details and professional qualifications where required.",
                "Electrical providers are required to provide an electrical-worker licence reference.",
                "Customers provide their name, phone number, county, preferred date and service notes for each booking.",
                "Payment is matched to the exact booking amount and stored with the M-PESA transaction reference.",
                "A rating becomes available only after the completed service qualifies under the booking controls.",
            ]
        )
    )
    story.append(Spacer(1, 5 * mm))
    story.append(
        callout(
            "<b>Coverage:</b> PATANAFUU supports customer searches across all 47 Kenyan "
            "counties. Actual booking availability depends on whether an approved provider "
            "is available in the selected county."
        )
    )
    story.append(PageBreak())

    # Page 4
    story.extend(
        heading(
            "03 / Revenue and payment controls",
            "How PATANAFUU earns and collects",
            "The customer pays the exact confirmed service amount. PATANAFUU earns a "
            "marketplace fee that is deducted from the provider's service proceeds.",
        )
    )
    story.append(commission_table())
    story.append(Spacer(1, 4 * mm))
    story.append(
        callout(
            "<b>Provider fee rules:</b> A minimum marketplace fee of KES 75 applies. "
            "Electrical services may add 2 percentage points. Plumbing and mechanical "
            "services may add 1.5 percentage points. The total marketplace fee will not "
            "exceed 22% of the booking value."
        )
    )
    story.append(Spacer(1, 5 * mm))
    story.append(p("PAYMENT FLOW", "h2"))
    story.append(payment_flow_table())
    story.append(Spacer(1, 5 * mm))
    story.append(p("REFUND AND CANCELLATION TARIFF", "h2"))
    story.append(refund_table())
    story.append(Spacer(1, 4 * mm))
    story.append(
        p(
            "Refund requests are sent to <b>stilespulsar77@gmail.com</b> with the "
            "booking ID and M-PESA transaction details. Requests are reviewed within "
            "3 to 5 business days. Approved refunds are processed through M-PESA within "
            "7 to 14 business days.",
            "body_small",
        )
    )
    story.append(PageBreak())

    # Page 5
    story.append(Spacer(1, 15 * mm))
    story.extend(
        heading(
            "04 / Applicant declaration",
            "PayBill purpose and authorisation",
            "This page should be signed by the proprietor, partners or authorised company "
            "signatory named in the Safaricom application documents.",
        )
    )
    story.append(p("PURPOSE OF THE PAYBILL", "h2"))
    story.append(
        callout(
            "The requested M-PESA PayBill will be used for customer-to-business collection "
            "of payments for genuine PATANAFUU service bookings. Every payment will be "
            "linked to a booking ID and a customer-approved amount. The PayBill will not "
            "be used for donations, fundraising, investments, loans, betting, money "
            "remittance or unrelated third-party collections.",
            gold=True,
        )
    )
    story.append(Spacer(1, 6 * mm))
    story.append(p("DECLARATION", "h2"))
    story.append(
        p(
            "I confirm that the information and tariffs in this document are accurate "
            "for PATANAFUU as at 27 July 2026. I confirm that the registered applicant "
            "name, registration details, KRA PIN, bank settlement account, ownership "
            "information and authorised contacts supplied in the official Safaricom "
            "forms are complete and correct. I authorise Safaricom to review this guide "
            "together with the online platform and supporting application documents.",
            "body",
        )
    )
    story.append(Spacer(1, 5 * mm))
    story.append(signature_table())
    story.append(Spacer(1, 6 * mm))
    story.append(
        callout(
            "<b>Dispatch edition 2.0.</b> Sign and stamp this page. Send it together "
            "with the active PATANAFUU website link and the official Safaricom PayBill "
            "application, terms, tariff selection, administrator and KYC documents "
            "required for the applicant's legal structure.",
            gold=True,
        )
    )

    return story


def main():
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    doc = Document(str(OUTPUT))
    doc.build(build_story())
    print(OUTPUT)


if __name__ == "__main__":
    main()
