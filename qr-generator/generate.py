#!/usr/bin/env python3
"""
Генератор QR-плакатов для магазинов сети Продтовары.

Использование:
    1. Заполни shops.csv
    2. Установи: pip install segno reportlab
    3. Запусти: python generate.py

На выходе: posters/ — папка с готовыми A4 PDF-плакатами для типографии.
"""

import csv
import os
from pathlib import Path

import segno
from reportlab.lib.colors import HexColor
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas

# === Конфиг ===
BASE_URL = os.environ.get("FEEDBACK_URL", "https://prodtovary.by/otzyv")
OUTPUT_DIR = Path("posters")
SHOPS_CSV = Path("shops.csv")
LOGO_PATH = Path("logo.png")  # опционально

BRAND_COLOR = HexColor("#16a34a")  # зелёный Продтовары
DARK_COLOR = HexColor("#0f172a")
LIGHT_COLOR = HexColor("#64748b")

# Регистрация кириллических шрифтов (Inter или DejaVuSans)
try:
    pdfmetrics.registerFont(TTFont("Inter", "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"))
    pdfmetrics.registerFont(TTFont("Inter-Reg", "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"))
    FONT_BOLD = "Inter"
    FONT_REG = "Inter-Reg"
except Exception:
    FONT_BOLD = "Helvetica-Bold"
    FONT_REG = "Helvetica"


def make_qr_png(url: str, output: Path, scale: int = 25):
    """Генерирует QR-код в PNG с высокой плотностью"""
    qr = segno.make(url, error="h")  # error correction H = 30%
    qr.save(str(output), kind="png", scale=scale, dark="#0f172a", light="#ffffff", border=2)


def render_poster(shop_code: str, shop_name: str, address: str, output_pdf: Path):
    """Создаёт A4-плакат с QR-кодом для магазина"""
    url = f"{BASE_URL}?shop={shop_code}"
    qr_temp = OUTPUT_DIR / f"_qr_{shop_code}.png"
    make_qr_png(url, qr_temp)

    c = canvas.Canvas(str(output_pdf), pagesize=A4)
    page_w, page_h = A4

    # === Фон ===
    c.setFillColor(HexColor("#fafafa"))
    c.rect(0, 0, page_w, page_h, fill=1, stroke=0)

    # === Верхняя плашка (бренд) ===
    c.setFillColor(BRAND_COLOR)
    c.rect(0, page_h - 35 * mm, page_w, 35 * mm, fill=1, stroke=0)

    c.setFillColor(HexColor("#ffffff"))
    c.setFont(FONT_BOLD, 32)
    c.drawCentredString(page_w / 2, page_h - 22 * mm, "ПРОДТОВАРЫ")

    c.setFont(FONT_REG, 11)
    c.drawCentredString(page_w / 2, page_h - 30 * mm, "ваше мнение важно для нас")

    # === Заголовок ===
    c.setFillColor(DARK_COLOR)
    c.setFont(FONT_BOLD, 28)
    c.drawCentredString(page_w / 2, page_h - 60 * mm, "Оставьте отзыв")

    c.setFillColor(LIGHT_COLOR)
    c.setFont(FONT_REG, 16)
    c.drawCentredString(page_w / 2, page_h - 70 * mm, "о работе магазина")

    # === QR-код (центр страницы) ===
    qr_size = 90 * mm
    qr_x = (page_w - qr_size) / 2
    qr_y = page_h / 2 - qr_size / 2 - 10 * mm
    c.drawImage(str(qr_temp), qr_x, qr_y, width=qr_size, height=qr_size, mask="auto")

    # Рамка вокруг QR
    c.setStrokeColor(BRAND_COLOR)
    c.setLineWidth(2)
    c.roundRect(qr_x - 6 * mm, qr_y - 6 * mm, qr_size + 12 * mm, qr_size + 12 * mm, 6 * mm, fill=0, stroke=1)

    # === Инструкция ===
    c.setFillColor(DARK_COLOR)
    c.setFont(FONT_BOLD, 18)
    c.drawCentredString(page_w / 2, qr_y - 18 * mm, "1. Наведите камеру телефона")
    c.drawCentredString(page_w / 2, qr_y - 28 * mm, "2. Перейдите по ссылке")
    c.drawCentredString(page_w / 2, qr_y - 38 * mm, "3. Поделитесь впечатлением")

    # === Информация о магазине (низ) ===
    c.setFillColor(BRAND_COLOR)
    c.rect(0, 0, page_w, 30 * mm, fill=1, stroke=0)

    c.setFillColor(HexColor("#ffffff"))
    c.setFont(FONT_BOLD, 14)
    c.drawCentredString(page_w / 2, 22 * mm, shop_name)

    c.setFont(FONT_REG, 11)
    c.drawCentredString(page_w / 2, 14 * mm, address)

    c.setFont(FONT_REG, 8)
    c.setFillColor(HexColor("#dcfce7"))
    c.drawCentredString(page_w / 2, 6 * mm, f"код магазина: {shop_code}")

    c.save()
    qr_temp.unlink()  # удаляем временный QR
    print(f"✅ {output_pdf.name}")


def main():
    if not SHOPS_CSV.exists():
        # Создаём пример
        with SHOPS_CSV.open("w", encoding="utf-8") as f:
            f.write("code,name,address,city\n")
            f.write("minsk-pobediteley-5,Продтовары на Победителей 5,пр. Победителей 5,Минск\n")
            f.write("minsk-yakuba-12,Продтовары на Якуба Коласа 12,ул. Якуба Коласа 12,Минск\n")
        print(f"📝 Создан шаблон {SHOPS_CSV}. Заполни и запусти ещё раз.")
        return

    OUTPUT_DIR.mkdir(exist_ok=True)

    with SHOPS_CSV.open(encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            code = row["code"].strip()
            name = row["name"].strip()
            address = row["address"].strip()
            output = OUTPUT_DIR / f"poster_{code}.pdf"
            render_poster(code, name, address, output)

    print(f"\n🎉 Готово! Плакаты в папке {OUTPUT_DIR}/")
    print("📤 Отправь PDF-файлы в типографию для печати на А4")


if __name__ == "__main__":
    main()
