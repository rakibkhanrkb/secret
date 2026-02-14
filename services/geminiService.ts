
import { GoogleGenAI, Type } from "@google/genai";
import { GeminiResponse } from "../types";

export const generateRomanticContent = async (): Promise<GeminiResponse> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: "Generate a short, beautiful 4-line romantic poem and 3 sweet Valentine wishes for a loved one. The mood should be deeply affectionate and modern. The entire response must be in Bengali language.",
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          poem: { type: Type.STRING },
          wishes: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          }
        },
        required: ["poem", "wishes"]
      }
    }
  });

  try {
    return JSON.parse(response.text || '{}') as GeminiResponse;
  } catch (error) {
    console.error("Failed to parse Gemini response", error);
    return {
      poem: "গোলাপ লাল, নীল অপরাজিতা,\nতোমার হাসিতেই আমার যত কবিতা।\nতুমি আছো বলেই পৃথিবী এত সুন্দর,\nভালোবেসে যাবো তোমায় সারা জনমভর।",
      wishes: ["শুভ ভালোবাসা দিবস!", "তোমাকে আজীবন ভালোবাসবো।", "তুমিই আমার সবটুকু খুশি।"]
    };
  }
};
