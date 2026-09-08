/**
 * دالة خادمية اختيارية: تعرّف على الموقع عبر Claude Vision.
 *
 * ⚠️ تنبيه تكلفة: هذا المسار يستهلك رصيد Anthropic API، وهو منفصل تمامًا
 * عن اشتراك Claude Pro. إن لم يكن لديك رصيد API، استخدم المزوّد المحلي
 * المجاني في src/lib/recognition.local.js بدلًا منه.
 *
 * التشغيل (Vercel / Netlify Functions / أي خادم Node):
 *   1) npm install @anthropic-ai/sdk
 *   2) اضبط ANTHROPIC_API_KEY في بيئة الخادم (لا في .env الخاص بالمتصفح)
 *   3) VITE_RECOGNITION_PROVIDER=claude
 *
 * المفتاح يبقى على الخادم. المتصفح يرسل الصورة فقط ويستقبل نتيجة منظّمة.
 */

const SYSTEM_PROMPT = `أنت خبير في التراث الأثري لمنطقة حائل في السعودية.
ستصلك صورة التقطها سائح، وقائمة بالمواقع المعروفة.
مهمتك: تحديد أي موقع من القائمة تُظهره الصورة، أو الإقرار بعدم التطابق.

قواعد صارمة:
- لا تخمّن. إن لم تكن واثقًا بنسبة تتجاوز 60% أعِد siteId = null.
- اعتمد على أدلة بصرية ملموسة (نوع الصخر، أسلوب النقش، طراز البناء، التضاريس).
- أعِد JSON فقط بلا أي نص إضافي وبلا علامات markdown.

الشكل المطلوب:
{"siteId": string|null, "label": string, "confidence": number, "evidence": string[]}
حيث label وevidence باللغة العربية، وconfidence بين 0 و1.`

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method not allowed' })
  }

  const { imageBase64, mediaType = 'image/jpeg', candidates = [] } = request.body ?? {}

  if (!imageBase64) {
    return response.status(400).json({ error: 'imageBase64 مطلوب' })
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return response.status(500).json({ error: 'ANTHROPIC_API_KEY غير مضبوط على الخادم' })
  }

  try {
    const { default: Anthropic } = await import('@anthropic-ai/sdk')
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

    const message = await client.messages.create({
      model: 'claude-sonnet-5',
      max_tokens: 600,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: mediaType, data: imageBase64 },
            },
            {
              type: 'text',
              text: `المواقع المعروفة:\n${JSON.stringify(candidates, null, 2)}\n\nأعِد JSON فقط.`,
            },
          ],
        },
        // نبدأ رد النموذج بقوس مفتوح لإجباره على JSON خالص بلا مقدمات
        { role: 'assistant', content: '{' },
      ],
    })

    const raw = '{' + (message.content[0]?.text ?? '')
    const parsed = JSON.parse(raw)

    // نتحقق أن المعرّف من القائمة فعلًا — لا نثق بمخرجات النموذج بلا فحص
    const allowed = new Set(candidates.map((candidate) => candidate.id))
    const siteId = allowed.has(parsed.siteId) ? parsed.siteId : null

    return response.status(200).json({
      siteId,
      label: parsed.label ?? 'نتيجة غير محددة',
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0,
      evidence: Array.isArray(parsed.evidence) ? parsed.evidence : [],
    })
  } catch (error) {
    return response.status(500).json({ error: error.message })
  }
}
