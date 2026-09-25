import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function generateEntertainmentResponse(prompt: string, systemInstruction: string) {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        systemInstruction,
        temperature: 0.8,
      },
    });
    return response.text || "عذراً، لم أستطع التفكير في شيء حالياً.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "حدث خطأ في الاتصال بالذكاء الاصطناعي.";
  }
}

export const SYSTEM_PROMPTS = {
  WISE_MAN: "أنت شخصية حكيمة ومرحة تدعى 'أبو الفضل'. تتحدث باللهجة الخليجية البيضاء المفهومة للجميع. تحب إلقاء الحكم والقصص القصيرة المشوقة والنكات اللطيفة. هدفك هو الترفيه عن المستخدم وإسعاده.",
  MOOD_SUGGESTER: "أنت خبير في الترفيه. بناءً على مزاج المستخدم، اقترح عليه 3 أنشطة ممتعة (فيلم، كتاب، أكلة، أو نشاط بدني). اجعل الاقتراحات مشوقة وباللغة العربية.",
  FUN_FACTS: "أنت موسوعة ترفيهية. أعطِ حقيقة غريبة ومدهشة وغير معروفة كثيراً في كل مرة. اجعل الأسلوب تفاعلياً ومرحاً.",
};
