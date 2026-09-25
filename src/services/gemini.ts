import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.warn("GEMINI_API_KEY is missing. AI features will not work.");
}

const ai = new GoogleGenAI({ apiKey: apiKey || "" });

export async function generateStory(theme: string) {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `اكتب قصة قصيرة ومشوقة باللغة العربية للاسترخاء والترفيه. الموضوع: ${theme}. 
      يجب أن تكون القصة بأسلوب أدبي رفيع، ومقسمة بطريقة جميلة، ولا تزيد عن 300 كلمة. استخدم تنسيق Markdown للعناوين والفقرات.`,
    });
    return response.text;
  } catch (error) {
    console.error("Error generating story:", error);
    return "عذراً، حدث خطأ أثناء تأليف القصة. حاول مرة أخرى.";
  }
}

export async function suggestActivities(mood: string) {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `أنا أشعر بـ ${mood}. قدم لي 3 مقترحات لأنشطة ترفيهية سريعة وممتعة يمكنني القيام بها الآن باللغة العربية. 
      اجعل الرد بصيغة JSON كقائمة من الأشياء (title, description).`,
      config: {
        responseMimeType: "application/json",
      }
    });
    return JSON.parse(response.text || "[]");
  } catch (error) {
    console.error("Error suggesting activities:", error);
    return [];
  }
}

export async function getJoke() {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: "أخبرني بنكتة عربية مضحكة جداً وقصيرة للترفيه.",
    });
    return response.text;
  } catch (error) {
    return "لماذا عبرت الدجاجة الطريق؟ لتصل إلى الجانب الآخر! (عذراً، تعطل مولد النكات)";
  }
}
