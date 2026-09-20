# -*- coding: utf-8 -*-
"""غلافٌ من صورةٍ حقيقية لنقوش جبة.

   الصورة وحدها لا تحمل نصًّا: النقوش فاتحة والسماء زرقاء، فأيّ كلمةٍ
   فوقها تضيع. فنُطفئها نحو لون البازلت، ثمّ نزيد الإطفاء كلّما اتّجهنا
   يمينًا حيث يقف الاسم — تدرّجٌ مخبوزٌ في الصورة، لأنّ pptxgenjs لا
   يعرف التدرّجات.

   يشغّل:  python tools/deck/art/cover.py
"""
from PIL import Image
import os, sys
sys.stdout.reconfigure(encoding='utf-8')

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, os.pardir, os.pardir, os.pardir))
OUT = os.path.join(HERE, os.pardir, 'assets')
SRC = os.path.join(REPO, 'public', 'photos', 'jubbah-02.jpg')
DST = os.path.join(OUT, 'cover.jpg')
BASALT = (11, 15, 23)
W, H = 2400, 1350

im = Image.open(SRC).convert('RGB')
# قصٌّ إلى نسبة الشريحة، مع إبقاء النقوش في الثلث الأعلى
target = W / H
w, h = im.size
if w / h > target:
    nw = int(h * target)
    im = im.crop(((w - nw) // 2, 0, (w - nw) // 2 + nw, h))
else:
    nh = int(w / target)
    top = int((h - nh) * 0.35)
    im = im.crop((0, top, w, top + nh))
im = im.resize((W, H), Image.LANCZOS)

ground = Image.new('RGB', (W, H), BASALT)

# قناع الإطفاء: ٤٨٪ يسارًا، و٩٤٪ عند الحافّة اليمنى
mask = Image.new('L', (W, 1))
px = mask.load()
LO, HI = 0.25, 0.62                      # حيث يبدأ النص وحيث يصير الظهر صلبًا
for x in range(W):
    t = x / (W - 1)                      # ٠ يسارًا، ١ يمينًا
    u = min(max((t - LO) / (HI - LO), 0.0), 1.0)
    u = u * u * (3 - 2 * u)              # منحنى ناعم: لا حدَّ ظاهرًا للتدرّج
    px[x, 0] = int(255 * (0.38 + 0.57 * u))
mask = mask.resize((W, H))

im = Image.composite(ground, im, mask)
im.save(DST, quality=88, optimize=True)
print('cover.jpg', im.size, os.path.getsize(DST) // 1024, 'KB')
