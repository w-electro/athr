"""Builds athr_eval.json + allam-athr-eval.ipynb from src/data/sites.js (re-run after editing site data)."""
import json
import re
from pathlib import Path

HERE = Path(__file__).parent


def extract_sites():
    """Each site's verified facts and story text, straight from Athr's own data file."""
    src = (HERE.parent / "src" / "data" / "sites.js").read_text(encoding="utf-8")
    sites = []
    for block in re.split(r"\n\s{4}id: '", src)[1:]:
        field = lambda k: (re.search(rf"\n\s+{k}: '([^']+)'", block) or [None, ""])[1]
        facts_block = re.search(r"facts: \[(.*?)\n\s{4}\]", block, re.S)
        facts = re.findall(r"label: '([^']+)', value: '([^']+)'", facts_block.group(1)) if facts_block else []
        story = re.findall(r"heading: '([^']+)',\s*body: '([^']+)'", block)
        context = "\n".join(
            [f"الموقع: {field('name')} — {field('subtitle')}", f"المكان: {field('city')}", f"الحقبة: {field('era')}"]
            + [f"{label}: {value}" for label, value in facts]
            + [f"{heading}: {body}" for heading, body in story])
        sites.append({"id": block.split("'", 1)[0], "name": field("name"), "facts": facts, "context": context})
    return sites


sites = extract_sites()
data = {
    "sites": [{"id": s["id"], "name": s["name"], "context": s["context"]} for s in sites],
    "questions": [{"site_id": s["id"], "site": s["name"], "expected": value,
                   "q": f"ما {label} لموقع «{s['name']}» في منطقة حائل؟ أجب باختصار."}
                  for s in sites for label, value in s["facts"]],
}
(HERE / "athr_eval.json").write_text(json.dumps(data, ensure_ascii=False, indent=1), encoding="utf-8")


def md(s):
    return {"cell_type": "markdown", "metadata": {}, "source": s}


def code(s):
    return {"cell_type": "code", "metadata": {}, "execution_count": None, "outputs": [], "source": s}


cells = [
    md(r"""# أثر × ALLaM — Hail heritage test

Does **ALLaM-7B** (SDAIA / HUMAIN, Apache-2.0) know Hail's heritage? This asks it 24 questions built from
Athr's own verified site facts (`src/data/sites.js`), scores the answers **twice** — ALLaM alone, then ALLaM given Athr's verified site text (grounded) — and asks 3 open "tour guide" questions.

**Kaggle:** verify your phone first (profile → Settings → Phone verification), then ⚙️ *Settings* → **Accelerator: GPU T4 x2** (or any GPU) · **Internet: On** → *Run All*.
**Colab:** *Runtime → Change runtime type → T4 GPU* → *Run all*. On a single 15–16 GB GPU the model loads in 8-bit automatically.
First run downloads ~15 GB (≈5–10 min). Results land in `/kaggle/working/` (Kaggle *Output* panel) or the Colab *Files* panel. Full run ≈ 15–20 min."""),
    code(r'''!pip -q install -U "transformers>=4.40.1" accelerate bitsandbytes'''),
    code(r'''import torch, json, re, time
from transformers import AutoModelForCausalLM, AutoTokenizer, BitsAndBytesConfig

assert torch.cuda.is_available(), "No GPU: Settings -> Accelerator -> GPU (Kaggle) / Runtime -> Change runtime type -> T4 (Colab)"
MODEL = "humain-ai/ALLaM-7B-Instruct-preview"
gpu_gb = sum(torch.cuda.get_device_properties(i).total_memory for i in range(torch.cuda.device_count())) / 1e9
tok = AutoTokenizer.from_pretrained(MODEL)
if gpu_gb >= 20:   # Kaggle T4 x2 (~30 GB): full fp16 quality
    model = AutoModelForCausalLM.from_pretrained(MODEL, torch_dtype=torch.float16, device_map="auto")
else:              # one 15-16 GB GPU (Kaggle single T4 / P100, Colab T4): 8-bit fits with room to generate
    model = AutoModelForCausalLM.from_pretrained(MODEL, device_map="auto",
                                                 quantization_config=BitsAndBytesConfig(load_in_8bit=True))
model.eval()
print(f"GPU memory {gpu_gb:.0f} GB -> {'fp16' if gpu_gb >= 20 else '8-bit'}; loaded on", {str(p.device) for p in model.parameters()})'''),
    code(r'''def ask(question, max_new_tokens=200):
    msgs = [{"role": "user", "content": question}]
    text = tok.apply_chat_template(msgs, tokenize=False, add_generation_prompt=True)
    inputs = tok(text, return_tensors="pt", return_token_type_ids=False).to(model.device)
    with torch.no_grad():
        out = model.generate(**inputs, max_new_tokens=max_new_tokens, do_sample=False)  # greedy = repeatable
    return tok.decode(out[0][inputs["input_ids"].shape[1]:], skip_special_tokens=True).strip()

print(ask("كيف أجهز كوب شاهي؟"))  # the model card's own smoke test'''),
    code("EVAL = " + json.dumps(data, ensure_ascii=False, indent=1)),
    code(r'''AR_DIGITS = str.maketrans("٠١٢٣٤٥٦٧٨٩", "0123456789")

def numbers(s):
    s = s.translate(AR_DIGITS).replace(",", "").replace("٬", "")
    s = re.sub(r"(\d+(?:\.\d+)?)\s*(آلاف|ألف|الف)", lambda m: str(int(float(m.group(1)) * 1000)), s)  # "10 آلاف" = 10000
    return re.findall(r"\d+(?:\.\d+)?", s)

def score(expected, answer):
    """✅ every number in the expected fact is in the answer · ❌ one is missing · 👀 no numbers: judge by eye"""
    exp = numbers(expected)
    if not exp:
        return "👀"
    got = set(numbers(answer))
    return "✅" if all(n in got for n in exp) else "❌"

CONTEXT = {s["id"]: s["context"] for s in EVAL["sites"]}

def run(make_prompt, label):
    rows = []
    for i, item in enumerate(EVAL["questions"], 1):
        t = time.time()
        a = ask(make_prompt(item))
        rows.append({**item, "answer": a, "score": score(item["expected"], a), "secs": round(time.time() - t, 1)})
        print(f"[{label}] {i:2}/{len(EVAL['questions'])} {rows[-1]['score']} {item['site']} | expected: {item['expected']}")
        print(f"     ALLaM: {a[:160]}\n")
    return rows

def summary(rows, label):
    graded = [r for r in rows if r["score"] != "👀"]
    right = sum(r["score"] == "✅" for r in graded)
    print(f"{label}: numeric facts correct {right}/{len(graded)} ({100 * right / max(1, len(graded)):.0f}%) · by eye: {len(rows) - len(graded)}")
    return right, len(graded)

baseline = run(lambda item: item["q"], "alone")'''),
    code(r'''base_score = summary(baseline, "ALLaM alone")'''),
    md(r"""## Grounded run — ALLaM + Athr's verified data
Same 24 questions, but each one comes with that site's verified text from Athr (facts + story).
This is how Athr would really use a language model: it explains *our* facts instead of recalling from memory."""),
    code(r'''GROUNDED = """أنت مرشد سياحي لتطبيق «أثر» في منطقة حائل.
أجب عن السؤال اعتمادًا على المعلومات الموثّقة التالية فقط. إن لم تجد الإجابة فيها فقل: «لا تتوفر لديّ معلومة موثّقة».

المعلومات الموثّقة:
{context}

السؤال: {q}"""

grounded = run(lambda item: GROUNDED.format(context=CONTEXT[item["site_id"]], q=item["q"]), "grounded")'''),
    code(r'''g_score = summary(grounded, "ALLaM + Athr data")
print()
print(f"Alone:    {base_score[0]}/{base_score[1]}")
print(f"Grounded: {g_score[0]}/{g_score[1]}")
print("\nSide by side (non-numeric answers — judge by eye):")
for b, g in zip(baseline, grounded):
    if b["score"] == "👀":
        print(f"\n• {b['site']} — expected: {b['expected']}")
        print(f"  alone:    {b['answer'][:140]}")
        print(f"  grounded: {g['answer'][:140]}")'''),
    md("## Open questions — would ALLaM make a good tour guide?"),
    code(r'''OPEN = [
    "أنا سائح أزور حائل لأول مرة. اشرح لي نقوش جبة الصخرية في خمس جمل بأسلوب مرشد سياحي.",
    "ما الفرق بين النقوش الثمودية والنبطية؟ وأين أجدها في منطقة حائل؟",
    "خطط لي يومًا واحدًا في حائل يجمع التاريخ والطبيعة، مع أفضل وقت لكل محطة.",
]
open_answers = []
for q in OPEN:
    a = ask(q, max_new_tokens=500)
    open_answers.append({"q": q, "answer": a})
    print("Q:", q)
    print(a)
    print("-" * 60)

# the first question again, grounded — the real Athr experience
jubbah = [s for s in EVAL["sites"] if s["id"] == "jubbah"][0]
a = ask(GROUNDED.format(context=jubbah["context"], q=OPEN[0]), max_new_tokens=500)
open_answers.append({"q": OPEN[0] + "  [grounded]", "answer": a})
print("Q (grounded):", OPEN[0])
print(a)'''),
    code(r'''import os
OUT = "/kaggle/working" if os.path.isdir("/kaggle/working") else "."   # Kaggle or Colab
with open(f"{OUT}/allam_athr_results.json", "w", encoding="utf-8") as f:
    json.dump({"model": MODEL, "alone": baseline, "grounded": grounded, "open": open_answers,
               "score_alone": base_score, "score_grounded": g_score}, f, ensure_ascii=False, indent=1)
lines = [f"**Alone:** {base_score[0]}/{base_score[1]} · **Grounded:** {g_score[0]}/{g_score[1]}", "",
         "| Site | Expected | Alone | Grounded |", "|---|---|---|---|"]
for b, g in zip(baseline, grounded):
    cut = lambda r: r["score"] + " " + r["answer"][:90].replace("|", "/").replace("\n", " ")
    lines.append(f"| {b['site']} | {b['expected']} | {cut(b)} | {cut(g)} |")
with open(f"{OUT}/allam_athr_results.md", "w", encoding="utf-8") as f:
    f.write("\n".join(lines))
print(f"Saved -> {OUT}/allam_athr_results.json + .md")'''),

]

nb = {"cells": cells, "nbformat": 4, "nbformat_minor": 5,
      "metadata": {"kernelspec": {"display_name": "Python 3", "language": "python", "name": "python3"},
                   "language_info": {"name": "python"}}}
(HERE / "allam-athr-eval.ipynb").write_text(json.dumps(nb, ensure_ascii=False, indent=1), encoding="utf-8")
print("wrote allam-athr-eval.ipynb with", len(cells), "cells")
