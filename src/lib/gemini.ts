import { GoogleGenAI, Type } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY;

export const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

export const VIBE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    movieTitle: { type: Type.STRING },
    movieReason: { type: Type.STRING },
    activity: { type: Type.STRING },
    vibeCheck: { type: Type.STRING },
    color: { type: Type.STRING, description: "A hex color code that matches this vibe" }
  },
  required: ["movieTitle", "movieReason", "activity", "vibeCheck", "color"]
};

export async function getVibeRecommendation(mood: string) {
  if (!ai) throw new Error("GEMINI_API_KEY is not set");

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `The user is feeling "${mood}". 
    Provide an entertainment package:
    1. A movie recommendation (title and why it fits this mood).
    2. A creative activity to do right now.
    3. A witty, short "Vibe Check" message in ARABIC.
    4. A hex color that represents this mood.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: VIBE_SCHEMA
    }
  });

  return JSON.parse(response.text);
}
