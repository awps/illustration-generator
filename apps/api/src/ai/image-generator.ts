import { GoogleGenAI, HarmCategory, HarmBlockThreshold } from "@google/genai";

export interface GeneratedImage {
  base64: string;
  mimeType: string;
}

export interface ReferenceImage {
  base64: string;
  mimeType: string;
}

export type ReferenceMode = 'style' | 'structure'

const SAFETY_SETTINGS = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
]

const MAX_RETRIES = 2;

export async function generateImage(
  ai: GoogleGenAI,
  enhancedPrompt: string,
  reference?: ReferenceImage,
  referenceMode: ReferenceMode = 'style'
): Promise<GeneratedImage> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const contents: any[] = [];
    if (reference) {
      contents.push({
        inlineData: { mimeType: reference.mimeType, data: reference.base64 },
      });
      const refInstruction = referenceMode === 'structure'
        ? `Analyze the reference image above and follow its layout, composition, spatial arrangement, and element placement closely. Create a new illustration that mirrors the same structure and visual hierarchy but with fresh artwork for the following: ${enhancedPrompt}`
        : `Use the reference image above ONLY as a style guide — match its rendering technique, color treatment, and visual aesthetic. Do NOT copy its layout, composition, text, or specific elements. Create a completely new and original illustration for the following: ${enhancedPrompt}`;
      contents.push({ text: refInstruction });
    } else {
      contents.push({ text: enhancedPrompt });
    }

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-image-preview",
        contents,
        config: {
          responseModalities: ["IMAGE"],
          safetySettings: SAFETY_SETTINGS,
          imageConfig: {
            aspectRatio: "1:1",
          },
        },
      });

      const candidate = response.candidates?.[0];
      const parts = candidate?.content?.parts;
      if (!parts) {
        const blockReason = candidate?.finishReason
          ?? (response as any).promptFeedback?.blockReason
          ?? "unknown";
        console.error(`[image-generator] No content (attempt ${attempt + 1}/${MAX_RETRIES + 1}). reason:`, blockReason,
          "promptFeedback:", JSON.stringify((response as any).promptFeedback));
        lastError = new Error(`Image generation returned no content (reason: ${blockReason})`);
        continue;
      }

      const imagePart = parts.find((p) =>
        p.inlineData?.mimeType?.startsWith("image/")
      );

      if (!imagePart?.inlineData) {
        lastError = new Error("Image generation returned no image data");
        continue;
      }

      if (attempt > 0) {
        console.log(`[image-generator] Succeeded on attempt ${attempt + 1}`);
      }

      return {
        base64: imagePart.inlineData.data!,
        mimeType: imagePart.inlineData.mimeType!,
      };
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      console.error(`[image-generator] Error (attempt ${attempt + 1}/${MAX_RETRIES + 1}):`, lastError.message);
    }
  }

  throw lastError ?? new Error("Image generation failed after retries");
}
