# -*- coding: utf-8 -*-
"""يبني athr-intro-ar.pdf — ورقة الشرح السريع.

   النبذة كانت ملفّ txt فخرجت مبعثرة: محرّرات النصّ الصِّرف لا تضبط
   اتجاه سطرٍ تجتمع فيه عربيةٌ وأرقامٌ ولاتينية، فيتقدّم ما حقّه التأخير
   مهما كان الملفّ صحيحًا. والـPDF يثبّت الاتجاه والتشكيل معًا.

   والمسار: pptxgenjs يرسم الصفحتين بمقاس A4، ثمّ ليبر أوفيس يصدّرهما
   PDF — وهو المسار نفسه المجرَّب في بقية عروض المشروع، ويُخرج العربية
   صحيحةً موصولة.

       python tools/deck/build-intro.py
"""
import os
import shutil
import subprocess
import sys
import tempfile

sys.stdout.reconfigure(encoding='utf-8')

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, os.pardir, os.pardir))
OUT = os.path.join(REPO, 'athr-intro-ar.pdf')

SOFFICE_CANDIDATES = [
    r'C:\Program Files\LibreOffice\program\soffice.com',
    r'C:\Program Files (x86)\LibreOffice\program\soffice.com',
    'soffice',
]


def soffice():
    for c in SOFFICE_CANDIDATES:
        if os.path.exists(c) or shutil.which(c):
            return c
    sys.exit('لم أجد ليبر أوفيس — وهو ما يصدّر الـPDF')


tmp = tempfile.mkdtemp(prefix='athr-intro-')
try:
    pptx = os.path.join(tmp, 'intro.pptx')
    subprocess.run(['node', os.path.join(HERE, 'intro.cjs'), pptx],
                   check=True, cwd=REPO)
    subprocess.run([soffice(), '--headless', '--convert-to', 'pdf',
                    '--outdir', tmp, pptx],
                   check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    pdf = os.path.join(tmp, 'intro.pdf')
    if not os.path.exists(pdf):
        sys.exit('لم يُنتج ليبر أوفيس ملفًّا — تأكّد أنّه ليس مفتوحًا بنسخةٍ أخرى')
    shutil.copyfile(pdf, OUT)
    print('كُتب %s — %d ك.ب' % (os.path.basename(OUT), os.path.getsize(OUT) // 1024))
finally:
    shutil.rmtree(tmp, ignore_errors=True)
