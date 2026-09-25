from PIL import Image, ImageDraw, ImageFont
from pathlib import Path
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader

# =========================================================
# PATHS
#
# The certificate template and output directory live inside
# the existing certificate-system implementation so that the
# existing download/verify endpoints keep working with the
# files emitted here.
# =========================================================

BASE_DIR = Path(__file__).resolve().parent
ROOT_DIR = BASE_DIR.parent.parent

TEMPLATE = ROOT_DIR / "certificate-system" / "assets" / "certificate-template.png"
OUTPUT_DIR = ROOT_DIR / "certificate-system" / "certificates"

OUTPUT_DIR.mkdir(exist_ok=True)


# =========================================================
# FONT
# =========================================================

_FONT_CANDIDATES = {
    False: [
        "C:/Windows/Fonts/arial.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/System/Library/Fonts/Supplemental/Arial.ttf",
    ],
    True: [
        "C:/Windows/Fonts/arialbd.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
    ],
}


def get_font(size, bold=False):
    for path in _FONT_CANDIDATES[bold]:
        try:
            return ImageFont.truetype(path, size)
        except OSError:
            continue
    return ImageFont.load_default()


# =========================================================
# FIT TEXT INSIDE A GIVEN WIDTH
# =========================================================

def fit_text(draw, text, max_width, start_size, bold=False):
    size = start_size

    while size >= 18:
        font = get_font(size, bold)
        box = draw.textbbox((0, 0), text, font=font)
        text_width = box[2] - box[0]

        if text_width <= max_width:
            return font

        size -= 2

    return get_font(18, bold)


# =========================================================
# CENTER TEXT
# =========================================================

def center_text(draw, text, center_x, y, font, fill):
    box = draw.textbbox((0, 0), text, font=font)
    text_width = box[2] - box[0]
    x = center_x - (text_width / 2)

    draw.text((x, y), text, font=font, fill=fill)


# =========================================================
# GENERATE CERTIFICATE
# =========================================================

def generate_certificate(student):
    image = Image.open(TEMPLATE).convert("RGB")
    draw = ImageDraw.Draw(image)

    WIDTH, HEIGHT = image.size

    name = student["name"]
    course = student["course"]
    score = student["score"]
    completion_date = student["completion_date"]
    certificate_id = student["certificate_id"]

    text_color = (15, 20, 45)

    # 1. STUDENT NAME
    name_font = fit_text(draw, name, max_width=760, start_size=72, bold=True)
    center_text(draw, name, WIDTH / 2, 398, name_font, text_color)

    # 2. COURSE NAME IN MAIN SENTENCE
    course_sentence_font = fit_text(draw, course, max_width=300, start_size=22)
    center_text(draw, course, 838, 543, course_sentence_font, text_color)

    # 3. FINAL SCORE
    score_font = get_font(27)
    center_text(draw, str(score), 345, 688, score_font, text_color)

    # 4. COURSE INFORMATION BOX
    course_box_font = fit_text(draw, course, max_width=260, start_size=22)
    center_text(draw, course, 825, 688, course_box_font, text_color)

    # 5. COMPLETION DATE
    date_font = fit_text(draw, completion_date, max_width=220, start_size=22)
    center_text(draw, completion_date, 1210, 688, date_font, text_color)

    output_png = OUTPUT_DIR / f"{certificate_id}.png"
    image.save(output_png)

    output_pdf = OUTPUT_DIR / f"{certificate_id}.pdf"

    pdf = canvas.Canvas(str(output_pdf), pagesize=(WIDTH, HEIGHT))
    pdf.drawImage(ImageReader(str(output_png)), 0, 0, width=WIDTH, height=HEIGHT)
    pdf.save()

    return output_pdf