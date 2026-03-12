import { GoogleGenAI } from "@google/genai";
import { Style } from "../styles";

const SYSTEM_INSTRUCTION = `You are an expert image prompt engineer. Given a short description and a set of visual style rules,
generate a detailed 3-4 sentence prompt for an AI image generator. The prompt must:
1. Faithfully represent the user's subject
2. Strictly follow the provided visual style rules
3. Always end with: "The subject is rendered on a solid light gray (#E0E0E0) background with no floor, no shadows on the background, and no environmental elements. The subject is cleanly isolated."
4. Do NOT include any text, watermarks, labels, or UI elements in the image description.
Return ONLY the image generation prompt, nothing else.`;

export async function enhancePrompt(
  ai: GoogleGenAI,
  userPrompt: string,
  style: Style
): Promise<string> {
  const userMessage = `Subject: ${userPrompt}\nVisual Style: ${style.name} — ${style.rules}`;

  const response = await ai.models.generateContent({
    model: "gemini-3.1-flash-lite-preview",
    contents: userMessage,
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      temperature: 0.7,
      maxOutputTokens: 512,
    },
  });

  // response.text is a string getter in @google/genai SDK
  const text = response.text;
  if (!text) {
    throw new Error("Prompt enhancement returned empty response");
  }

  return text.trim();
}
