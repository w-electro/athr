# -*- coding: utf-8 -*-
"""صور الشاشة الرأسية: لقطةٌ واحدة لكلّ لوحة، من التصوير الميداني.

   الشاشة 1504×2256، أي 2:3. والأصل 2268×4032 أي 9:16 — أطولُ نسبيًّا،
   فيُقصّ من ارتفاعه لا من عرضه: يُحفظ العرض كاملًا ويُؤخذ من الوسط.
   والمقاس مطابقٌ للشاشة بكسلًا ببكسل.

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

W, H = 1504, 2256          # ٢:٣ — مقاس الشاشة نفسه

# (المجلّد، الملفّ، ميلُ القصّ رأسيًّا)
#
# الميل صفرٌ يعني الاحتفاظ بأعلى الصورة، وواحدٌ بأسفلها، ونصفٌ بوسطها.
# والقصّ من الارتفاع لا مفرّ منه: الأصل 9:16 والشاشة 2:3. والوسط يصلح
# لأكثرها، إلا حيث يقع النقش عاليًا — ومَلِك جبة أظهرها: تاجُه هو ما
# يُعرف به، وقصُّ الوسط كان يقطعه.
PICKS = [
    ('jubbah-p1', 'IMG_E0564.JPG', 0.50),
    ('jubbah-p2', 'IMG_E0584.JPG', 0.22),
    ('jubbah-p3', 'IMG_E0618.JPG', 0.42),
    ('jubbah-p4', 'IMG_E0658.JPG', 0.50),
    ('jubbah-p5', 'IMG_E0636.JPG', 0.38),
    ('jubbah-p6', 'IMG_E0670.JPG', 0.50),
    ('jubbah-p7', 'IMG_E0698.JPG', 0.40),
    ('jubbah-p8', 'IMG_E0723.JPG', 0.50),
    ('jubbah-p9', 'IMG_E0736.JPG', 0.50),
    ('jubbah-p10', 'IMG_E0756.JPG', 0.50),
]


def crop_to_ratio(im, bias=0.5):
    target = W / H
    w, h = im.size
    if abs(w / h - target) <= 0.002:
        return im
    if w / h > target:
        nw = int(h * target)
        return im.crop(((w - nw) // 2, 0, (w - nw) // 2 + nw, h))
    nh = int(w / target)
    top = int((h - nh) * bias)
    return im.crop((0, top, w, top + nh))


if not os.path.isdir(INBOX):
    sys.exit('photos-inbox غير موجود — هذه الصور الخام لا تُتتبَّع في git')

os.makedirs(OUT, exist_ok=True)
for sid, fname, bias in PICKS:
    src = os.path.join(INBOX, sid, fname)
    im = crop_to_ratio(Image.open(src).convert('RGB'), bias).resize((W, H), Image.LANCZOS)
    # بعض النقوش ضحلة ولا تُقرأ من بُعد، فيُرفع التباين قليلًا
    im = ImageEnhance.Contrast(im).enhance(1.18)
    im = ImageEnhance.Color(im).enhance(1.06)
    dst = os.path.join(OUT, sid + '.jpg')
    im.save(dst, quality=84, optimize=True)
    print('%-12s %-16s bias %.2f  %4d KB' % (sid, fname, bias, os.path.getsize(dst) // 1024))
