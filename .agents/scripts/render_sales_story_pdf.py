from pathlib import Path

import fitz
from PIL import Image, ImageDraw

pdf_path = Path("artifacts/sample-garage-door-repair/Summit-Garage-Door-Business-Lifecycle-Sales-Story.pdf")
output_dir = Path(".agents/outputs/summit-sales-story")
output_dir.mkdir(parents=True, exist_ok=True)

document = fitz.open(pdf_path)
previews = []
for index, page in enumerate(document):
    pixmap = page.get_pixmap(matrix=fitz.Matrix(0.8, 0.8), alpha=False)
    page_path = output_dir / f"page-{index + 1:02d}.png"
    pixmap.save(page_path)
    image = Image.open(page_path).convert("RGB")
    image.thumbnail((238, 337))
    previews.append(image.copy())

sheet = Image.new("RGB", (1020, 4 * 375), "#d9e0e8")
draw = ImageDraw.Draw(sheet)
for index, image in enumerate(previews):
    x = 12 + (index % 4) * 252
    y = 24 + (index // 4) * 375
    sheet.paste(image, (x, y))
    draw.text((x, y - 17), f"Page {index + 1}", fill="#172033")

sheet.save(output_dir / "contact-sheet.png")
print(f"Rendered {document.page_count} pages to {output_dir}")