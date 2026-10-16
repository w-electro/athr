"""Builds allam-athr-eval.ipynb from athr_eval.json (re-run after editing sites.js facts)."""
import json
from pathlib import Path

HERE = Path(__file__).parent
data = json.loads((HERE / "athr_eval.json").read_text(encoding="utf-8"))


def md(s):
    return {"cell_type": "markdown", "metadata": {}, "source": s}


def code(s):
    return {"cell_type": "code", "metadata": {}, "execution_count": None, "outputs": [], "source": s}


cells = [
    md(r"""# أثر × ALLaM — Hail heritage test

Does **ALLaM-7B** (SDAIA / HUMAIN, Apache-2.0) know Hail's heritage? This asks it 24 questions built from
Athr's own verified site facts (`src/data/sites.js`), scores the answers, then asks 3 open "tour guide" questions.

**Kaggle:** verify your phone first (profile → Settings → Phone verification), then ⚙️ *Settings* → **Accelerator: GPU T4 x2** (or any GPU) · **Internet: On** → *Run All*.
**Colab:** *Runtime → Change runtime type → T4 GPU* → *Run all*. On a single 15–16 GB GPU the model loads in 8-bit automatically.
First run downloads ~15 GB (≈5–10 min). Results land in `/kaggle/working/` — download them from the *Output* tab."""),
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
    return re.findall(r"\d+(?:\.\d+)?", s)

def score(expected, answer):
    """✅ every number in the expected fact is in the answer · ❌ one is missing · 👀 no numbers: judge by eye"""
    exp = numbers(expected)
    if not exp:
        return "👀"
    got = set(numbers(answer))
    return "✅" if all(n in got for n in exp) else "❌"

rows = []
for i, item in enumerate(EVAL["questions"], 1):
    t = time.time()
    a = ask(item["q"])
    rows.append({**item, "answer": a, "score": score(item["expected"], a), "secs": round(time.time() - t, 1)})
    print(f"{i:2}/{len(EVAL['questions'])} {rows[-1]['score']} {item['site']} | expected: {item['expected']}")
    print(f"     ALLaM: {a[:160]}\n")'''),
    code(r'''graded = [r for r in rows if r["score"] != "👀"]
right = sum(r["score"] == "✅" for r in graded)
print(f"Numeric facts correct: {right}/{len(graded)}  ({100 * right / max(1, len(graded)):.0f}%)")
print(f"To judge by eye: {sum(r['score'] == '👀' for r in rows)}")
by_site = {}
for r in graded:
    by_site.setdefault(r["site"], []).append(r["score"] == "✅")
for site, ok in by_site.items():
    print(f"  {site}: {sum(ok)}/{len(ok)}")'''),
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
    print("-" * 60)'''),
    code(r'''with open("/kaggle/working/allam_athr_results.json", "w", encoding="utf-8") as f:
    json.dump({"model": MODEL, "facts": rows, "open": open_answers}, f, ensure_ascii=False, indent=1)
lines = ["| | Site | Expected | ALLaM |", "|---|---|---|---|"]
for r in rows:
    ans = r["answer"][:120].replace("|", "/").replace("\n", " ")
    lines.append(f"| {r['score']} | {r['site']} | {r['expected']} | {ans} |")
with open("/kaggle/working/allam_athr_results.md", "w", encoding="utf-8") as f:
    f.write("\n".join(lines))
print("Saved -> Output tab: allam_athr_results.json + .md")'''),
]

nb = {"cells": cells, "nbformat": 4, "nbformat_minor": 5,
      "metadata": {"kernelspec": {"display_name": "Python 3", "language": "python", "name": "python3"},
                   "language_info": {"name": "python"}}}
(HERE / "allam-athr-eval.ipynb").write_text(json.dumps(nb, ensure_ascii=False, indent=1), encoding="utf-8")
print("wrote allam-athr-eval.ipynb with", len(cells), "cells")
