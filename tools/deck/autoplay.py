# -*- coding: utf-8 -*-
"""خصائص عرض شاشة الجناح.

   يكتب `loop="1"` في presProps.xml — فالضغطةُ بعد آخر شريحة تعود إلى
   الأولى بدل أن تُنهي العرض. pptxgenjs لا يكتبه.

   **والتقدّم بالضغط لا بالوقت** ما لم يُطلب غيره. فإن أردت شاشةً تمشي
   وحدها بلا يد:

       python tools/deck/autoplay.py --auto
       python tools/deck/autoplay.py --auto --qr 15 --panel 8

   وحينها يُكتب advTm على انتقال كلّ شريحة، ويبقى advClick مرفوعًا فتظلّ
   اليد قادرةً على التقديم. ولذلك present لا kiosk — الأخيرة تمنع اللمس.
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

FLAGS = {'--auto'}
args = [a for a in sys.argv[1:] if not a.startswith('--')]
# قيمُ الخيارات ليست ملفّات
for name in ('--qr', '--panel'):
    if name in sys.argv:
        v = sys.argv[sys.argv.index(name) + 1]
        if v in args:
            args.remove(v)

SRC = args[0] if args else os.path.join(REPO, 'athr-screen-ar.pptx')
AUTO = '--auto' in sys.argv


def opt(name, default):
    return float(sys.argv[sys.argv.index(name) + 1]) if name in sys.argv else default


QR_SECONDS = opt('--qr', 12)        # الرمز يمكث أطول: المارّ يحتاج وقتًا ليمسحه
PANEL_SECONDS = opt('--panel', 6)

WORK = os.path.join(HERE, '.pack')

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
    # انتقالٌ سابق يُزال أوّلًا، فلا يجتمع اثنان ويرفضهما باوربوينت
    s = re.sub(r'<p:transition[^>]*>.*?</p:transition>', '', s, flags=re.S)
    s = re.sub(r'<p:transition[^>]*/>', '', s)

    if AUTO:
        ms = int((QR_SECONDS if i == 0 else PANEL_SECONDS) * 1000)
        adv = ' advClick="1" advTm="%d"' % ms
    else:
        adv = ''
    trans = (
        '<p:transition xmlns:p14="http://schemas.microsoft.com/office/powerpoint/2010/main"'
        ' spd="slow" p14:dur="900"%s><p:fade/></p:transition>' % adv
    )
    s = s[:-len('</p:sld>')] + trans + '</p:sld>'
    io.open(p, 'w', encoding='utf-8', newline='').write(s)

# خصائص العرض في presProps.xml لا في presentation.xml
props = os.path.join(WORK, 'ppt', 'presProps.xml')
s = io.open(props, encoding='utf-8').read()
s = re.sub(r'<p:showPr\b.*?</p:showPr>', '', s, flags=re.S)
s = re.sub(r'<p:showPr\b[^>]*/>', '', s)

timing = ' useTimings="1"' if AUTO else ' useTimings="0"'
show = ('<p:showPr loop="1" showNarration="1"%s><p:present/><p:sldAll/></p:showPr>'
        % timing)

# pptxgenjs يكتب العنصر مغلقًا على نفسه: <p:presentationPr .../>
# فالإدراج بعده يعطي جذرين في مستندٍ واحد. فنفتحه ثمّ نضع showPr داخله.
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

if AUTO:
    print('%d شريحة — تقدّمٌ تلقائي: الرمز %gث واللوحات %gث، ثمّ يعود إلى الأولى'
          % (len(slides), QR_SECONDS, PANEL_SECONDS))
else:
    print('%d شريحة — التقدّم بالضغط، والضغطةُ بعد الأخيرة تعود إلى الأولى'
          % len(slides))
