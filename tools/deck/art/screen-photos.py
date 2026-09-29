# -*- coding: utf-8 -*-
"""صور الشاشة الرأسية: لقطةٌ واحدة لكلّ لوحة، من التصوير الميداني.

   الأصل 2268×4032 — نسبةُ ٩:١٦ بعينها، وهي نسبة الشاشة الرأسية، فلا قصّ.
   والتصغير إلى 1200 عرضًا يكفي شاشةً بعرض 1080.

   اختيار اللقطة لم يكن بالعين وحدها: لكلّ لوحةٍ حُسب مركزُ متجهاتها في
   `public/reference-index.json`، وأُخذت أقربُ صورةٍ إليه — أي أكثرُها
   تمثيلًا للّوحة بحساب النموذج نفسه. ثمّ رُوجعت العشر بالعين، فاستُبدلت
   ثلاث: p2 لأنّ المَلِك لم يكن بارزًا، وp5 وp8 لبهتانهما.

   يشغّل:  python tools/deck/art/screen-photos.py
   يقرأ:   photos-inbox/jubbah-p*/   (غير متتبَّعة في git — التصوير الخام)
   يكتب:   tools/deck/assets/screen/jubbah-p*.jpg
"""
from PIL import Image, ImageEnhance
import os
import sys

sys.stdout.reconfigure(encoding='utf-8')

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, os.pardir, os.pardir, os.pardir))
INBOX = os.path.join(REPO, 'photos-inbox')
OUT = os.path.join(HERE, os.pardir, 'assets', 'screen')

W, H = 1200, 2133          # ٩:١٦

PICKS = [
    ('jubbah-p1', 'IMG_E0564.JPG'),
    ('jubbah-p2', 'IMG_E0584.JPG'),
    ('jubbah-p3', 'IMG_E0618.JPG'),
    ('jubbah-p4', 'IMG_E0658.JPG'),
    ('jubbah-p5', 'IMG_E0636.JPG'),
    ('jubbah-p6', 'IMG_E0670.JPG'),
    ('jubbah-p7', 'IMG_E0698.JPG'),
    ('jubbah-p8', 'IMG_E0723.JPG'),
    ('jubbah-p9', 'IMG_E0736.JPG'),
    ('jubbah-p10', 'IMG_E0756.JPG'),
]


def crop_9_16(im):
    target = W / H
    w, h = im.size
    if abs(w / h - target) <= 0.002:
        return im
    if w / h > target:
        nw = int(h * target)
        return im.crop(((w - nw) // 2, 0, (w - nw) // 2 + nw, h))
    nh = int(w / target)
    top = int((h - nh) * 0.5)
    return im.crop((0, top, w, top + nh))


def scrim(im):
    """ظلٌّ متدرّج في الثلث الأسفل، مخبوزٌ في الصورة.

       pptxgenjs لا يعرف التدرّجات، ومستطيلٌ نصف شفّاف يُظهر حدًّا أفقيًّا
       فوق النصّ. والخبز هنا يجعل الاسم يُقرأ فوق صخرٍ فاتح أو داكن سواء.
    """
    grad = Image.new('L', (1, H))
    px = grad.load()
    for y in range(H):
        t = max(0.0, (y - H * 0.58) / (H * 0.42))
        px[0, y] = int(225 * (t ** 1.5))
    return Image.composite(Image.new('RGB', (W, H), (11, 15, 23)), im, grad.resize((W, H)))


if not os.path.isdir(INBOX):
    sys.exit('photos-inbox غير موجود — هذه الصور الخام لا تُتتبَّع في git')

os.makedirs(OUT, exist_ok=True)
for sid, fname in PICKS:
    src = os.path.join(INBOX, sid, fname)
    im = crop_9_16(Image.open(src).convert('RGB')).resize((W, H), Image.LANCZOS)
    # بعض النقوش ضحلة ولا تُقرأ من بُعد، فيُرفع التباين قليلًا
    im = ImageEnhance.Contrast(im).enhance(1.18)
    im = ImageEnhance.Color(im).enhance(1.06)
    im = scrim(im)
    dst = os.path.join(OUT, sid + '.jpg')
    im.save(dst, quality=84, optimize=True)
    print('%-12s %-16s %4d KB' % (sid, fname, os.path.getsize(dst) // 1024))
