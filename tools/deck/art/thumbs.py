# -*- coding: utf-8 -*-
"""قصّتان من الصورة نفسها: ما تراه الكاميرا، وما في الفهرس.

   عمدًا من مصدرٍ واحد بقصّين مختلفين — فذلك هو ما يفعله النظام: يطابق
   لوحةً واحدة عبر لقطتين غير متطابقتين.

   يشغّل:  python tools/deck/art/thumbs.py
"""
from PIL import Image, ImageEnhance
import os, sys
sys.stdout.reconfigure(encoding='utf-8')

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, os.pardir, os.pardir, os.pardir))
OUT = os.path.join(HERE, os.pardir, 'assets')
SRC = os.path.join(REPO, 'public', 'photos', 'jubbah-02.jpg')
im = Image.open(SRC).convert('RGB')
W, H = im.size

def crop43(cx, cy, frac, name):
    """قصٌّ بنسبة 4:3 حول نقطةٍ نسبية، بعرضٍ يساوي frac من الصورة."""
    w = int(W * frac)
    h = int(w * 3 / 4)
    x = max(0, min(W - w, int(W * cx - w / 2)))
    y = max(0, min(H - h, int(H * cy - h / 2)))
    t = im.crop((x, y, x + w, y + h)).resize((640, 480), Image.LANCZOS)
    # النقوش باهتة في الأصل، وتصغيرُها يزيدها بهتانًا
    t = ImageEnhance.Contrast(t).enhance(1.45)
    t = ImageEnhance.Brightness(t).enhance(1.12)
    p = os.path.join(OUT, name)
    t.save(p, quality=90)
    print(name, t.size, os.path.getsize(p) // 1024, 'KB')

crop43(0.19, 0.64, 0.30, 'thumb-camera.jpg')   # لقطة الزائر: أقرب
crop43(0.24, 0.60, 0.46, 'thumb-index.jpg')    # مرجع الفهرس: أوسع
