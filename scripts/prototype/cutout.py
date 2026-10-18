"""Cut a manuscript sheet out of its cream mount.

    uv run --with pillow python scripts/prototype/cutout.py in.jpg out.webp preview.jpg

Paper reads neutral/blue-grey, the mount reads cream, so "warmth" (R - B)
separates them. Keep the largest connected paper region, close small
holes (ink, stamps), and feather the edge slightly.
"""
import sys
from PIL import Image, ImageChops, ImageDraw, ImageFilter

src, out, preview = sys.argv[1:4]
im = Image.open(src).convert("RGB")
r, g, b = im.split()

# Warmth = R - B (clipped at 0); the mount is warm, paper isn't
warmth = ImageChops.subtract(r, b)
small = warmth.resize((im.width // 4, im.height // 4)).filter(ImageFilter.MedianFilter(7))
paper = small.point(lambda v: 255 if v < 16 else 0)

# Close ink strokes and stamps inside the sheet, then trim specks outside
paper = paper.filter(ImageFilter.MaxFilter(9)).filter(ImageFilter.MinFilter(9))
paper = paper.filter(ImageFilter.MinFilter(5)).filter(ImageFilter.MaxFilter(5))

# Largest connected region only (flood from the sheet's centre-left)
w, h = paper.size
seed = (w // 4, h // 2)
marked = paper.copy()
ImageDraw.floodfill(marked, seed, 128)
mask = marked.point(lambda v: 255 if v == 128 else 0)

mask = mask.resize(im.size, Image.BILINEAR).filter(ImageFilter.GaussianBlur(2))
cut = im.copy()
cut.putalpha(mask)
cut.save(out, "WEBP", quality=85, method=6)

# Preview on a dark background, to check the edge
bg = Image.new("RGB", im.size, (40, 40, 40))
bg.paste(im, mask=mask)
bg.resize((im.width // 4, im.height // 4)).save(preview, quality=80)
print(out, cut.size)
