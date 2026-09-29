# -*- coding: utf-8 -*-
"""تشغيلٌ ذاتيّ متكرّر لشاشة الجناح.

   pptxgenjs لا يكتب توقيت التقدّم ولا التكرار، فيُضافان إلى XML بعد
   التوليد:

     · advTm على انتقال كلّ شريحة — كم تمكث قبل التالية (بالمللي ثانية)
     · loop="1" في presProps.xml — فتعود إلى الأولى بعد الأخيرة

   وadvClick يبقى مرفوعًا: الشاشة تمشي وحدها، ومن أراد التقديم بيده
   فله ذلك. وهذا ما يفرّق present عن kiosk — الأخير يمنع اللمس أصلًا.

     python tools/deck/autoplay.py [ملفّ.pptx] [--qr ثوانٍ] [--panel ثوانٍ]
"""
import io
import os
import re
import shutil
import sys
import zipfile

sys.stdout.reconfigure(encoding='utf-8')

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, os.pardir, os.pardir))

args = [a for a in sys.argv[1:] if not a.startswith('--')]
SRC = args[0] if args else os.path.join(REPO, 'athr-screen-ar.pptx')


def opt(name, default):
    if name in sys.argv:
        return float(sys.argv[sys.argv.index(name) + 1])
    return default


QR_SECONDS = opt('--qr', 12)        # الرمز يمكث أطول: المارّ يحتاج وقتًا ليمسحه
PANEL_SECONDS = opt('--panel', 6)

WORK = os.path.join(HERE, '.pack')

TRANSITION = (
    '<p:transition xmlns:p14="http://schemas.microsoft.com/office/powerpoint/2010/main"'
    ' spd="slow" p14:dur="900" advClick="1" advTm="{ms}"><p:fade/></p:transition>'
)

if os.path.isdir(WORK):
    shutil.rmtree(WORK)
with zipfile.ZipFile(SRC) as z:
    z.extractall(WORK)
    names = z.namelist()

slides = sorted(
    (n for n in names if re.fullmatch(r'ppt/slides/slide\d+\.xml', n)),
    key=lambda n: int(re.search(r'(\d+)', os.path.basename(n)).group(1)),
)
assert slides, 'لا شرائح في الملفّ'

for i, rel in enumerate(slides):
    p = os.path.join(WORK, rel.replace('/', os.sep))
    s = io.open(p, encoding='utf-8').read()
    assert s.endswith('</p:sld>'), 'ذيلٌ غير متوقّع في ' + rel
    # انتقالٌ سابق يُستبدل، فلا يجتمع اثنان ويرفضهما باوربوينت
    s = re.sub(r'<p:transition[^>]*>.*?</p:transition>', '', s, flags=re.S)
    s = re.sub(r'<p:transition[^>]*/>', '', s)
    ms = int((QR_SECONDS if i == 0 else PANEL_SECONDS) * 1000)
    s = s[:-len('</p:sld>')] + TRANSITION.format(ms=ms) + '</p:sld>'
    io.open(p, 'w', encoding='utf-8', newline='').write(s)

# التكرار في presProps.xml لا في presentation.xml: هناك موضع خصائص العرض
props = os.path.join(WORK, 'ppt', 'presProps.xml')
s = io.open(props, encoding='utf-8').read()
assert '<p:showPr' not in s, 'خصائص عرضٍ موجودةٌ سلفًا'
show = '<p:showPr loop="1" showNarration="1" useTimings="1"><p:present/><p:sldAll/></p:showPr>'

# pptxgenjs يكتب العنصر مغلقًا على نفسه: <p:presentationPr .../>
# فالإدراج بعده يعطي جذرين في مستندٍ واحد — وهو ما رفضه المدقّق.
# فنفتحه أوّلًا ثمّ نضع showPr داخله.
if re.search(r'<p:presentationPr\b[^>]*/>', s):
    s = re.sub(r'(<p:presentationPr\b[^>]*?)\s*/>',
               r'\1>' + show + '</p:presentationPr>', s, count=1)
else:
    s = re.sub(r'(<p:presentationPr\b[^>]*>)', r'\1' + show, s, count=1)
assert '<p:showPr' in s and s.rstrip().endswith('</p:presentationPr>'), \
    'تعذّر إدراج خصائص العرض'

io.open(props, 'w', encoding='utf-8', newline='').write(s)

if os.path.exists(SRC):
    os.remove(SRC)
with zipfile.ZipFile(SRC, 'w', zipfile.ZIP_DEFLATED) as z:
    for n in names:
        z.write(os.path.join(WORK, n.replace('/', os.sep)), n)
shutil.rmtree(WORK)

print('تشغيلٌ ذاتيّ: %d شريحة — الرمز %gث، واللوحات %gث، ثمّ يعود إلى الأولى'
      % (len(slides), QR_SECONDS, PANEL_SECONDS))
