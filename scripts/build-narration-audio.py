#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
مولّد السرد الصوتي لتطبيق أثر.

يقرأ scripts/narration.json ويكتب ملفات mp3 وفهرسًا في public/audio/.

════════════════════════════════════════════════════════════════════════
 لماذا نولّد هنا لا على الهاتف
════════════════════════════════════════════════════════════════════════
النصّ ثابت: أربعة مواقع في تسع وعشرين لغة. فبدل أن يحمل كل زائر نموذج
نطق ويشغّله، نولّد مرّة واحدة على حاسوب بلا قيود، ونشحن صوتًا جاهزًا.
النتيجة: جودة أعلى، وتنزيل أصغر بمئة ضعف، وتزامن مقيس لا مقدَّر.

════════════════════════════════════════════════════════════════════════
 المحرّكات — مرتّبة بالجودة لكل لغة
════════════════════════════════════════════════════════════════════════
لا محرّك مفتوح واحد يغطّي التسع والعشرين. فنرتّب لكل لغة قائمة تفضيل،
ونأخذ أول محرّك متاح فعلًا:

  supertonic  ٣١ لغة، ٩٩ مليون معامل، ٤٤٫١ ك.هرتز — الأفضل، ومنها العربية
  kokoro      ٨ لغات بجودة ممتازة — نستعمله للصينية تحديدًا
  mms         ألف لغة وزيادة من ميتا — جودة متوسطة، لكنه يغطّي ما لا يغطّيه غيره

كل محرّك اختياري: إن لم تُثبَّت مكتبته تخطّته اللغات التي تعتمد عليه،
وبقي ما عداها يعمل. وما لا يجد محرّكًا لا يُولَّد له ملف — والتطبيق حينها
يتراجع إلى نطق المتصفح كما كان. لا شيء ينكسر.

════════════════════════════════════════════════════════════════════════
 التثبيت
════════════════════════════════════════════════════════════════════════
    pip install numpy lameenc
    pip install supertonic          # يغطّي ١٨ لغة ومنها العربية والإنجليزية
    pip install kokoro              # اختياري — للصينية
    pip install transformers torch  # اختياري — لبقية اللغات

    python scripts/build-narration-audio.py

خيارات مفيدة:
    --only ar en        يولّد لغات بعينها (للتجربة السريعة قبل التوليد الكامل)
    --force             يعيد توليد ما وُلّد سابقًا
    --list              يعرض خطّة التوليد ولا يولّد شيئًا
"""

from __future__ import annotations

import argparse
import json
import sys
from dataclasses import dataclass, field
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[1]
NARRATION_JSON = ROOT / "scripts" / "narration.json"
AUDIO_DIR = ROOT / "public" / "audio"
MANIFEST = AUDIO_DIR / "manifest.json"

# صمت بين الجمل. أقصر من هذا يبدو متعجّلًا، وأطول يبدو متقطّعًا.
PAUSE_SECONDS = 0.35

# ٤٨ كيلوبت أحادي: كافٍ تمامًا للكلام، ويبقي المقطع دون ٤٠٠ كيلوبايت
MP3_BITRATE = 48


# ═══════════════════════════════════════════════════════════════════════
#  خريطة اللغات
# ═══════════════════════════════════════════════════════════════════════

# ترتيب التفضيل لكل لغة من لغات التطبيق
ENGINE_ORDER: dict[str, list[str]] = {
    # تغطّيها Supertonic بجودة عالية
    "ar": ["supertonic", "mms"],
    "de": ["supertonic", "mms"],
    "el": ["supertonic", "mms"],
    "en": ["supertonic", "kokoro", "mms"],
    "es": ["supertonic", "kokoro", "mms"],
    "fr": ["supertonic", "kokoro", "mms"],
    "hi": ["supertonic", "kokoro", "mms"],
    "id": ["supertonic", "mms"],
    "it": ["supertonic", "kokoro", "mms"],
    "ja": ["supertonic", "kokoro", "mms"],
    "ko": ["supertonic", "mms"],
    "nl": ["supertonic", "mms"],
    "pl": ["supertonic", "mms"],
    "pt": ["supertonic", "kokoro", "mms"],
    "ru": ["supertonic", "mms"],
    "tr": ["supertonic", "mms"],
    "uk": ["supertonic", "mms"],
    "vi": ["supertonic", "mms"],
    # الصينية ليست في Supertonic، وMMS لا يملك لها نموذجًا أصلًا (لا
    # mms-tts-cmn ولا zho)، فKokoro هو السبيل الوحيد إليها — وهو يتقنها.
    "zh-Hans": ["kokoro"],
    "zh-Hant": ["kokoro"],
    # ما لا يغطّيه إلا MMS
    "bn": ["mms"],
    "fa": ["mms"],
    "he": ["mms"],
    "ms": ["mms"],
    "sw": ["mms"],
    "ta": ["mms"],
    "th": ["mms"],
    "tl": ["mms"],
    "ur": ["mms"],
}

# أصوات Supertonic. نثبّت صوتًا واحدًا لكل لغة حتى لا يتغيّر الراوي
# بين موقع وآخر — الدليل شخص واحد يرافق الزائر، لا أشخاص متناوبون.
SUPERTONIC_VOICE = "M4"

# رموز MMS بمعيار ISO 639-3، مُتحقَّق منها على Hugging Face لا مخمَّنة.
# الأردية تحديدًا ليست "urd" بل "urd-script_arabic" — فMMS يفرّق بين خطوط
# اللغة الواحدة، والأردية تُكتب بالعربية وبالديوناغري وباللاتينية.
MMS_CANDIDATES: dict[str, list[str]] = {
    "bn": ["ben"],
    "fa": ["fas"],
    "he": ["heb"],
    "ms": ["zlm"],
    "sw": ["swh"],
    "ta": ["tam"],
    "th": ["tha"],
    "tl": ["tgl"],
    "ur": ["urd-script_arabic"],
    "ar": ["ara"],
    "de": ["deu"],
    "el": ["ell"],
    "en": ["eng"],
    "es": ["spa"],
    "fr": ["fra"],
    "hi": ["hin"],
    "id": ["ind"],
    "it": ["ita"],
    "ja": ["jpn"],
    "ko": ["kor"],
    "nl": ["nld"],
    "pl": ["pol"],
    "pt": ["por"],
    "ru": ["rus"],
    "tr": ["tur"],
    "uk": ["ukr"],
    "vi": ["vie"],
}

# رموز Kokoro
KOKORO_VOICE: dict[str, tuple[str, str]] = {
    # (رمز اللغة، اسم الصوت)
    "zh-Hans": ("z", "zf_xiaobei"),
    "zh-Hant": ("z", "zf_xiaobei"),
    "en": ("a", "af_heart"),
    "es": ("e", "ef_dora"),
    "fr": ("f", "ff_siwis"),
    "hi": ("h", "hf_alpha"),
    "it": ("i", "if_sara"),
    "ja": ("j", "jf_alpha"),
    "pt": ("p", "pf_dora"),
}


# ═══════════════════════════════════════════════════════════════════════
#  المحرّكات
# ═══════════════════════════════════════════════════════════════════════


@dataclass
class Clip:
    """موجة واحدة مع معدّل عيّناتها."""

    wave: np.ndarray  # float32 أحادي، بين -1 و 1
    rate: int


# ═══════════════════════════════════════════════════════════════════════
#  تهيئة النصّ للنطق
# ═══════════════════════════════════════════════════════════════════════

# علامات الترقيم العربية والطباعية ليست كلّها في مفردات كل نموذج. نحن
# كتبنا النصّ بترقيم عربي صحيح للقارئ، فنترجمه هنا إلى ما يفهمه المركّب.
# الوقفة محفوظة: الفاصلة المنقوطة تصير فاصلة لا فراغًا، فيبقى الإيقاع.
PUNCTUATION = {
    "؛": ",",
    "،": ",",
    "؟": "?",
    "٪": "%",
    "«": "",
    "»": "",
    "”": "",
    "“": "",
    "…": ".",
    "—": ",",
    "–": ",",
    "ـ": "",  # التطويل زينة خطّية لا صوت لها
}


def normalize_text(text: str) -> str:
    for source, target in PUNCTUATION.items():
        text = text.replace(source, target)
    return " ".join(text.split())


def strip_unsupported(text: str, message: str) -> str | None:
    """
    يقرأ الحروف التي اشتكى منها المركّب من نصّ الخطأ ويحذفها.

    شبكة أمان أخيرة: خير أن تُنطق الجملة بلا رمز واحد من أن يسقط المقطع
    كلّه. ونطبع ما حُذف حتى لا يمرّ صامتًا.
    """
    import re

    found = re.findall(r"'(.)'", message)
    if not found:
        return None

    cleaned = text
    for character in found:
        cleaned = cleaned.replace(character, " ")
    return " ".join(cleaned.split())


class EngineUnavailable(Exception):
    """المكتبة غير مثبّتة أو النموذج غير متاح لهذه اللغة."""


class SupertonicEngine:
    name = "supertonic-3"

    def __init__(self) -> None:
        try:
            from supertonic import TTS  # type: ignore
        except ImportError as exc:
            raise EngineUnavailable("pip install supertonic") from exc

        print("  ↳ تحميل Supertonic…", flush=True)
        self._tts = TTS(model="supertonic-3", auto_download=True)
        self._style = self._tts.get_voice_style(voice_name=SUPERTONIC_VOICE)
        self._rate = int(getattr(self._tts, "sample_rate", 44100))

    def voice_label(self, language: str) -> str:
        return f"Supertonic {SUPERTONIC_VOICE}"

    def supports(self, language: str) -> bool:
        return True

    def synthesize(self, text: str, language: str) -> Clip:
        wav, _duration = self._tts.synthesize(text, lang=language, voice_style=self._style)
        return Clip(wave=np.asarray(wav, dtype=np.float32).reshape(-1), rate=self._rate)


class KokoroEngine:
    name = "kokoro-82m"

    def __init__(self) -> None:
        try:
            from kokoro import KPipeline  # type: ignore
        except ImportError as exc:
            raise EngineUnavailable("pip install kokoro") from exc

        self._KPipeline = KPipeline
        self._pipelines: dict[str, object] = {}
        self._rate = 24000

    def supports(self, language: str) -> bool:
        return language in KOKORO_VOICE

    def voice_label(self, language: str) -> str:
        return f"Kokoro {KOKORO_VOICE[language][1]}"

    def _pipeline(self, code: str):
        if code not in self._pipelines:
            print(f"  ↳ تحميل Kokoro ({code})…", flush=True)
            self._pipelines[code] = self._KPipeline(lang_code=code)
        return self._pipelines[code]

    def synthesize(self, text: str, language: str) -> Clip:
        code, voice = KOKORO_VOICE[language]
        chunks = [chunk.audio for chunk in self._pipeline(code)(text, voice=voice)]
        if not chunks:
            raise EngineUnavailable("kokoro لم تُخرج صوتًا")
        wave = np.concatenate([np.asarray(c, dtype=np.float32).reshape(-1) for c in chunks])
        return Clip(wave=wave, rate=self._rate)


class MmsEngine:
    """
    MMS من ميتا. جودته أقلّ من غيره، لكنه يغطّي لغات لا يغطّيها أحد —
    ووجود صوت متوسّط خير من لغة بلا صوت أصلًا.
    """

    name = "mms-tts"

    def __init__(self) -> None:
        try:
            import torch  # type: ignore
            from transformers import AutoTokenizer, VitsModel  # type: ignore
        except ImportError as exc:
            raise EngineUnavailable("pip install transformers torch") from exc

        self._torch = torch
        self._AutoTokenizer = AutoTokenizer
        self._VitsModel = VitsModel
        self._loaded: dict[str, tuple] = {}
        self._failed: set[str] = set()
        self._uroman = None

    def supports(self, language: str) -> bool:
        return language in MMS_CANDIDATES and language not in self._failed

    def voice_label(self, language: str) -> str:
        return f"MMS {MMS_CANDIDATES[language][0]}"

    def _romanize(self, text: str) -> str:
        """
        بعض نماذج MMS دُرّبت على نصّ ممثّل بحروف لاتينية لا بخطّه الأصلي،
        فتخرج صامتة أو مشوّهة إن أطعمناها الخطّ الأصلي.
        """
        if self._uroman is None:
            try:
                import uroman  # type: ignore

                self._uroman = uroman.Uroman()
            except ImportError:
                self._uroman = False

        if not self._uroman:
            raise EngineUnavailable("هذه اللغة تحتاج: pip install uroman")
        return self._uroman.romanize_string(text)

    def _model(self, language: str):
        if language in self._loaded:
            return self._loaded[language]

        last_error: Exception | None = None
        for code in MMS_CANDIDATES[language]:
            model_id = f"facebook/mms-tts-{code}"
            try:
                print(f"  ↳ تحميل {model_id}…", flush=True)
                tokenizer = self._AutoTokenizer.from_pretrained(model_id)
                model = self._VitsModel.from_pretrained(model_id)
                model.eval()
                self._loaded[language] = (tokenizer, model)
                return self._loaded[language]
            except Exception as exc:  # noqa: BLE001 — نجرّب المرشّح التالي
                last_error = exc

        self._failed.add(language)
        raise EngineUnavailable(f"لا نموذج MMS لـ {language}: {last_error}")

    def synthesize(self, text: str, language: str) -> Clip:
        tokenizer, model = self._model(language)

        if getattr(tokenizer, "is_uroman", False):
            text = self._romanize(text)

        inputs = tokenizer(text, return_tensors="pt")
        with self._torch.no_grad():
            waveform = model(**inputs).waveform

        return Clip(
            wave=waveform.squeeze().cpu().numpy().astype(np.float32),
            rate=int(model.config.sampling_rate),
        )


ENGINE_CLASSES = {
    "supertonic": SupertonicEngine,
    "kokoro": KokoroEngine,
    "mms": MmsEngine,
}


@dataclass
class EngineRegistry:
    """يبني كل محرّك مرّة واحدة عند أول حاجة، ويتذكّر ما فشل."""

    _built: dict[str, object] = field(default_factory=dict)
    _broken: dict[str, str] = field(default_factory=dict)

    def get(self, key: str):
        if key in self._broken:
            return None
        if key in self._built:
            return self._built[key]

        try:
            engine = ENGINE_CLASSES[key]()
        except EngineUnavailable as exc:
            self._broken[key] = str(exc)
            print(f"  ⚠ {key} غير متاح ({exc})")
            return None

        self._built[key] = engine
        return engine

    def pick(self, language: str):
        """أوّل محرّك متاح يدعم هذه اللغة، أو None."""
        for key in ENGINE_ORDER.get(language, []):
            engine = self.get(key)
            if engine is not None and engine.supports(language):
                return engine
        return None


# ═══════════════════════════════════════════════════════════════════════
#  تركيب المقطع وترميزه
# ═══════════════════════════════════════════════════════════════════════


def normalize(wave: np.ndarray) -> np.ndarray:
    """
    يوحّد العلوّ بين المحرّكات.

    بدون هذا يخرج مقطع عربي أعلى من مقطع تايلندي، فيرفع الزائر الصوت في
    لغة ويخفضه في أخرى. نستهدف ذروة ثابتة ونترك هامشًا يمنع القصّ.
    """
    peak = float(np.max(np.abs(wave))) if wave.size else 0.0
    if peak < 1e-6:
        return wave
    return wave * (0.89 / peak)


def build_track(segments: list[Clip]) -> tuple[np.ndarray, int, list[float]]:
    """
    يصل الجمل بصمت بينها، ويعيد الموجة ومعدّلها وبدايات الجمل بالثواني.

    البدايات هنا هي بيت القصيد: قياسٌ فعليّ لما وُلّد، فيصير إبراز النص
    في التطبيق مطابقًا للصوت تمامًا بدل أن يُقدَّر من عدد الحروف.
    """
    rate = segments[0].rate
    pause = np.zeros(int(PAUSE_SECONDS * rate), dtype=np.float32)

    pieces: list[np.ndarray] = []
    offsets: list[float] = []
    cursor = 0

    for index, clip in enumerate(segments):
        if clip.rate != rate:
            raise ValueError("اختلف معدّل العيّنات داخل المقطع الواحد")

        offsets.append(cursor / rate)
        pieces.append(clip.wave)
        cursor += clip.wave.size

        if index < len(segments) - 1:
            pieces.append(pause)
            cursor += pause.size

    return normalize(np.concatenate(pieces)), rate, offsets


def encode_mp3(wave: np.ndarray, rate: int, path: Path) -> None:
    """يرمّز إلى mp3 عبر lameenc — بلا حاجة إلى ffmpeg على الجهاز."""
    try:
        import lameenc  # type: ignore
    except ImportError as exc:
        raise SystemExit("ينقص: pip install lameenc") from exc

    pcm = np.clip(wave, -1.0, 1.0)
    pcm = (pcm * 32767.0).astype(np.int16)

    encoder = lameenc.Encoder()
    encoder.set_bit_rate(MP3_BITRATE)
    encoder.set_in_sample_rate(rate)
    encoder.set_channels(1)
    encoder.set_quality(2)

    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(encoder.encode(pcm.tobytes()) + encoder.flush())


# ═══════════════════════════════════════════════════════════════════════
#  التشغيل
# ═══════════════════════════════════════════════════════════════════════


def speak(engine, text: str, language: str) -> Clip:
    """ينطق جملة، ويعالج شكوى المركّب من رمز غير مدعوم بدل أن يستسلم."""
    prepared = normalize_text(text)
    try:
        return engine.synthesize(prepared, language)
    except Exception as exc:  # noqa: BLE001
        cleaned = strip_unsupported(prepared, str(exc))
        if cleaned is None or cleaned == prepared:
            raise
        print(f"    ⚠ حُذف رمز غير مدعوم: {exc}")
        return engine.synthesize(cleaned, language)


def load_manifest() -> dict:
    if MANIFEST.exists():
        try:
            return json.loads(MANIFEST.read_text("utf-8")).get("clips", {})
        except (json.JSONDecodeError, OSError):
            pass
    return {}


def save_manifest(clips: dict) -> None:
    """
    يحفظ الفهرس بدمجه مع ما على القرص لا باستبداله.

    ══════════════════════════════════════════════════════════════════
     لماذا الدمج
    ══════════════════════════════════════════════════════════════════
    شُغّلت نسختان من هذا السكربت معًا مرّة، فقرأت كلٌّ منهما الفهرس عند
    البدء وكتبته عند الانتهاء — فمحت الأخيرةُ مدخلًا أضافته الأولى.
    الملف الصوتي كان موجودًا على القرص، لكنه غائبٌ عن الفهرس، فالتطبيق
    لا يراه أصلًا. عطبٌ صامت تمامًا: لا خطأ، لا تحذير، لغةٌ بلا صوت.

    القراءة قبل الكتابة مباشرةً تجعل التشغيلين يتكاملان بدل أن يتنافسا.
    """
    AUDIO_DIR.mkdir(parents=True, exist_ok=True)

    merged = load_manifest()
    merged.update(clips)

    payload = {
        "version": 1,
        "note": "مولّد بـ scripts/build-narration-audio.py — لا يُحرَّر يدويًا",
        "clips": dict(sorted(merged.items())),
    }
    MANIFEST.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", "utf-8")


def main() -> int:
    parser = argparse.ArgumentParser(description="يولّد سرد أثر الصوتي")
    parser.add_argument("--only", nargs="*", metavar="LANG", help="لغات بعينها")
    parser.add_argument("--sites", nargs="*", metavar="SITE", help="مواقع بعينها")
    parser.add_argument("--force", action="store_true", help="أعد توليد الموجود")
    parser.add_argument("--list", action="store_true", help="اعرض الخطّة فقط")
    args = parser.parse_args()

    if not NARRATION_JSON.exists():
        print("لم يوجد scripts/narration.json — شغّل أولًا: npm run narration:export")
        return 1

    data = json.loads(NARRATION_JSON.read_text("utf-8"))
    languages = data["languages"]

    wanted = args.only or sorted(languages)
    missing = [code for code in wanted if code not in languages]
    if missing:
        print(f"لغات غير موجودة في الملف: {', '.join(missing)}")
        return 1

    if args.list:
        print(f"{'اللغة':<10} {'المقاطع':<9} ترتيب المحرّكات")
        for code in wanted:
            order = " ← ".join(ENGINE_ORDER.get(code, [])) or "لا محرّك"
            print(f"{code:<10} {len(languages[code]):<9} {order}")
        return 0

    clips = load_manifest()
    registry = EngineRegistry()
    made = skipped = failed = 0

    for code in wanted:
        pending = [
            entry
            for entry in languages[code]
            if not args.sites or entry["siteId"] in args.sites
        ]
        if not pending:
            continue

        print(f"\n▸ {code}")
        engine = registry.pick(code)
        if engine is None:
            print(f"  ✗ لا محرّك متاح — ستتراجع هذه اللغة إلى نطق المتصفح")
            failed += len(pending)
            continue

        for entry in pending:
            key = f"{code}/{entry['siteId']}"
            out = AUDIO_DIR / code / f"{entry['siteId']}.mp3"

            if out.exists() and key in clips and not args.force:
                skipped += 1
                continue

            try:
                pieces = [
                    speak(engine, segment["speech"], code) for segment in entry["segments"]
                ]
                wave, rate, offsets = build_track(pieces)
                encode_mp3(wave, rate, out)
            except Exception as exc:  # noqa: BLE001 — لغة واحدة لا تُسقط الباقي
                print(f"  ✗ {entry['siteId']}: {exc}")
                failed += 1
                continue

            seconds = round(wave.size / rate, 2)
            clips[key] = {
                "file": f"{code}/{entry['siteId']}.mp3",
                "seconds": seconds,
                "offsets": [round(value, 2) for value in offsets],
                "engine": engine.name,
                "voice": engine.voice_label(code),
            }
            made += 1
            size_kb = out.stat().st_size // 1024
            print(f"  ✓ {entry['siteId']:<10} {seconds:>6.1f}s  {size_kb:>4} ك.ب  {engine.name}")

            # نحفظ بعد كل مقطع: انقطاعُ التوليد لا يضيّع ما أُنجز
            save_manifest(clips)

    save_manifest(clips)
    print(f"\nوُلّد {made} · تُخطّي {skipped} · تعذّر {failed}")
    print(f"الفهرس: {MANIFEST.relative_to(ROOT)}")

    return audit()


def audit() -> int:
    """
    يطابق ما على القرص بما في الفهرس.

    الملف بلا مدخل لا يراه التطبيق أصلًا، والمدخل بلا ملف يعطي الزائر
    زرًّا يضغطه فلا يُشغَّل شيء. كلاهما عطبٌ صامت، وقد وقع الأوّل فعلًا حين
    تنافس تشغيلان على الفهرس — فنفحصه هنا بدل انتظار من يكتشفه بأذنه.
    """
    clips = load_manifest()
    on_disk = {
        f"{path.parent.name}/{path.stem}" for path in AUDIO_DIR.glob("*/*.mp3")
    }

    orphan_files = sorted(on_disk - set(clips))
    missing_files = sorted(key for key in clips if key not in on_disk)

    if not orphan_files and not missing_files:
        print(f"الفحص: {len(clips)} مقطعًا، كلٌّ منها له ملفٌّ ومدخل ✓")
        return 0

    if orphan_files:
        print(f"\n⚠ ملفات بلا مدخل في الفهرس ({len(orphan_files)}) — لن يراها التطبيق:")
        for key in orphan_files:
            print("   ", key)
    if missing_files:
        print(f"\n⚠ مداخل بلا ملف ({len(missing_files)}) — زرُّ تشغيلٍ لا يعمل:")
        for key in missing_files:
            print("   ", key)

    return 1


if __name__ == "__main__":
    sys.exit(main())
