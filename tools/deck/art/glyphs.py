# -*- coding: utf-8 -*-
"""رموز العرض التقديمي، بأسلوب النقش الصخري.

   لا مكتبة SVG هنا: cairosvg يحتاج libcairo وهي غائبة عن ويندوز، فنرسم
   بـPIL مباشرة على أربعة أضعاف المقاس ثم نصغّر — وهو ما يعطي الحوافّ
   نعومتها. والأطراف مدوّرة في كل خط، كي تشبه الطرقَ على الصخر لا الخطَّ
   الهندسيّ.

   يشغّل:  python tools/deck/art/glyphs.py
   يكتب:   tools/deck/assets/ic-*.png
"""
from PIL import Image, ImageDraw
import os
import sys

sys.stdout.reconfigure(encoding='utf-8')

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, os.pardir, 'assets')

S = 4                                   # أضعاف المقاس قبل التصغير
SAND = (162, 151, 127, 255)             # sand-dim
TERRA = (201, 122, 74, 255)             # terracotta


class Pen:
    """لوحٌ يرسم خطوطًا مدوّرة الأطراف على أرضيةٍ شفافة."""

    def __init__(self, w, h):
        self.im = Image.new('RGBA', (w * S, h * S), (0, 0, 0, 0))
        self.d = ImageDraw.Draw(self.im)

    def line(self, pts, color, w):
        p = [(x * S, y * S) for x, y in pts]
        r = w * S / 2
        self.d.line(p, fill=color, width=int(w * S), joint='curve')
        for x, y in p:                  # الطرف المدوّر: PIL لا يملك line-cap
            self.d.ellipse([x - r, y - r, x + r, y + r], fill=color)

    def circle(self, cx, cy, rad, color, w, fill=None):
        self.d.ellipse([(cx - rad) * S, (cy - rad) * S, (cx + rad) * S, (cy + rad) * S],
                       outline=color, width=int(w * S), fill=fill)

    def arc(self, cx, cy, rad, a0, a1, color, w):
        self.d.arc([(cx - rad) * S, (cy - rad) * S, (cx + rad) * S, (cy + rad) * S],
                   a0, a1, fill=color, width=int(w * S))

    def rrect(self, x0, y0, x1, y1, rad, color, w):
        self.d.rounded_rectangle([x0 * S, y0 * S, x1 * S, y1 * S],
                                 radius=rad * S, outline=color, width=int(w * S))

    def save(self, name):
        im = self.im.resize((self.im.width // S, self.im.height // S), Image.LANCZOS)
        im = im.crop(im.getbbox())      # القصّ إلى المحتوى: الوضع في الشريحة أدقّ
        im.save(os.path.join(OUT, name))
        print(name, im.size)


def ibex(pen, x, y, s, color, w):
    """وعلٌ مبسّط على هيئة نقوش جبة، داخل مربّعٍ ضلعه s."""
    u = lambda a, b: (x + a * s, y + b * s)
    pen.line([u(.50, .06), u(.66, .00), u(.80, .09), u(.87, .23)], color, w)  # القرن
    pen.line([u(.87, .23), u(.76, .36)], color, w)                            # العنق
    pen.line([u(.76, .36), u(.14, .36), u(.02, .50)], color, w)               # الظهر والذيل
    for lx in (.17, .30, .52, .66):
        pen.line([u(lx, .38), u(lx, .72)], color, w)                          # القوائم


def which_panel():
    """أيّ لوحة هذه؟ — ثلاثة نقوش على جدارٍ واحد، وأحدها مطوّق."""
    p = Pen(220, 200)
    ibex(p, 12, 30, 58, SAND, 8)
    ibex(p, 150, 30, 58, SAND, 8)
    ibex(p, 78, 96, 66, TERRA, 9)
    p.circle(112, 122, 62, TERRA, 8)
    p.save('ic-whichpanel.png')


def languages():
    """وبأيّ لغة؟ — فقاعتا كلام، القصّة نفسها بلسانين."""
    p = Pen(200, 200)
    p.rrect(10, 16, 122, 92, 16, SAND, 9)
    p.line([(40, 92), (32, 118), (62, 92)], SAND, 9)
    for cx in (37, 66, 95):
        p.circle(cx, 54, 5, SAND, 5, fill=SAND)
    p.rrect(80, 112, 192, 184, 16, TERRA, 9)
    p.line([(162, 112), (170, 88), (140, 112)], TERRA, 9)
    for cx in (107, 136, 165):
        p.circle(cx, 148, 5, TERRA, 5, fill=TERRA)
    p.save('ic-languages.png')


def no_network():
    """وبلا شبكة — صاريةٌ وموجاتها، مشطوبةً."""
    p = Pen(200, 200)
    p.line([(70, 194), (100, 96), (130, 194)], SAND, 10)
    p.line([(82, 154), (118, 154)], SAND, 10)
    p.circle(100, 74, 9, SAND, 9)
    p.arc(100, 74, 34, 200, 340, SAND, 9)
    p.arc(100, 74, 58, 205, 335, SAND, 9)
    p.line([(28, 182), (172, 24)], TERRA, 11)
    p.save('ic-nonet.png')


if __name__ == '__main__':
    which_panel()
    languages()
    no_network()
