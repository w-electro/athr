# -*- coding: utf-8 -*-
"""يبني athr-qa-ar.pdf — أسئلة التحكيم وأجوبتها.

   المسار نفسه المجرَّب في بقية أوراق المشروع: pptxgenjs يرسم صفحات A4،
   ثمّ ليبر أوفيس يصدّرها PDF بالعربية صحيحةً موصولة.

       python tools/deck/build-qa.py
"""
import os
import shutil
import subprocess
import sys
import tempfile

sys.stdout.reconfigure(encoding='utf-8')

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, os.pardir, os.pardir))
OUT = os.path.join(REPO, 'athr-qa-ar.pdf')

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


tmp = tempfile.mkdtemp(prefix='athr-qa-')
try:
    pptx = os.path.join(tmp, 'qa.pptx')
    subprocess.run(['node', os.path.join(HERE, 'qa.cjs'), pptx],
                   check=True, cwd=REPO)
    subprocess.run([soffice(), '--headless', '--convert-to', 'pdf',
                    '--outdir', tmp, pptx],
                   check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    pdf = os.path.join(tmp, 'qa.pdf')
    if not os.path.exists(pdf):
        sys.exit('لم يُنتج ليبر أوفيس ملفًّا — تأكّد أنّه ليس مفتوحًا بنسخةٍ أخرى')
    shutil.copyfile(pdf, OUT)
    print('كُتب %s — %d ك.ب' % (os.path.basename(OUT), os.path.getsize(OUT) // 1024))
finally:
    shutil.rmtree(tmp, ignore_errors=True)
