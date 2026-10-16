---
license: cc-by-4.0
language:
- ar
pretty_name: Hail Heritage QA
size_categories:
- n<1K
task_categories:
- question-answering
tags:
- arabic
- saudi-arabia
- hail
- cultural-heritage
- evaluation
- rag
- hallucination
- translationese
- allam
configs:
- config_name: questions
  data_files: questions.jsonl
  default: true
- config_name: sites
  data_files: sites.jsonl
---

# Hail Heritage QA · أسئلة تراث حائل

A small, verified Arabic benchmark about heritage sites in the **Hail region, Saudi Arabia** — built from the
content of [Athr (أثر)](https://w-electro.github.io/athr/), an on-device AI heritage guide for Hail.

- **24 questions** with verified short answers across **6 sites**: Jubbah rock art (UNESCO), A'arif Fort,
  Al-Qishlah Palace, the Aja Mountains, Hail Regional Museum, Shuwaymis rock art (UNESCO).
- **6 grounding passages** (`sites.jsonl`) — the verified text for each site — for testing retrieval-augmented answers.
- **Results for ALLaM-7B-Instruct-preview** and the **evaluation notebook** to reproduce them on a free GPU.

> ### 🏛️ Try Athr · جرّب تطبيق أثر
> **Athr** turns your phone into a heritage guide for Hail: point the camera at a rock inscription and an on-device AI
> recognises it and tells its story — in 29 languages, no internet needed at the site.
> <p dir="rtl" align="right">تطبيق أثر يحوّل هاتفك إلى مرشد تراثي في حائل: وجّه الكاميرا نحو النقش ليتعرّف عليه ويروي قصته.</p>
>
> **▶ App:** https://w-electro.github.io/athr/ · **Code:** https://github.com/w-electro/athr

## Why
Arabic models are often tested on Arabic in general, rarely on **local Saudi knowledge**. Two questions:
1. **Facts:** does a model know Hail's heritage — or invent it?
2. **Style:** does its Arabic read as native, or as translated English ("translationese")?

## Results — ALLaM-7B-Instruct-preview (Oct 2026)

**Facts**

| Setting | Numeric facts | Text facts (checked by hand) |
|---|---|---|
| Model alone | 7 / 14 | several invented (e.g. a limestone Qishlah, Aja tied to the wrong legend, a non-existent museum URL) |
| + grounding passage | **14 / 14** | **10 / 10** |

Grounding with verified local text took the model from about half right to **24 / 24, with nothing invented**.

**Style (translationese)** — English calques per 100 words and sentence breaks per 100 words. Calques counted include:

<p dir="rtl" align="right"><b>بالتأكيد</b> ـ <b>إليك</b> ـ <b>مما يجعلها</b> ـ <b>ليست مجرد… بل</b> ـ <b>أتمنى أن يكون مفيدًا</b></p>

| Text | Calques / 100 words | Sentence breaks / 100 words |
|---|---|---|
| Athr's native Arabic text (reference) | 0.0 | 1.8 |
| ALLaM default | 2.4 | ~5.2 |
| ALLaM told to "write natural Arabic" | 1.9 | ~6.0 |

The instruction barely helps: the English rhythm (short, noun-first sentences; ≈3× native sentence breaks) appears to
come from training data rather than prompting. Small sample (4 long answers) — treat as a signal, not a verdict.

## Files
| File | Contents |
|---|---|
| `questions.jsonl` | `id, site_id, site, question, answer` |
| `sites.jsonl` | `site_id, site, context` — verified grounding passage per site |
| `results/allam-7b-instruct-preview.json` | every answer, alone and grounded, with scores and style metrics |
| `evaluate_allam.ipynb` | runs the whole evaluation on Kaggle (T4 ×2) or Colab (T4, 8-bit) |

Scoring: a numeric answer is correct when every number in the reference answer appears in the model's answer
(Arabic-Indic digits and the Arabic word for thousands normalised). Non-numeric answers were checked by hand.

## Use
```python
from datasets import load_dataset
qs = load_dataset("WaleedAlshammari/hail-heritage-qa", "questions", split="train")
sites = load_dataset("WaleedAlshammari/hail-heritage-qa", "sites", split="train")
```

## الملخص بالعربية
<div dir="rtl" align="right">

مجموعة أسئلة موثّقة عن مواقع التراث في **منطقة حائل**، مأخوذة من محتوى تطبيق أثر (https://w-electro.github.io/athr/): ٢٤ سؤالًا بإجابات قصيرة موثّقة عن
ستة مواقع، مع نصوص موثّقة لكل موقع لاختبار الإجابة المستندة إلى المصادر.
في اختبار نموذج علّام (ALLaM-7B): أجاب وحده عن ٧ من ١٤ معلومة رقمية واختلق تفاصيل، وحين زُوّد بالنص الموثّق أجاب عن
الأسئلة الأربعة والعشرين كلها بلا اختلاق. أما الأسلوب فما زال يحمل إيقاع الإنجليزية المترجمة، ولم تُصلحه التعليمات
وحدها — وهي ملاحظة نرجو أن تفيد في تطوير النماذج العربية.

</div>

## Citation & credit
Created by **Waleed AlOudah** (Hail, Saudi Arabia), from the [Athr project](https://github.com/w-electro/athr). Site texts © Athr, released here under
CC BY 4.0 — please credit "Hail Heritage QA — Waleed AlOudah". Photos are not included.
