# -*- coding: utf-8 -*-
"""خلفيّتا قالب هاكاثون AJA AI، مركَّبتان من أصوله نفسها.

   القالب ملفّ Keynote ولا تُكتب الـ‎.key برمجيًّا، فيُعاد بناء مظهره
   بوربوينت. وحتى لا يكون المظهر تقليدًا بالعين، تُستخرج صور القالب من
   داخل حزمته وتُركَّب منها الخلفيّتان:

     bg-dark.jpg   — الغلاف والختام: تدرّج داكن + حقل نجوم + وهج
     bg-light.jpg  — الأقسام والمحتوى: أبيض مائل للأزرق + شريط علويّ

   يشغّل:  python tools/deck/art/aja-backgrounds.py [مسار القالب.key]
   يكتب:   tools/deck/assets/aja/
"""
from PIL import Image, ImageDraw
import glob
import io
import os
import sys
import zipfile

sys.stdout.reconfigure(encoding='utf-8')

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, os.pardir, os.pardir, os.pardir))
OUT = os.path.join(HERE, os.pardir, 'assets', 'aja')

W, H = 2000, 1125          # 16:9 بدقّةٍ تكفي الطباعة والعرض

key = sys.argv[1] if len(sys.argv) > 1 else None
if not key:
    found = glob.glob(os.path.join(REPO, '*.key'))
    if not found:
        sys.exit('لم أجد ملفّ القالب ‎.key في جذر المستودع')
    key = found[0]

os.makedirs(OUT, exist_ok=True)
z = zipfile.ZipFile(key)

# الأصول داخل الحزمة بأسماءٍ عربية مشوّشة، فنعرّفها بالمقاس لا بالاسم
by_size = {}
for n in z.namelist():
    if not n.startswith('Data/'):
        continue
    try:
        im = Image.open(io.BytesIO(z.read(n)))
    except Exception:
        continue
    by_size.setdefault(im.size, []).append((n, im))


def pick(size, why):
    hits = by_size.get(size)
    if not hits:
        sys.exit('لم أجد أصلًا بمقاس %s (%s)' % (size, why))
    return hits[0][1]


gradient = pick((2520, 1705), 'التدرّج الداكن')
stars = pick((941, 1672), 'حقل النجوم')
glow = pick((1229, 1228), 'الوهج الأزرق')
logo_aja = pick((1112, 1092), 'شعار هاكاثون AJA AI')
# شعار «عام الذكاء الاصطناعي 2026»: عريضٌ جدًّا وشفّاف، نسبته نحو 2.7.
#
# ولا يكفي المقاس وحده: في الحزمة مستطيلٌ فارغ بالنسبة نفسها وأكبر
# حجمًا (إطار تحديد)، فاختيار الأعرض يقع عليه. فنقيس كثافة الحبر —
# الشعار يملأ ثلث مساحته، والإطار الفارغ أقلّ من خُمسها.
logo_year = None
best_ink = 0
for size, hits in by_size.items():
    w, h = size
    if not h or not (2.4 < w / h < 3.0):
        continue
    im = hits[0][1].convert('RGBA')
    alpha = im.split()[3]
    ink = sum(alpha.histogram()[40:]) / float(w * h)
    if ink > best_ink:
        best_ink, logo_year = ink, im

logo_aja.convert('RGBA').save(os.path.join(OUT, 'logo-aja.png'))
if logo_year:
    logo_year.convert('RGBA').save(os.path.join(OUT, 'logo-year.png'))
    print('logo-year.png', logo_year.size)
print('logo-aja.png ', logo_aja.size)


def cover(im, w, h):
    r = max(w / im.width, h / im.height)
    im = im.resize((int(im.width * r), int(im.height * r)), Image.LANCZOS)
    x, y = (im.width - w) // 2, (im.height - h) // 2
    return im.crop((x, y, x + w, y + h))


# ── الخلفية الداكنة ──
dark = cover(gradient.convert('RGB'), W, H).convert('RGBA')
st = cover(stars.convert('RGBA').rotate(90, expand=True), W, H)
dark = Image.alpha_composite(dark, st)

g = glow.convert('RGBA')
g = g.resize((int(W * 0.52), int(W * 0.52)), Image.LANCZOS)
# الوهج في الأصل خافتٌ عند الزاوية السفلى اليسرى، لا مصباحًا في الوسط
alpha = g.split()[3].point(lambda a: int(a * 0.38))
g.putalpha(alpha)
layer = Image.new('RGBA', (W, H), (0, 0, 0, 0))
layer.alpha_composite(g, (int(-W * 0.14), int(H * 0.55)))
dark = Image.alpha_composite(dark, layer).convert('RGB')
dark.save(os.path.join(OUT, 'bg-dark.jpg'), quality=88, optimize=True)
print('bg-dark.jpg ', dark.size)

# ── الخلفية الفاتحة: بياضٌ مائل للأزرق وشريطٌ علويّ متدرّج ──
light = Image.new('RGB', (W, H), (0xF9, 0xFA, 0xFC))
bar = Image.new('RGB', (W, 1))
d = bar.load()
for x in range(W):
    t = x / (W - 1)
    # من كحليّ اليمين إلى أزرقَ فاتح اليسار، كشريط القالب
    d[x, 0] = (
        int(0x0B + (0x2E - 0x0B) * (1 - t)),
        int(0x1A + (0x8C - 0x1A) * (1 - t)),
        int(0x3C + (0xC9 - 0x3C) * (1 - t)),
    )
light.paste(bar.resize((W, int(H * 0.016))), (0, 0))
light.save(os.path.join(OUT, 'bg-light.jpg'), quality=90, optimize=True)
print('bg-light.jpg', light.size)
