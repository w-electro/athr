# -*- coding: utf-8 -*-
"""انتقال Morph: pptxgenjs لا يكتبه، وPowerPoint يفهمه من وسمٍ واحد."""
import io, os, re, sys, zipfile, shutil
sys.stdout.reconfigure(encoding='utf-8')

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, os.pardir, os.pardir))
SRC = sys.argv[1] if len(sys.argv) > 1 else os.path.join(REPO, 'athr-pitch-ar.pptx')
WORK = os.path.join(HERE, '.pack')

MORPH = (
 '<mc:AlternateContent xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006">'
 '<mc:Choice xmlns:p159="http://schemas.microsoft.com/office/powerpoint/2015/09/main" Requires="p159">'
 '<p:transition xmlns:p14="http://schemas.microsoft.com/office/powerpoint/2010/main"'
 ' spd="slow" p14:dur="900"><p159:morph option="byObject"/></p:transition>'
 '</mc:Choice><mc:Fallback>'
 '<p:transition xmlns:p14="http://schemas.microsoft.com/office/powerpoint/2010/main"'
 ' spd="slow" p14:dur="900"><p:fade/></p:transition>'
 '</mc:Fallback></mc:AlternateContent>'
)

# اسمٌ يبدأ بعلامتَي تعجّب يجعل PowerPoint يزاوج الشكلين يقينًا لا تخمينًا
ANCHOR = {1: '!!wordmark', 8: '!!wordmark'}
CNVPR = re.compile(r'<p:cNvPr id="(\d+)" name="([^"]*)"')

if os.path.isdir(WORK):
    shutil.rmtree(WORK)
with zipfile.ZipFile(SRC) as z:
    z.extractall(WORK)
    names = z.namelist()

for i in range(1, 9):
    p = os.path.join(WORK, 'ppt', 'slides', 'slide%d.xml' % i)
    s = io.open(p, encoding='utf-8').read()
    assert '<p:transition' not in s, 'انتقالٌ موجودٌ سلفًا في %d' % i
    assert s.endswith('</p:sld>'), 'ذيلٌ غير متوقّع في %d' % i
    s = s[:-len('</p:sld>')] + MORPH + '</p:sld>'

    # ثاني cNvPr هو أوّل شكلٍ حقيقي؛ الأوّل مجموعةُ الشجرة
    hits = list(CNVPR.finditer(s))
    assert len(hits) >= 2, 'لا أشكال في %d' % i
    h = hits[1]
    tag = ANCHOR.get(i, '!!title')
    s = s[:h.start(2)] + tag + s[h.end(2):]

    io.open(p, 'w', encoding='utf-8', newline='').write(s)

if os.path.exists(SRC):
    os.remove(SRC)
with zipfile.ZipFile(SRC, 'w', zipfile.ZIP_DEFLATED) as z:
    for n in names:
        z.write(os.path.join(WORK, n.replace('/', os.sep)), n)
print('طُبّق Morph على ٨ شرائح')
